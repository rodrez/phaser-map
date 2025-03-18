/**
 * SpatialHashGrid for efficient spatial queries using Cartesian coordinates (x,y)
 * This implementation is designed for dungeon/instance areas with regular coordinates
 */
export function createSpatialHashGrid(cellSize: number = 50) {
  // Maps cell coordinates to a set of entity IDs
  const cells: Map<string, Set<string>> = new Map();
  
  // Maps entity IDs to their current cell and position
  const entityData: Map<string, { cellKey: string; x: number; y: number }> = new Map();
  
  /**
   * Get the cell key for a position
   * @param x X coordinate
   * @param y Y coordinate
   * @returns Cell key string
   */
  function getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    return `${cellX}:${cellY}`;
  }
  
  /**
   * Add an entity to the grid
   * @param entityId Entity ID
   * @param x X coordinate
   * @param y Y coordinate
   */
  function addEntity(entityId: string, x: number, y: number): void {
    const cellKey = getCellKey(x, y);
    
    // Create cell if it doesn't exist
    if (!cells.has(cellKey)) {
      cells.set(cellKey, new Set());
    }
    
    // Add entity to cell
    cells.get(cellKey)!.add(entityId);
    
    // Track entity's cell and position
    entityData.set(entityId, { cellKey, x, y });
  }
  
  /**
   * Remove an entity from the grid
   * @param entityId Entity ID
   * @param x Optional X coordinate (for performance when known)
   * @param y Optional Y coordinate (for performance when known)
   */
  function removeEntity(entityId: string, x?: number, y?: number): void {
    // If we have the position, use it directly
    if (x !== undefined && y !== undefined) {
      const cellKey = getCellKey(x, y);
      
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
   * @param entityId Entity ID
   * @param oldX Old X coordinate
   * @param oldY Old Y coordinate
   * @param newX New X coordinate
   * @param newY New Y coordinate
   */
  function updateEntity(
    entityId: string,
    oldX: number,
    oldY: number,
    newX: number,
    newY: number
  ): void {
    const oldCellKey = getCellKey(oldX, oldY);
    const newCellKey = getCellKey(newX, newY);
    
    // Skip if cell hasn't changed
    if (oldCellKey === newCellKey) {
      // Just update position
      entityData.set(entityId, { cellKey: oldCellKey, x: newX, y: newY });
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
    entityData.set(entityId, { cellKey: newCellKey, x: newX, y: newY });
  }
  
  /**
   * Get nearby cells for a position and radius
   * @param x X coordinate
   * @param y Y coordinate
   * @param radius Radius to search
   * @returns Array of cell keys
   */
  function getNearbyKeys(x: number, y: number, radius: number): string[] {
    const minCellX = Math.floor((x - radius) / cellSize);
    const maxCellX = Math.floor((x + radius) / cellSize);
    const minCellY = Math.floor((y - radius) / cellSize);
    const maxCellY = Math.floor((y + radius) / cellSize);
    
    const keys: string[] = [];
    
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        keys.push(`${cellX}:${cellY}`);
      }
    }
    
    return keys;
  }
  
  /**
   * Get entities near a position
   * @param x X coordinate
   * @param y Y coordinate
   * @param radius Radius to search
   * @returns Array of entity IDs
   */
  function getNearbyEntities(x: number, y: number, radius: number): string[] {
    const cellKeys = getNearbyKeys(x, y, radius);
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
    if (radius !== Infinity) {
      const radiusSquared = radius * radius;
      const result: string[] = [];
      
      for (const entityId of entityIds) {
        const entity = entityData.get(entityId);
        if (!entity) continue;
        
        const dx = entity.x - x;
        const dy = entity.y - y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared <= radiusSquared) {
          result.push(entityId);
        }
      }
      
      return result;
    }
    
    return Array.from(entityIds);
  }
  
  /**
   * Get the position of an entity
   * @param entityId Entity ID
   * @returns Position as {x, y} or null if not found
   */
  function getEntityPosition(entityId: string): {x: number, y: number} | null {
    const entity = entityData.get(entityId);
    if (!entity) return null;
    
    return { x: entity.x, y: entity.y };
  }
  
  /**
   * Calculate distance between two points
   * @param x1 First point X
   * @param y1 First point Y
   * @param x2 Second point X
   * @param y2 Second point Y
   * @returns Euclidean distance
   */
  function distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Get all entity IDs
   * @returns Array of entity IDs
   */
  function getAllEntities(): string[] {
    return Array.from(entityData.keys());
  }
  
  /**
   * Get all entities with their positions
   * @returns Array of objects with id, x, and y properties
   */
  function getAllEntityPositions(): Array<{id: string, x: number, y: number}> {
    return Array.from(entityData.entries()).map(([id, data]) => ({
      id,
      x: data.x,
      y: data.y
    }));
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
    getAllEntityPositions,
    distance,
    getCellSize: () => cellSize,
    clear,
    getStats: () => ({
      cells: cells.size,
      entities: entityData.size
    })
  };
} 