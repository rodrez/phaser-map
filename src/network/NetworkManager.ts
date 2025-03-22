/**
 * NetworkManager.ts
 * Handles network communication between the game client and server
 */

import { logger, LogCategory } from '../utils/Logger';
import type { PlayerState, PlayerInput } from '../player/PlayerState';
import type { Position } from '../player/types';

// Custom event types for WebSocket messages
export interface NetworkMessage {
  type: string;
  data: any;
}

// Define possible message types
export enum MessageType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PLAYER_JOIN = 'player-join',
  PLAYER_LEAVE = 'player-leave',
  PLAYER_MOVE = 'player-move',
  PLAYER_INPUT = 'player-input',
  PLAYER_STATE = 'player-state',
  ROOM_JOIN = 'room-join',
  ROOM_LEAVE = 'room-leave',
  ROOM_STATE = 'room-state',
  CHAT_MESSAGE = 'chat-message',
  ERROR = 'error'
}

/**
 * Manager for network communication
 */
export class NetworkManager {
  private scene: Phaser.Scene;
  private socket: WebSocket | null = null;
  private serverUrl: string;
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // Initial delay in ms
  private heartbeatInterval: number | null = null;
  private messageQueue: NetworkMessage[] = [];
  private playerId: string | null = null;
  private playerName: string | null = null;
  private roomId: string | null = null;
  private authentication: Record<string, unknown> = {};

  constructor(scene: Phaser.Scene, serverUrl: string) {
    this.scene = scene;
    this.serverUrl = serverUrl;
    logger.debug(LogCategory.NETWORK, `NetworkManager initialized with server URL: ${serverUrl}`);
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(playerId: string, playerName: string, authData?: Record<string, unknown>): void {
    if (this.isConnected) {
      logger.warn(LogCategory.NETWORK, 'Already connected to server');
      return;
    }

    this.playerId = playerId;
    this.playerName = playerName;
    
    if (authData) {
      this.authentication = authData;
    }

    try {
      logger.info(LogCategory.NETWORK, `Connecting to server: ${this.serverUrl}`);
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      logger.error(LogCategory.NETWORK, `Error connecting to server: ${error}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    logger.info(LogCategory.NETWORK, 'Disconnecting from server');
    
    // Clear any pending reconnect timer
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear heartbeat interval
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close the connection
    this.socket.close(1000, 'Client disconnected');
    this.isConnected = false;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    logger.info(LogCategory.NETWORK, 'Connected to server');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Send authentication if we have player ID
    if (this.playerId) {
      this.sendAuthentication();
    }
    
    // Set up heartbeat
    this.startHeartbeat();
    
    // Send any queued messages
    this.flushMessageQueue();
    
    // Emit connection event
    this.scene.events.emit('network-connected');
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as NetworkMessage;
      
      if (!message || !message.type) {
        logger.warn(LogCategory.NETWORK, 'Received invalid message format from server');
        return;
      }
      
      // Process message based on type
      switch (message.type) {
        case MessageType.CONNECT:
          // Successful connection acknowledgment
          logger.debug(LogCategory.NETWORK, 'Server acknowledged connection');
          break;
          
        case MessageType.PLAYER_JOIN:
          // New player joined
          this.scene.events.emit('network-player-joined', message.data.playerId, message.data.playerState);
          break;
          
        case MessageType.PLAYER_LEAVE:
          // Player left
          this.scene.events.emit('network-player-left', message.data.playerId);
          break;
          
        case MessageType.PLAYER_MOVE:
          // Player movement update
          this.scene.events.emit('network-player-update', message.data.playerState);
          break;
          
        case MessageType.ROOM_STATE:
          // Full room state update
          this.scene.events.emit('network-state-sync', message.data.roomState);
          break;
          
        case MessageType.ROOM_JOIN:
          // Joined a room
          this.roomId = message.data.roomId;
          logger.info(LogCategory.NETWORK, `Joined room: ${this.roomId}`);
          this.scene.events.emit('network-room-joined', message.data.roomId, message.data.roomState);
          break;
          
        case MessageType.CHAT_MESSAGE:
          // Chat message received
          this.scene.events.emit('network-chat-message', message.data);
          break;
          
        case MessageType.ERROR:
          // Error from server
          logger.error(LogCategory.NETWORK, `Server error: ${message.data.message}`);
          this.scene.events.emit('network-error', message.data.message);
          break;
          
        default:
          logger.debug(LogCategory.NETWORK, `Unhandled message type: ${message.type}`);
          break;
      }
    } catch (error) {
      logger.error(LogCategory.NETWORK, `Error processing message: ${error}`);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    
    // Clear heartbeat interval
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Log the close event
    if (event.wasClean) {
      logger.info(
        LogCategory.NETWORK,
        `Connection closed cleanly, code=${event.code}, reason=${event.reason}`
      );
    } else {
      logger.warn(
        LogCategory.NETWORK, 
        `Connection abruptly closed, code=${event.code}`
      );
      this.scheduleReconnect();
    }
    
    // Emit disconnection event
    this.scene.events.emit('network-disconnected', event.code, event.reason);
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    logger.error(LogCategory.NETWORK, 'WebSocket error');
    this.scene.events.emit('network-error', 'Connection error');
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(LogCategory.NETWORK, 'Maximum reconnection attempts reached');
      this.scene.events.emit('network-reconnect-failed');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
    
    logger.info(
      LogCategory.NETWORK,
      `Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`
    );
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      if (this.playerId && this.playerName) {
        this.connect(this.playerId, this.playerName, this.authentication);
      }
    }, delay);
  }

  /**
   * Set up heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send a heartbeat every 30 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  /**
   * Send a heartbeat message
   */
  private sendHeartbeat(): void {
    this.sendMessage({
      type: 'heartbeat',
      data: {
        timestamp: Date.now(),
        playerId: this.playerId
      }
    });
  }

  /**
   * Send authentication data
   */
  private sendAuthentication(): void {
    this.sendMessage({
      type: MessageType.CONNECT,
      data: {
        playerId: this.playerId,
        playerName: this.playerName,
        timestamp: Date.now(),
        ...this.authentication
      }
    });
  }

  /**
   * Join a room
   */
  public joinRoom(roomId: string): void {
    this.roomId = roomId;
    
    this.sendMessage({
      type: MessageType.ROOM_JOIN,
      data: {
        roomId,
        playerId: this.playerId,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Leave the current room
   */
  public leaveRoom(): void {
    if (!this.roomId) return;
    
    this.sendMessage({
      type: MessageType.ROOM_LEAVE,
      data: {
        roomId: this.roomId,
        playerId: this.playerId,
        timestamp: Date.now()
      }
    });
    
    this.roomId = null;
  }

  /**
   * Send player input to the server
   */
  public sendPlayerInput(input: PlayerInput & { sequence: number, playerId: string, roomId: string }): void {
    this.sendMessage({
      type: MessageType.PLAYER_INPUT,
      data: {
        ...input,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Send player position update to the server
   */
  public sendPlayerPosition(data: { position: Position, playerId: string, roomId: string, timestamp: number }): void {
    this.sendMessage({
      type: MessageType.PLAYER_MOVE,
      data
    });
  }

  /**
   * Send a room change event
   */
  public sendRoomChange(oldRoomId: string, newRoomId: string): void {
    this.sendMessage({
      type: MessageType.ROOM_LEAVE,
      data: {
        roomId: oldRoomId,
        playerId: this.playerId,
        timestamp: Date.now()
      }
    });
    
    this.sendMessage({
      type: MessageType.ROOM_JOIN,
      data: {
        roomId: newRoomId,
        playerId: this.playerId,
        timestamp: Date.now()
      }
    });
    
    this.roomId = newRoomId;
  }

  /**
   * Send a message to the server
   */
  private sendMessage(message: NetworkMessage): void {
    if (!this.isConnected || !this.socket) {
      // Queue the message for later if not connected
      this.messageQueue.push(message);
      return;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      logger.error(LogCategory.NETWORK, `Error sending message: ${error}`);
      // Queue the message for retry
      this.messageQueue.push(message);
    }
  }

  /**
   * Send all queued messages
   */
  private flushMessageQueue(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;
      
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        logger.error(LogCategory.NETWORK, `Error sending queued message: ${error}`);
        // Put the message back at the front of the queue
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Check if connected to server
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current room ID
   */
  public getCurrentRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.disconnect();
    this.socket = null;
    
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
} 