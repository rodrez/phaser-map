/**
 * This file demonstrates how to integrate the server with a client.
 * In a real application, this would be part of your Phaser game code.
 * 
 * Usage:
 * 1. Import the socket.io-client library in your game
 * 2. Use this code as a reference for implementing client-side socket handling
 */

// Example client-side code (for reference only)
/*
import { io } from 'socket.io-client';

class ChatService {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.connected = false;
    this.messageCallbacks = [];
    this.userJoinedCallbacks = [];
    this.userLeftCallbacks = [];
    this.playerMovedCallbacks = [];
  }

  // Connect to the server
  connect(serverUrl = 'http://localhost:3000') {
    this.socket = io(serverUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
      this.connected = true;
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
    });
    
    // Set up event listeners
    this.socket.on('receive-message', (message) => {
      console.log('Received message:', message);
      this.messageCallbacks.forEach(callback => callback(message));
    });
    
    this.socket.on('user-joined', (data) => {
      console.log('User joined:', data.userId);
      this.userJoinedCallbacks.forEach(callback => callback(data.userId));
    });
    
    this.socket.on('user-left', (data) => {
      console.log('User left:', data.userId);
      this.userLeftCallbacks.forEach(callback => callback(data.userId));
    });
    
    this.socket.on('player-moved', (data) => {
      this.playerMovedCallbacks.forEach(callback => callback(data));
    });
    
    this.socket.on('room-history', (messages) => {
      console.log('Received room history:', messages);
      // You might want to display these messages in your UI
    });
  }
  
  // Join a chat room
  joinRoom(roomId) {
    if (!this.connected) {
      console.error('Not connected to server');
      return;
    }
    
    if (this.currentRoom) {
      this.leaveRoom();
    }
    
    this.socket.emit('join-room', roomId);
    this.currentRoom = roomId;
    console.log('Joined room:', roomId);
  }
  
  // Leave the current room
  leaveRoom() {
    if (!this.connected || !this.currentRoom) {
      return;
    }
    
    this.socket.emit('leave-room', this.currentRoom);
    console.log('Left room:', this.currentRoom);
    this.currentRoom = null;
  }
  
  // Send a message to the current room
  sendMessage(message) {
    if (!this.connected || !this.currentRoom) {
      console.error('Not connected or not in a room');
      return;
    }
    
    this.socket.emit('send-message', {
      roomId: this.currentRoom,
      message: message,
      sender: this.socket.id // In a real app, you'd use a username
    });
  }
  
  // Update player position
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
  
  // Register callbacks for events
  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }
  
  onUserJoined(callback) {
    this.userJoinedCallbacks.push(callback);
  }
  
  onUserLeft(callback) {
    this.userLeftCallbacks.push(callback);
  }
  
  onPlayerMoved(callback) {
    this.playerMovedCallbacks.push(callback);
  }
  
  // Disconnect from the server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Example usage:
// const chatService = new ChatService();
// chatService.connect();
// chatService.joinRoom('game-lobby');
// chatService.sendMessage('Hello, world!');
// chatService.onMessage((message) => {
//   console.log('New message:', message);
//   // Update UI with the message
// });
*/ 

// Leaderboard Integration
// These functions can be used by the client to interact with the leaderboard system

/**
 * Get all leaderboards
 * @returns {Promise} Promise that resolves to leaderboard data
 */
export const getAllLeaderboards = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboards`);
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboards');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    throw error;
  }
};

/**
 * Get a specific leaderboard by category
 * @param {string} category - The leaderboard category
 * @returns {Promise} Promise that resolves to leaderboard data
 */
export const getLeaderboard = async (category) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboards/${category}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${category} leaderboard`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${category} leaderboard:`, error);
    throw error;
  }
};

/**
 * Get a player's rank in a specific leaderboard
 * @param {string} category - The leaderboard category
 * @param {string} playerId - The player's ID
 * @returns {Promise} Promise that resolves to player rank data
 */
export const getPlayerRank = async (category, playerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboards/${category}/player/${playerId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch player rank for ${category}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching player rank for ${category}:`, error);
    throw error;
  }
};

/**
 * Update a player's score in a leaderboard
 * @param {string} category - The leaderboard category
 * @param {string} playerId - The player's ID
 * @param {string} playerName - The player's name
 * @param {number} score - The player's score
 * @returns {Promise} Promise that resolves to update result
 */
export const updateLeaderboardScore = async (category, playerId, playerName, score) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboards/${category}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerId,
        playerName,
        score
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update ${category} leaderboard`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating ${category} leaderboard:`, error);
    throw error;
  }
};

/**
 * Socket.io event handlers for leaderboards
 * @param {Object} socket - The socket.io client instance
 * @param {Function} onLeaderboardUpdated - Callback when leaderboard is updated
 * @param {Function} onPlayerRankUpdated - Callback when player rank is updated
 * @param {Function} onLeaderboardError - Callback when leaderboard error occurs
 */
export const setupLeaderboardSocketHandlers = (socket, {
  onLeaderboardUpdated,
  onPlayerRankUpdated,
  onLeaderboardError
}) => {
  // Listen for leaderboard updates
  socket.on('leaderboard-updated', (data) => {
    if (onLeaderboardUpdated) {
      onLeaderboardUpdated(data);
    }
  });
  
  // Listen for player rank updates
  socket.on('player-rank-updated', (data) => {
    if (onPlayerRankUpdated) {
      onPlayerRankUpdated(data);
    }
  });
  
  // Listen for leaderboard errors
  socket.on('leaderboard-error', (data) => {
    if (onLeaderboardError) {
      onLeaderboardError(data);
    }
  });
};

/**
 * Request leaderboard data via socket.io
 * @param {Object} socket - The socket.io client instance
 * @param {string} category - The leaderboard category
 */
export const requestLeaderboardData = (socket, category) => {
  socket.emit('get-leaderboard', category);
};

/**
 * Update a player's score in a leaderboard via socket.io
 * @param {Object} socket - The socket.io client instance
 * @param {string} playerId - The player's ID
 * @param {string} playerName - The player's name
 * @param {string} category - The leaderboard category
 * @param {number} score - The player's score
 */
export const updateLeaderboardViaSocket = (socket, playerId, playerName, category, score) => {
  socket.emit('update-leaderboard', {
    playerId,
    playerName,
    category,
    score
  });
}; 