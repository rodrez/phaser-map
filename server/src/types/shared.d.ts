declare module 'shared' {
  // Re-export types from shared package
  export enum MessageType {
    JOIN_GAME = 'join_game',
    ENTITY_CREATE = 'entity_create',
    ENTITY_REMOVE = 'entity_remove',
    ENTITY_UPDATE = 'entity_update',
    ENTITY_INTERACT = 'entity_interact',
    PLAYER_MOVEMENT = 'player_movement',
    PLAYER_CHAT = 'player_chat',
    ERROR = 'error',
    GAME_STATE = 'game_state'
  }

  export interface NetworkMessage<T> {
    type: MessageType;
    data: T;
    timestamp: number;
    sequenceId?: number;
  }

  export interface GeoCoordinates {
    lat: number;
    lng: number;
  }

  export interface Vector2 {
    x: number;
    y: number;
  }

  export interface JoinGameMessage {
    username: string;
  }

  export interface PlayerMovementMessage {
    playerId?: string;
    lat?: number;
    lng?: number;
    position?: GeoCoordinates | Vector2;
    velocity?: Vector2;
    direction?: Vector2;
    isMoving?: boolean;
    timestamp?: number;
    sequenceId?: number;
  }

  export interface EntityUpdateMessage {
    id: string;
    type: string;
    position?: GeoCoordinates | Vector2;
    state?: any;
  }

  export interface ChatMessage {
    playerId: string;
    playerName: string;
    message: string;
    channelId: string;
    timestamp: number;
  }

  export interface ErrorMessage {
    code: string;
    message: string;
  }

  export interface EntityInteractMessage {
    type: string;
    id: string;
    action?: string;
    data?: any;
  }

  export enum EntityType {
    PLAYER = 'player',
    NPC = 'npc',
    MONSTER = 'monster',
    ITEM = 'item',
    FLAG = 'flag',
    STRUCTURE = 'structure'
  }

  export enum PlayerClass {
    WARRIOR = 'warrior',
    MAGE = 'mage',
    RANGER = 'ranger',
    HEALER = 'healer'
  }

  export const GAME_CONSTANTS: {
    WORLD_RADIUS_METERS: number;
    DEFAULT_MOVE_SPEED: number;
    MAX_PLAYER_LEVEL: number;
    INTERACTION_RADIUS: number;
    COMBAT_RANGE: {
      MELEE: number;
      RANGED: number;
    };
    SERVER_TICK_RATE: number;
    POSITION_UPDATE_RATE: number;
    GRID_CELL_SIZE: number;
  };
} 