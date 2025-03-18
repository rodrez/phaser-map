import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageType, NetworkMessage, GeoCoordinates, Vector2 } from 'shared';
import { createWorldManager, WorldType } from './game/worldManager.js';

// Load environment variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up server
const fastify = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

// Register plugins
await fastify.register(fastifyCors, {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
});

await fastify.register(fastifyWebsocket);

// Initialize world manager with config
const worldManager = createWorldManager({
  // Default center coordinates (San Francisco)
  lat: 37.7749,
  lng: -122.4194,
  boundaryRadius: 1000, // 1km play area
  territoryRadius: 100, // 100m territory radius
  cellSize: 50 // 50m grid cells for overworld
});

// Create some sample dungeon entrances
worldManager.registerDungeonEntrance({
  id: 'ancient-ruins',
  name: 'Ancient Ruins',
  geoPosition: { lat: 37.7749, lng: -122.4194 },
  entryPosition: { x: 100, y: 100 },
  interactionRadius: 20, // 20 meters
  maxPlayers: 10
});

worldManager.registerDungeonEntrance({
  id: 'haunted-forest',
  name: 'Haunted Forest',
  geoPosition: { lat: 37.7800, lng: -122.4150 },
  entryPosition: { x: 100, y: 100 },
  interactionRadius: 20, // 20 meters
  maxPlayers: 10
});

// Health check route
fastify.get('/api/health', async () => {
  return { 
    status: 'ok', 
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
});

// Map configuration endpoint
fastify.get('/api/map/config', async () => {
  return {
    bounds: worldManager.overworldMap.getBounds(),
    dungeonEntrances: worldManager.getDungeonEntrances()
  };
});

// Game loop variables
let gameLoopInterval: NodeJS.Timeout | null = null;
const TICK_RATE = parseInt(process.env.TICK_RATE || '20', 10);
const TICK_INTERVAL = 1000 / TICK_RATE;

// Start game loop
function startGameLoop(): void {
  if (gameLoopInterval) return;
  
  fastify.log.info(`Starting game loop with tick rate: ${TICK_RATE} ticks per second`);
  
  let lastTick = Date.now();
  
  gameLoopInterval = setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastTick) / 1000; // in seconds
    lastTick = now;
    
    // Update game state
    updateGame(deltaTime);
  }, TICK_INTERVAL);
}

// Stop game loop
function stopGameLoop(): void {
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    gameLoopInterval = null;
    fastify.log.info('Game loop stopped');
  }
}

// Update game state
function updateGame(deltaTime: number): void {
  // Process game state updates
  // This is a minimal version, you'll expand this later
}

// Send message to a client
function sendToClient(socket: WebSocket, message: any): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

// WebSocket connection handler
fastify.register(async function(fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection.socket;
    const playerId = Math.random().toString(36).substring(2, 15);
    
    fastify.log.info(`Client connected: ${playerId}`);
    
    // Set up WebSocket events
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Process different message types
        switch (message.type) {
          case MessageType.JOIN_GAME: {
            const joinData = message.data;
            
            fastify.log.info(`Player ${joinData.username} (${playerId}) joined the game`);
            
            // Add player to the world manager
            const player = worldManager.addPlayer(
              playerId,
              joinData.username,
              socket
            );
            
            // Send join confirmation with initial position
            sendToClient(socket, {
              type: MessageType.JOIN_GAME,
              data: {
                playerId,
                position: player.location.geoPosition,
                worldType: player.location.worldType,
                dungeonEntrances: worldManager.getDungeonEntrances(),
                message: `Welcome to the game, ${joinData.username}!`
              },
              timestamp: Date.now()
            });
            
            break;
          }
          
          case MessageType.PLAYER_MOVEMENT: {
            const moveData = message.data;
            const player = worldManager.getPlayer(playerId);
            
            if (!player) {
              fastify.log.warn(`Movement message from unknown player: ${playerId}`);
              break;
            }
            
            // Determine which coordinate system to use based on the world type
            if (player.location.worldType === WorldType.OVERWORLD) {
              // Get lat/lng from the message
              const lat = moveData.lat ?? moveData.position?.lat;
              const lng = moveData.lng ?? moveData.position?.lng;
              
              if (lat === undefined || lng === undefined) {
                fastify.log.warn(`Invalid position data from player ${playerId}`);
                break;
              }
              
              // Update player position in the overworld
              worldManager.updatePlayerPosition(playerId, { lat, lng });
              
              // Broadcast to nearby players
              worldManager.broadcastToNearby(playerId, {
                type: MessageType.PLAYER_MOVEMENT,
                data: {
                  playerId,
                  lat,
                  lng,
                  velocity: moveData.velocity,
                  direction: moveData.direction,
                  isMoving: moveData.isMoving
                },
                timestamp: Date.now()
              }, 100); // 100 meters broadcast radius
            } 
            else if (player.location.worldType === WorldType.DUNGEON) {
              // Get x/y from the message
              const x = moveData.position?.x;
              const y = moveData.position?.y;
              
              if (x === undefined || y === undefined) {
                fastify.log.warn(`Invalid dungeon position data from player ${playerId}`);
                break;
              }
              
              // Update player position in the dungeon
              worldManager.updatePlayerPosition(playerId, { x, y });
              
              // Broadcast to nearby players in the same dungeon
              worldManager.broadcastToNearby(playerId, {
                type: MessageType.PLAYER_MOVEMENT,
                data: {
                  playerId,
                  position: { x, y },
                  velocity: moveData.velocity,
                  direction: moveData.direction,
                  isMoving: moveData.isMoving
                },
                timestamp: Date.now()
              }, 200); // 200 pixel broadcast radius
            }
            
            break;
          }
          
          case MessageType.PLAYER_CHAT: {
            // Broadcast chat message to all nearby players
            worldManager.broadcastToNearby(playerId, {
              type: MessageType.PLAYER_CHAT,
              data: {
                ...message.data,
                playerId
              },
              timestamp: Date.now()
            }, 500, true); // 500 unit radius, include self
            
            break;
          }
          
          // Handle dungeon entrance/exit
          case MessageType.ENTITY_INTERACT: {
            const interactData = message.data;
            
            if (interactData.type === 'dungeon_entrance') {
              const dungeonId = interactData.id;
              
              // Attempt to enter the dungeon
              const success = worldManager.enterDungeon(playerId, dungeonId);
              
              if (!success) {
                // Send error to client
                sendToClient(socket, {
                  type: MessageType.ERROR,
                  data: {
                    code: 'DUNGEON_ENTRY_FAILED',
                    message: 'Failed to enter dungeon. It may be full or you are not at the entrance.'
                  },
                  timestamp: Date.now()
                });
              }
            } 
            else if (interactData.type === 'dungeon_exit') {
              // Attempt to exit the dungeon
              const success = worldManager.exitDungeon(playerId);
              
              if (!success) {
                // Send error to client
                sendToClient(socket, {
                  type: MessageType.ERROR,
                  data: {
                    code: 'DUNGEON_EXIT_FAILED',
                    message: 'Failed to exit dungeon. You must be at an exit point.'
                  },
                  timestamp: Date.now()
                });
              }
            }
            
            break;
          }
          
          default:
            fastify.log.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        fastify.log.error(`Error processing message: ${error}`);
      }
    });
    
    // Handle disconnection
    socket.on('close', () => {
      fastify.log.info(`Client disconnected: ${playerId}`);
      
      // Get player's last known position and world for broadcasting
      const player = worldManager.getPlayer(playerId);
      
      if (player) {
        // Broadcast to nearby players in same world
        worldManager.broadcastToNearby(playerId, {
          type: MessageType.ENTITY_REMOVE,
          data: {
            id: playerId
          },
          timestamp: Date.now()
        }, 200);
      }
      
      // Remove player from world manager
      worldManager.removePlayer(playerId);
    });
  });
});

// Start the server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info(`Server running on port ${PORT}`);
  fastify.log.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Start game loop
  startGameLoop();
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Handle graceful shutdown
function handleShutdown() {
  fastify.log.info('Shutting down server...');
  
  // Stop game loop
  stopGameLoop();
  
  fastify.close().then(() => {
    fastify.log.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown); 