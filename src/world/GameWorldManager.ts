/**
 * GameWorldManager.ts
 * Top-level coordinator for game world state, connecting network, players, and world state
 */

import { logger, LogCategory } from '../utils/Logger';
import { PlayerStateManager } from '../player/PlayerStateManager';
import { NetworkManager } from '../network/NetworkManager';
import { WorldStateManager } from './WorldStateManager';
import type { PlayerState } from '../player/PlayerState';

/**
 * Main coordinator for game world state
 * Integrates network, player, and world state management
 */
export class GameWorldManager {
  private scene: Phaser.Scene;
  private playerStateManager: PlayerStateManager;
  private networkManager: NetworkManager;
  private worldStateManager: WorldStateManager;
  private isInitialized = false;
  private defaultRoomId = 'default';
  private serverUrl = 'ws://localhost:3000';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Initialize subsystems
    this.playerStateManager = new PlayerStateManager(scene);
    this.worldStateManager = new WorldStateManager(scene);
    this.networkManager = new NetworkManager(scene, this.serverUrl);
    
    // Connect subsystems
    this.worldStateManager.setPlayerStateManager(this.playerStateManager);
    this.worldStateManager.setNetworkManager(this.networkManager);
    this.playerStateManager.setNetworkClient(this.networkManager);
    
    this.setupEventListeners();
    
    logger.info(LogCategory.GAME, 'GameWorldManager initialized');
  }

  /**
   * Set up event listeners to coordinate between subsystems
   */
  private setupEventListeners(): void {
    // Network-to-game events
    this.scene.events.on('network-connected', this.handleNetworkConnected, this);
    this.scene.events.on('network-disconnected', this.handleNetworkDisconnected, this);
    this.scene.events.on('network-error', this.handleNetworkError, this);
    
    // Player events
    this.scene.events.on('player-joined', this.handlePlayerJoined, this);
    this.scene.events.on('player-left', this.handlePlayerLeft, this);
    
    // World events
    this.scene.events.on('world-room-joined', this.handleRoomJoined, this);
    this.scene.events.on('world-room-left', this.handleRoomLeft, this);
  }

  /**
   * Configure the game world manager
   */
  public configure(config: {
    serverUrl?: string;
    defaultRoomId?: string;
  }): void {
    if (config.serverUrl) {
      this.serverUrl = config.serverUrl;
    }
    
    if (config.defaultRoomId) {
      this.defaultRoomId = config.defaultRoomId;
    }
    
    logger.debug(LogCategory.GAME, `GameWorldManager configured: server=${this.serverUrl}, defaultRoom=${this.defaultRoomId}`);
  }

  /**
   * Initialize the game world with player information
   */
  public initializePlayer(playerId: string, username: string): void {
    if (this.isInitialized) {
      logger.warn(LogCategory.GAME, 'GameWorldManager already initialized');
      return;
    }
    
    // Initialize player state
    this.playerStateManager.initLocalPlayer(playerId, username);
    
    // Connect to the server
    this.networkManager.connect(playerId, username);
    
    this.isInitialized = true;
    
    logger.info(LogCategory.GAME, `Player initialized: id=${playerId}, username=${username}`);
  }

  /**
   * Join a specific room
   */
  public joinRoom(roomId: string = this.defaultRoomId): void {
    if (!this.isInitialized) {
      logger.warn(LogCategory.GAME, 'Cannot join room: GameWorldManager not initialized');
      return;
    }
    
    this.worldStateManager.joinRoom(roomId);
  }

  /**
   * Handle network connected event
   */
  private handleNetworkConnected(): void {
    logger.info(LogCategory.GAME, 'Connected to game server');
    
    // Join the default room once connected
    this.joinRoom();
    
    // Emit connected event for the game scene to handle
    this.scene.events.emit('game-connected');
  }

  /**
   * Handle network disconnected event
   */
  private handleNetworkDisconnected(code: number, reason: string): void {
    logger.warn(LogCategory.GAME, `Disconnected from game server: ${reason} (${code})`);
    
    // Emit disconnected event for the game scene to handle
    this.scene.events.emit('game-disconnected', code, reason);
  }

  /**
   * Handle network error event
   */
  private handleNetworkError(error: string): void {
    logger.error(LogCategory.GAME, `Network error: ${error}`);
    
    // Emit error event for the game scene to handle
    this.scene.events.emit('game-error', error);
  }

  /**
   * Handle player joined event
   */
  private handlePlayerJoined(id: string, playerState: PlayerState): void {
    logger.debug(LogCategory.GAME, `Player joined: ${id}`);
    
    // Emit player joined event for the game scene to handle
    this.scene.events.emit('game-player-joined', id, playerState);
  }

  /**
   * Handle player left event
   */
  private handlePlayerLeft(id: string): void {
    logger.debug(LogCategory.GAME, `Player left: ${id}`);
    
    // Emit player left event for the game scene to handle
    this.scene.events.emit('game-player-left', id);
  }

  /**
   * Handle room joined event
   */
  private handleRoomJoined(roomId: string): void {
    logger.info(LogCategory.GAME, `Joined room: ${roomId}`);
    
    // Emit room joined event for the game scene to handle
    this.scene.events.emit('game-room-joined', roomId);
  }

  /**
   * Handle room left event
   */
  private handleRoomLeft(roomId: string): void {
    logger.info(LogCategory.GAME, `Left room: ${roomId}`);
    
    // Emit room left event for the game scene to handle
    this.scene.events.emit('game-room-left', roomId);
  }

  /**
   * Get the player state manager
   */
  public getPlayerStateManager(): PlayerStateManager {
    return this.playerStateManager;
  }

  /**
   * Get the network manager
   */
  public getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  /**
   * Get the world state manager
   */
  public getWorldStateManager(): WorldStateManager {
    return this.worldStateManager;
  }

  /**
   * Update method called by the game loop
   */
  public update(time: number, delta: number): void {
    // Update subsystems
    this.playerStateManager.update(time, delta);
    this.worldStateManager.update(time, delta);
  }

  /**
   * Clean up resources when destroying
   */
  public destroy(): void {
    // Clean up event listeners
    this.scene.events.off('network-connected', this.handleNetworkConnected, this);
    this.scene.events.off('network-disconnected', this.handleNetworkDisconnected, this);
    this.scene.events.off('network-error', this.handleNetworkError, this);
    this.scene.events.off('player-joined', this.handlePlayerJoined, this);
    this.scene.events.off('player-left', this.handlePlayerLeft, this);
    this.scene.events.off('world-room-joined', this.handleRoomJoined, this);
    this.scene.events.off('world-room-left', this.handleRoomLeft, this);
    
    // Destroy subsystems
    this.playerStateManager.destroy();
    this.networkManager.destroy();
    this.worldStateManager.destroy();
    
    logger.info(LogCategory.GAME, 'GameWorldManager destroyed');
  }
} 