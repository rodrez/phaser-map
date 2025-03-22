/**
 * WorldStateManager.ts
 * Manages the state of the game world, coordinating rooms and entities
 */

import { logger, LogCategory } from '../utils/Logger';
import type { PlayerState } from '../player/PlayerState';
import type { RoomState, EntityState } from '../player/PlayerState';
import type { NetworkManager } from '../network/NetworkManager';
import type { PlayerStateManager } from '../player/PlayerStateManager';

/**
 * Manages the state of the game world, including rooms and entities
 */
export class WorldStateManager {
  private scene: Phaser.Scene;
  private networkManager: NetworkManager | null = null;
  private playerStateManager: PlayerStateManager | null = null;
  private rooms: Map<string, RoomState> = new Map();
  private currentRoomId: string | null = null;
  private loadedRooms: Set<string> = new Set();
  private entityCallbacks: Map<string, (entityState: EntityState) => void> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
    logger.debug(LogCategory.WORLD, 'WorldStateManager initialized');
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Network-related events
    this.scene.events.on('network-room-joined', this.handleRoomJoined, this);
    this.scene.events.on('network-state-sync', this.handleRoomStateSync, this);
    this.scene.events.on('network-player-joined', this.handlePlayerJoined, this);
    this.scene.events.on('network-player-left', this.handlePlayerLeft, this);
    this.scene.events.on('network-player-update', this.handlePlayerUpdate, this);
    
    // Player-related events
    this.scene.events.on('player-room-changed', this.handlePlayerRoomChanged, this);
  }

  /**
   * Set the network manager reference
   */
  public setNetworkManager(networkManager: NetworkManager): void {
    this.networkManager = networkManager;
  }

  /**
   * Set the player state manager reference
   */
  public setPlayerStateManager(playerStateManager: PlayerStateManager): void {
    this.playerStateManager = playerStateManager;
  }

  /**
   * Get the current room state
   */
  public getCurrentRoom(): RoomState | null {
    if (!this.currentRoomId) return null;
    return this.rooms.get(this.currentRoomId) || null;
  }

  /**
   * Get a specific room by ID
   */
  public getRoom(roomId: string): RoomState | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get all rooms
   */
  public getAllRooms(): Map<string, RoomState> {
    return this.rooms;
  }

  /**
   * Join a specific room
   */
  public joinRoom(roomId: string): void {
    if (this.currentRoomId === roomId) {
      logger.warn(LogCategory.WORLD, `Already in room ${roomId}`);
      return;
    }
    
    logger.info(LogCategory.WORLD, `Joining room ${roomId}`);
    
    // Update current room ID
    this.currentRoomId = roomId;
    
    // Notify network manager
    if (this.networkManager) {
      this.networkManager.joinRoom(roomId);
    }
    
    // Update player state manager
    if (this.playerStateManager) {
      this.playerStateManager.setRoom(roomId);
    }
    
    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        players: {},
        entities: {},
        lastUpdated: Date.now()
      });
    }
    
    // Add to loaded rooms
    this.loadedRooms.add(roomId);
    
    // Emit room join event
    this.scene.events.emit('world-room-joined', roomId, this.rooms.get(roomId));
  }

  /**
   * Leave the current room
   */
  public leaveRoom(): void {
    if (!this.currentRoomId) {
      logger.warn(LogCategory.WORLD, 'Not currently in a room');
      return;
    }
    
    const roomId = this.currentRoomId;
    logger.info(LogCategory.WORLD, `Leaving room ${roomId}`);
    
    // Clear current room ID
    this.currentRoomId = null;
    
    // Notify network manager
    if (this.networkManager) {
      this.networkManager.leaveRoom();
    }
    
    // Emit room leave event
    this.scene.events.emit('world-room-left', roomId);
  }

  /**
   * Add an entity to the current room
   */
  public addEntity(entity: EntityState): void {
    if (!this.currentRoomId) {
      logger.warn(LogCategory.WORLD, 'Cannot add entity: not in a room');
      return;
    }
    
    const room = this.rooms.get(this.currentRoomId);
    if (!room) return;
    
    room.entities[entity.id] = entity;
    room.lastUpdated = Date.now();
    
    // Emit entity added event
    this.scene.events.emit('world-entity-added', entity);
    
    // Call entity callback if registered
    const callback = this.entityCallbacks.get(entity.type);
    if (callback) {
      callback(entity);
    }
  }

  /**
   * Remove an entity from the current room
   */
  public removeEntity(entityId: string): void {
    if (!this.currentRoomId) return;
    
    const room = this.rooms.get(this.currentRoomId);
    if (!room) return;
    
    const entity = room.entities[entityId];
    if (!entity) return;
    
    delete room.entities[entityId];
    room.lastUpdated = Date.now();
    
    // Emit entity removed event
    this.scene.events.emit('world-entity-removed', entityId, entity);
  }

  /**
   * Register a callback for a specific entity type
   */
  public registerEntityCallback(entityType: string, callback: (entityState: EntityState) => void): void {
    this.entityCallbacks.set(entityType, callback);
  }

  /**
   * Unregister an entity callback
   */
  public unregisterEntityCallback(entityType: string): void {
    this.entityCallbacks.delete(entityType);
  }

  /**
   * Handle room joined event from network
   */
  private handleRoomJoined(roomId: string, roomState: RoomState): void {
    logger.info(LogCategory.WORLD, `Room joined: ${roomId}`);
    
    this.currentRoomId = roomId;
    
    // Store room state
    this.rooms.set(roomId, {
      ...roomState,
      lastUpdated: Date.now()
    });
    
    // Add to loaded rooms
    this.loadedRooms.add(roomId);
    
    // Emit room join event
    this.scene.events.emit('world-room-joined', roomId, roomState);
  }

  /**
   * Handle room state sync from network
   */
  private handleRoomStateSync(roomState: RoomState): void {
    if (!roomState || !roomState.id) {
      logger.warn(LogCategory.WORLD, 'Received invalid room state');
      return;
    }
    
    const roomId = roomState.id;
    
    // Update room state
    this.rooms.set(roomId, {
      ...roomState,
      lastUpdated: Date.now()
    });
    
    // Process entities if this is the current room
    if (roomId === this.currentRoomId) {
      // Check for new or updated entities
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) return;
      
      Object.values(roomState.entities).forEach(entity => {
        const existingEntity = currentRoom.entities[entity.id];
        if (!existingEntity) {
          // New entity
          this.scene.events.emit('world-entity-added', entity);
          
          // Call entity callback if registered
          const callback = this.entityCallbacks.get(entity.type);
          if (callback) {
            callback(entity);
          }
        }
      });
      
      // Check for removed entities
      Object.keys(currentRoom.entities).forEach(entityId => {
        if (!roomState.entities[entityId]) {
          const entity = currentRoom.entities[entityId];
          // Entity was removed
          this.scene.events.emit('world-entity-removed', entityId, entity);
        }
      });
    }
    
    // Emit room update event
    this.scene.events.emit('world-room-updated', roomId, roomState);
  }

  /**
   * Handle player joined event from network
   */
  private handlePlayerJoined(playerId: string, playerState: PlayerState): void {
    if (!playerState.roomId) {
      logger.warn(LogCategory.WORLD, `Player ${playerId} joined without a room ID`);
      return;
    }
    
    const roomId = playerState.roomId;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      // Room doesn't exist yet, create it
      this.rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        players: {
          [playerId]: playerState
        },
        entities: {},
        lastUpdated: Date.now()
      });
    } else {
      // Add player to room
      room.players[playerId] = playerState;
      room.lastUpdated = Date.now();
    }
    
    // Emit player joined room event
    this.scene.events.emit('world-player-joined-room', playerId, roomId, playerState);
  }

  /**
   * Handle player left event from network
   */
  private handlePlayerLeft(playerId: string): void {
    // Find the room the player was in
    for (const [roomId, room] of this.rooms.entries()) {
      if (playerId in room.players) {
        // Remove player from room
        delete room.players[playerId];
        room.lastUpdated = Date.now();
        
        // Emit player left room event
        this.scene.events.emit('world-player-left-room', playerId, roomId);
        break;
      }
    }
  }

  /**
   * Handle player update event from network
   */
  private handlePlayerUpdate(playerState: PlayerState): void {
    if (!playerState.roomId || !playerState.id) return;
    
    const roomId = playerState.roomId;
    const playerId = playerState.id;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      // Room doesn't exist yet, create it
      this.rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        players: {
          [playerId]: playerState
        },
        entities: {},
        lastUpdated: Date.now()
      });
    } else {
      // Update player in room
      room.players[playerId] = playerState;
      room.lastUpdated = Date.now();
    }
  }

  /**
   * Handle player room changed event
   */
  private handlePlayerRoomChanged(oldRoomId: string, newRoomId: string): void {
    if (this.playerStateManager) {
      const localPlayer = this.playerStateManager.getLocalPlayer();
      if (!localPlayer) return;
      
      // Remove player from old room
      const oldRoom = this.rooms.get(oldRoomId);
      if (oldRoom && localPlayer.id in oldRoom.players) {
        delete oldRoom.players[localPlayer.id];
        oldRoom.lastUpdated = Date.now();
      }
      
      // Add player to new room
      let newRoom = this.rooms.get(newRoomId);
      if (!newRoom) {
        newRoom = {
          id: newRoomId,
          name: `Room ${newRoomId}`,
          players: {},
          entities: {},
          lastUpdated: Date.now()
        };
        this.rooms.set(newRoomId, newRoom);
      }
      
      newRoom.players[localPlayer.id] = {
        id: localPlayer.id,
        position: localPlayer.position,
        direction: localPlayer.direction,
        animation: localPlayer.animation,
        health: localPlayer.health,
        username: localPlayer.username,
        roomId: newRoomId,
        lastUpdated: Date.now(),
        isMoving: localPlayer.isMoving,
        speed: localPlayer.speed
      };
      
      newRoom.lastUpdated = Date.now();
      this.currentRoomId = newRoomId;
      
      // Add to loaded rooms
      this.loadedRooms.add(newRoomId);
    }
  }

  /**
   * Update method called by the game loop
   */
  public update(time: number, delta: number): void {
    // No continuous updates needed for now
  }

  /**
   * Clean up event listeners when destroying
   */
  public destroy(): void {
    this.scene.events.off('network-room-joined', this.handleRoomJoined, this);
    this.scene.events.off('network-state-sync', this.handleRoomStateSync, this);
    this.scene.events.off('network-player-joined', this.handlePlayerJoined, this);
    this.scene.events.off('network-player-left', this.handlePlayerLeft, this);
    this.scene.events.off('network-player-update', this.handlePlayerUpdate, this);
    this.scene.events.off('player-room-changed', this.handlePlayerRoomChanged, this);
    
    this.rooms.clear();
    this.loadedRooms.clear();
    this.entityCallbacks.clear();
    
    logger.debug(LogCategory.WORLD, 'WorldStateManager destroyed');
  }
} 