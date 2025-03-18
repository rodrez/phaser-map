import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database singleton
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize database connection
 */
export async function setupDatabase() {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create connection pool
  pool = new Pool({
    connectionString,
    max: 10, // Maximum connections in the pool
    idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
  });

  // Test connection
  try {
    const client = await pool.connect();
    client.release();
    console.log('Successfully connected to PostgreSQL database');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }

  // Initialize Drizzle ORM
  db = drizzle(pool, { schema });

  return db;
}

/**
 * Get database instance
 * @throws Error if database is not initialized
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Re-export schema
 */
export { schema }; 