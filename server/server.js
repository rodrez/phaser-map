/**
 * Main server entry point
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Game systems
import logger from './utils/logger.js';
import PlayerStateSystem from './game/systems/PlayerStateSystem.js';
import MovementSystem from './game/systems/MovementSystem.js';
import GeospatialAreaSystem from './game/systems/GeospatialAreaSystem.js';
import FlagSystem from './game/systems/FlagSystem.js';
import { connectRedis } from './config/redis.js';
import { initializeDatabase } from './config/postgres.js';

// Connection manager for WebSockets
import ConnectionManager from './network/ConnectionManager.js';

// Current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default port
const PORT = process.env.PORT || 3000;

/**
 * Initialize the server
 */
async function initializeServer() {
  try {
    logger.info('Starting server initialization...');
    
    // Connect to Redis if enabled
    await connectRedis();
    
    // Initialize PostgreSQL
    await initializeDatabase();
    
    // Create Express app
    const app = express();
    
    // Apply middlewares
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Set up static files
    app.use(express.static(`${dirname(__dirname)}/public`));
    
    // Basic health check route
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', message: 'Server is running' });
    });
    
    // Create HTTP server
    const server = createServer(app);
    
    // Create WebSocket server
    const wss = new WebSocketServer({ server });
    
    // Initialize the connection manager
    const connectionManager = new ConnectionManager(wss);
    
    // Set up game areas
    await GeospatialAreaSystem.setupInitialAreas();
    
    // Set up initial game flags
    await FlagSystem.setupInitialFlags();
    
    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      // Log the URL
      logger.info(`WebSocket URL: ws://localhost:${PORT}`);
      logger.info(`HTTP URL: http://localhost:${PORT}`);
    });
    
    // Handle server shutdown
    const gracefulShutdown = async () => {
      logger.info('Server shutdown initiated...');
      
      // Close the HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Terminate all WebSocket connections
      connectionManager.closeAllConnections();
      
      process.exit(0);
    };
    
    // Handle process termination
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    logger.info('Server initialization complete');
    
  } catch (error) {
    logger.error(`Server initialization failed: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
initializeServer(); 