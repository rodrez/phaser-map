/**
 * GeospatialAreaSystem.js
 * Manages game areas with geospatial coordinates
 */

import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class GeospatialAreaSystem {
  constructor() {
    // Map of all registered areas
    this.areas = new Map();

    // Spatial index structure (simple for now)
    this.index = {
      // Stores area IDs in a grid of latitude/longitude bands
      grid: new Map(),
      // Grid cell size in degrees
      cellSize: 0.05
    };

    // Track whether we're in test mode
    this.testMode = process.env.NODE_ENV === 'test';

    logger.info('GeospatialAreaSystem initialized');
  }

  /**
   * Set up initial game areas
   */
  async setupInitialAreas() {
    try {
      logger.info('Setting up initial game areas');
      
      // Set up a starting area
      this.registerArea({
        id: 'starting-area',
        name: 'Starting Area',
        boundingBox: {
          minLat: 0,
          maxLat: 1,
          minLng: 0,
          maxLng: 1
        },
        properties: {
          type: 'safe',
          description: 'A safe area for new players',
          allowPvP: false,
          allowBuilding: true
        }
      });
      
      // Set up a forest area
      this.registerArea({
        id: 'forest',
        name: 'Dense Forest',
        boundingBox: {
          minLat: 1,
          maxLat: 2,
          minLng: 0,
          maxLng: 1
        },
        properties: {
          type: 'wilderness',
          description: 'A dense forest with resources',
          allowPvP: true,
          allowBuilding: true,
          resources: ['wood', 'herbs']
        }
      });
      
      // Set up a desert area
      this.registerArea({
        id: 'desert',
        name: 'Vast Desert',
        boundingBox: {
          minLat: 0,
          maxLat: 1,
          minLng: 1,
          maxLng: 2
        },
        properties: {
          type: 'wilderness',
          description: 'A vast desert with scarce resources',
          allowPvP: true,
          allowBuilding: false,
          resources: ['minerals', 'gems'],
          hazards: ['heat', 'sandstorms']
        }
      });
      
      // Set up a mountain area
      this.registerArea({
        id: 'mountains',
        name: 'Mountain Range',
        boundingBox: {
          minLat: 1,
          maxLat: 2,
          minLng: 1,
          maxLng: 2
        },
        properties: {
          type: 'wilderness',
          description: 'A rugged mountain range',
          allowPvP: true,
          allowBuilding: true,
          resources: ['stone', 'ore', 'gems'],
          hazards: ['cold', 'avalanches']
        }
      });
      
      logger.info(`Initial game areas set up: ${this.areas.size} areas registered`);
      return true;
    } catch (error) {
      logger.error(`Error setting up initial game areas: ${error.message}`);
      return false;
    }
  }

  /**
   * Register a new area with the system
   * @param {Object} area - Area definition
   * @returns {Boolean} - Whether registration was successful
   */
  registerArea(area) {
    try {
      // Validate required properties
      if (!area.id || !area.name || !area.boundingBox) {
        logger.error('Invalid area definition: missing required properties');
        return false;
      }

      const { minLat, maxLat, minLng, maxLng } = area.boundingBox;
      
      // Validate bounding box
      if (minLat >= maxLat || minLng >= maxLng) {
        logger.error('Invalid area bounding box: min values must be less than max values');
        return false;
      }

      // Add unique ID if not provided
      if (!area.id) {
        area.id = uuidv4();
      }

      // Add creation timestamp
      area.createdAt = Date.now();

      // Store the area
      this.areas.set(area.id, area);

      // Add to spatial index
      this._addToSpatialIndex(area);

      logger.info(`Area registered: ${area.name} (${area.id})`);
      return true;
    } catch (error) {
      logger.error(`Error registering area: ${error.message}`);
      return false;
    }
  }

  /**
   * Get an area by ID
   * @param {String} areaId - The area ID
   * @returns {Object|null} - The area definition, or null if not found
   */
  getArea(areaId) {
    return this.areas.get(areaId) || null;
  }

  /**
   * Get all registered areas
   * @returns {Array} - Array of area definitions
   */
  getAllAreas() {
    return Array.from(this.areas.values());
  }

  /**
   * Find areas within a bounding box
   * @param {Object} boundingBox - Bounding box defined by {minLat, maxLat, minLng, maxLng}
   * @returns {Array} - Array of area definitions within the bounding box
   */
  getAreasInBoundingBox(boundingBox) {
    try {
      const { minLat, maxLat, minLng, maxLng } = boundingBox;
      
      // Get potentially intersecting areas from the spatial index
      const candidateAreaIds = this._getAreasFromSpatialIndex(boundingBox);
      
      // Filter areas to those that actually intersect with the bounding box
      const intersectingAreas = [];
      
      for (const areaId of candidateAreaIds) {
        const area = this.areas.get(areaId);
        if (!area) continue;
        
        const areaBoundingBox = area.boundingBox;
        
        // Check for intersection
        if (this._boundingBoxesIntersect(areaBoundingBox, boundingBox)) {
          intersectingAreas.push(area);
        }
      }
      
      return intersectingAreas;
    } catch (error) {
      logger.error(`Error getting areas in bounding box: ${error.message}`);
      return [];
    }
  }

  /**
   * Find the area containing a specific point
   * @param {Object} point - Point defined by {lat, lng}
   * @returns {Array} - Array of area definitions containing the point (may be multiple)
   */
  getAreasAtPoint(point) {
    try {
      const { lat, lng } = point;
      
      const containingAreas = [];
      
      for (const area of this.areas.values()) {
        const { minLat, maxLat, minLng, maxLng } = area.boundingBox;
        
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          containingAreas.push(area);
        }
      }
      
      return containingAreas;
    } catch (error) {
      logger.error(`Error getting areas at point: ${error.message}`);
      return [];
    }
  }

  /**
   * Update an existing area
   * @param {String} areaId - The area ID
   * @param {Object} updates - The updates to apply
   * @returns {Boolean} - Whether the update was successful
   */
  updateArea(areaId, updates) {
    try {
      // Check if area exists
      if (!this.areas.has(areaId)) {
        logger.warn(`Attempted to update non-existent area ${areaId}`);
        return false;
      }
      
      const area = this.areas.get(areaId);
      
      // If updating the bounding box, validate it
      if (updates.boundingBox) {
        const { minLat, maxLat, minLng, maxLng } = updates.boundingBox;
        
        if (minLat >= maxLat || minLng >= maxLng) {
          logger.error('Invalid area bounding box: min values must be less than max values');
          return false;
        }
        
        // Remove from old spatial index
        this._removeFromSpatialIndex(area);
      }
      
      // Update the area
      const updatedArea = {
        ...area,
        ...updates,
        updatedAt: Date.now()
      };
      
      // Store the updated area
      this.areas.set(areaId, updatedArea);
      
      // Update spatial index if bounding box changed
      if (updates.boundingBox) {
        this._addToSpatialIndex(updatedArea);
      }
      
      logger.info(`Area updated: ${updatedArea.name} (${areaId})`);
      return true;
    } catch (error) {
      logger.error(`Error updating area ${areaId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete an area
   * @param {String} areaId - The area ID
   * @returns {Boolean} - Whether deletion was successful
   */
  deleteArea(areaId) {
    try {
      // Check if area exists
      if (!this.areas.has(areaId)) {
        logger.warn(`Attempted to delete non-existent area ${areaId}`);
        return false;
      }
      
      const area = this.areas.get(areaId);
      
      // Remove from spatial index
      this._removeFromSpatialIndex(area);
      
      // Remove from areas map
      this.areas.delete(areaId);
      
      logger.info(`Area deleted: ${areaId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting area ${areaId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Add an area to the spatial index
   * @private
   * @param {Object} area - The area to add
   */
  _addToSpatialIndex(area) {
    const { minLat, maxLat, minLng, maxLng } = area.boundingBox;
    const { cellSize } = this.index;
    
    // Find grid cells that intersect with area
    const minLatCell = Math.floor(minLat / cellSize);
    const maxLatCell = Math.floor(maxLat / cellSize);
    const minLngCell = Math.floor(minLng / cellSize);
    const maxLngCell = Math.floor(maxLng / cellSize);
    
    // Add area ID to each intersecting cell
    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        const cellKey = `${latCell}:${lngCell}`;
        
        if (!this.index.grid.has(cellKey)) {
          this.index.grid.set(cellKey, new Set());
        }
        
        this.index.grid.get(cellKey).add(area.id);
      }
    }
  }

  /**
   * Remove an area from the spatial index
   * @private
   * @param {Object} area - The area to remove
   */
  _removeFromSpatialIndex(area) {
    const { minLat, maxLat, minLng, maxLng } = area.boundingBox;
    const { cellSize } = this.index;
    
    // Find grid cells that intersect with area
    const minLatCell = Math.floor(minLat / cellSize);
    const maxLatCell = Math.floor(maxLat / cellSize);
    const minLngCell = Math.floor(minLng / cellSize);
    const maxLngCell = Math.floor(maxLng / cellSize);
    
    // Remove area ID from each intersecting cell
    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        const cellKey = `${latCell}:${lngCell}`;
        
        if (this.index.grid.has(cellKey)) {
          this.index.grid.get(cellKey).delete(area.id);
          
          // Clean up empty cells
          if (this.index.grid.get(cellKey).size === 0) {
            this.index.grid.delete(cellKey);
          }
        }
      }
    }
  }

  /**
   * Get candidate areas from the spatial index
   * @private
   * @param {Object} boundingBox - The bounding box to check
   * @returns {Set} - Set of area IDs that might intersect with the bounding box
   */
  _getAreasFromSpatialIndex(boundingBox) {
    const { minLat, maxLat, minLng, maxLng } = boundingBox;
    const { cellSize } = this.index;
    
    // Find grid cells that intersect with bounding box
    const minLatCell = Math.floor(minLat / cellSize);
    const maxLatCell = Math.floor(maxLat / cellSize);
    const minLngCell = Math.floor(minLng / cellSize);
    const maxLngCell = Math.floor(maxLng / cellSize);
    
    // Collect all area IDs from intersecting cells
    const areaIds = new Set();
    
    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        const cellKey = `${latCell}:${lngCell}`;
        
        if (this.index.grid.has(cellKey)) {
          for (const areaId of this.index.grid.get(cellKey)) {
            areaIds.add(areaId);
          }
        }
      }
    }
    
    return areaIds;
  }

  /**
   * Check if two bounding boxes intersect
   * @private
   * @param {Object} box1 - First bounding box
   * @param {Object} box2 - Second bounding box
   * @returns {Boolean} - Whether the boxes intersect
   */
  _boundingBoxesIntersect(box1, box2) {
    return (
      box1.minLat <= box2.maxLat &&
      box1.maxLat >= box2.minLat &&
      box1.minLng <= box2.maxLng &&
      box1.maxLng >= box2.minLng
    );
  }
}

export default new GeospatialAreaSystem(); 