/**
 * FlagSystem.js
 * Manages player-placed flags that control territory and movement on the world map
 */

import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import PlayerStateSystem from './PlayerStateSystem.js';

// Constants for flag system
const FLAG_DEFAULTS = {
  RADIUS: 500, // Base radius in meters
  VISUAL_BOUNDARY: 600, // Visual boundary radius in meters
  MATERIALS: {
    LEATHER: 3,
    WOOD: 3,
    STONE: 2, // For hardened flags
  },
  HEALTH: 200, // Default flag health
  ABANDONED_TIMEOUT: 2 * 7 * 24 * 60 * 60 * 1000, // 2 weeks in milliseconds
  TAKEOVER_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 1 month in milliseconds
};

class FlagSystem {
  constructor() {
    // Map of all flags
    this.flags = new Map(); // flagId -> flag object
    
    // Spatial index for efficient spatial queries
    this.spatialIndex = new Map(); // cellKey -> Set of flagIds
    
    // Index of flags by owner
    this.ownerFlags = new Map(); // ownerId -> Set of flagIds
    
    // Grid cell size in degrees (approximately 1km at equator)
    this.cellSize = 0.01;
    
    // Track test mode
    this.testMode = process.env.NODE_ENV === 'test';
    
    logger.info('FlagSystem initialized');
  }

  /**
   * Set up initial system flags
   * @returns {Promise<boolean>} Success status
   */
  async setupInitialFlags() {
    try {
      logger.info('Setting up initial system flags');
      
      // Create a system flag at the origin/starting point
      await this.createFlag({
        id: 'system-start-flag',
        ownerId: 'system',
        name: 'Starting Point',
        position: {
          lat: 0,
          lng: 0
        },
        type: 'system',
        isPublic: true,
        toll: 0,
        isHardened: true,
        health: FLAG_DEFAULTS.HEALTH
      });
      
      // Create several system flags at key locations around the world
      // These could be capital cities or important landmarks
      const keyLocations = [
        { name: 'North America', lat: 39.8283, lng: -98.5795 },
        { name: 'South America', lat: -8.7832, lng: -55.4915 },
        { name: 'Europe', lat: 54.5260, lng: 15.2551 },
        { name: 'Africa', lat: 8.7832, lng: 34.5085 },
        { name: 'Asia', lat: 34.0479, lng: 100.6197 },
        { name: 'Australia', lat: -25.2744, lng: 133.7751 }
      ];
      
      for (const location of keyLocations) {
        await this.createFlag({
          id: `system-${location.name.toLowerCase().replace(/\s+/g, '-')}`,
          ownerId: 'system',
          name: `${location.name} Portal`,
          position: {
            lat: location.lat,
            lng: location.lng
          },
          type: 'system',
          isPublic: true,
          toll: 0,
          isHardened: true,
          health: FLAG_DEFAULTS.HEALTH
        });
      }
      
      logger.info(`Initial flags setup complete: ${this.flags.size} flags created`);
      return true;
    } catch (error) {
      logger.error(`Error setting up initial flags: ${error.message}`);
      return false;
    }
  }

  /**
   * Player places a new flag
   * @param {string} playerId - Player placing the flag
   * @param {Object} position - Position {lat, lng}
   * @param {Object} options - Flag options
   * @returns {Promise<Object>} Result object {success, flagId, error}
   */
  async placeFlag(playerId, position, options = {}) {
    try {
      const { name = `Flag of ${playerId}`, isPublic = false, toll = 0 } = options;
      
      // Check if player exists
      const player = await PlayerStateSystem.getPlayer(playerId);
      if (!player) {
        return { success: false, error: 'Player not found' };
      }
      
      // Check if position is valid
      if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        return { success: false, error: 'Invalid position' };
      }
      
      // Check if player can place a flag at this position
      const placementCheck = await this.canPlaceFlagAt(playerId, position);
      if (!placementCheck.allowed) {
        return { success: false, error: placementCheck.reason };
      }
      
      // Check if player has required materials
      // In a real implementation, check player inventory
      // For now, assume they have the materials
      
      // Create the flag
      const flagId = uuidv4();
      const newFlag = {
        id: flagId,
        ownerId: playerId,
        name,
        position,
        radius: FLAG_DEFAULTS.RADIUS,
        visualBoundary: FLAG_DEFAULTS.VISUAL_BOUNDARY,
        isPublic,
        toll: isPublic ? toll : 0,
        isHardened: false,
        isAbandoned: false,
        health: FLAG_DEFAULTS.HEALTH,
        type: 'normal',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastVisited: Date.now()
      };
      
      // Store the flag
      await this.createFlag(newFlag);
      
      logger.info(`Player ${playerId} placed flag ${flagId} at ${position.lat}, ${position.lng}`);
      
      return { 
        success: true, 
        flagId,
        flag: newFlag
      };
    } catch (error) {
      logger.error(`Error placing flag for player ${playerId}:`, { error: error.message });
      return { success: false, error: `Failed to place flag: ${error.message}` };
    }
  }

  /**
   * Create a flag in the system
   * @param {Object} flagData - Flag data
   * @returns {Promise<boolean>} Success status
   */
  async createFlag(flagData) {
    try {
      // Validate required properties
      if (!flagData.id || !flagData.position) {
        logger.error('Invalid flag data: missing required properties');
        return false;
      }
      
      // Store the flag
      this.flags.set(flagData.id, flagData);
      
      // Add to spatial index
      this._addToSpatialIndex(flagData);
      
      // Add to owner index if not a system flag
      if (flagData.ownerId && flagData.ownerId !== 'system') {
        this._addToOwnerIndex(flagData.id, flagData.ownerId);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error creating flag ${flagData.id}:`, { error: error.message });
      return false;
    }
  }

  /**
   * Check if a player can place a flag at a position
   * @param {string} playerId - Player ID
   * @param {Object} position - Position {lat, lng}
   * @returns {Promise<Object>} Result {allowed, reason}
   */
  async canPlaceFlagAt(playerId, position) {
    try {
      // Check if the position is within 600m of one of the player's existing flags
      // This is the key game mechanic - players can only expand territory by
      // jumping between flags
      
      // Get player's flags
      const playerFlags = await this.getPlayerFlags(playerId);
      let withinExistingFlag = false;
      
      // If player has no flags, they can only place at the starting location
      // In a real implementation, check if they're a new player
      if (playerFlags.length === 0) {
        // For new players, check if they're at the starting location
        const startFlag = this.flags.get('system-start-flag');
        if (startFlag) {
          const distance = this._calculateDistance(position, startFlag.position);
          withinExistingFlag = distance <= startFlag.visualBoundary;
        }
        
        if (!withinExistingFlag) {
          return { 
            allowed: false, 
            reason: 'New players must place their first flag near the starting point' 
          };
        }
      } else {
        // Check if the position is within any of the player's flags' boundaries
        for (const flag of playerFlags) {
          const distance = this._calculateDistance(position, flag.position);
          if (distance <= flag.visualBoundary) {
            withinExistingFlag = true;
            break;
          }
        }
        
        if (!withinExistingFlag) {
          return { 
            allowed: false, 
            reason: 'Flags must be placed within 600m of your existing flags' 
          };
        }
      }
      
      // Check if the position overlaps with other players' flags
      // Find flags close to the position
      const nearbyFlags = await this.getFlagsInRange(position, FLAG_DEFAULTS.RADIUS);
      
      // Filter out player's own flags
      const otherFlags = nearbyFlags.filter(f => f.ownerId !== playerId && f.ownerId !== 'system');
      
      // Check for overlap with other players' territories
      for (const flag of otherFlags) {
        const distance = this._calculateDistance(position, flag.position);
        
        // If the new flag would overlap with another player's flag territory
        if (distance < (FLAG_DEFAULTS.RADIUS + flag.radius)) {
          return { 
            allowed: false, 
            reason: `This location overlaps with ${flag.name} owned by another player` 
          };
        }
      }
      
      // All checks passed
      return { allowed: true };
    } catch (error) {
      logger.error(`Error checking flag placement for player ${playerId}:`, { error: error.message });
      return { allowed: false, reason: `Error checking placement: ${error.message}` };
    }
  }

  /**
   * Check if a player can teleport to a flag
   * @param {string} playerId - Player ID
   * @param {string} flagId - Flag ID
   * @returns {Promise<Object>} Result {allowed, cost, reason}
   */
  async canTeleportToFlag(playerId, flagId) {
    try {
      // Get the flag
      const flag = this.flags.get(flagId);
      if (!flag) {
        return { allowed: false, reason: 'Flag not found' };
      }
      
      // Player can always teleport to their own flags
      if (flag.ownerId === playerId) {
        return { allowed: true, cost: 0 };
      }
      
      // System flags are always accessible
      if (flag.ownerId === 'system') {
        return { allowed: true, cost: 2 }; // Cost in Roc Feathers
      }
      
      // Public flags are accessible with a toll
      if (flag.isPublic) {
        return { allowed: true, cost: flag.toll };
      }
      
      // Private flags are only accessible to the owner
      return { allowed: false, reason: 'This flag is private' };
    } catch (error) {
      logger.error(`Error checking teleport permission for player ${playerId} to flag ${flagId}:`, { error: error.message });
      return { allowed: false, reason: `Error checking permission: ${error.message}` };
    }
  }

  /**
   * Teleport a player to a flag
   * @param {string} playerId - Player ID
   * @param {string} flagId - Flag ID
   * @returns {Promise<Object>} Result {success, position, error}
   */
  async teleportToFlag(playerId, flagId) {
    try {
      // Check if player can teleport to this flag
      const teleportCheck = await this.canTeleportToFlag(playerId, flagId);
      if (!teleportCheck.allowed) {
        return { success: false, error: teleportCheck.reason };
      }
      
      // Get the flag
      const flag = this.flags.get(flagId);
      if (!flag) {
        return { success: false, error: 'Flag not found' };
      }
      
      // In a real implementation, deduct the cost from player's inventory
      const teleportCost = teleportCheck.cost;
      
      // Update flag last visited time
      flag.lastVisited = Date.now();
      this.flags.set(flagId, flag);
      
      logger.info(`Player ${playerId} teleported to flag ${flagId} for ${teleportCost} cost`);
      
      // Return the position to teleport to
      return {
        success: true,
        position: flag.position,
        visualBoundary: flag.visualBoundary
      };
    } catch (error) {
      logger.error(`Error teleporting player ${playerId} to flag ${flagId}:`, { error: error.message });
      return { success: false, error: `Teleport failed: ${error.message}` };
    }
  }

  /**
   * Upgrade a flag to a hardened status
   * @param {string} playerId - Player ID
   * @param {string} flagId - Flag ID
   * @returns {Promise<Object>} Result {success, error}
   */
  async hardenFlag(playerId, flagId) {
    try {
      // Get the flag
      const flag = this.flags.get(flagId);
      if (!flag) {
        return { success: false, error: 'Flag not found' };
      }
      
      // Check if player owns the flag
      if (flag.ownerId !== playerId) {
        return { success: false, error: 'You do not own this flag' };
      }
      
      // Check if flag is already hardened
      if (flag.isHardened) {
        return { success: false, error: 'Flag is already hardened' };
      }
      
      // In a real implementation, check if player has required materials (2 Stone)
      
      // Update flag to hardened status
      flag.isHardened = true;
      flag.updatedAt = Date.now();
      this.flags.set(flagId, flag);
      
      logger.info(`Player ${playerId} hardened flag ${flagId}`);
      
      return { success: true, flag };
    } catch (error) {
      logger.error(`Error hardening flag ${flagId} for player ${playerId}:`, { error: error.message });
      return { success: false, error: `Failed to harden flag: ${error.message}` };
    }
  }

  /**
   * Remove a flag (player removing their own flag)
   * @param {string} playerId - Player ID
   * @param {string} flagId - Flag ID
   * @returns {Promise<Object>} Result {success, resources, error}
   */
  async removeFlag(playerId, flagId) {
    try {
      // Get the flag
      const flag = this.flags.get(flagId);
      if (!flag) {
        return { success: false, error: 'Flag not found' };
      }
      
      // Check if player owns the flag
      if (flag.ownerId !== playerId) {
        return { success: false, error: 'You do not own this flag' };
      }
      
      // Check if flag is a special type that can't be removed
      if (flag.type === 'system') {
        return { success: false, error: 'System flags cannot be removed' };
      }
      
      // Special structures have different resource returns
      let returnedResources = {};
      
      if (flag.type === 'roc-shrine') {
        returnedResources = { wood: 5, stone: 5 };
      } else if (flag.type === 'guard-tower') {
        returnedResources = { wood: 10, stone: 10 };
        // Add iron if upgraded
      } else if (flag.isHardened) {
        returnedResources = { wood: 1, leather: 1, stone: 1 };
      } else {
        returnedResources = { wood: 1, leather: 1 };
      }
      
      // Remove the flag
      this._removeFromSpatialIndex(flag);
      this._removeFromOwnerIndex(flag.id, flag.ownerId);
      this.flags.delete(flag.id);
      
      logger.info(`Player ${playerId} removed flag ${flagId}`);
      
      return { 
        success: true, 
        resources: returnedResources
      };
    } catch (error) {
      logger.error(`Error removing flag ${flagId} for player ${playerId}:`, { error: error.message });
      return { success: false, error: `Failed to remove flag: ${error.message}` };
    }
  }

  /**
   * Get all flags owned by a player
   * @param {string} playerId - Player ID
   * @returns {Promise<Array>} Array of flag objects
   */
  async getPlayerFlags(playerId) {
    try {
      if (!this.ownerFlags.has(playerId)) {
        return [];
      }
      
      const flagIds = this.ownerFlags.get(playerId);
      const flags = [];
      
      for (const flagId of flagIds) {
        const flag = this.flags.get(flagId);
        if (flag) {
          flags.push(flag);
        }
      }
      
      return flags;
    } catch (error) {
      logger.error(`Error getting flags for player ${playerId}:`, { error: error.message });
      return [];
    }
  }

  /**
   * Get flags within a certain range of a position
   * @param {Object} position - Position {lat, lng}
   * @param {number} range - Range in meters
   * @returns {Promise<Array>} Array of flag objects
   */
  async getFlagsInRange(position, range) {
    try {
      // Convert range from meters to approximate degrees
      // This is a simplification; 0.00001 degrees is roughly 1.11 meters at the equator
      const rangeDegrees = range * 0.00001;
      
      // Create a bounding box
      const boundingBox = {
        minLat: position.lat - rangeDegrees,
        maxLat: position.lat + rangeDegrees,
        minLng: position.lng - rangeDegrees,
        maxLng: position.lng + rangeDegrees
      };
      
      // Get flags in the bounding box
      const flagsInBox = await this.getFlagsInBoundingBox(boundingBox);
      
      // Filter flags by actual distance
      return flagsInBox.filter(flag => {
        const distance = this._calculateDistance(position, flag.position);
        return distance <= range;
      });
    } catch (error) {
      logger.error(`Error getting flags in range:`, { error: error.message });
      return [];
    }
  }

  /**
   * Get flags within a bounding box
   * @param {Object} boundingBox - {minLat, maxLat, minLng, maxLng}
   * @returns {Promise<Array>} Array of flag objects
   */
  async getFlagsInBoundingBox(boundingBox) {
    try {
      const { minLat, maxLat, minLng, maxLng } = boundingBox;
      
      // Find grid cells that intersect with bounding box
      const minLatCell = Math.floor(minLat / this.cellSize);
      const maxLatCell = Math.floor(maxLat / this.cellSize);
      const minLngCell = Math.floor(minLng / this.cellSize);
      const maxLngCell = Math.floor(maxLng / this.cellSize);
      
      // Collect all flags from intersecting cells
      const flagIds = new Set();
      
      for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
        for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
          const cellKey = `${latCell}:${lngCell}`;
          
          if (this.spatialIndex.has(cellKey)) {
            for (const flagId of this.spatialIndex.get(cellKey)) {
              flagIds.add(flagId);
            }
          }
        }
      }
      
      // Get the actual flags and filter by bounding box containment
      const flags = [];
      
      for (const flagId of flagIds) {
        const flag = this.flags.get(flagId);
        if (flag) {
          if (
            flag.position.lat >= minLat && flag.position.lat <= maxLat &&
            flag.position.lng >= minLng && flag.position.lng <= maxLng
          ) {
            flags.push(flag);
          }
        }
      }
      
      return flags;
    } catch (error) {
      logger.error(`Error getting flags in bounding box:`, { error: error.message });
      return [];
    }
  }

  /**
   * Check for abandoned flags and update their status
   * @returns {Promise<number>} Number of flags updated
   */
  async checkForAbandonedFlags() {
    try {
      const now = Date.now();
      let updatedCount = 0;
      
      for (const [flagId, flag] of this.flags.entries()) {
        // Skip system flags
        if (flag.ownerId === 'system') continue;
        
        // Skip special structures that can't be abandoned
        if (flag.type === 'roc-shrine' || flag.type === 'guard-tower') continue;
        
        // If flag hasn't been visited in 2 weeks, mark as abandoned
        if (!flag.isAbandoned && (now - flag.lastVisited) > FLAG_DEFAULTS.ABANDONED_TIMEOUT) {
          flag.isAbandoned = true;
          flag.updatedAt = now;
          this.flags.set(flagId, flag);
          updatedCount++;
          
          logger.info(`Flag ${flagId} owned by ${flag.ownerId} marked as abandoned`);
        }
      }
      
      return updatedCount;
    } catch (error) {
      logger.error(`Error checking for abandoned flags:`, { error: error.message });
      return 0;
    }
  }

  /**
   * Get all flags in the system
   * @returns {Array} Array of all flag objects
   */
  getAllFlags() {
    return Array.from(this.flags.values());
  }

  /**
   * Add a flag to the spatial index
   * @private
   * @param {Object} flag - Flag object
   */
  _addToSpatialIndex(flag) {
    const { lat, lng } = flag.position;
    
    // Calculate cell coordinates
    const latCell = Math.floor(lat / this.cellSize);
    const lngCell = Math.floor(lng / this.cellSize);
    const cellKey = `${latCell}:${lngCell}`;
    
    // Add flag to cell
    if (!this.spatialIndex.has(cellKey)) {
      this.spatialIndex.set(cellKey, new Set());
    }
    
    this.spatialIndex.get(cellKey).add(flag.id);
  }

  /**
   * Remove a flag from the spatial index
   * @private
   * @param {Object} flag - Flag object
   */
  _removeFromSpatialIndex(flag) {
    const { lat, lng } = flag.position;
    
    // Calculate cell coordinates
    const latCell = Math.floor(lat / this.cellSize);
    const lngCell = Math.floor(lng / this.cellSize);
    const cellKey = `${latCell}:${lngCell}`;
    
    // Remove flag from cell
    if (this.spatialIndex.has(cellKey)) {
      this.spatialIndex.get(cellKey).delete(flag.id);
      
      // Clean up empty cells
      if (this.spatialIndex.get(cellKey).size === 0) {
        this.spatialIndex.delete(cellKey);
      }
    }
  }

  /**
   * Add a flag to owner index
   * @private
   * @param {string} flagId - Flag ID
   * @param {string} ownerId - Owner ID
   */
  _addToOwnerIndex(flagId, ownerId) {
    if (!this.ownerFlags.has(ownerId)) {
      this.ownerFlags.set(ownerId, new Set());
    }
    
    this.ownerFlags.get(ownerId).add(flagId);
  }

  /**
   * Remove a flag from owner index
   * @private
   * @param {string} flagId - Flag ID
   * @param {string} ownerId - Owner ID
   */
  _removeFromOwnerIndex(flagId, ownerId) {
    if (this.ownerFlags.has(ownerId)) {
      this.ownerFlags.get(ownerId).delete(flagId);
      
      // Clean up empty sets
      if (this.ownerFlags.get(ownerId).size === 0) {
        this.ownerFlags.delete(ownerId);
      }
    }
  }

  /**
   * Calculate the distance between two points in meters
   * @private
   * @param {Object} point1 - {lat, lng}
   * @param {Object} point2 - {lat, lng}
   * @returns {number} Distance in meters
   */
  _calculateDistance(point1, point2) {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371e3; // Earth radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
}

// Export as singleton
export default new FlagSystem(); 