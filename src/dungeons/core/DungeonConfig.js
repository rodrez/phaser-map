/**
 * DungeonConfig - Configuration system for dungeons
 * This file defines the structure and configuration options for different dungeon types
 */

import { logger, LogCategory } from '../../utils/Logger';

/**
 * Base dungeon configuration class
 * All dungeon types should extend this class
 */
export class BaseDungeonConfig {
  /**
   * Constructor for BaseDungeonConfig
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Basic dungeon properties
    this.id = options.id || 'base-dungeon';
    this.name = options.name || 'Base Dungeon';
    this.description = options.description || 'A basic dungeon template';
    this.difficulty = options.difficulty || 1;
    this.minLevel = options.minLevel || 1;
    this.maxLevel = options.maxLevel || 10;
    
    // Visual and audio themes
    this.theme = options.theme || 'default';
    this.backgroundKey = options.backgroundKey || 'dungeon-background';
    this.musicKey = options.musicKey || 'dungeon-music';
    this.ambientSoundKey = options.ambientSoundKey || 'dungeon-ambient';
    
    // Room generation parameters
    this.roomConfig = {
      minRooms: options.minRooms || 5,
      maxRooms: options.maxRooms || 10,
      roomTypes: options.roomTypes || ['standard', 'monster', 'treasure', 'boss'],
      roomSizeMin: options.roomSizeMin || { width: 800, height: 600 },
      roomSizeMax: options.roomSizeMax || { width: 1200, height: 900 },
      ...options.roomConfig
    };
    
    // Monster configuration
    this.monsterConfig = {
      types: options.monsterTypes || ['default'],
      density: options.monsterDensity || 0.5, // 0-1 scale for how many monsters per room
      bossTypes: options.bossTypes || ['default-boss'],
      ...options.monsterConfig
    };
    
    // Treasure and reward configuration
    this.treasureConfig = {
      commonItems: options.commonItems || [],
      rareItems: options.rareItems || [],
      epicItems: options.epicItems || [],
      legendaryItems: options.legendaryItems || [],
      goldRange: options.goldRange || { min: 10, max: 100 },
      ...options.treasureConfig
    };
    
    // Special mechanics for this dungeon type
    this.specialMechanics = options.specialMechanics || [];
    
    // Custom event handlers
    this.eventHandlers = options.eventHandlers || {};
    
    logger.info(LogCategory.DUNGEON, `Created dungeon config: ${this.name}`);
  }
  
  /**
   * Get room generation parameters for a specific level
   * @param {number} level - The dungeon level
   * @returns {Object} Room generation parameters
   */
  getRoomGenerationParams(level) {
    // Base implementation - can be overridden by specific dungeon types
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      numRooms: Math.floor(this.roomConfig.minRooms + difficultyFactor * (this.roomConfig.maxRooms - this.roomConfig.minRooms)),
      roomTypes: this.roomConfig.roomTypes,
      roomSizeRange: {
        min: this.roomConfig.roomSizeMin,
        max: this.roomConfig.roomSizeMax
      }
    };
  }
  
  /**
   * Get monster configuration for a specific level
   * @param {number} level - The dungeon level
   * @returns {Object} Monster configuration
   */
  getMonsterConfig(level) {
    // Base implementation - can be overridden by specific dungeon types
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      types: this.monsterConfig.types,
      density: this.monsterConfig.density,
      bossTypes: this.monsterConfig.bossTypes,
      levelMultiplier: 1 + (difficultyFactor * 0.5) // Monsters get 50% stronger at max level
    };
  }
  
  /**
   * Get treasure configuration for a specific level
   * @param {number} level - The dungeon level
   * @returns {Object} Treasure configuration
   */
  getTreasureConfig(level) {
    // Base implementation - can be overridden by specific dungeon types
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      commonDropChance: 0.7 - (difficultyFactor * 0.2), // Less common items at higher levels
      rareDropChance: 0.25 + (difficultyFactor * 0.1),
      epicDropChance: 0.04 + (difficultyFactor * 0.08),
      legendaryDropChance: 0.01 + (difficultyFactor * 0.02),
      goldMultiplier: 1 + difficultyFactor // More gold at higher levels
    };
  }
  
  /**
   * Check if a special mechanic is enabled for this dungeon
   * @param {string} mechanicName - The name of the mechanic to check
   * @returns {boolean} Whether the mechanic is enabled
   */
  hasMechanic(mechanicName) {
    return this.specialMechanics.includes(mechanicName);
  }
  
  /**
   * Get an event handler for a specific event
   * @param {string} eventName - The name of the event
   * @returns {Function|null} The event handler or null if not found
   */
  getEventHandler(eventName) {
    return this.eventHandlers[eventName] || null;
  }
}

/**
 * Registry of all available dungeon configurations
 */
export class DungeonConfigRegistry {
  constructor() {
    this.configs = new Map();
  }
  
  /**
   * Register a dungeon configuration
   * @param {BaseDungeonConfig} config - The dungeon configuration to register
   */
  register(config) {
    if (!(config instanceof BaseDungeonConfig)) {
      logger.error(LogCategory.DUNGEON, 'Attempted to register invalid dungeon config');
      return;
    }
    
    this.configs.set(config.id, config);
    logger.info(LogCategory.DUNGEON, `Registered dungeon config: ${config.name} (${config.id})`);
  }
  
  /**
   * Get a dungeon configuration by ID
   * @param {string} id - The dungeon configuration ID
   * @returns {BaseDungeonConfig|null} The dungeon configuration or null if not found
   */
  get(id) {
    return this.configs.get(id) || null;
  }
  
  /**
   * Get all registered dungeon configurations
   * @returns {Array<BaseDungeonConfig>} Array of all dungeon configurations
   */
  getAll() {
    return Array.from(this.configs.values());
  }
  
  /**
   * Get all dungeon configurations that are available at a specific player level
   * @param {number} playerLevel - The player's level
   * @returns {Array<BaseDungeonConfig>} Array of available dungeon configurations
   */
  getAvailableForLevel(playerLevel) {
    return this.getAll().filter(config => 
      playerLevel >= config.minLevel && 
      (config.maxLevel === 0 || playerLevel <= config.maxLevel)
    );
  }
}

// Create and export the global dungeon config registry
export const dungeonConfigRegistry = new DungeonConfigRegistry(); 