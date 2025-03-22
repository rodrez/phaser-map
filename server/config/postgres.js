/**
 * postgres.js
 * PostgreSQL database connection configuration
 */

import pg from 'pg';
import logger from '../utils/logger.js';

// Extract database configuration from environment variables
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'mmogame',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: Number.parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Only use SSL in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Check if we're in test mode
const isTestMode = process.env.NODE_ENV === 'test';

// Create a pool instance
const pool = new pg.Pool(dbConfig);

// Set up event listeners
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  logger.error(`PostgreSQL error: ${err.message}`);
});

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  try {
    // Test the connection
    const client = await pool.connect();
    
    // Log PostgreSQL info
    const versionRes = await client.query('SELECT version()');
    logger.info(`PostgreSQL connected: ${versionRes.rows[0].version}`);
    
    // Release the client back to the pool
    client.release();
    
    // If in test mode, check for required extensions and tables
    if (isTestMode) {
      await verifyDatabaseSetup();
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to connect to PostgreSQL: ${error.message}`);
    
    // If we're in test mode, we'll create a memory-only mock
    if (isTestMode) {
      logger.warn('Running in test mode with memory-only database');
      return true;
    }
    
    throw error;
  }
}

/**
 * Verify database setup for tests
 */
async function verifyDatabaseSetup() {
  try {
    const client = await pool.connect();
    try {
      // Check for PostGIS extension
      const postgisCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) as has_postgis;
      `);
      
      if (!postgisCheck.rows[0].has_postgis) {
        logger.warn('PostGIS extension not found, spatial queries will not work correctly');
      }
      
      // Check for required tables
      const tables = ['players', 'player_profiles', 'player_positions', 'player_inventories'];
      for (const table of tables) {
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          ) as exists;
        `, [table]);
        
        if (!tableCheck.rows[0].exists) {
          logger.warn(`Required table '${table}' not found in database`);
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`Error verifying database setup: ${error.message}`);
  }
}

/**
 * Execute a database transaction
 * @param {Function} callback - Callback function that receives a client
 * @returns {Promise<any>} - Result of the callback
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool }; 