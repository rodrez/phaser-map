/**
 * Common interfaces and types for the Player System
 * This file contains shared type definitions used throughout the player components
 */

// Basic position type used for coordinates
export interface Position {
  x: number;
  y: number;
}

// Geographic position with latitude and longitude
export interface GeoPosition {
  latitude: number;
  longitude: number;
}

// Map location data
export interface MapLocation {
  id: string;
  position: Position;
  geoPosition?: GeoPosition;
  name?: string;
  type?: string;
}

// Player movement options
export interface MovementOptions {
  x?: number;
  y?: number;
  speed?: number;
  faceDirection?: boolean;
  animate?: boolean;
}

// Tree interactions
export interface TreeChopData {
  tree: Phaser.GameObjects.Sprite;
  requiredDistance: number;
  chopDuration: number;
  onComplete?: (tree: Phaser.GameObjects.Sprite) => void;
}

// Fruit gathering data
export interface FruitGatherData {
  fruit: Phaser.GameObjects.Sprite;
  requiredDistance: number;
  healingPower: number;
}

// Player health-related types
export interface HealthData {
  current: number;
  max: number;
  regenerationRate?: number;
}

// Status effect configuration
export interface StatusEffectConfig {
  damage?: number;
  duration: number;
  visualEffect?: string;
  tickInterval?: number;
}

// Flag placement options
export interface FlagPlacementOptions {
  position: Position;
  animate?: boolean;
  showParticles?: boolean;
}

// Animation configuration
export interface AnimationConfig {
  key: string;
  frameRate?: number;
  repeat?: number;
  ignoreIfPlaying?: boolean;
}

// Debug options
export interface DebugOptions {
  showHitAreas?: boolean;
  logMovement?: boolean;
  showPaths?: boolean;
} 