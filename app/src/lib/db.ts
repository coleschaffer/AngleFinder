import { Pool } from 'pg';
import { AnalyticsEvent, AnalyticsEventType, AwarenessLevel, SourceType } from '@/types';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database tables
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        user_agent TEXT
      )
    `);

    // Analytics table for tracking interactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_type VARCHAR(20) NOT NULL,
        awareness_level VARCHAR(20) NOT NULL,
        momentum_score INTEGER NOT NULL,
        is_sweet_spot BOOLEAN DEFAULT false,
        niche VARCHAR(100),
        source_type VARCHAR(50),
        content TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Add content column if it doesn't exist (migration for existing tables)
    await client.query(`
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS content TEXT
    `);

    // Create index for faster analytics queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_awareness ON analytics_events (awareness_level);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_sweet_spot ON analytics_events (is_sweet_spot);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events (timestamp);
    `);
  } finally {
    client.release();
  }
}

export interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  date: string;
  userAgent: string;
}

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  await initDatabase();
  const result = await pool.query(
    'SELECT id, email, message, date, user_agent as "userAgent" FROM feedback ORDER BY date DESC'
  );
  return result.rows.map(row => ({
    ...row,
    date: row.date.toISOString(),
  }));
}

export async function addFeedback(feedback: Omit<FeedbackItem, 'id'>): Promise<FeedbackItem> {
  await initDatabase();
  const id = crypto.randomUUID();
  await pool.query(
    'INSERT INTO feedback (id, email, message, date, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [id, feedback.email, feedback.message, feedback.date, feedback.userAgent]
  );
  return { id, ...feedback };
}

export async function deleteFeedback(id: string): Promise<void> {
  await pool.query('DELETE FROM feedback WHERE id = $1', [id]);
}

export async function clearAllFeedback(): Promise<void> {
  await pool.query('DELETE FROM feedback');
}

// ============================================
// Analytics Functions
// ============================================

export interface AnalyticsEventInput {
  eventType: AnalyticsEventType;
  itemId: string;
  itemType: 'claim' | 'hook';
  awarenessLevel: AwarenessLevel;
  momentumScore: number;
  niche?: string;
  sourceType?: SourceType;
  content?: string;
}

export async function trackAnalyticsEvent(event: AnalyticsEventInput): Promise<void> {
  await initDatabase();
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO analytics_events
     (id, event_type, item_id, item_type, awareness_level, momentum_score, is_sweet_spot, niche, source_type, content, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      event.eventType,
      event.itemId,
      event.itemType,
      event.awarenessLevel,
      event.momentumScore,
      false, // is_sweet_spot - deprecated, always false
      event.niche || null,
      event.sourceType || null,
      event.content || null,
      new Date().toISOString(),
    ]
  );
}

export interface AnalyticsSummary {
  totalEvents: number;
  byAwarenessLevel: {
    hidden: number;
    emerging: number;
    known: number;
  };
  byEventType: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await initDatabase();

  // Total events
  const totalResult = await pool.query('SELECT COUNT(*) as count FROM analytics_events');
  const totalEvents = parseInt(totalResult.rows[0].count, 10);

  // By awareness level
  const awarenessResult = await pool.query(`
    SELECT awareness_level, COUNT(*) as count
    FROM analytics_events
    GROUP BY awareness_level
  `);
  const byAwarenessLevel = { hidden: 0, emerging: 0, known: 0 };
  awarenessResult.rows.forEach((row: { awareness_level: string; count: string }) => {
    byAwarenessLevel[row.awareness_level as AwarenessLevel] = parseInt(row.count, 10);
  });

  // By event type
  const eventTypeResult = await pool.query(`
    SELECT event_type, COUNT(*) as count
    FROM analytics_events
    GROUP BY event_type
  `);
  const byEventType: Record<string, number> = {};
  eventTypeResult.rows.forEach((row: { event_type: string; count: string }) => {
    byEventType[row.event_type] = parseInt(row.count, 10);
  });

  // Recent events (last 50)
  const recentResult = await pool.query(`
    SELECT
      id, event_type as "eventType", item_id as "itemId", item_type as "itemType",
      awareness_level as "awarenessLevel", momentum_score as "momentumScore",
      niche, source_type as "sourceType", content, timestamp
    FROM analytics_events
    ORDER BY timestamp DESC
    LIMIT 50
  `);
  const recentEvents: AnalyticsEvent[] = recentResult.rows.map((row: Record<string, unknown>) => ({
    ...row,
    timestamp: (row.timestamp as Date).toISOString(),
  })) as AnalyticsEvent[];

  return {
    totalEvents,
    byAwarenessLevel,
    byEventType,
    recentEvents,
  };
}

export async function clearAllAnalytics(): Promise<void> {
  await pool.query('DELETE FROM analytics_events');
}

// ============================================
// Error Logging Functions
// ============================================

export interface ErrorLogEntry {
  id: string;
  endpoint: string;
  errorType: string;
  message: string;
  statusCode?: number;
  requestData?: string;
  timestamp: string;
}

export async function initErrorLogsTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id UUID PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        error_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        status_code INTEGER,
        request_data TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs (timestamp);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs (endpoint);
    `);
  } finally {
    client.release();
  }
}

export interface LogErrorInput {
  endpoint: string;
  errorType: string;
  message: string;
  statusCode?: number;
  requestData?: Record<string, unknown>;
}

export async function logError(error: LogErrorInput): Promise<void> {
  try {
    await initErrorLogsTable();
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO error_logs (id, endpoint, error_type, message, status_code, request_data, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        error.endpoint,
        error.errorType,
        error.message.slice(0, 5000), // Limit message length
        error.statusCode || null,
        error.requestData ? JSON.stringify(error.requestData).slice(0, 5000) : null,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    // Silent fail - don't let logging errors break the app
    console.error('Failed to log error:', err);
  }
}

export async function getRecentErrors(limit: number = 100): Promise<ErrorLogEntry[]> {
  await initErrorLogsTable();
  const result = await pool.query(
    `SELECT id, endpoint, error_type as "errorType", message, status_code as "statusCode",
            request_data as "requestData", timestamp
     FROM error_logs
     ORDER BY timestamp DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(row => ({
    ...row,
    timestamp: row.timestamp.toISOString(),
  }));
}

export async function getErrorStats(): Promise<{
  total: number;
  byEndpoint: Record<string, number>;
  byErrorType: Record<string, number>;
  last24h: number;
}> {
  await initErrorLogsTable();

  const totalResult = await pool.query('SELECT COUNT(*) as count FROM error_logs');
  const total = parseInt(totalResult.rows[0].count, 10);

  const byEndpointResult = await pool.query(`
    SELECT endpoint, COUNT(*) as count
    FROM error_logs
    GROUP BY endpoint
  `);
  const byEndpoint: Record<string, number> = {};
  byEndpointResult.rows.forEach((row: { endpoint: string; count: string }) => {
    byEndpoint[row.endpoint] = parseInt(row.count, 10);
  });

  const byErrorTypeResult = await pool.query(`
    SELECT error_type, COUNT(*) as count
    FROM error_logs
    GROUP BY error_type
  `);
  const byErrorType: Record<string, number> = {};
  byErrorTypeResult.rows.forEach((row: { error_type: string; count: string }) => {
    byErrorType[row.error_type] = parseInt(row.count, 10);
  });

  const last24hResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM error_logs
    WHERE timestamp > NOW() - INTERVAL '24 hours'
  `);
  const last24h = parseInt(last24hResult.rows[0].count, 10);

  return { total, byEndpoint, byErrorType, last24h };
}

export async function clearAllErrors(): Promise<void> {
  await pool.query('DELETE FROM error_logs');
}

// ============================================
// API Usage Tracking Functions
// ============================================

export interface UsageEntry {
  id: string;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  requestDurationMs: number;
  apiKeyUsed: 'primary' | 'secondary';
  wasRateLimited: boolean;
  sessionId?: string;
  timestamp: string;
}

export async function initUsageTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        model VARCHAR(100) NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        request_duration_ms INTEGER NOT NULL DEFAULT 0,
        api_key_used VARCHAR(20) NOT NULL DEFAULT 'primary',
        was_rate_limited BOOLEAN DEFAULT false,
        session_id VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage (timestamp);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage (endpoint);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_usage_session ON api_usage (session_id);
    `);
  } finally {
    client.release();
  }
}

export interface TrackUsageInput {
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  requestDurationMs: number;
  apiKeyUsed: 'primary' | 'secondary';
  wasRateLimited?: boolean;
  sessionId?: string;
}

export async function trackUsage(usage: TrackUsageInput): Promise<void> {
  try {
    await initUsageTable();
    const id = crypto.randomUUID();
    const totalTokens = usage.inputTokens + usage.outputTokens;

    await pool.query(
      `INSERT INTO api_usage
       (id, endpoint, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
        total_tokens, request_duration_ms, api_key_used, was_rate_limited, session_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        usage.endpoint,
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.cacheReadTokens || 0,
        usage.cacheCreationTokens || 0,
        totalTokens,
        usage.requestDurationMs,
        usage.apiKeyUsed,
        usage.wasRateLimited || false,
        usage.sessionId || null,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    // Silent fail - don't let usage tracking break the app
    console.error('Failed to track usage:', err);
  }
}

export interface UsageSummary {
  // Current period (last hour)
  currentHour: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheCreationTokens: number;
    avgRequestDuration: number;
    rateLimitedRequests: number;
    byEndpoint: Record<string, number>;
    byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number }>;
  };
  // Last 24 hours
  last24Hours: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    rateLimitedRequests: number;
    requestsPerHour: { hour: string; requests: number; tokens: number }[];
  };
  // All time
  allTime: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheCreationTokens: number;
  };
  // Active sessions (unique session IDs in last 15 minutes)
  activeSessions: number;
  // Rate limit info
  rateLimits: {
    primaryKeyUsage: number;
    secondaryKeyUsage: number;
    rateLimitHitsLast24h: number;
  };
  // Recent requests
  recentRequests: UsageEntry[];
}

export async function getUsageSummary(): Promise<UsageSummary> {
  await initUsageTable();

  // Current hour stats
  const currentHourResult = await pool.query(`
    SELECT
      COUNT(*) as total_requests,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(SUM(cache_read_tokens), 0) as total_cache_read_tokens,
      COALESCE(SUM(cache_creation_tokens), 0) as total_cache_creation_tokens,
      COALESCE(AVG(request_duration_ms), 0) as avg_duration,
      COUNT(CASE WHEN was_rate_limited THEN 1 END) as rate_limited
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '1 hour'
  `);
  const currentHourRow = currentHourResult.rows[0];

  // By endpoint (current hour)
  const byEndpointResult = await pool.query(`
    SELECT endpoint, COUNT(*) as count
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY endpoint
  `);
  const byEndpoint: Record<string, number> = {};
  byEndpointResult.rows.forEach((row: { endpoint: string; count: string }) => {
    byEndpoint[row.endpoint] = parseInt(row.count, 10);
  });

  // By model (current hour)
  const byModelResult = await pool.query(`
    SELECT model,
           COUNT(*) as requests,
           COALESCE(SUM(input_tokens), 0) as input_tokens,
           COALESCE(SUM(output_tokens), 0) as output_tokens
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY model
  `);
  const byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number }> = {};
  byModelResult.rows.forEach((row: any) => {
    byModel[row.model] = {
      requests: parseInt(row.requests, 10),
      inputTokens: parseInt(row.input_tokens, 10),
      outputTokens: parseInt(row.output_tokens, 10),
    };
  });

  // Last 24 hours stats
  const last24hResult = await pool.query(`
    SELECT
      COUNT(*) as total_requests,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(SUM(cache_read_tokens), 0) as total_cache_read_tokens,
      COUNT(CASE WHEN was_rate_limited THEN 1 END) as rate_limited
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '24 hours'
  `);
  const last24hRow = last24hResult.rows[0];

  // Requests per hour (last 24 hours)
  const hourlyResult = await pool.query(`
    SELECT
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as requests,
      COALESCE(SUM(total_tokens), 0) as tokens
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC
  `);
  const requestsPerHour = hourlyResult.rows.map((row: any) => ({
    hour: row.hour.toISOString(),
    requests: parseInt(row.requests, 10),
    tokens: parseInt(row.tokens, 10),
  }));

  // All time stats
  const allTimeResult = await pool.query(`
    SELECT
      COUNT(*) as total_requests,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(SUM(cache_read_tokens), 0) as total_cache_read_tokens,
      COALESCE(SUM(cache_creation_tokens), 0) as total_cache_creation_tokens
    FROM api_usage
  `);
  const allTimeRow = allTimeResult.rows[0];

  // Active sessions (last 15 minutes)
  const activeSessionsResult = await pool.query(`
    SELECT COUNT(DISTINCT session_id) as count
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '15 minutes'
    AND session_id IS NOT NULL
  `);
  const activeSessions = parseInt(activeSessionsResult.rows[0].count, 10);

  // Rate limit info
  const keyUsageResult = await pool.query(`
    SELECT
      api_key_used,
      COUNT(*) as count
    FROM api_usage
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY api_key_used
  `);
  let primaryKeyUsage = 0;
  let secondaryKeyUsage = 0;
  keyUsageResult.rows.forEach((row: { api_key_used: string; count: string }) => {
    if (row.api_key_used === 'primary') primaryKeyUsage = parseInt(row.count, 10);
    if (row.api_key_used === 'secondary') secondaryKeyUsage = parseInt(row.count, 10);
  });

  // Recent requests (last 50)
  const recentResult = await pool.query(`
    SELECT
      id, endpoint, model, input_tokens as "inputTokens", output_tokens as "outputTokens",
      cache_read_tokens as "cacheReadTokens", cache_creation_tokens as "cacheCreationTokens",
      total_tokens as "totalTokens", request_duration_ms as "requestDurationMs",
      api_key_used as "apiKeyUsed", was_rate_limited as "wasRateLimited",
      session_id as "sessionId", timestamp
    FROM api_usage
    ORDER BY timestamp DESC
    LIMIT 50
  `);
  const recentRequests: UsageEntry[] = recentResult.rows.map((row: any) => ({
    ...row,
    timestamp: row.timestamp.toISOString(),
  }));

  return {
    currentHour: {
      totalRequests: parseInt(currentHourRow.total_requests, 10),
      totalInputTokens: parseInt(currentHourRow.total_input_tokens, 10),
      totalOutputTokens: parseInt(currentHourRow.total_output_tokens, 10),
      totalCacheReadTokens: parseInt(currentHourRow.total_cache_read_tokens, 10),
      totalCacheCreationTokens: parseInt(currentHourRow.total_cache_creation_tokens, 10),
      avgRequestDuration: Math.round(parseFloat(currentHourRow.avg_duration)),
      rateLimitedRequests: parseInt(currentHourRow.rate_limited, 10),
      byEndpoint,
      byModel,
    },
    last24Hours: {
      totalRequests: parseInt(last24hRow.total_requests, 10),
      totalInputTokens: parseInt(last24hRow.total_input_tokens, 10),
      totalOutputTokens: parseInt(last24hRow.total_output_tokens, 10),
      totalCacheReadTokens: parseInt(last24hRow.total_cache_read_tokens, 10),
      rateLimitedRequests: parseInt(last24hRow.rate_limited, 10),
      requestsPerHour,
    },
    allTime: {
      totalRequests: parseInt(allTimeRow.total_requests, 10),
      totalInputTokens: parseInt(allTimeRow.total_input_tokens, 10),
      totalOutputTokens: parseInt(allTimeRow.total_output_tokens, 10),
      totalCacheReadTokens: parseInt(allTimeRow.total_cache_read_tokens, 10),
      totalCacheCreationTokens: parseInt(allTimeRow.total_cache_creation_tokens, 10),
    },
    activeSessions,
    rateLimits: {
      primaryKeyUsage,
      secondaryKeyUsage,
      rateLimitHitsLast24h: parseInt(last24hRow.rate_limited, 10),
    },
    recentRequests,
  };
}

export async function clearAllUsage(): Promise<void> {
  await pool.query('DELETE FROM api_usage');
}

// ============================================
// Source Content Caching Functions
// ============================================

export interface CachedContent {
  id: string;
  sourceUrl: string;
  sourceType: SourceType;
  contentHash: string;
  content: string;
  contentLength: number;
  fetchDurationMs: number;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  lastAccessedAt: string;
}

export async function initContentCacheTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS source_content_cache (
        id UUID PRIMARY KEY,
        source_url TEXT NOT NULL UNIQUE,
        source_type VARCHAR(50) NOT NULL,
        content_hash VARCHAR(64) NOT NULL,
        content TEXT NOT NULL,
        content_length INTEGER NOT NULL DEFAULT 0,
        fetch_duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_cache_url ON source_content_cache (source_url);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_cache_expires ON source_content_cache (expires_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_cache_type ON source_content_cache (source_type);
    `);
  } finally {
    client.release();
  }
}

// Cache entries never expire automatically - only cleared manually
const CACHE_TTL_YEARS = 100; // Effectively permanent

export interface GetCachedContentResult {
  content: string;
  cacheHit: boolean;
  cachedAt?: string;
  hitCount?: number;
}

/**
 * Get cached content for a source URL
 * Returns null if not cached or expired
 */
export async function getCachedContent(sourceUrl: string): Promise<GetCachedContentResult | null> {
  try {
    await initContentCacheTable();

    const result = await pool.query(
      `SELECT content, created_at, hit_count
       FROM source_content_cache
       WHERE source_url = $1 AND expires_at > NOW()`,
      [sourceUrl]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update hit count and last accessed time
    await pool.query(
      `UPDATE source_content_cache
       SET hit_count = hit_count + 1, last_accessed_at = NOW()
       WHERE source_url = $1`,
      [sourceUrl]
    );

    const row = result.rows[0];
    return {
      content: row.content,
      cacheHit: true,
      cachedAt: row.created_at.toISOString(),
      hitCount: row.hit_count + 1,
    };
  } catch (err) {
    console.error('Failed to get cached content:', err);
    return null;
  }
}

/**
 * Store content in cache
 */
export async function setCachedContent(
  sourceUrl: string,
  sourceType: SourceType,
  content: string,
  fetchDurationMs: number
): Promise<void> {
  try {
    await initContentCacheTable();

    const id = crypto.randomUUID();
    const contentHash = await hashContent(content);
    const now = new Date();
    // Set expiration far in the future - cache is cleared manually, not automatically
    const expiresAt = new Date(now.getTime() + CACHE_TTL_YEARS * 365 * 24 * 60 * 60 * 1000);

    // Upsert - update if exists, insert if not
    await pool.query(
      `INSERT INTO source_content_cache
       (id, source_url, source_type, content_hash, content, content_length, fetch_duration_ms,
        created_at, expires_at, hit_count, last_accessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $8)
       ON CONFLICT (source_url) DO UPDATE SET
         content = EXCLUDED.content,
         content_hash = EXCLUDED.content_hash,
         content_length = EXCLUDED.content_length,
         fetch_duration_ms = EXCLUDED.fetch_duration_ms,
         created_at = EXCLUDED.created_at,
         expires_at = EXCLUDED.expires_at,
         last_accessed_at = EXCLUDED.last_accessed_at`,
      [
        id,
        sourceUrl,
        sourceType,
        contentHash,
        content,
        content.length,
        fetchDurationMs,
        now.toISOString(),
        expiresAt.toISOString(),
      ]
    );
  } catch (err) {
    console.error('Failed to cache content:', err);
    // Silent fail - don't let caching break the app
  }
}

/**
 * Simple hash function for content (for change detection)
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get cache statistics for admin dashboard
 */
export interface ContentCacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  totalHits: number;
  bySourceType: Record<string, { count: number; sizeBytes: number; hits: number }>;
  avgFetchDurationMs: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  expiredCount: number;
}

export async function getContentCacheStats(): Promise<ContentCacheStats> {
  await initContentCacheTable();

  // Overall stats
  const overallResult = await pool.query(`
    SELECT
      COUNT(*) as total_entries,
      COALESCE(SUM(content_length), 0) as total_size,
      COALESCE(SUM(hit_count), 0) as total_hits,
      COALESCE(AVG(fetch_duration_ms), 0) as avg_fetch_duration,
      MIN(created_at) as oldest_entry,
      MAX(created_at) as newest_entry
    FROM source_content_cache
    WHERE expires_at > NOW()
  `);
  const overall = overallResult.rows[0];

  // By source type
  const byTypeResult = await pool.query(`
    SELECT
      source_type,
      COUNT(*) as count,
      COALESCE(SUM(content_length), 0) as size_bytes,
      COALESCE(SUM(hit_count), 0) as hits
    FROM source_content_cache
    WHERE expires_at > NOW()
    GROUP BY source_type
  `);
  const bySourceType: Record<string, { count: number; sizeBytes: number; hits: number }> = {};
  byTypeResult.rows.forEach((row: any) => {
    bySourceType[row.source_type] = {
      count: parseInt(row.count, 10),
      sizeBytes: parseInt(row.size_bytes, 10),
      hits: parseInt(row.hits, 10),
    };
  });

  // Expired count
  const expiredResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM source_content_cache
    WHERE expires_at <= NOW()
  `);
  const expiredCount = parseInt(expiredResult.rows[0].count, 10);

  return {
    totalEntries: parseInt(overall.total_entries, 10),
    totalSizeBytes: parseInt(overall.total_size, 10),
    totalHits: parseInt(overall.total_hits, 10),
    bySourceType,
    avgFetchDurationMs: Math.round(parseFloat(overall.avg_fetch_duration)),
    oldestEntry: overall.oldest_entry ? overall.oldest_entry.toISOString() : null,
    newestEntry: overall.newest_entry ? overall.newest_entry.toISOString() : null,
    expiredCount,
  };
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  await initContentCacheTable();
  const result = await pool.query(
    `DELETE FROM source_content_cache WHERE expires_at <= NOW() RETURNING id`
  );
  return result.rowCount || 0;
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
  await pool.query('DELETE FROM source_content_cache');
}
