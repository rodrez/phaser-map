/**
 * Client integration for the geospatial MMO system
 * This class provides methods for integrating a Phaser client with the geospatial server
 */
export class GeospatialClient {
  /**
   * Create a new GeospatialClient
   * @param {Object} socketIo - The socket.io client library
   * @param {string} serverUrl - The server URL (default: http://localhost:3000)
   */
  constructor(socketIo, serverUrl = 'http://localhost:3000') {
    this.io = socketIo;
    this.serverUrl = serverUrl;
    this.socket = null;
    this.authenticated = false;
    this.playerId = null;
    this.username = null;
    
    // Callback maps
    this.callbacks = {
      playerMoved: new Set(),
      playerDisconnected: new Set(),
      areaData: new Set(),
      flagPlaced: new Set(),
      flagRemoved: new Set(),
      movementRejected: new Set(),
      areaError: new Set(),
      flagError: new Set(),
      authError: new Set()
    };
    
    // Local caches for game state
    this.players = new Map(); // playerId -> player data
    this.flags = new Map(); // flagId -> flag data
    this.areas = new Map(); // areaId -> area data
    
    // Current viewport (for optimizing updates)
    this.currentViewport = null;
  }
  
  /**
   * Connect to the server
   * @returns {Promise} - Promise that resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = this.io(this.serverUrl);
        
        this.socket.on('connect', () => {
          console.log('Connected to geospatial server');
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });
        
        this.setupEventHandlers();
      } catch (error) {
        console.error('Failed to connect:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Setup all socket event handlers
   * @private
   */
  setupEventHandlers() {
    // Authentication responses
    this.socket.on('authenticated', (data) => {
      if (data.success) {
        this.authenticated = true;
        this.playerId = data.player.id;
        this.players.set(this.playerId, data.player);
        console.log('Authentication successful', data.player);
      }
    });
    
    this.socket.on('auth-error', (data) => {
      console.error('Authentication error:', data.message);
      this.triggerCallbacks('authError', data);
    });
    
    // Player events
    this.socket.on('player-moved', (data) => {
      // Update local player cache
      const player = this.players.get(data.playerId) || {};
      this.players.set(data.playerId, {
        ...player,
        position: data.position,
        direction: data.direction,
        lastUpdate: data.timestamp
      });
      
      this.triggerCallbacks('playerMoved', data);
    });
    
    this.socket.on('player-disconnected', (data) => {
      // Remove from local cache
      this.players.delete(data.playerId);
      this.triggerCallbacks('playerDisconnected', data);
    });
    
    // Area and flag events
    this.socket.on('area-data', (data) => {
      // Update local caches
      if (data.areas) {
        for (const area of data.areas) {
          this.areas.set(area.id, area);
        }
      }
      
      if (data.flags) {
        for (const flag of data.flags) {
          this.flags.set(flag.id, flag);
        }
      }
      
      if (data.players) {
        for (const player of data.players) {
          if (player.id !== this.playerId) {
            this.players.set(player.id, player);
          }
        }
      }
      
      this.triggerCallbacks('areaData', data);
    });
    
    this.socket.on('flag-placed', (data) => {
      // Add to local cache
      this.flags.set(data.flag.id, data.flag);
      this.triggerCallbacks('flagPlaced', data);
    });
    
    this.socket.on('flag-removed', (data) => {
      // Remove from local cache
      this.flags.delete(data.flagId);
      this.triggerCallbacks('flagRemoved', data);
    });
    
    // Error events
    this.socket.on('movement-rejected', (data) => {
      console.warn('Movement rejected:', data.error);
      this.triggerCallbacks('movementRejected', data);
    });
    
    this.socket.on('area-error', (data) => {
      console.error('Area error:', data.message);
      this.triggerCallbacks('areaError', data);
    });
    
    this.socket.on('flag-error', (data) => {
      console.error('Flag error:', data.message);
      this.triggerCallbacks('flagError', data);
    });
  }
  
  /**
   * Authenticate with the server
   * @param {string} playerId - The player ID
   * @param {string} username - The player username
   * @returns {Promise} - Promise that resolves when authenticated
   */
  authenticate(playerId, username) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      // Set up one-time handlers for this authentication attempt
      const authSuccessHandler = (data) => {
        this.socket.off('authenticated', authSuccessHandler);
        this.socket.off('auth-error', authErrorHandler);
        if (data.success) {
          resolve(data.player);
        } else {
          reject(new Error('Authentication failed'));
        }
      };
      
      const authErrorHandler = (data) => {
        this.socket.off('authenticated', authSuccessHandler);
        this.socket.off('auth-error', authErrorHandler);
        reject(new Error(data.message));
      };
      
      this.socket.once('authenticated', authSuccessHandler);
      this.socket.once('auth-error', authErrorHandler);
      
      // Send authentication request
      this.socket.emit('authenticate', { playerId, username });
    });
  }
  
  /**
   * Request data for the area around the player
   * @param {Object} viewport - The viewport bounds {minLat, minLng, maxLat, maxLng}
   */
  requestAreaData(viewport) {
    if (!this.socket || !this.authenticated) {
      console.error('Not connected or not authenticated');
      return;
    }
    
    this.currentViewport = viewport;
    this.socket.emit('request-area-data', viewport);
  }
  
  /**
   * Update player movement
   * @param {Object} position - The player position {lat, lng}
   * @param {number} direction - The player direction in degrees
   */
  updateMovement(position, direction) {
    if (!this.socket || !this.authenticated) {
      console.error('Not connected or not authenticated');
      return;
    }
    
    this.socket.emit('player-move', {
      position,
      direction,
      timestamp: Date.now()
    });
    
    // Optimistically update local player data
    const player = this.players.get(this.playerId) || {};
    this.players.set(this.playerId, {
      ...player,
      position,
      direction,
      lastUpdate: Date.now()
    });
  }
  
  /**
   * Place a flag at the specified position
   * @param {Object} position - The flag position {lat, lng}
   * @param {string} name - The flag name (optional)
   * @returns {Promise} - Promise that resolves when flag is placed
   */
  placeFlag(position, name = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.authenticated) {
        reject(new Error('Not connected or not authenticated'));
        return;
      }
      
      // Set up one-time handlers for this flag placement attempt
      const successHandler = (data) => {
        this.socket.off('flag-placed-success', successHandler);
        this.socket.off('flag-error', errorHandler);
        resolve(data);
      };
      
      const errorHandler = (data) => {
        this.socket.off('flag-placed-success', successHandler);
        this.socket.off('flag-error', errorHandler);
        reject(new Error(data.message));
      };
      
      this.socket.once('flag-placed-success', successHandler);
      this.socket.once('flag-error', errorHandler);
      
      // Send flag placement request
      this.socket.emit('place-flag', { position, name });
    });
  }
  
  /**
   * Register a callback for a specific event
   * @param {string} event - The event name
   * @param {Function} callback - The callback function
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].add(callback);
    } else {
      console.warn(`Unknown event: ${event}`);
    }
  }
  
  /**
   * Remove a callback for a specific event
   * @param {string} event - The event name
   * @param {Function} callback - The callback function to remove
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].delete(callback);
    }
  }
  
  /**
   * Trigger all callbacks for an event
   * @private
   * @param {string} event - The event name
   * @param {*} data - The event data
   */
  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      for (const callback of this.callbacks[event]) {
        callback(data);
      }
    }
  }
  
  /**
   * Get all known players
   * @returns {Array} - Array of player objects
   */
  getPlayers() {
    return Array.from(this.players.values());
  }
  
  /**
   * Get all known flags
   * @returns {Array} - Array of flag objects
   */
  getFlags() {
    return Array.from(this.flags.values());
  }
  
  /**
   * Get all known areas
   * @returns {Array} - Array of area objects
   */
  getAreas() {
    return Array.from(this.areas.values());
  }
  
  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.authenticated = false;
      this.playerId = null;
      this.username = null;
      this.players.clear();
      this.flags.clear();
      this.areas.clear();
    }
  }
}

/**
 * Example usage:
 * 
 * import { io } from 'socket.io-client';
 * import { GeospatialClient } from './geospatial-client-integration.js';
 * 
 * // In your Phaser game:
 * const client = new GeospatialClient(io, 'http://localhost:3000');
 * 
 * // Connect and authenticate
 * await client.connect();
 * await client.authenticate('player123', 'PlayerName');
 * 
 * // Request initial area data
 * client.requestAreaData({
 *   minLat: 0.0,
 *   minLng: 0.0,
 *   maxLat: 0.1,
 *   maxLng: 0.1
 * });
 * 
 * // Listen for player movements
 * client.on('playerMoved', (data) => {
 *   // Update player sprite position
 *   const sprite = playerSprites.get(data.playerId);
 *   if (sprite) {
 *     sprite.setPosition(
 *       latLngToWorldX(data.position.lat),
 *       latLngToWorldY(data.position.lng)
 *     );
 *     sprite.setRotation(data.direction);
 *   }
 * });
 * 
 * // Update player movement (e.g. in your update loop)
 * client.updateMovement(
 *   { lat: player.lat, lng: player.lng },
 *   player.direction
 * );
 */ 