/**
 * LostSwampDungeon - Configuration for the lost swamp dungeon type
 */

import { BaseDungeonConfig, dungeonConfigRegistry } from '../core/DungeonConfig';
import { MonsterType } from '../../monsters/MonsterTypes';
import { logger, LogCategory } from '../../utils/Logger';

/**
 * Lost Swamp dungeon configuration
 * A mysterious swamp filled with dangerous creatures and hidden treasures
 */
export class LostSwampDungeonConfig extends BaseDungeonConfig {
  /**
   * Constructor for LostSwampDungeonConfig
   * @param {Object} options - Additional configuration options
   */
  constructor(options = {}) {
    // Set swamp-specific default options
    const swampOptions = {
      id: 'lost-swamp',
      name: 'Lost Swamp',
      description: 'A mysterious swamp filled with dangerous creatures and hidden treasures.',
      difficulty: 3,
      minLevel: 5,
      maxLevel: 10,
      
      // Visual and audio themes
      theme: 'swamp',
      backgroundKey: 'swamp-background',
      musicKey: 'swamp-music',
      ambientSoundKey: 'swamp-ambient',
      
      // Room configuration
      roomConfig: {
        minRooms: 7,
        maxRooms: 14,
        roomTypes: ['shallow-water', 'deep-water', 'muddy-ground', 'dry-patch', 'ancient-tree', 'boss'],
        roomSizeMin: { width: 800, height: 600 },
        roomSizeMax: { width: 1300, height: 950 }
      },
      
      // Monster configuration
      monsterConfig: {
        types: [
          MonsterType.LIZARDFOLK,
          MonsterType.WOLF,
          MonsterType.BOAR
        ],
        density: 0.7,
        bossTypes: [MonsterType.LIZARDFOLK_KING]
      },
      
      // Treasure configuration
      treasureConfig: {
        commonItems: ['swamp-boots', 'poison-antidote', 'minor-healing-potion'],
        rareItems: ['lizard-scale-armor', 'poison-dagger', 'swamp-map'],
        epicItems: ['staff-of-the-marsh', 'lizardfolk-spear'],
        legendaryItems: ['crown-of-the-lizard-king'],
        goldRange: { min: 30, max: 200 }
      },
      
      // Special mechanics
      specialMechanics: [
        'poison-resistance', // Players need poison resistance in certain areas
        'slow-movement', // Movement is slowed in swampy areas
        'fog-of-war', // Limited visibility in foggy areas
        'quicksand' // Dangerous quicksand traps
      ],
      
      // Merge with any provided options
      ...options
    };
    
    // Call parent constructor with merged options
    super(swampOptions);
    
    // Swamp-specific properties
    this.fogDensity = options.fogDensity || 0.6; // How dense the fog is (affects visibility)
    this.waterDepth = options.waterDepth || 0.5; // How deep the water is (affects movement)
    this.poisonTypes = ['weak', 'standard', 'deadly'];
    this.quicksandLocations = options.quicksandLocations || 0.3; // Chance of quicksand in a room
    
    // Special handling for level 4 (boss level with Lizardfolk King)
    this.specialLevelConfig = {
      4: {
        bossName: 'Lizardfolk King',
        bossLevel: 10,
        bossHealth: 500,
        bossDamage: 25,
        bossDefense: 15,
        guardCount: 4, // Number of lizardfolk guards protecting the king
        specialRewards: ['crown-of-the-lizard-king', 'royal-lizard-scale']
      }
    };
    
    logger.info(LogCategory.DUNGEON, `Lost Swamp dungeon config created: ${this.name}`);
  }
  
  /**
   * Override the room generation parameters for swamp dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Room generation parameters
   */
  getRoomGenerationParams(level) {
    const baseParams = super.getRoomGenerationParams(level);
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    // Add swamp-specific room generation parameters
    return {
      ...baseParams,
      fogDensity: this.fogDensity + (difficultyFactor * 0.2), // Fog gets denser at higher levels
      waterDepth: this.waterDepth + (difficultyFactor * 0.3), // Water gets deeper at higher levels
      hasQuicksand: Math.random() < this.quicksandLocations + (difficultyFactor * 0.2), // More quicksand at higher levels
      poisonLevel: this.poisonTypes[Math.min(Math.floor(difficultyFactor * this.poisonTypes.length), this.poisonTypes.length - 1)],
      isSpecialLevel: this.specialLevelConfig[level] !== undefined
    };
  }
  
  /**
   * Override the monster configuration for swamp dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Monster configuration
   */
  getMonsterConfig(level) {
    const baseConfig = super.getMonsterConfig(level);
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    // Check if this is a special level with specific configuration
    const isSpecialLevel = this.specialLevelConfig[level] !== undefined;
    
    // Adjust monster types based on level
    const availableTypes = [...this.monsterConfig.types];
    
    // Add more dangerous monsters at higher levels
    if (level >= 3) {
      availableTypes.push(MonsterType.OGRE);
    }
    
    // Special handling for level 4 (boss level)
    const bossList = isSpecialLevel && level === 4 
      ? [MonsterType.LIZARDFOLK_KING] 
      : [...this.monsterConfig.bossTypes];
    
    return {
      ...baseConfig,
      types: availableTypes,
      bossTypes: bossList,
      poisonAttack: true, // Swamp monsters can inflict poison
      poisonDamage: 5 + (level * 2),
      poisonDuration: 5000 + (level * 1000),
      ambushFromWater: level >= 2, // Higher level monsters can ambush from water
      packTactics: level >= 3, // Higher level monsters use pack tactics
      specialLevel: isSpecialLevel
    };
  }
  
  /**
   * Get swamp-specific hazard configuration
   * @param {number} level - The dungeon level
   * @returns {Object} Hazard configuration
   */
  getHazardConfig(level) {
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      poisonGasDamage: 3 + (level * 2),
      poisonGasDuration: 3000 + (level * 1000),
      poisonGasVisibility: true,
      
      quicksandSlowFactor: 0.3 + (difficultyFactor * 0.3), // How much quicksand slows the player
      quicksandDamage: 5 + (level * 2), // Damage per second in quicksand
      quicksandEscapeDifficulty: 0.4 + (difficultyFactor * 0.3), // Difficulty to escape (0-1)
      
      deepWaterSlowFactor: 0.5, // How much deep water slows the player
      deepWaterStaminaDrain: 10 + (level * 5), // Stamina drain per second in deep water
      
      fogVisibilityReduction: 0.3 + (difficultyFactor * 0.4) // How much fog reduces visibility (0-1)
    };
  }
  
  /**
   * Get special configuration for a specific level
   * @param {number} level - The dungeon level
   * @returns {Object|null} Special level configuration or null if not a special level
   */
  getSpecialLevelConfig(level) {
    return this.specialLevelConfig[level] || null;
  }
  
  /**
   * Check if a level is a special level (e.g., boss level with special mechanics)
   * @param {number} level - The dungeon level
   * @returns {boolean} Whether this is a special level
   */
  isSpecialLevel(level) {
    return this.specialLevelConfig[level] !== undefined;
  }
}

// Create and register the lost swamp dungeon configuration
export const lostSwampDungeonConfig = new LostSwampDungeonConfig();

// Register the lost swamp dungeon configuration
dungeonConfigRegistry.register(lostSwampDungeonConfig);
logger.info(LogCategory.DUNGEON, `Registered Lost Swamp dungeon: ${lostSwampDungeonConfig.name} (${lostSwampDungeonConfig.id})`); 