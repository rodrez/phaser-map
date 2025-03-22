/**
 * PlayerState.ts
 * Defines the state structure for players in the game
 */

import type { Position, GeoPosition, HealthData } from './types';

// Core player state that will be synced across the network
export interface PlayerState {
  id: string;
  position: Position;
  direction: string; // 'up', 'down', 'left', 'right'
  animation: string; // Current animation key
  health: HealthData;
  username: string;
  roomId: string; // The current room/area the player is in
  lastUpdated: number; // Timestamp of last update
  isMoving: boolean;
  speed: number;
}

// Player input state (used for local prediction)
export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  timestamp: number;
}

// Extended player state with client-only properties
export interface LocalPlayerState extends PlayerState {
  inputs: PlayerInput;
  pendingUpdates: Array<{
    input: PlayerInput;
    predictedPosition: Position;
    serverAcknowledged: boolean;
  }>;
  geoPosition?: GeoPosition;
  inventory: InventoryState;
  stats: PlayerStats;
  effects: StatusEffectState[];
}

// Remote player state (other players in the same room)
export interface RemotePlayerState extends PlayerState {
  interpolationPoints: Position[]; // For smooth movement between updates
}

// Player inventory
export interface InventoryState {
  items: InventoryItem[];
  maxSlots: number;
  gold: number;
}

// Inventory item
export interface InventoryItem {
  id: string;
  type: string;
  name: string;
  quantity: number;
  properties?: Record<string, unknown>;
}

// Player statistics
export interface PlayerStats {
  level: number;
  experience: number;
  strength: number;
  agility: number;
  intelligence: number;
}

// Status effect on player
export interface StatusEffectState {
  id: string;
  type: string;
  remainingDuration: number;
  strength: number;
  visualEffect?: string;
}

// Room state containing all players in a room
export interface RoomState {
  id: string;
  name: string;
  players: Record<string, PlayerState>;
  entities: Record<string, EntityState>;
  lastUpdated: number;
}

// Game entity state (NPCs, interactive objects, etc.)
export interface EntityState {
  id: string;
  type: string;
  position: Position;
  properties: Record<string, unknown>;
}

/**
 * Creates a default player state
 */
export function createDefaultPlayerState(id: string, username: string): PlayerState {
  return {
    id,
    username,
    position: { x: 400, y: 300 },
    direction: 'down',
    animation: 'idle',
    health: { current: 100, max: 100, regenerationRate: 1 },
    roomId: 'default',
    lastUpdated: Date.now(),
    isMoving: false,
    speed: 150
  };
}

/**
 * Creates a full local player state with extended properties
 */
export function createLocalPlayerState(id: string, username: string): LocalPlayerState {
  return {
    ...createDefaultPlayerState(id, username),
    inputs: {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
      timestamp: Date.now()
    },
    pendingUpdates: [],
    inventory: {
      items: [],
      maxSlots: 20,
      gold: 0
    },
    stats: {
      level: 1,
      experience: 0,
      strength: 10,
      agility: 10,
      intelligence: 10
    },
    effects: []
  };
} 