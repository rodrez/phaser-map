import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration from environment variables
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;
export const useRedis = process.env.USE_REDIS === 'true';

// Create Redis client with configuration
export const redisClient = createClient({
  url: `redis://${REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : ''}${REDIS_HOST}:${REDIS_PORT}`,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff: 2^retries * 100ms (max 30s)
      const delay = Math.min(2 ** retries * 100, 30000);
      logger.info(`Redis reconnecting in ${delay}ms...`);
      return delay;
    }
  }
});

// Handle Redis events
redisClient.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis reconnecting');
});

redisClient.on('ready', () => {
  logger.info('Redis ready');
});

/**
 * Connect to Redis
 * @returns {Promise<void>}
 */
export async function connectRedis() {
  // Skip if Redis is disabled
  if (!useRedis) {
    logger.info('Redis is disabled, using in-memory storage only');
    return;
  }
  
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    
    // Ping Redis to ensure connection is working
    const pong = await redisClient.ping();
    logger.info('Redis connection successful', { pong });
  } catch (error) {
    logger.error('Redis connection failed', { error: error.message });
    // Don't throw an error - application should work without Redis
  }
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
export async function disconnectRedis() {
  if (useRedis && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Redis disconnect error', { error: error.message });
      // Force disconnect if quit fails
      redisClient.disconnect();
    }
  }
}

// Handle application termination
process.on('SIGINT', async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
  process.exit(0);
}); 