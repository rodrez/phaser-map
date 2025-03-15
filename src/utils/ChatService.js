import { io } from 'socket.io-client';
import { logger, LogCategory } from './Logger';

/**
 * Service for handling chat and real-time communication
 */
export class ChatService {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.connected = false;
    this.username = 'Player_' + Math.floor(Math.random() * 1000);
    
    // Callbacks for different events
    this.messageCallbacks = [];
    this.userJoinedCallbacks = [];
    this.userLeftCallbacks = [];
    this.playerMovedCallbacks = [];
    this.roomHistoryCallbacks = [];
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.roomListCallbacks = [];
    this.roomErrorCallbacks = [];
  }

  /**
   * Connect to the chat server
   * @param {string} serverUrl - The server URL
   */
  connect(serverUrl = '/') {
    if (this.socket) {
      logger.info(LogCategory.NETWORK, 'Already connected to chat server');
      return;
    }
    
    logger.info(LogCategory.NETWORK, 'Connecting to chat server:', serverUrl);
    
    // Configure socket options
    const socketOptions = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true,
      withCredentials: true
    };
    
    try {
      this.socket = io(serverUrl, socketOptions);
      
      this.socket.on('connect', () => {
        logger.info(LogCategory.NETWORK, 'Connected to chat server with ID:', this.socket.id);
        this.connected = true;
        this.connectionCallbacks.forEach(callback => callback(this.socket.id));
      });
      
      this.socket.on('connect_error', (error) => {
        logger.error(LogCategory.NETWORK, 'Connection error:', error.message);
        // Notify UI about connection error
        this.disconnectionCallbacks.forEach(callback => callback(error.message));
      });
      
      this.socket.on('disconnect', (reason) => {
        logger.info(LogCategory.NETWORK, 'Disconnected from chat server:', reason);
        this.connected = false;
        this.currentRoom = null;
        this.disconnectionCallbacks.forEach(callback => callback(reason));
      });
      
      // Set up event listeners
      this.socket.on('receive-message', (message) => {
        logger.info(LogCategory.NETWORK, 'Received message:', message);
        this.messageCallbacks.forEach(callback => callback(message));
      });
      
      this.socket.on('user-joined', (data) => {
        logger.info(LogCategory.NETWORK, 'User joined:', data.userId);
        this.userJoinedCallbacks.forEach(callback => callback(data.userId));
      });
      
      this.socket.on('user-left', (data) => {
        logger.info(LogCategory.NETWORK, 'User left:', data.userId);
        this.userLeftCallbacks.forEach(callback => callback(data.userId));
      });
      
      this.socket.on('player-moved', (data) => {
        this.playerMovedCallbacks.forEach(callback => callback(data));
      });
      
      this.socket.on('room-history', (messages) => {
        logger.info(LogCategory.NETWORK, 'Received room history:', messages);
        this.roomHistoryCallbacks.forEach(callback => callback(messages));
      });
      
      this.socket.on('room-error', (error) => {
        logger.error(LogCategory.NETWORK, 'Room error:', error.message);
        this.roomErrorCallbacks.forEach(callback => callback(error.message));
      });
    } catch (error) {
      logger.error(LogCategory.NETWORK, 'Error initializing socket connection:', error);
      this.disconnectionCallbacks.forEach(callback => callback(error.message));
    }
  }
  
  /**
   * Set the username for this client
   * @param {string} username - The username to set
   */
  setUsername(username) {
    this.username = username;
  }
  
  /**
   * Get available rooms from the server
   */
  async getAvailableRooms() {
    try {
      // Use a relative URL when using the proxy
      const response = await fetch('/api/rooms', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        this.roomListCallbacks.forEach(callback => callback(data.data));
        return data.data;
      }
      
      return [];
    } catch (error) {
      logger.error(LogCategory.NETWORK, 'Error fetching rooms:', error);
      return [];
    }
  }
  
  /**
   * Create a new room
   * @param {string} roomId - The room ID
   * @param {string} name - The room name
   * @param {boolean} isPrivate - Whether the room is private
   * @param {string} password - The password for private rooms
   * @returns {Promise<object>} - The created room
   */
  async createRoom(roomId, name, isPrivate = false, password = null) {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          name,
          isPrivate,
          password
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh room list
        await this.getAvailableRooms();
        return data.data;
      }
      
      throw new Error(data.error || 'Failed to create room');
    } catch (error) {
      logger.error(LogCategory.NETWORK, 'Error creating room:', error);
      throw error;
    }
  }
  
  /**
   * Join a chat room
   * @param {string} roomId - The room ID
   * @param {string} password - The password for private rooms
   */
  joinRoom(roomId, password = null) {
    if (!this.connected) {
      logger.error(LogCategory.NETWORK, 'Not connected to server');
      return;
    }
    
    if (this.currentRoom) {
      this.leaveRoom();
    }
    
    logger.info(LogCategory.NETWORK, 'Joining room:', roomId);
    
    // If password is provided, send as an object
    if (password) {
      this.socket.emit('join-room', { roomId, password });
    } else {
      this.socket.emit('join-room', roomId);
    }
    
    this.currentRoom = roomId;
  }
  
  /**
   * Leave the current room
   */
  leaveRoom() {
    if (!this.connected || !this.currentRoom) {
      return;
    }
    
    logger.info(LogCategory.NETWORK, 'Leaving room:', this.currentRoom);
    this.socket.emit('leave-room', this.currentRoom);
    this.currentRoom = null;
  }
  
  /**
   * Send a message to the current room
   * @param {string} message - The message to send
   */
  sendMessage(message) {
    if (!this.connected || !this.currentRoom) {
      logger.error(LogCategory.NETWORK, 'Not connected or not in a room');
      return;
    }
    
    logger.info(LogCategory.NETWORK, 'Sending message:', message);
    this.socket.emit('send-message', {
      roomId: this.currentRoom,
      message: message,
      sender: this.username
    });
  }
  
  /**
   * Update player position
   * @param {Object} position - The player position
   * @param {string} direction - The player direction
   */
  updatePosition(position, direction) {
    if (!this.connected || !this.currentRoom) {
      return;
    }
    
    this.socket.emit('update-position', {
      roomId: this.currentRoom,
      playerId: this.socket.id,
      position,
      direction
    });
  }
  
  /**
   * Register a callback for when a message is received
   * @param {Function} callback - The callback function
   */
  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when a user joins
   * @param {Function} callback - The callback function
   */
  onUserJoined(callback) {
    this.userJoinedCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when a user leaves
   * @param {Function} callback - The callback function
   */
  onUserLeft(callback) {
    this.userLeftCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when a player moves
   * @param {Function} callback - The callback function
   */
  onPlayerMoved(callback) {
    this.playerMovedCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when room history is received
   * @param {Function} callback - The callback function
   */
  onRoomHistory(callback) {
    this.roomHistoryCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when connected to the server
   * @param {Function} callback - The callback function
   */
  onConnection(callback) {
    this.connectionCallbacks.push(callback);
    
    // If already connected, call the callback immediately
    if (this.connected) {
      callback(this.socket.id);
    }
  }
  
  /**
   * Register a callback for when disconnected from the server
   * @param {Function} callback - The callback function
   */
  onDisconnection(callback) {
    this.disconnectionCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when room list is updated
   * @param {Function} callback - The callback function
   */
  onRoomListUpdated(callback) {
    this.roomListCallbacks.push(callback);
  }
  
  /**
   * Register a callback for when a room error occurs
   * @param {Function} callback - The callback function
   */
  onRoomError(callback) {
    this.roomErrorCallbacks.push(callback);
  }
  
  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      logger.info(LogCategory.NETWORK, 'Disconnecting from chat server');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentRoom = null;
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService(); 