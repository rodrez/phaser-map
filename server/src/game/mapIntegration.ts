/**
 * Map Integration utilities for the game server
 * This file provides helper functions for integrating with Leaflet maps
 */
import { createGeoSpatialHashGrid } from './geoSpatialHashGrid.js';
import { GeoCoordinates } from 'shared';

// Default map configuration (can be overridden when initializing)
const defaultMapConfig = {
  lat: 51.505, // Default center latitude (London)
  lng: -0.09,  // Default center longitude (London)
  boundaryRadius: 600, // Radius of the playable area in meters
  territoryRadius: 500, // Radius of territory captures in meters
  cellSize: 100 // Size of spatial grid cells in meters
};

/**
 * Create a map integration service
 * @param config Optional configuration to override defaults
 */
export function createMapIntegration(config = {}) {
  // Merge provided config with defaults
  const mapConfig = { ...defaultMapConfig, ...config };
  
  // Create the spatial grid for this map
  const grid = createGeoSpatialHashGrid(mapConfig.cellSize);
  
  // Map bounds
  const bounds = {
    center: { lat: mapConfig.lat, lng: mapConfig.lng },
    radius: mapConfig.boundaryRadius
  };
  
  // Territories and flags
  const territories: Map<string, {
    id: string;
    position: GeoCoordinates;
    radius: number;
    ownerId?: string;
    captureProgress?: number;
  }> = new Map();
  
  /**
   * Calculate distance between two points using the Haversine formula
   * @param point1 First point
   * @param point2 Second point
   * @returns Distance in meters
   */
  function calculateDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
    return grid.calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
  }
  
  /**
   * Check if a position is within the play area boundary
   * @param position Position to check
   * @returns True if position is within boundary
   */
  function isPositionWithinBoundary(position: GeoCoordinates): boolean {
    const distance = calculateDistance(position, bounds.center);
    return distance <= bounds.radius;
  }
  
  /**
   * Add a territory flag at a position
   * @param id Unique ID for the territory
   * @param position Position of the territory flag
   * @param ownerId Optional initial owner ID
   * @returns The created territory or null if invalid position
   */
  function addTerritory(id: string, position: GeoCoordinates, ownerId?: string) {
    // Check if position is valid
    if (!isPositionWithinBoundary(position)) {
      return null;
    }
    
    // Check if too close to another territory
    for (const territory of territories.values()) {
      const distance = calculateDistance(position, territory.position);
      if (distance < mapConfig.territoryRadius) {
        return null;
      }
    }
    
    // Create the territory
    const territory = {
      id,
      position,
      radius: mapConfig.territoryRadius,
      ownerId,
      captureProgress: ownerId ? 100 : 0
    };
    
    territories.set(id, territory);
    return territory;
  }
  
  /**
   * Remove a territory
   * @param id Territory ID
   * @returns True if territory was removed
   */
  function removeTerritory(id: string): boolean {
    return territories.delete(id);
  }
  
  /**
   * Get all entities within a specific territory
   * @param territoryId Territory ID
   * @returns Array of entity IDs or empty array if territory not found
   */
  function getEntitiesInTerritory(territoryId: string): string[] {
    const territory = territories.get(territoryId);
    if (!territory) return [];
    
    return grid.getNearbyEntities(
      territory.position.lat,
      territory.position.lng,
      territory.radius
    );
  }
  
  /**
   * Check if an entity is within any territory
   * @param entityId Entity ID
   * @returns Array of territory IDs the entity is within
   */
  function getTerritoriesContainingEntity(entityId: string): string[] {
    const position = grid.getEntityPosition(entityId);
    if (!position) return [];
    
    const result: string[] = [];
    
    for (const [id, territory] of territories.entries()) {
      const distance = calculateDistance(position, territory.position);
      if (distance <= territory.radius) {
        result.push(id);
      }
    }
    
    return result;
  }
  
  /**
   * Generate random position within the play area boundary
   * @returns Random position within the boundary
   */
  function generateRandomPosition(): GeoCoordinates {
    // Randomize a distance from center (using square root to ensure uniform distribution)
    const distance = Math.sqrt(Math.random()) * bounds.radius;
    
    // Randomize an angle
    const angle = Math.random() * 2 * Math.PI;
    
    // Calculate the position using a custom implementation of the destination point formula
    // This would have been grid.destinationPoint previously
    
    // Convert angle to radians
    const angRad = angle;
    // Earth's radius in meters
    const earthRadius = 6371000;
    
    // Current point in radians
    const lat1 = bounds.center.lat * (Math.PI / 180);
    const lng1 = bounds.center.lng * (Math.PI / 180);
    
    // Calculate new lat/lng
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / earthRadius) +
                          Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(angRad));
    
    const lng2 = lng1 + Math.atan2(Math.sin(angRad) * Math.sin(distance / earthRadius) * Math.cos(lat1),
                                  Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2));
    
    // Convert back to degrees
    return {
      lat: lat2 * (180 / Math.PI),
      lng: lng2 * (180 / Math.PI)
    };
  }
  
  /**
   * Generate a set of territory positions that don't overlap
   * @param count Number of territories to generate
   * @returns Array of valid territory positions
   */
  function generateTerritoryPositions(count: number): GeoCoordinates[] {
    const positions: GeoCoordinates[] = [];
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      
      // Generate a random position
      const position = generateRandomPosition();
      
      // Check if it's valid (not too close to existing territories)
      let isValid = true;
      
      for (const territory of territories.values()) {
        const distance = calculateDistance(position, territory.position);
        if (distance < mapConfig.territoryRadius * 2) {
          isValid = false;
          break;
        }
      }
      
      for (const existingPosition of positions) {
        const distance = calculateDistance(position, existingPosition);
        if (distance < mapConfig.territoryRadius * 2) {
          isValid = false;
          break;
        }
      }
      
      if (isValid) {
        positions.push(position);
      }
    }
    
    return positions;
  }
  
  return {
    // Grid access
    grid,
    
    // Territory management
    addTerritory,
    removeTerritory,
    getEntitiesInTerritory,
    getTerritoriesContainingEntity,
    getAllTerritories: () => Array.from(territories.values()),
    
    // Position utilities
    calculateDistance,
    isPositionWithinBoundary,
    generateRandomPosition,
    generateTerritoryPositions,
    
    // Configuration
    getMapConfig: () => ({ ...mapConfig }),
    getBounds: () => ({ ...bounds })
  };
} 