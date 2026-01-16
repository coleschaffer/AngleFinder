import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize the feedback table if it doesn't exist
export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        user_agent TEXT
      )
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
