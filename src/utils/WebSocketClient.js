import { logger, LogCategory } from './Logger';

/**
 * WebSocketClient - Manages WebSocket connections to the game server
 * This handles connection management, authentication, and message routing
 */
export class WebSocketClient {
  /**
   * Constructor for WebSocketClient
   * @param {Object} options - Configuration options
   * @param {string} options.serverUrl - URL of the WebSocket server
   * @param {string} options.playerId - Player ID for authentication
   * @param {string} options.username - Username for authentication
   * @param {Function} options.onAuthenticated - Callback when authentication is successful
   * @param {Function} options.onDisconnect - Callback when connection is closed
   */
  constructor(options = {}) {
    // Server URL, default to localhost for development
    this.serverUrl = options.serverUrl || 'ws://localhost:3000';
    
    // Player authentication details
    this.playerId = options.playerId || null;
    this.username = options.username || null;
    
    // Connection state
    this.isConnected = false;
    this.isAuthenticated = false;
    this.authenticating = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    
    // WebSocket instance
    this.socket = null;
    
    // Message queue for messages that need to be sent after authentication
    this.messageQueue = [];
    
    // Message handlers for different message types
    this.messageHandlers = new Map();
    
    // Callbacks
    this.onAuthenticatedCallback = options.onAuthenticated || (() => {});
    this.onDisconnectCallback = options.onDisconnect || (() => {});
    
    // Initialize default message handlers
    this.setupDefaultHandlers();
    
    logger.info(LogCategory.NETWORK, 'WebSocketClient initialized');
  }
  
  /**
   * Set up default message handlers
   */
  setupDefaultHandlers() {
    // Handle authentication response
    this.registerHandler('authenticated', (data) => {
      logger.info(LogCategory.AUTH, 'Authentication successful:', data.playerId);
      this.authenticating = false;
      this.isAuthenticated = true;
      this.playerData = data.playerData;
      
      // Process any queued messages
      this.processMessageQueue();
      
      // Call the authenticated callback
      this.onAuthenticatedCallback(data);
    });
    
    // Handle player movement updates
    this.registerHandler('player-moved', (data) => {
      logger.info(LogCategory.PLAYER, `Player ${data.playerId} moved to: ${data.position.lat}, ${data.position.lng}`);
      // This will be handled by the game scene
    });
    
    // Handle error messages
    this.registerHandler('error', (data) => {
      logger.error(LogCategory.NETWORK, 'Server error:', data.message);
      if (data.message === 'Already authenticated') {
        this.authenticating = false;
        this.isAuthenticated = true;
      }
    });
    
    // Handle move acknowledgment
    this.registerHandler('move-ack', (data) => {
      logger.debug(LogCategory.PLAYER, 'Move acknowledged:', data.position);
    });
    
    // Handle players list
    this.registerHandler('players-list', (data) => {
      logger.info(LogCategory.PLAYER, `Received ${data.players.length} players`);
    });
    
    // Handle chat messages
    this.registerHandler('chat-message', (data) => {
      logger.info(LogCategory.CHAT, `Chat from ${data.senderId}: ${data.message}`);
    });
    
    // Handle forced disconnection
    this.registerHandler('force-disconnect', (data) => {
      logger.warn(LogCategory.NETWORK, 'Forced disconnect:', data.reason);
      this.disconnect();
    });
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise<boolean>} - Success status
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        logger.info(LogCategory.NETWORK, `Connecting to server: ${this.serverUrl}`);
        
        // Create new WebSocket connection
        this.socket = new WebSocket(this.serverUrl);
        
        // Set up event handlers
        this.socket.onopen = () => {
          logger.info(LogCategory.NETWORK, 'WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          // Authenticate if we have credentials
          if (this.playerId && this.username) {
            this.authenticate(this.playerId, this.username);
          }
          
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          logger.warn(LogCategory.NETWORK, `WebSocket connection closed: ${event.code} ${event.reason}`);
          this.isConnected = false;
          this.isAuthenticated = false;
          
          // Call the disconnect callback
          this.onDisconnectCallback(event);
          
          // Attempt to reconnect if not explicitly closed by the client
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
          
          if (!this.isConnected) {
            resolve(false);
          }
        };
        
        this.socket.onerror = (error) => {
          logger.error(LogCategory.NETWORK, 'WebSocket error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        logger.error(LogCategory.NETWORK, 'Error connecting to WebSocket server:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Attempt to reconnect to the server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(LogCategory.NETWORK, 'Maximum reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
    
    logger.info(LogCategory.NETWORK, `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        logger.error(LogCategory.NETWORK, 'Reconnect attempt failed');
      });
    }, delay);
  }
  
  /**
   * Authenticate with the server
   * @param {string} playerId - Player ID (can be any unique identifier)
   * @param {string} username - Username to display
   * @param {string} token - Optional authentication token
   */
  authenticate(playerId, username, token = '') {
    if (!this.isConnected) {
      logger.error(LogCategory.AUTH, 'Cannot authenticate: not connected to server');
      return;
    }
    
    if (this.isAuthenticated || this.authenticating) {
      logger.warn(LogCategory.AUTH, 'Authentication already in progress or completed');
      return;
    }
    
    this.authenticating = true;
    this.playerId = playerId;
    this.username = username;
    
    logger.info(LogCategory.AUTH, `Authenticating as: ${username} (${playerId})`);
    
    this.send('authenticate', {
      playerId,
      username,
      token
    });
  }
  
  /**
   * Send a message to the server
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {boolean} - Success status
   */
  send(type, data) {
    // If not connected, queue the message for later sending
    if (!this.isConnected) {
      logger.warn(LogCategory.NETWORK, `Cannot send message: not connected. Queueing ${type} message.`);
      this.messageQueue.push({ type, data });
      return false;
    }
    
    // If not authenticated and message requires authentication, queue it
    if (!this.isAuthenticated && type !== 'authenticate') {
      logger.warn(LogCategory.NETWORK, `Not yet authenticated. Queueing ${type} message.`);
      this.messageQueue.push({ type, data });
      return false;
    }
    
    try {
      const message = JSON.stringify({ type, data });
      this.socket.send(message);
      return true;
    } catch (error) {
      logger.error(LogCategory.NETWORK, `Error sending message: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Process any queued messages after authentication
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    logger.info(LogCategory.NETWORK, `Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const { type, data } = this.messageQueue.shift();
      this.send(type, data);
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {string} data - Message data as a string
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (!message.type || !message.data) {
        logger.error(LogCategory.NETWORK, 'Invalid message format:', message);
        return;
      }
      
      // Call the handler for this message type
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      } else {
        logger.warn(LogCategory.NETWORK, `No handler for message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(LogCategory.NETWORK, `Error handling message: ${error.message}`);
    }
  }
  
  /**
   * Register a handler for a specific message type
   * @param {string} type - Message type
   * @param {Function} handler - Handler function
   */
  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }
  
  /**
   * Unregister a handler for a specific message type
   * @param {string} type - Message type
   */
  unregisterHandler(type) {
    this.messageHandlers.delete(type);
  }
  
  /**
   * Send a player movement update
   * @param {Object} position - Position object (lat, lng)
   * @param {string} currentArea - Current area ID (optional)
   * @returns {boolean} - Success status
   */
  sendPlayerMove(position, currentArea = null) {
    const moveData = {
      position: {
        lat: position.lat,
        lng: position.lng
      }
    };
    
    // Add current area if provided
    if (currentArea) {
      moveData.position.currentArea = currentArea;
    }
    
    return this.send('player-move', moveData);
  }
  
  /**
   * Request players in an area
   * @param {string} areaId - Area ID
   * @returns {boolean} - Success status
   */
  getPlayersInArea(areaId) {
    return this.send('get-players', { areaId });
  }
  
  /**
   * Request players in a bounding box
   * @param {Object} bounds - Bounding box (minLat, maxLat, minLng, maxLng)
   * @returns {boolean} - Success status
   */
  getPlayersInBounds(bounds) {
    return this.send('get-players', { bounds });
  }
  
  /**
   * Send a chat message
   * @param {string} message - Message text
   * @param {string} scope - Message scope (global, area, private)
   * @param {string} targetId - Target player ID for private messages
   * @returns {boolean} - Success status
   */
  sendChatMessage(message, scope = 'area', targetId = null) {
    const chatData = {
      message,
      scope
    };
    
    // Add target ID for private messages
    if (scope === 'private' && targetId) {
      chatData.targetId = targetId;
    }
    
    return this.send('chat-message', chatData);
  }
  
  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket && this.isConnected) {
      logger.info(LogCategory.NETWORK, 'Disconnecting from server');
      this.socket.close(1000, 'Client disconnect');
      this.isConnected = false;
      this.isAuthenticated = false;
    }
  }
}

// Export a singleton instance for global use
export default new WebSocketClient(); 