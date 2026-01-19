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

    // Analytics table for tracking Sweet Spot interactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_type VARCHAR(20) NOT NULL,
        awareness_level VARCHAR(20) NOT NULL,
        momentum_score INTEGER NOT NULL,
        is_sweet_spot BOOLEAN NOT NULL,
        niche VARCHAR(100),
        source_type VARCHAR(50),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
      )
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
  isSweetSpot: boolean;
  niche?: string;
  sourceType?: SourceType;
}

export async function trackAnalyticsEvent(event: AnalyticsEventInput): Promise<void> {
  await initDatabase();
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO analytics_events
     (id, event_type, item_id, item_type, awareness_level, momentum_score, is_sweet_spot, niche, source_type, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      event.eventType,
      event.itemId,
      event.itemType,
      event.awarenessLevel,
      event.momentumScore,
      event.isSweetSpot,
      event.niche || null,
      event.sourceType || null,
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
  sweetSpotRate: number;
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

  // Sweet spot rate
  const sweetSpotResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_sweet_spot = true) as sweet_spot_count,
      COUNT(*) as total
    FROM analytics_events
  `);
  const sweetSpotCount = parseInt(sweetSpotResult.rows[0].sweet_spot_count, 10);
  const sweetSpotTotal = parseInt(sweetSpotResult.rows[0].total, 10);
  const sweetSpotRate = sweetSpotTotal > 0 ? (sweetSpotCount / sweetSpotTotal) * 100 : 0;

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
      is_sweet_spot as "isSweetSpot", niche, source_type as "sourceType", timestamp
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
    sweetSpotRate,
    byEventType,
    recentEvents,
  };
}

export async function clearAllAnalytics(): Promise<void> {
  await pool.query('DELETE FROM analytics_events');
}
