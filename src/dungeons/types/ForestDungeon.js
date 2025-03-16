/**
 * ForestDungeon - Configuration for the forest dungeon type
 */

import { BaseDungeonConfig, dungeonConfigRegistry } from '../core/DungeonConfig';
import { MonsterType } from '../../monsters/MonsterTypes';
import { logger, LogCategory } from '../../utils/Logger';

/**
 * Forest dungeon configuration
 * A lush forest dungeon with wildlife and natural hazards
 */
export class ForestDungeonConfig extends BaseDungeonConfig {
  /**
   * Constructor for ForestDungeonConfig
   * @param {Object} options - Additional configuration options
   */
  constructor(options = {}) {
    // Set forest-specific default options
    const forestOptions = {
      id: 'forest-dungeon',
      name: 'Enchanted Forest',
      description: 'A mystical forest filled with wildlife and ancient magic.',
      difficulty: 2,
      minLevel: 1,
      maxLevel: 5,
      
      // Visual and audio themes
      theme: 'forest',
      backgroundKey: 'forest-background',
      musicKey: 'forest-music',
      ambientSoundKey: 'forest-ambient',
      
      // Room configuration
      roomConfig: {
        minRooms: 6,
        maxRooms: 12,
        roomTypes: ['forest-clearing', 'dense-woods', 'stream', 'cave', 'ancient-tree', 'boss'],
        roomSizeMin: { width: 900, height: 700 },
        roomSizeMax: { width: 1400, height: 1000 }
      },
      
      // Monster configuration
      monsterConfig: {
        types: [
          MonsterType.WOLF,
          MonsterType.STAG,
          MonsterType.BOAR,
          MonsterType.BEAR
        ],
        density: 0.6,
        bossTypes: [MonsterType.BEAR]
      },
      
      // Treasure configuration
      treasureConfig: {
        commonItems: ['wooden-shield', 'leather-armor', 'healing-herb'],
        rareItems: ['hunter-bow', 'forest-staff', 'nature-amulet'],
        epicItems: ['ancient-bark-armor', 'wildwood-bow'],
        legendaryItems: ['staff-of-the-forest-keeper'],
        goldRange: { min: 15, max: 120 }
      },
      
      // Special mechanics
      specialMechanics: [
        'natural-healing', // Players heal slowly over time in forest areas
        'wildlife-interaction', // Some animals may be friendly or provide quests
        'seasonal-changes' // Forest changes based on in-game season
      ],
      
      // Merge with any provided options
      ...options
    };
    
    // Call parent constructor with merged options
    super(forestOptions);
    
    // Forest-specific properties
    this.weatherEffects = ['rain', 'fog', 'sunbeam'];
    this.forestDensity = options.forestDensity || 0.7; // How dense the forest is (affects visibility and movement)
    
    logger.info(LogCategory.DUNGEON, `Forest dungeon config created: ${this.name}`);
  }
  
  /**
   * Override the room generation parameters for forest dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Room generation parameters
   */
  getRoomGenerationParams(level) {
    const baseParams = super.getRoomGenerationParams(level);
    
    // Add forest-specific room generation parameters
    return {
      ...baseParams,
      forestDensity: this.forestDensity + (level * 0.05), // Forest gets denser at higher levels
      weatherEffect: this.weatherEffects[Math.floor(Math.random() * this.weatherEffects.length)],
      hasWaterFeatures: Math.random() > 0.5, // 50% chance of water features (streams, ponds)
      hasAncientTrees: level >= 3 // Ancient trees appear at level 3+
    };
  }
  
  /**
   * Override the monster configuration for forest dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Monster configuration
   */
  getMonsterConfig(level) {
    const baseConfig = super.getMonsterConfig(level);
    
    // Adjust monster types based on level
    let availableTypes = [...this.monsterConfig.types];
    
    // Add more dangerous monsters at higher levels
    if (level >= 3) {
      availableTypes.push(MonsterType.LIZARDFOLK);
    }
    
    if (level >= 5) {
      availableTypes.push(MonsterType.OGRE);
    }
    
    // Adjust boss types based on level
    let bossList = [...this.monsterConfig.bossTypes];
    
    if (level >= 4) {
      bossList.push(MonsterType.LIZARDFOLK_KING);
    }
    
    if (level >= 5) {
      bossList.push(MonsterType.DRAGON);
    }
    
    return {
      ...baseConfig,
      types: availableTypes,
      bossTypes: bossList,
      packBehavior: true, // Wolves and other animals may hunt in packs
      territorialBehavior: level >= 3 // Monsters become more territorial at higher levels
    };
  }
  
  /**
   * Get forest-specific weather effects
   * @param {number} level - The dungeon level
   * @returns {Object} Weather configuration
   */
  getWeatherConfig(level) {
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      rainChance: 0.3 + (difficultyFactor * 0.2),
      fogChance: 0.2 + (difficultyFactor * 0.3),
      thunderstormChance: difficultyFactor * 0.2,
      weatherIntensity: 0.5 + (difficultyFactor * 0.5),
      weatherDuration: 30000 + (difficultyFactor * 30000) // 30-60 seconds based on level
    };
  }
}

// Create and register the forest dungeon configuration
export const forestDungeonConfig = new ForestDungeonConfig();
dungeonConfigRegistry.register(forestDungeonConfig); 