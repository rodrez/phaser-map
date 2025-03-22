import { logger, LogCategory } from './Logger';
import webSocketClient from './WebSocketClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * FlagService - Manages flag-related functionality with the server
 * This service handles flag placement, teleportation, and flag data synchronization
 */
class FlagService {
  constructor() {
    // Map of all flags
    this.flags = new Map();
    
    // Flag update callbacks
    this.onFlagPlacedCallbacks = new Set();
    this.onFlagRemovedCallbacks = new Set();
    this.onFlagUpdateCallbacks = new Set();
    this.onTeleportCallbacks = new Set();
    
    // Player's last known position
    this.playerPosition = null;
    
    // Initialize WebSocket handlers
    this.initializeSocketHandlers();
    
    logger.info(LogCategory.FLAG, 'FlagService initialized');
  }
  
  /**
   * Initialize WebSocket message handlers for flag-related events
   */
  initializeSocketHandlers() {
    // Handler for flag placement response
    webSocketClient.registerHandler('flag-placed', (data) => {
      if (data.success) {
        logger.info(LogCategory.FLAG, `Server confirmed flag placement at ${data.flag.position.lat}, ${data.flag.position.lng}`);
        this.addFlag(data.flag);
        this.triggerFlagPlaced(data.flag);
      } else {
        logger.error(LogCategory.FLAG, `Flag placement failed: ${data.error}`);
      }
    });
    
    // Handler for others placing flags
    webSocketClient.registerHandler('flag-placed-by-other', (data) => {
      logger.info(LogCategory.FLAG, `Player ${data.ownerId} placed a flag at ${data.flag.position.lat}, ${data.flag.position.lng}`);
      this.addFlag(data.flag);
      this.triggerFlagPlaced(data.flag);
    });
    
    // Handler for flag removed
    webSocketClient.registerHandler('flag-removed', (data) => {
      if (data.success) {
        logger.info(LogCategory.FLAG, `Flag ${data.flagId} removed`);
        this.removeFlag(data.flagId);
        this.triggerFlagRemoved(data.flagId, data.resources);
      } else {
        logger.error(LogCategory.FLAG, `Flag removal failed: ${data.error}`);
      }
    });
    
    // Handler for flag update
    webSocketClient.registerHandler('flag-updated', (data) => {
      logger.info(LogCategory.FLAG, `Flag ${data.flag.id} updated`);
      this.updateFlag(data.flag);
      this.triggerFlagUpdate(data.flag);
    });
    
    // Handler for teleport response
    webSocketClient.registerHandler('teleport-result', (data) => {
      if (data.success) {
        logger.info(LogCategory.FLAG, `Teleported to flag at ${data.position.lat}, ${data.position.lng}`);
        this.triggerTeleport(data.position, data.visualBoundary);
      } else {
        logger.error(LogCategory.FLAG, `Teleport failed: ${data.error}`);
      }
    });
    
    // Handler for initial flags
    webSocketClient.registerHandler('initial-flags', (data) => {
      logger.info(LogCategory.FLAG, `Received ${data.flags.length} initial flags`);
      
      // Clear existing flags
      this.flags.clear();
      
      // Add all received flags
      for (const flag of data.flags) {
        this.addFlag(flag);
      }
      
      // Notify all listeners about the update
      this.triggerFlagsLoaded(Array.from(this.flags.values()));
    });
  }
  
  /**
   * Request all flags in a certain area or bounding box
   * @param {Object} params - Query parameters
   * @param {string} params.areaId - Area ID (optional)
   * @param {Object} params.bounds - Bounding box (optional)
   */
  requestFlags(params = {}) {
    // If we're authenticated, request flags
    if (webSocketClient.isAuthenticated) {
      if (params.areaId) {
        webSocketClient.send('request-flags', { areaId: params.areaId });
      } else if (params.bounds) {
        webSocketClient.send('request-flags', { bounds: params.bounds });
      } else {
        // Default to requesting all flags
        webSocketClient.send('request-flags', {});
      }
    } else {
      logger.warn(LogCategory.FLAG, 'Cannot request flags: not authenticated');
    }
  }
  
  /**
   * Place a flag at the specified position
   * @param {Object} position - Position object {lat, lng}
   * @param {Object} options - Flag options
   * @param {string} options.name - Flag name
   * @param {boolean} options.isPublic - Whether the flag is public
   * @param {number} options.toll - Toll for public flags
   * @returns {string} - Temporary flag ID (will be replaced with server ID)
   */
  placeFlag(position, options = {}) {
    // Track the player's position
    this.playerPosition = position;
    
    // Generate a temporary local flag ID
    const tempFlagId = `temp_${uuidv4()}`;
    
    // Create a temporary local flag object
    const tempFlag = {
      id: tempFlagId,
      ownerId: webSocketClient.playerId,
      name: options.name || `Flag of ${webSocketClient.username}`,
      position,
      isPublic: options.isPublic || false,
      toll: options.isPublic ? (options.toll || 0) : 0,
      isHardened: false,
      isTemporary: true,  // Mark as temporary until server confirms
      createdAt: Date.now()
    };
    
    // Add to our local collection 
    this.addFlag(tempFlag);
    
    // Trigger the flag placed event
    this.triggerFlagPlaced(tempFlag);
    
    // Send the request to the server
    webSocketClient.send('place-flag', {
      position,
      options
    });
    
    return tempFlagId;
  }
  
  /**
   * Remove a flag
   * @param {string} flagId - Flag ID
   */
  removeOwnFlag(flagId) {
    // Check if we have this flag
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      logger.warn(LogCategory.FLAG, `Cannot remove flag ${flagId}: flag not found`);
      return;
    }
    
    // Check if we own this flag
    if (flag.ownerId !== webSocketClient.playerId) {
      logger.warn(LogCategory.FLAG, `Cannot remove flag ${flagId}: you do not own this flag`);
      return;
    }
    
    // Send the request to the server
    webSocketClient.send('remove-flag', { flagId });
    
    // Optimistically remove the flag locally
    this.removeFlag(flagId);
    this.triggerFlagRemoved(flagId);
  }
  
  /**
   * Harden a flag
   * @param {string} flagId - Flag ID
   */
  hardenFlag(flagId) {
    // Check if we have this flag
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      logger.warn(LogCategory.FLAG, `Cannot harden flag ${flagId}: flag not found`);
      return;
    }
    
    // Check if we own this flag
    if (flag.ownerId !== webSocketClient.playerId) {
      logger.warn(LogCategory.FLAG, `Cannot harden flag ${flagId}: you do not own this flag`);
      return;
    }
    
    // Send the request to the server
    webSocketClient.send('harden-flag', { flagId });
  }
  
  /**
   * Teleport to a flag
   * @param {string} flagId - Flag ID
   */
  teleportToFlag(flagId) {
    // Check if we have this flag
    const flag = this.flags.get(flagId);
    
    if (!flag) {
      logger.warn(LogCategory.FLAG, `Cannot teleport to flag ${flagId}: flag not found`);
      return;
    }
    
    // Send the request to the server
    webSocketClient.send('teleport-to-flag', { flagId });
  }
  
  /**
   * Add a flag to the local collection
   * @param {Object} flag - Flag object
   */
  addFlag(flag) {
    // Replace any temporary flag with the same server ID
    if (!flag.isTemporary) {
      // Check if we have a temporary flag at the same position
      for (const [id, existingFlag] of this.flags.entries()) {
        if (existingFlag.isTemporary && this.isSamePosition(existingFlag.position, flag.position)) {
          // Remove the temporary flag
          this.flags.delete(id);
          logger.info(LogCategory.FLAG, `Replaced temporary flag ${id} with server flag ${flag.id}`);
          break;
        }
      }
    }
    
    // Add or update the flag
    this.flags.set(flag.id, flag);
  }
  
  /**
   * Remove a flag from the local collection
   * @param {string} flagId - Flag ID
   */
  removeFlag(flagId) {
    this.flags.delete(flagId);
  }
  
  /**
   * Update a flag in the local collection
   * @param {Object} flag - Flag object
   */
  updateFlag(flag) {
    if (this.flags.has(flag.id)) {
      this.flags.set(flag.id, { ...this.flags.get(flag.id), ...flag });
    } else {
      this.addFlag(flag);
    }
  }
  
  /**
   * Get a flag by ID
   * @param {string} flagId - Flag ID
   * @returns {Object|null} - Flag object or null if not found
   */
  getFlag(flagId) {
    return this.flags.get(flagId) || null;
  }
  
  /**
   * Get all flags
   * @returns {Array} - Array of flag objects
   */
  getAllFlags() {
    return Array.from(this.flags.values());
  }
  
  /**
   * Get player's own flags
   * @returns {Array} - Array of flag objects owned by the player
   */
  getOwnFlags() {
    return this.getAllFlags().filter(flag => flag.ownerId === webSocketClient.playerId);
  }
  
  /**
   * Get flags within a certain range
   * @param {Object} position - Position object {lat, lng}
   * @param {number} range - Range in meters
   * @returns {Array} - Array of flag objects within range
   */
  getFlagsInRange(position, range) {
    // Filter flags by distance
    return this.getAllFlags().filter(flag => {
      const distance = this.calculateDistance(position, flag.position);
      return distance <= range;
    });
  }
  
  /**
   * Calculate distance between two positions
   * @param {Object} pos1 - First position {lat, lng}
   * @param {Object} pos2 - Second position {lat, lng}
   * @returns {number} - Distance in meters
   */
  calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
  
  /**
   * Check if two positions are the same (with small margin for error)
   * @param {Object} pos1 - First position {lat, lng}
   * @param {Object} pos2 - Second position {lat, lng}
   * @returns {boolean} - Whether the positions are the same
   */
  isSamePosition(pos1, pos2) {
    const EPSILON = 0.0001; // Approximately 10m at equator
    return Math.abs(pos1.lat - pos2.lat) < EPSILON && Math.abs(pos1.lng - pos2.lng) < EPSILON;
  }
  
  /**
   * Update player position
   * @param {Object} position - Position object {lat, lng}
   */
  updatePlayerPosition(position) {
    this.playerPosition = position;
  }
  
  /**
   * Register a callback for when a flag is placed
   * @param {Function} callback - Callback function
   */
  onFlagPlaced(callback) {
    this.onFlagPlacedCallbacks.add(callback);
  }
  
  /**
   * Unregister a callback for when a flag is placed
   * @param {Function} callback - Callback function
   */
  offFlagPlaced(callback) {
    this.onFlagPlacedCallbacks.delete(callback);
  }
  
  /**
   * Register a callback for when a flag is removed
   * @param {Function} callback - Callback function
   */
  onFlagRemoved(callback) {
    this.onFlagRemovedCallbacks.add(callback);
  }
  
  /**
   * Unregister a callback for when a flag is removed
   * @param {Function} callback - Callback function
   */
  offFlagRemoved(callback) {
    this.onFlagRemovedCallbacks.delete(callback);
  }
  
  /**
   * Register a callback for when a flag is updated
   * @param {Function} callback - Callback function
   */
  onFlagUpdate(callback) {
    this.onFlagUpdateCallbacks.add(callback);
  }
  
  /**
   * Unregister a callback for when a flag is updated
   * @param {Function} callback - Callback function
   */
  offFlagUpdate(callback) {
    this.onFlagUpdateCallbacks.delete(callback);
  }
  
  /**
   * Register a callback for when a teleport occurs
   * @param {Function} callback - Callback function
   */
  onTeleport(callback) {
    this.onTeleportCallbacks.add(callback);
  }
  
  /**
   * Unregister a callback for when a teleport occurs
   * @param {Function} callback - Callback function
   */
  offTeleport(callback) {
    this.onTeleportCallbacks.delete(callback);
  }
  
  /**
   * Trigger flag placed event
   * @param {Object} flag - Flag object
   */
  triggerFlagPlaced(flag) {
    for (const callback of this.onFlagPlacedCallbacks) {
      try {
        callback(flag);
      } catch (error) {
        logger.error(LogCategory.FLAG, `Error in flag placed callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Trigger flag removed event
   * @param {string} flagId - Flag ID
   * @param {Object} resources - Resources returned (if any)
   */
  triggerFlagRemoved(flagId, resources = null) {
    for (const callback of this.onFlagRemovedCallbacks) {
      try {
        callback(flagId, resources);
      } catch (error) {
        logger.error(LogCategory.FLAG, `Error in flag removed callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Trigger flag update event
   * @param {Object} flag - Flag object
   */
  triggerFlagUpdate(flag) {
    for (const callback of this.onFlagUpdateCallbacks) {
      try {
        callback(flag);
      } catch (error) {
        logger.error(LogCategory.FLAG, `Error in flag update callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Trigger teleport event
   * @param {Object} position - Position object {lat, lng}
   * @param {number} visualBoundary - Visual boundary radius
   */
  triggerTeleport(position, visualBoundary) {
    for (const callback of this.onTeleportCallbacks) {
      try {
        callback(position, visualBoundary);
      } catch (error) {
        logger.error(LogCategory.FLAG, `Error in teleport callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Trigger flags loaded event
   * @param {Array} flags - Array of flag objects
   */
  triggerFlagsLoaded(flags) {
    // Custom event for initial flag loading
    const event = new CustomEvent('flags-loaded', { detail: flags });
    window.dispatchEvent(event);
  }
}

// Export a singleton instance
export default new FlagService(); 