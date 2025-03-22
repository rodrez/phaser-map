/**
 * PlayerStateManager.ts
 * Manages the state of player entities, handling state updates and synchronization
 */

import type { Position } from './types';
import { 
  PlayerState, 
  PlayerInput, 
  LocalPlayerState, 
  RemotePlayerState, 
  createLocalPlayerState 
} from './PlayerState';
import { logger, LogCategory } from '../utils/Logger';

/**
 * Manager for player state including local player and remote players
 */
export class PlayerStateManager {
  private scene: Phaser.Scene;
  private localPlayer: LocalPlayerState | null = null;
  private remotePlayers: Map<string, RemotePlayerState> = new Map();
  private networkClient: any; // Will be replaced with proper NetworkClient type
  private lastInputTime = 0;
  private inputSequence = 0;
  private updateRate = 1000 / 20; // 20 updates per second
  private interpolationDelay = 100; // ms to delay interpolation for smooth movement

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
    logger.log(LogCategory.PLAYER, 'PlayerStateManager initialized');
  }

  /**
   * Set up event listeners for player state changes
   */
  private setupEventListeners(): void {
    // Listen for network updates
    this.scene.events.on('network-player-update', this.onRemotePlayerUpdate, this);
    this.scene.events.on('network-player-joined', this.onPlayerJoined, this);
    this.scene.events.on('network-player-left', this.onPlayerLeft, this);
    this.scene.events.on('network-state-sync', this.onStateSync, this);
  }

  /**
   * Set the network client for communication
   */
  public setNetworkClient(client: any): void {
    this.networkClient = client;
  }

  /**
   * Initialize the local player
   */
  public initLocalPlayer(id: string, username: string): LocalPlayerState {
    this.localPlayer = createLocalPlayerState(id, username);
    return this.localPlayer;
  }

  /**
   * Get the local player state
   */
  public getLocalPlayer(): LocalPlayerState | null {
    return this.localPlayer;
  }

  /**
   * Get a specific remote player by ID
   */
  public getRemotePlayer(id: string): RemotePlayerState | undefined {
    return this.remotePlayers.get(id);
  }

  /**
   * Get all remote players
   */
  public getAllRemotePlayers(): Map<string, RemotePlayerState> {
    return this.remotePlayers;
  }

  /**
   * Update the local player's input state
   */
  public updatePlayerInput(input: PlayerInput): void {
    if (!this.localPlayer) return;

    const now = Date.now();
    input.timestamp = now;
    
    this.localPlayer.inputs = { ...input };
    
    // Only send input updates at a controlled rate to reduce network traffic
    if (now - this.lastInputTime >= this.updateRate) {
      this.lastInputTime = now;
      this.sendInputToServer(input);
    }
  }

  /**
   * Update the local player's position directly
   */
  public updateLocalPlayerPosition(position: Position): void {
    if (!this.localPlayer) return;
    
    this.localPlayer.position = { ...position };
    this.localPlayer.lastUpdated = Date.now();
    
    // Send position update to server
    this.sendPositionToServer(position);
  }

  /**
   * Set the local player's room ID
   */
  public setRoom(roomId: string): void {
    if (!this.localPlayer) return;
    
    // Only change room if different
    if (this.localPlayer.roomId !== roomId) {
      const oldRoomId = this.localPlayer.roomId;
      this.localPlayer.roomId = roomId;
      
      // Clear remote players when changing rooms
      this.remotePlayers.clear();
      
      // Notify server about room change
      if (this.networkClient) {
        this.networkClient.sendRoomChange(oldRoomId, roomId);
      }
      
      // Trigger room change event
      this.scene.events.emit('player-room-changed', oldRoomId, roomId);
      
      logger.log(LogCategory.PLAYER, `Player moved from room ${oldRoomId} to ${roomId}`);
    }
  }

  /**
   * Process player movement based on inputs
   */
  public processMovement(delta: number): void {
    if (!this.localPlayer || !this.localPlayer.inputs) return;
    
    const inputs = this.localPlayer.inputs;
    const speed = this.localPlayer.speed * (delta / 1000);
    let dx = 0;
    let dy = 0;
    let isMoving = false;
    let direction = this.localPlayer.direction;
    
    // Calculate movement delta based on input
    if (inputs.up) {
      dy -= speed;
      direction = 'up';
      isMoving = true;
    } else if (inputs.down) {
      dy += speed;
      direction = 'down';
      isMoving = true;
    }
    
    if (inputs.left) {
      dx -= speed;
      direction = 'left';
      isMoving = true;
    } else if (inputs.right) {
      dx += speed;
      direction = 'right';
      isMoving = true;
    }
    
    // Update position if moving
    if (isMoving) {
      const newPosition = {
        x: this.localPlayer.position.x + dx,
        y: this.localPlayer.position.y + dy
      };
      
      // Update local state
      this.localPlayer.position = newPosition;
      this.localPlayer.direction = direction;
      this.localPlayer.isMoving = isMoving;
      this.localPlayer.animation = isMoving ? `walk-${direction}` : `idle-${direction}`;
      
      // Store this update for server reconciliation
      this.localPlayer.pendingUpdates.push({
        input: { ...inputs, timestamp: Date.now() },
        predictedPosition: { ...newPosition },
        serverAcknowledged: false
      });
      
      // Cap the pending updates array to prevent memory issues
      if (this.localPlayer.pendingUpdates.length > 10) {
        this.localPlayer.pendingUpdates.shift();
      }
    } else {
      // Update animation when player stops
      this.localPlayer.isMoving = false;
      this.localPlayer.animation = `idle-${this.localPlayer.direction}`;
    }
  }

  /**
   * Update remote players (interpolation)
   */
  public updateRemotePlayers(time: number, delta: number): void {
    this.remotePlayers.forEach(player => {
      if (player.interpolationPoints && player.interpolationPoints.length > 0) {
        const targetPosition = player.interpolationPoints[0];
        
        // Calculate distance to the target position
        const dx = targetPosition.x - player.position.x;
        const dy = targetPosition.y - player.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we're close enough, move to the next interpolation point
        if (distance < 5) {
          player.position = { ...targetPosition };
          player.interpolationPoints.shift();
          
          // If no more points, stop moving
          if (player.interpolationPoints.length === 0) {
            player.isMoving = false;
            player.animation = `idle-${player.direction}`;
          }
          return;
        }
        
        // Otherwise, interpolate towards the target
        const speed = player.speed * (delta / 1000);
        const ratio = speed / distance;
        const moveX = dx * ratio;
        const moveY = dy * ratio;
        
        // Update position
        player.position.x += moveX;
        player.position.y += moveY;
        
        // Update direction based on movement
        if (Math.abs(moveX) > Math.abs(moveY)) {
          player.direction = moveX > 0 ? 'right' : 'left';
        } else {
          player.direction = moveY > 0 ? 'down' : 'up';
        }
        
        player.isMoving = true;
        player.animation = `walk-${player.direction}`;
      } else {
        // No interpolation points, ensure player is not moving
        player.isMoving = false;
        player.animation = `idle-${player.direction}`;
      }
    });
  }

  /**
   * Handle a state sync from the server
   */
  private onStateSync(roomState: any): void {
    if (!roomState || !roomState.players) return;
    
    // Update remote players from the state
    Object.entries(roomState.players).forEach(([id, playerState]: [string, any]) => {
      // Skip local player
      if (this.localPlayer && id === this.localPlayer.id) {
        // Reconcile local player state with server state
        this.reconcileLocalState(playerState);
        return;
      }
      
      // Update or add remote player
      this.updateRemotePlayer(id, playerState);
    });
    
    // Remove players that are no longer in the room
    this.remotePlayers.forEach((player, id) => {
      if (!roomState.players[id]) {
        this.remotePlayers.delete(id);
        this.scene.events.emit('player-left', id);
      }
    });
  }

  /**
   * Handle a remote player update
   */
  private onRemotePlayerUpdate(playerState: PlayerState): void {
    if (!playerState || !playerState.id) return;
    
    // Skip if it's the local player
    if (this.localPlayer && playerState.id === this.localPlayer.id) {
      this.reconcileLocalState(playerState);
      return;
    }
    
    this.updateRemotePlayer(playerState.id, playerState);
  }

  /**
   * Update a remote player's state
   */
  private updateRemotePlayer(id: string, state: PlayerState): void {
    const existingPlayer = this.remotePlayers.get(id);
    
    if (existingPlayer) {
      // Add new position as interpolation target
      existingPlayer.interpolationPoints.push({ ...state.position });
      // Cap interpolation points to prevent memory issues
      if (existingPlayer.interpolationPoints.length > 5) {
        existingPlayer.interpolationPoints.shift();
      }
      
      // Update other state properties
      existingPlayer.direction = state.direction;
      existingPlayer.animation = state.animation;
      existingPlayer.health = state.health;
      existingPlayer.username = state.username;
      existingPlayer.roomId = state.roomId;
      existingPlayer.lastUpdated = state.lastUpdated;
      existingPlayer.isMoving = state.isMoving;
      existingPlayer.speed = state.speed;
    } else {
      // Create new remote player
      const remotePlayer: RemotePlayerState = {
        ...state,
        interpolationPoints: [{ ...state.position }]
      };
      this.remotePlayers.set(id, remotePlayer);
      
      // Notify about new player
      this.scene.events.emit('player-joined', id, remotePlayer);
    }
  }

  /**
   * Reconcile the local player state with server state
   */
  private reconcileLocalState(serverState: PlayerState): void {
    if (!this.localPlayer) return;
    
    // Find the last acknowledged input
    const serverTime = serverState.lastUpdated;
    const pendingUpdates = [...this.localPlayer.pendingUpdates];
    
    // Remove all acknowledged updates
    this.localPlayer.pendingUpdates = pendingUpdates.filter(update => 
      update.input.timestamp > serverTime
    );
    
    // If there's a significant difference between predicted and server position, correct it
    const dx = Math.abs(this.localPlayer.position.x - serverState.position.x);
    const dy = Math.abs(this.localPlayer.position.y - serverState.position.y);
    
    if (dx > 50 || dy > 50) {
      // Large discrepancy - snap to server position
      this.localPlayer.position = { ...serverState.position };
      logger.log(LogCategory.PLAYER, 'Corrected player position due to large discrepancy');
    }
    
    // Update other server-authoritative properties
    this.localPlayer.health = serverState.health;
    this.localPlayer.speed = serverState.speed;
    this.localPlayer.roomId = serverState.roomId;
  }

  /**
   * Handle a player joining the game
   */
  private onPlayerJoined(id: string, playerState: PlayerState): void {
    // Skip if it's the local player
    if (this.localPlayer && id === this.localPlayer.id) return;
    
    if (!this.remotePlayers.has(id)) {
      const remotePlayer: RemotePlayerState = {
        ...playerState,
        interpolationPoints: [{ ...playerState.position }]
      };
      this.remotePlayers.set(id, remotePlayer);
      
      logger.log(LogCategory.PLAYER, `Player ${id} joined the game`);
      this.scene.events.emit('player-joined', id, remotePlayer);
    }
  }

  /**
   * Handle a player leaving the game
   */
  private onPlayerLeft(id: string): void {
    if (this.remotePlayers.has(id)) {
      this.remotePlayers.delete(id);
      logger.log(LogCategory.PLAYER, `Player ${id} left the game`);
      this.scene.events.emit('player-left', id);
    }
  }

  /**
   * Send input to the server
   */
  private sendInputToServer(input: PlayerInput): void {
    if (!this.networkClient || !this.localPlayer) return;
    
    const inputData = {
      ...input,
      sequence: this.inputSequence++,
      playerId: this.localPlayer.id,
      roomId: this.localPlayer.roomId
    };
    
    this.networkClient.sendPlayerInput(inputData);
  }

  /**
   * Send position directly to the server
   */
  private sendPositionToServer(position: Position): void {
    if (!this.networkClient || !this.localPlayer) return;
    
    const positionData = {
      position,
      playerId: this.localPlayer.id,
      roomId: this.localPlayer.roomId,
      timestamp: Date.now()
    };
    
    this.networkClient.sendPlayerPosition(positionData);
  }

  /**
   * Update method called by the game loop
   */
  public update(time: number, delta: number): void {
    // Process local player movement based on inputs
    this.processMovement(delta);
    
    // Update remote players (interpolation)
    this.updateRemotePlayers(time, delta);
  }

  /**
   * Clean up event listeners when destroying
   */
  public destroy(): void {
    this.scene.events.off('network-player-update', this.onRemotePlayerUpdate, this);
    this.scene.events.off('network-player-joined', this.onPlayerJoined, this);
    this.scene.events.off('network-player-left', this.onPlayerLeft, this);
    this.scene.events.off('network-state-sync', this.onStateSync, this);
    
    this.localPlayer = null;
    this.remotePlayers.clear();
    
    logger.log(LogCategory.PLAYER, 'PlayerStateManager destroyed');
  }
} 