/**
 * ConnectionManager.js
 * Manages WebSocket connections and message handlers
 */

import logger from '../utils/logger.js';
import PlayerStateSystem from '../game/systems/PlayerStateSystem.js';
import { v4 as uuidv4 } from 'uuid';

class ConnectionManager {
  constructor(wss) {
    this.wss = wss;
    this.connections = new Map(); // socketId -> connection info
    this.playerSockets = new Map(); // playerId -> socketId
    
    this.setupWebSocketServer();
    
    logger.info('ConnectionManager initialized');
  }
  
  /**
   * Set up WebSocket server event handlers
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      // Generate a unique connection ID
      const connectionId = uuidv4();
      ws.id = connectionId;
      
      // Store connection info
      this.connections.set(connectionId, {
        ws,
        ip: req.socket.remoteAddress,
        connectedAt: Date.now(),
        isAuthenticated: false,
        playerId: null
      });
      
      logger.info(`New WebSocket connection: ${connectionId}`);
      
      // Set up message handling
      ws.on('message', (message) => this.handleMessage(ws, message));
      
      // Handle disconnection
      ws.on('close', () => this.handleDisconnect(ws));
      
      // Send welcome message
      this.sendToClient(ws, 'connection', {
        id: connectionId,
        message: 'Connected to game server',
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Buffer|ArrayBuffer|Buffer[]} data - The raw message data
   */
  handleMessage(ws, data) {
    try {
      // Parse the message
      const message = JSON.parse(data.toString());
      
      // Check if the message has a type
      if (!message.type) {
        this.sendError(ws, 'Invalid message format: missing type');
        return;
      }
      
      // Route message to appropriate handler
      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(ws, message.data);
          break;
          
        case 'player-move':
          this.handlePlayerMove(ws, message.data);
          break;
          
        case 'get-players':
          this.handleGetPlayers(ws, message.data);
          break;
          
        case 'chat-message':
          this.handleChatMessage(ws, message.data);
          break;
          
        case 'request-flags':
          this.handleRequestFlags(ws, message.data);
          break;
          
        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message: ${error.message}`);
      this.sendError(ws, 'Invalid message format');
    }
  }
  
  /**
   * Handle player authentication
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Object} data - The authentication data
   */
  async handleAuthentication(ws, data) {
    try {
      const { playerId, username, token } = data;
      
      if (!playerId) {
        this.sendError(ws, 'Missing player ID');
        return;
      }
      
      // TODO: Verify token with a proper auth system
      
      // Get the connection info
      const connection = this.connections.get(ws.id);
      
      // Check if already authenticated
      if (connection.isAuthenticated) {
        this.sendError(ws, 'Already authenticated');
        return;
      }
      
      // Get or create player state
      const existingPlayer = await PlayerStateSystem.getPlayer(playerId);
      
      if (existingPlayer) {
        // If player exists, check if they're already connected
        if (this.playerSockets.has(playerId)) {
          // Get the existing socket
          const existingSocketId = this.playerSockets.get(playerId);
          const existingConnection = this.connections.get(existingSocketId);
          
          if (existingConnection) {
            // Force disconnect the existing connection
            this.sendToClient(existingConnection.ws, 'force-disconnect', { 
              reason: 'Account logged in elsewhere' 
            });
            
            existingConnection.ws.close();
            
            logger.info(`Forced disconnect of existing connection for player ${playerId}`);
          }
        }
        
        // Update the player's session
        await PlayerStateSystem.updatePlayer(playerId, {
          lastActive: Date.now()
        });
      } else {
        // Register new player
        await PlayerStateSystem.registerPlayer(playerId, {
          isNewPlayer: true,
          username: username || `Player-${playerId.substring(0, 6)}`,
          profile: { displayName: username || `Player-${playerId.substring(0, 6)}` },
          position: { lat: 0, lng: 0, currentArea: 'starting-area' },
          sessionId: ws.id
        });
      }
      
      // Update connection info
      connection.isAuthenticated = true;
      connection.playerId = playerId;
      this.connections.set(ws.id, connection);
      
      // Map player ID to socket
      this.playerSockets.set(playerId, ws.id);
      
      // Send authentication success response
      this.sendToClient(ws, 'authenticated', {
        playerId,
        playerData: await PlayerStateSystem.getPlayer(playerId)
      });
      
      logger.info(`Player authenticated: ${playerId} (socket: ${ws.id})`);
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      this.sendError(ws, 'Authentication failed');
    }
  }
  
  /**
   * Handle player movement updates
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Object} data - The movement data
   */
  async handlePlayerMove(ws, data) {
    try {
      const connection = this.connections.get(ws.id);
      
      // Check if authenticated
      if (!connection.isAuthenticated) {
        this.sendError(ws, 'Not authenticated');
        return;
      }
      
      const { position } = data;
      const playerId = connection.playerId;
      
      // Update player position
      await PlayerStateSystem.updatePlayerPosition(playerId, position);
      
      // Send acknowledgment
      this.sendToClient(ws, 'move-ack', { 
        position,
        timestamp: Date.now()
      });
      
      // Notify nearby players of the movement
      this.broadcastPlayerMove(playerId, position);
    } catch (error) {
      logger.error(`Error handling player move: ${error.message}`);
      this.sendError(ws, 'Failed to process movement');
    }
  }
  
  /**
   * Handle request for players in area
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Object} data - The query data
   */
  async handleGetPlayers(ws, data) {
    try {
      const connection = this.connections.get(ws.id);
      
      // Check if authenticated
      if (!connection.isAuthenticated) {
        this.sendError(ws, 'Not authenticated');
        return;
      }
      
      const { areaId, bounds } = data;
      const playerId = connection.playerId;
      
      let players;
      
      // Get players either by area ID or by bounding box
      if (areaId) {
        players = await PlayerStateSystem.getPlayersInArea(areaId);
      } else if (bounds) {
        players = await PlayerStateSystem.getPlayersInBounds(bounds);
      } else {
        this.sendError(ws, 'Missing area ID or bounds');
        return;
      }
      
      // Filter out the requesting player
      const filteredPlayers = players.filter(p => p.id !== playerId);
      
      // Send player data
      this.sendToClient(ws, 'players-list', {
        players: filteredPlayers,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Error getting players: ${error.message}`);
      this.sendError(ws, 'Failed to get players');
    }
  }
  
  /**
   * Handle chat messages
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Object} data - The chat message data
   */
  handleChatMessage(ws, data) {
    try {
      const connection = this.connections.get(ws.id);
      
      // Check if authenticated
      if (!connection.isAuthenticated) {
        this.sendError(ws, 'Not authenticated');
        return;
      }
      
      const { message, scope, targetId } = data;
      const playerId = connection.playerId;
      
      // Validate message
      if (!message || message.trim().length === 0) {
        this.sendError(ws, 'Empty message');
        return;
      }
      
      const chatMessage = {
        id: uuidv4(),
        senderId: playerId,
        message,
        timestamp: Date.now()
      };
      
      // Handle different chat scopes
      switch (scope) {
        case 'global':
          // Send to all connected players
          this.broadcastToAll('chat-message', chatMessage);
          break;
          
        case 'area':
          // Send to players in the same area
          this.broadcastToArea(playerId, 'chat-message', chatMessage);
          break;
          
        case 'private':
          // Send to a specific player
          if (!targetId) {
            this.sendError(ws, 'Missing target ID for private message');
            return;
          }
          this.sendToPlayer(targetId, 'chat-message', {
            ...chatMessage,
            isPrivate: true
          });
          // Also send confirmation back to sender
          this.sendToClient(ws, 'chat-sent', {
            messageId: chatMessage.id,
            targetId,
            timestamp: Date.now()
          });
          break;
          
        default:
          this.sendError(ws, `Unknown chat scope: ${scope}`);
      }
    } catch (error) {
      logger.error(`Error handling chat message: ${error.message}`);
      this.sendError(ws, 'Failed to send chat message');
    }
  }
  
  /**
   * Handle WebSocket disconnection
   * @param {WebSocket} ws - The WebSocket connection
   */
  async handleDisconnect(ws) {
    try {
      const connectionId = ws.id;
      const connection = this.connections.get(connectionId);
      
      logger.info(`WebSocket disconnected: ${connectionId}`);
      
      if (connection?.isAuthenticated) {
        const playerId = connection.playerId;
        
        // Remove player-to-socket mapping
        this.playerSockets.delete(playerId);
        
        // Update player state
        await PlayerStateSystem.updatePlayer(playerId, {
          lastActive: Date.now(),
          isOnline: false
        });
        
        // Notify other players about the disconnection
        this.broadcastToArea(playerId, 'player-disconnected', {
          playerId,
          timestamp: Date.now()
        });
        
        logger.info(`Player disconnected: ${playerId}`);
      }
      
      // Remove connection from map
      this.connections.delete(connectionId);
    } catch (error) {
      logger.error(`Error handling disconnect: ${error.message}`);
    }
  }
  
  /**
   * Send a message to a specific client
   * @param {WebSocket} ws - The WebSocket connection
   * @param {string} type - The message type
   * @param {Object} data - The message data
   */
  sendToClient(ws, type, data) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type, data }));
      }
    } catch (error) {
      logger.error(`Error sending message to client: ${error.message}`);
    }
  }
  
  /**
   * Send an error message to a client
   * @param {WebSocket} ws - The WebSocket connection
   * @param {string} message - The error message
   */
  sendError(ws, message) {
    this.sendToClient(ws, 'error', { message });
  }
  
  /**
   * Send a message to a specific player
   * @param {string} playerId - The player ID
   * @param {string} type - The message type
   * @param {Object} data - The message data
   */
  sendToPlayer(playerId, type, data) {
    const socketId = this.playerSockets.get(playerId);
    if (socketId) {
      const connection = this.connections.get(socketId);
      if (connection) {
        this.sendToClient(connection.ws, type, data);
      }
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * @param {string} type - The message type
   * @param {Object} data - The message data
   */
  broadcastToAll(type, data) {
    for (const connection of this.connections.values()) {
      if (connection.isAuthenticated) {
        this.sendToClient(connection.ws, type, data);
      }
    }
  }
  
  /**
   * Broadcast a player's movement to nearby players
   * @param {string} playerId - The player ID
   * @param {Object} position - The player's position
   */
  async broadcastPlayerMove(playerId, position) {
    try {
      // Get player data
      const player = await PlayerStateSystem.getPlayer(playerId);
      if (!player) return;
      
      // Create movement update message
      const moveUpdate = {
        playerId,
        position,
        timestamp: Date.now()
      };
      
      // Get nearby players
      let nearbyPlayers;
      
      if (position.currentArea) {
        nearbyPlayers = await PlayerStateSystem.getPlayersInArea(position.currentArea);
      } else {
        // Create a bounding box around the player's position
        const bounds = {
          minLat: position.lat - 0.05,
          maxLat: position.lat + 0.05,
          minLng: position.lng - 0.05,
          maxLng: position.lng + 0.05
        };
        
        nearbyPlayers = await PlayerStateSystem.getPlayersInBounds(bounds);
      }
      
      // Send to all nearby players except the moving player
      for (const nearbyPlayer of nearbyPlayers) {
        if (nearbyPlayer.id !== playerId) {
          this.sendToPlayer(nearbyPlayer.id, 'player-moved', moveUpdate);
        }
      }
    } catch (error) {
      logger.error(`Error broadcasting player move: ${error.message}`);
    }
  }
  
  /**
   * Broadcast a message to players in the same area as a specific player
   * @param {string} playerId - The player ID
   * @param {string} type - The message type
   * @param {Object} data - The message data
   */
  async broadcastToArea(playerId, type, data) {
    try {
      // Get player data
      const player = await PlayerStateSystem.getPlayer(playerId);
      if (!player?.position?.currentArea) return;
      
      // Get players in the same area
      const areaPlayers = await PlayerStateSystem.getPlayersInArea(player.position.currentArea);
      
      // Send to all players in the area
      for (const areaPlayer of areaPlayers) {
        this.sendToPlayer(areaPlayer.id, type, data);
      }
    } catch (error) {
      logger.error(`Error broadcasting to area: ${error.message}`);
    }
  }
  
  /**
   * Close all WebSocket connections
   */
  closeAllConnections() {
    for (const connection of this.connections.values()) {
      try {
        connection.ws.close();
      } catch (error) {
        logger.error(`Error closing connection: ${error.message}`);
      }
    }
    
    this.connections.clear();
    this.playerSockets.clear();
    
    logger.info('All connections closed');
  }

  /**
   * Handle flag request messages
   * @param {WebSocket} ws - The WebSocket connection
   * @param {Object} data - The message data
   */
  handleRequestFlags(ws, data) {
    try {
      // Get the player's connection info
      const connection = this.connections.get(ws.id);
      if (!connection?.playerId) {
        this.sendError(ws, 'Not authenticated');
        return;
      }

      // For now, return an empty flag list
      // TODO: Implement flag system or inject it as a dependency
      const flags = [];

      // Send flags back to the client
      this.sendToClient(ws, 'flags-list', { flags });
      
    } catch (error) {
      logger.error(`Error handling flag request: ${error.message}`);
      this.sendError(ws, 'Error processing flag request');
    }
  }
}

export default ConnectionManager; 