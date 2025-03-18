/**
 * World Manager for handling both overworld and dungeon systems
 * This provides a unified interface to manage entities across both coordinate systems
 */
import { WebSocket } from 'ws';
import { MessageType, GeoCoordinates, Vector2 } from 'shared';
import { createGeoSpatialHashGrid } from './geoSpatialHashGrid.js';
import { createSpatialHashGrid } from './spatialHashGrid.js';
import { createMapIntegration } from './mapIntegration.js';

// World types
export enum WorldType {
  OVERWORLD = 'overworld',
  DUNGEON = 'dungeon'
}

// Player location info
export interface PlayerLocation {
  worldType: WorldType;
  // For overworld
  geoPosition?: GeoCoordinates;
  // For dungeons
  position?: Vector2;
  dungeonId?: string;
  dungeonLevel?: number;
}

// Dungeon entry point
export interface DungeonEntrance {
  id: string;
  name: string;
  // Location in the overworld
  geoPosition: GeoCoordinates;
  // Entry point in the dungeon coordinates
  entryPosition: Vector2;
  // Radius in meters that player must be within to enter
  interactionRadius: number;
  // Level requirements
  minLevel?: number;
  // Cooldown in milliseconds
  cooldown?: number;
  // Max players
  maxPlayers?: number;
}

// Player data
export interface PlayerData {
  id: string;
  username: string;
  socket: WebSocket;
  location: PlayerLocation;
  lastUpdate: number;
}

interface DungeonInstance {
  id: string;
  grid: ReturnType<typeof createSpatialHashGrid>;
  players: Map<string, PlayerData>;
  // Add more dungeon-specific properties as needed
}

interface WorldManagerConfig {
  lat?: number;
  lng?: number;
  boundaryRadius?: number;
  territoryRadius?: number;
  cellSize?: number;
}

/**
 * Create a world manager to handle both overworld and dungeon systems
 */
export function createWorldManager(config: WorldManagerConfig = {}) {
  // Default center coordinates (San Francisco)
  const centerLat = config.lat || 37.7749;
  const centerLng = config.lng || -122.4194;
  const boundaryRadius = config.boundaryRadius || 1000; // 1km play area
  const cellSize = config.cellSize || 50; // 50m grid cells for overworld
  
  // Create spatial grids for both coordinate systems
  const overworldGrid = createGeoSpatialHashGrid(cellSize);
  
  // Players in the game
  const players = new Map<string, PlayerData>();
  
  // Dungeon entrances
  const dungeonEntrances = new Map<string, DungeonEntrance>();
  
  // Active dungeon instances
  const dungeonInstances = new Map<string, DungeonInstance>();
  
  // Overworld details
  const overworldMap = {
    getBounds: () => {
      return {
        center: { lat: centerLat, lng: centerLng },
        radius: boundaryRadius
      };
    }
  };
  
  /**
   * Add a new player to the game
   */
  function addPlayer(
    id: string,
    username: string,
    socket: WebSocket,
    initialLocation?: Partial<PlayerLocation>
  ): PlayerData {
    // Create default location (overworld)
    const location: PlayerLocation = {
      worldType: WorldType.OVERWORLD,
      geoPosition: { lat: centerLat, lng: centerLng },
      ...initialLocation
    };
    
    // Create player data
    const player: PlayerData = {
      id,
      username,
      socket,
      location,
      lastUpdate: Date.now()
    };
    
    // Add to players map
    players.set(id, player);
    
    // Add to appropriate spatial grid
    if (location.worldType === WorldType.OVERWORLD && location.geoPosition) {
      overworldGrid.addEntity(id, location.geoPosition.lat, location.geoPosition.lng);
    } else if (location.worldType === WorldType.DUNGEON && location.position && location.dungeonId) {
      const dungeon = dungeonInstances.get(location.dungeonId);
      if (dungeon) {
        dungeon.grid.addEntity(id, location.position.x, location.position.y);
        dungeon.players.set(id, player);
      }
    }
    
    return player;
  }
  
  /**
   * Remove a player from the game
   */
  function removePlayer(playerId: string): boolean {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Remove from appropriate spatial grid
    if (player.location.worldType === WorldType.OVERWORLD && player.location.geoPosition) {
      overworldGrid.removeEntity(playerId);
    } else if (player.location.worldType === WorldType.DUNGEON && player.location.position && player.location.dungeonId) {
      const dungeon = dungeonInstances.get(player.location.dungeonId);
      if (dungeon) {
        dungeon.grid.removeEntity(playerId);
        dungeon.players.delete(playerId);
      }
    }
    
    // Remove from players map
    players.delete(playerId);
    
    return true;
  }
  
  /**
   * Update a player's position
   */
  function updatePlayerPosition(
    playerId: string,
    position: GeoCoordinates | Vector2
  ): boolean {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Handle updates based on coordinate system
    if (player.location.worldType === WorldType.OVERWORLD && 'lat' in position && 'lng' in position) {
      // Update overworld position
      const oldPos = player.location.geoPosition;
      
      // Update player data
      player.location.geoPosition = { lat: position.lat, lng: position.lng };
      player.lastUpdate = Date.now();
      
      // Update spatial grid
      if (oldPos) {
        overworldGrid.removeEntity(playerId);
        overworldGrid.addEntity(playerId, position.lat, position.lng);
      } else {
        overworldGrid.addEntity(playerId, position.lat, position.lng);
      }
      
      // Check for dungeons
      checkDungeonEntrance(player);
      
      return true;
    } 
    else if (player.location.worldType === WorldType.DUNGEON && 'x' in position && 'y' in position && player.location.dungeonId) {
      // Update dungeon position
      const oldPos = player.location.position;
      const dungeonId = player.location.dungeonId;
      const dungeon = dungeonInstances.get(dungeonId);
      
      if (!dungeon) return false;
      
      // Update player data
      player.location.position = { x: position.x, y: position.y };
      player.lastUpdate = Date.now();
      
      // Update spatial grid
      if (oldPos) {
        dungeon.grid.removeEntity(playerId);
        dungeon.grid.addEntity(playerId, position.x, position.y);
      } else {
        dungeon.grid.addEntity(playerId, position.x, position.y);
      }
      
      // Check for exits
      checkDungeonExit(player);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a player is near a dungeon entrance
   */
  function checkDungeonEntrance(player: PlayerData): void {
    if (player.location.worldType !== WorldType.OVERWORLD || !player.location.geoPosition) return;
    
    // Check each dungeon entrance
    dungeonEntrances.forEach(entrance => {
      const distance = calculateDistance(
        player.location.geoPosition!.lat,
        player.location.geoPosition!.lng,
        entrance.geoPosition.lat,
        entrance.geoPosition.lng
      );
      
      // If player is within interaction radius, send notification
      if (distance <= entrance.interactionRadius) {
        // Send interaction notification to client
        sendToClient(player.socket, {
          type: 'entity_update',
          data: {
            type: 'dungeon_entrance',
            id: entrance.id,
            name: entrance.name,
            action: 'enter'
          },
          timestamp: Date.now()
        });
      }
    });
  }
  
  /**
   * Send a player to a dungeon entrance
   */
  function sendToDungeonEntrance(player: PlayerData, entrance: DungeonEntrance): void {
    // Ensure dungeon instance exists
    let dungeon = dungeonInstances.get(entrance.id);
    
    if (!dungeon) {
      // Create new dungeon instance
      dungeon = {
        id: entrance.id,
        grid: createSpatialHashGrid(10), // 10px grid cells for dungeons
        players: new Map()
      };
      
      dungeonInstances.set(entrance.id, dungeon);
    }
    
    // Update player location
    const oldWorldType = player.location.worldType;
    const oldPosition = player.location.worldType === WorldType.OVERWORLD
      ? player.location.geoPosition
      : player.location.position;
    
    // Remove from current world grid
    if (oldWorldType === WorldType.OVERWORLD && player.location.geoPosition) {
      overworldGrid.removeEntity(player.id);
    } else if (oldWorldType === WorldType.DUNGEON && player.location.position && player.location.dungeonId) {
      const oldDungeon = dungeonInstances.get(player.location.dungeonId);
      if (oldDungeon) {
        oldDungeon.grid.removeEntity(player.id);
        oldDungeon.players.delete(player.id);
      }
    }
    
    // Update player data
    player.location = {
      worldType: WorldType.DUNGEON,
      position: { ...entrance.entryPosition }, // Clone to prevent modification
      dungeonId: entrance.id,
      dungeonLevel: 1
    };
    
    // Add to dungeon
    dungeon.grid.addEntity(player.id, entrance.entryPosition.x, entrance.entryPosition.y);
    dungeon.players.set(player.id, player);
    
    // Send world transition message to client
    sendToClient(player.socket, {
      type: 'entity_update',
      data: {
        type: 'world_transition',
        worldType: WorldType.DUNGEON,
        dungeonId: entrance.id,
        position: entrance.entryPosition
      },
      timestamp: Date.now()
    });
  }
  
  /**
   * Try to enter a dungeon
   */
  function enterDungeon(playerId: string, dungeonId: string): boolean {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Check if player is in the overworld
    if (player.location.worldType !== WorldType.OVERWORLD) return false;
    
    // Check if dungeon exists
    const entrance = dungeonEntrances.get(dungeonId);
    if (!entrance) return false;
    
    // Check if player is within interaction radius
    if (player.location.geoPosition) {
      const distance = calculateDistance(
        player.location.geoPosition.lat,
        player.location.geoPosition.lng,
        entrance.geoPosition.lat,
        entrance.geoPosition.lng
      );
      
      if (distance > entrance.interactionRadius) {
        // Too far from entrance
        return false;
      }
    }
    
    // Send player to dungeon
    sendToDungeonEntrance(player, entrance);
    return true;
  }
  
  /**
   * Check if a player is at a dungeon exit
   */
  function checkDungeonExit(player: PlayerData): void {
    // Implement exit detection logic here
    // For this minimal version, we'll pretend the player is at an exit
  }
  
  /**
   * Try to exit a dungeon
   */
  function exitDungeon(playerId: string): boolean {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Check if player is in a dungeon
    if (player.location.worldType !== WorldType.DUNGEON || !player.location.dungeonId) return false;
    
    // Find the dungeon entrance
    const entrance = dungeonEntrances.get(player.location.dungeonId);
    if (!entrance) return false;
    
    // Remove from dungeon grid
    if (player.location.position) {
      const dungeon = dungeonInstances.get(player.location.dungeonId);
      if (dungeon) {
        dungeon.grid.removeEntity(playerId);
        dungeon.players.delete(playerId);
      }
    }
    
    // Update player location
    player.location = {
      worldType: WorldType.OVERWORLD,
      geoPosition: { ...entrance.geoPosition }, // Clone to prevent modification
    };
    
    // Add to overworld grid
    overworldGrid.addEntity(playerId, entrance.geoPosition.lat, entrance.geoPosition.lng);
    
    // Send world transition message to client
    sendToClient(player.socket, {
      type: 'entity_update',
      data: {
        type: 'world_transition',
        worldType: WorldType.OVERWORLD,
        position: entrance.geoPosition
      },
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * Register a dungeon entrance
   */
  function registerDungeonEntrance(entrance: DungeonEntrance): void {
    dungeonEntrances.set(entrance.id, entrance);
  }
  
  /**
   * Broadcast a message to all players in a dungeon
   */
  function broadcastToDungeon(
    dungeonId: string, 
    message: any, 
    excludeIds: string[] = []
  ): void {
    const dungeon = dungeonInstances.get(dungeonId);
    if (!dungeon) return;
    
    const messageStr = JSON.stringify(message);
    
    // Send to all players in the dungeon
    dungeon.players.forEach((player) => {
      if (!excludeIds.includes(player.id) && player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(messageStr);
      }
    });
  }
  
  /**
   * Get nearby player IDs
   */
  function getNearbyPlayers(playerId: string, radius: number = 100): string[] {
    const player = players.get(playerId);
    if (!player) return [];
    
    if (player.location.worldType === WorldType.OVERWORLD && player.location.geoPosition) {
      // Get nearby players in overworld
      return overworldGrid.getNearbyEntities(
        player.location.geoPosition.lat,
        player.location.geoPosition.lng,
        radius
      );
    } else if (player.location.worldType === WorldType.DUNGEON && 
               player.location.position && 
               player.location.dungeonId) {
      // Get nearby players in dungeon
      const dungeon = dungeonInstances.get(player.location.dungeonId);
      if (!dungeon) return [];
      
      return dungeon.grid.getNearbyEntities(
        player.location.position.x,
        player.location.position.y,
        radius
      );
    }
    
    return [];
  }
  
  /**
   * Broadcast a message to nearby players
   */
  function broadcastToNearby(
    originId: string,
    message: any,
    radius: number = 100,
    includeOrigin: boolean = false
  ): void {
    const nearbyPlayerIds = getNearbyPlayers(originId, radius);
    const messageStr = JSON.stringify(message);
    
    nearbyPlayerIds.forEach(id => {
      if ((id !== originId || includeOrigin) && players.has(id)) {
        const player = players.get(id)!;
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(messageStr);
        }
      }
    });
    
    // Include origin if specified
    if (includeOrigin && !nearbyPlayerIds.includes(originId) && players.has(originId)) {
      const player = players.get(originId)!;
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(messageStr);
      }
    }
  }
  
  /**
   * Send a message to a client
   */
  function sendToClient(socket: WebSocket, message: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Convert latitude and longitude from degrees to radians
    const toRadians = (degree: number) => degree * (Math.PI / 180);
    const rlat1 = toRadians(lat1);
    const rlng1 = toRadians(lng1);
    const rlat2 = toRadians(lat2);
    const rlng2 = toRadians(lng2);
    
    // Haversine formula
    const dLat = rlat2 - rlat1;
    const dLng = rlng2 - rlng1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(rlat1) * Math.cos(rlat2) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Earth radius in meters
    const R = 6371000;
    return R * c;
  }
  
  /**
   * Get a player by ID
   */
  function getPlayer(playerId: string): PlayerData | undefined {
    return players.get(playerId);
  }
  
  /**
   * Get all dungeon entrances
   */
  function getDungeonEntrances(): DungeonEntrance[] {
    return Array.from(dungeonEntrances.values());
  }
  
  return {
    addPlayer,
    removePlayer,
    updatePlayerPosition,
    enterDungeon,
    exitDungeon,
    registerDungeonEntrance,
    broadcastToDungeon,
    getNearbyPlayers,
    broadcastToNearby,
    getPlayer,
    getDungeonEntrances,
    calculateDistance,
    sendToClient,
    overworldMap,
    
    // Diagnostics
    getStats: () => ({
      totalPlayers: players.size,
      overworldPlayers: Array.from(players.values()).filter(p => p.location.worldType === WorldType.OVERWORLD).length,
      dungeonPlayers: Array.from(players.values()).filter(p => p.location.worldType === WorldType.DUNGEON).length,
      activeDungeons: dungeonInstances.size
    })
  };
} 