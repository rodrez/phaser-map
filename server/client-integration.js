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