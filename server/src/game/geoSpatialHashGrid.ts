/**
 * GeoSpatialHashGrid for efficient spatial queries using geographic coordinates (lat/lng)
 * This implementation is designed for overworld areas with geo-coordinates
 */
export function createGeoSpatialHashGrid(cellSizeMeters: number = 100) {
  // Maps cell coordinates to a set of entity IDs
  const cells: Map<string, Set<string>> = new Map();
  
  // Maps entity IDs to their current cell and position
  const entityData: Map<string, { cellKey: string; lat: number; lng: number }> = new Map();
  
  // Earth radius in meters
  const EARTH_RADIUS = 6371000;
  
  /**
   * Convert geo coordinates to cell key
   * Uses a simplified projection method
   */
  function getCellKey(lat: number, lng: number): string {
    // Approximate meters per degree at the equator
    const metersPerDegreeLat = 111111;
    // Adjust for longitude (varies by latitude)
    const metersPerDegreeLng = 111111 * Math.cos(lat * (Math.PI / 180));
    
    // Convert to cell coordinates
    const cellLat = Math.floor((lat * metersPerDegreeLat) / cellSizeMeters);
    const cellLng = Math.floor((lng * metersPerDegreeLng) / cellSizeMeters);
    
    return `${cellLat}:${cellLng}`;
  }
  
  /**
   * Add an entity to the grid
   */
  function addEntity(entityId: string, lat: number, lng: number): void {
    const cellKey = getCellKey(lat, lng);
    
    // Create cell if it doesn't exist
    if (!cells.has(cellKey)) {
      cells.set(cellKey, new Set());
    }
    
    // Add entity to cell
    cells.get(cellKey)!.add(entityId);
    
    // Track entity's cell and position
    entityData.set(entityId, { cellKey, lat, lng });
  }
  
  /**
   * Remove an entity from the grid
   */
  function removeEntity(entityId: string, lat?: number, lng?: number): void {
    // If we have the position, use it directly
    if (lat !== undefined && lng !== undefined) {
      const cellKey = getCellKey(lat, lng);
      
      // Remove entity from cell
      if (cells.has(cellKey)) {
        cells.get(cellKey)!.delete(entityId);
        
        // Clean up empty cells
        if (cells.get(cellKey)!.size === 0) {
          cells.delete(cellKey);
        }
      }
      
      // Remove entity tracking
      entityData.delete(entityId);
      return;
    }
    
    // Otherwise, look up the position from stored data
    const entity = entityData.get(entityId);
    if (!entity) return;
    
    const { cellKey } = entity;
    
    // Remove entity from cell
    if (cells.has(cellKey)) {
      cells.get(cellKey)!.delete(entityId);
      
      // Clean up empty cells
      if (cells.get(cellKey)!.size === 0) {
        cells.delete(cellKey);
      }
    }
    
    // Remove entity tracking
    entityData.delete(entityId);
  }
  
  /**
   * Update an entity's position in the grid
   */
  function updateEntity(
    entityId: string,
    oldLat: number,
    oldLng: number,
    newLat: number,
    newLng: number
  ): void {
    const oldCellKey = getCellKey(oldLat, oldLng);
    const newCellKey = getCellKey(newLat, newLng);
    
    // Skip if cell hasn't changed
    if (oldCellKey === newCellKey) {
      // Just update position
      entityData.set(entityId, { cellKey: oldCellKey, lat: newLat, lng: newLng });
      return;
    }
    
    // Remove from old cell
    if (cells.has(oldCellKey)) {
      cells.get(oldCellKey)!.delete(entityId);
      
      // Clean up empty cells
      if (cells.get(oldCellKey)!.size === 0) {
        cells.delete(oldCellKey);
      }
    }
    
    // Add to new cell
    if (!cells.has(newCellKey)) {
      cells.set(newCellKey, new Set());
    }
    cells.get(newCellKey)!.add(entityId);
    
    // Update entity tracking
    entityData.set(entityId, { cellKey: newCellKey, lat: newLat, lng: newLng });
  }
  
  /**
   * Get nearby cell keys within a radius
   */
  function getNearbyKeys(lat: number, lng: number, radiusMeters: number): string[] {
    // Approximate conversions
    const metersPerDegreeLat = 111111;
    const metersPerDegreeLng = 111111 * Math.cos(lat * (Math.PI / 180));
    
    // Convert radius to degrees
    const latRadius = radiusMeters / metersPerDegreeLat;
    const lngRadius = radiusMeters / metersPerDegreeLng;
    
    // Calculate bounding box
    const minLat = lat - latRadius;
    const maxLat = lat + latRadius;
    const minLng = lng - lngRadius;
    const maxLng = lng + lngRadius;
    
    // Convert to cell coordinates
    const minCellLat = Math.floor((minLat * metersPerDegreeLat) / cellSizeMeters);
    const maxCellLat = Math.floor((maxLat * metersPerDegreeLat) / cellSizeMeters);
    const minCellLng = Math.floor((minLng * metersPerDegreeLng) / cellSizeMeters);
    const maxCellLng = Math.floor((maxLng * metersPerDegreeLng) / cellSizeMeters);
    
    const keys: string[] = [];
    
    // Generate all cell keys in the bounding box
    for (let cellLat = minCellLat; cellLat <= maxCellLat; cellLat++) {
      for (let cellLng = minCellLng; cellLng <= maxCellLng; cellLng++) {
        keys.push(`${cellLat}:${cellLng}`);
      }
    }
    
    return keys;
  }
  
  /**
   * Get entities near a position
   */
  function getNearbyEntities(lat: number, lng: number, radiusMeters: number): string[] {
    const cellKeys = getNearbyKeys(lat, lng, radiusMeters);
    const entityIds: Set<string> = new Set();
    
    // Collect entities from all nearby cells
    for (const key of cellKeys) {
      if (cells.has(key)) {
        const cellEntities = cells.get(key)!;
        for (const entityId of cellEntities) {
          entityIds.add(entityId);
        }
      }
    }
    
    // Filter entities by exact distance if needed
    if (radiusMeters !== Infinity) {
      const result: string[] = [];
      
      for (const entityId of entityIds) {
        const entity = entityData.get(entityId);
        if (!entity) continue;
        
        const distance = calculateDistance(lat, lng, entity.lat, entity.lng);
        
        if (distance <= radiusMeters) {
          result.push(entityId);
        }
      }
      
      return result;
    }
    
    return Array.from(entityIds);
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Convert to radians
    const rlat1 = lat1 * (Math.PI / 180);
    const rlng1 = lng1 * (Math.PI / 180);
    const rlat2 = lat2 * (Math.PI / 180);
    const rlng2 = lng2 * (Math.PI / 180);
    
    // Haversine formula
    const dLat = rlat2 - rlat1;
    const dLng = rlng2 - rlng1;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rlat1) * Math.cos(rlat2) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS * c;
  }
  
  /**
   * Get the entity position
   */
  function getEntityPosition(entityId: string): { lat: number, lng: number } | null {
    const entity = entityData.get(entityId);
    if (!entity) return null;
    
    return { lat: entity.lat, lng: entity.lng };
  }
  
  /**
   * Get all entities
   */
  function getAllEntities(): string[] {
    return Array.from(entityData.keys());
  }
  
  /**
   * Clear the grid
   */
  function clear(): void {
    cells.clear();
    entityData.clear();
  }
  
  return {
    addEntity,
    removeEntity,
    updateEntity,
    getNearbyEntities,
    getEntityPosition,
    getAllEntities,
    calculateDistance,
    getCellSize: () => cellSizeMeters,
    clear
  };
} 