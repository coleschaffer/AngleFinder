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
