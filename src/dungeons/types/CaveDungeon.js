/**
 * CaveDungeon - Configuration for the cave dungeon type
 */

import { BaseDungeonConfig, dungeonConfigRegistry } from '../core/DungeonConfig';
import { MonsterType } from '../../monsters/MonsterTypes';
import { logger, LogCategory } from '../../utils/Logger';

/**
 * Cave dungeon configuration
 * A dark, winding cave system with unique challenges
 */
export class CaveDungeonConfig extends BaseDungeonConfig {
  /**
   * Constructor for CaveDungeonConfig
   * @param {Object} options - Additional configuration options
   */
  constructor(options = {}) {
    // Set cave-specific default options
    const caveOptions = {
      id: 'cave-dungeon',
      name: 'Crystal Caverns',
      description: 'A vast network of underground caves filled with crystals, minerals, and dangerous creatures.',
      difficulty: 3,
      minLevel: 3,
      maxLevel: 8,
      
      // Visual and audio themes
      theme: 'cave',
      backgroundKey: 'cave-background',
      musicKey: 'cave-music',
      ambientSoundKey: 'cave-ambient',
      
      // Room configuration
      roomConfig: {
        minRooms: 8,
        maxRooms: 15,
        roomTypes: ['narrow-passage', 'crystal-chamber', 'underground-lake', 'mineral-deposit', 'lava-chamber', 'boss'],
        roomSizeMin: { width: 700, height: 500 },
        roomSizeMax: { width: 1200, height: 900 }
      },
      
      // Monster configuration
      monsterConfig: {
        types: [
          MonsterType.LIZARDFOLK,
          MonsterType.OGRE,
          MonsterType.BEAR // Cave bears
        ],
        density: 0.5,
        bossTypes: [MonsterType.DRAGON, MonsterType.LIZARDFOLK_KING]
      },
      
      // Treasure configuration
      treasureConfig: {
        commonItems: ['torch', 'mining-pick', 'minor-healing-potion'],
        rareItems: ['crystal-shard', 'miner-helmet', 'cave-map'],
        epicItems: ['crystal-sword', 'obsidian-armor'],
        legendaryItems: ['heart-of-the-mountain'],
        goldRange: { min: 50, max: 300 }
      },
      
      // Special mechanics
      specialMechanics: [
        'darkness', // Limited visibility without light sources
        'cave-ins', // Random cave-ins that can block paths or cause damage
        'crystal-power', // Crystals that provide temporary buffs
        'echo-location' // Sound-based navigation and monster detection
      ],
      
      // Merge with any provided options
      ...options
    };
    
    // Call parent constructor with merged options
    super(caveOptions);
    
    // Cave-specific properties
    this.lightLevels = ['pitch-black', 'dim', 'lit'];
    this.hazardTypes = ['falling-rocks', 'thin-ice', 'poisonous-gas', 'lava'];
    this.crystalTypes = ['healing', 'strength', 'defense', 'speed'];
    
    logger.info(LogCategory.DUNGEON, `Cave dungeon config created: ${this.name}`);
  }
  
  /**
   * Override the room generation parameters for cave dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Room generation parameters
   */
  getRoomGenerationParams(level) {
    const baseParams = super.getRoomGenerationParams(level);
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    // Add cave-specific room generation parameters
    return {
      ...baseParams,
      defaultLightLevel: this.lightLevels[Math.floor(difficultyFactor * (this.lightLevels.length - 1))],
      hazardChance: 0.2 + (difficultyFactor * 0.3),
      hazardTypes: this.hazardTypes,
      crystalDensity: 0.3 + (difficultyFactor * 0.2),
      crystalTypes: this.crystalTypes,
      hasCaveIns: level >= 5, // Cave-ins start at level 5
      hasUndergroundRivers: Math.random() > 0.5 // 50% chance of underground rivers
    };
  }
  
  /**
   * Override the monster configuration for cave dungeons
   * @param {number} level - The dungeon level
   * @returns {Object} Monster configuration
   */
  getMonsterConfig(level) {
    const baseConfig = super.getMonsterConfig(level);
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    // Adjust monster types based on level
    let availableTypes = [...this.monsterConfig.types];
    
    // Add more dangerous monsters at higher levels
    if (level >= 6) {
      availableTypes.push(MonsterType.DRAGON);
    }
    
    // Adjust boss types based on level
    let bossList = [...this.monsterConfig.bossTypes];
    
    if (level >= 7) {
      // Special cave dragon boss at high levels
      bossList = [MonsterType.DRAGON];
    }
    
    return {
      ...baseConfig,
      types: availableTypes,
      bossTypes: bossList,
      ambushBehavior: true, // Cave monsters tend to ambush from darkness
      echoLocation: level >= 4, // Higher level monsters can detect players by sound
      darkvision: true, // Cave monsters can see in the dark
      stealthBonus: 0.2 + (difficultyFactor * 0.3) // Monsters are harder to detect
    };
  }
  
  /**
   * Get cave-specific hazard configuration
   * @param {number} level - The dungeon level
   * @returns {Object} Hazard configuration
   */
  getHazardConfig(level) {
    const difficultyFactor = Math.min(level / this.maxLevel, 1);
    
    return {
      fallingRocksDamage: 10 + (level * 5),
      fallingRocksFrequency: 0.1 + (difficultyFactor * 0.2),
      
      poisonGasDamage: 5 + (level * 3),
      poisonGasDuration: 5000 + (level * 1000),
      poisonGasVisibility: true,
      
      lavaDamage: 20 + (level * 8),
      lavaFlowSpeed: 50 + (difficultyFactor * 50),
      
      thinIceBreakChance: 0.3 + (difficultyFactor * 0.4),
      thinIceFallDamage: 15 + (level * 5)
    };
  }
  
  /**
   * Get cave-specific crystal effects
   * @param {number} level - The dungeon level
   * @returns {Object} Crystal effects configuration
   */
  getCrystalEffects(level) {
    return {
      healing: {
        healthRestored: 20 + (level * 5),
        duration: 0 // Instant effect
      },
      strength: {
        damageBonus: 5 + (level * 2),
        duration: 30000 // 30 seconds
      },
      defense: {
        armorBonus: 10 + (level * 3),
        duration: 45000 // 45 seconds
      },
      speed: {
        speedBonus: 50 + (level * 10),
        duration: 20000 // 20 seconds
      }
    };
  }
}

// Create and register the cave dungeon configuration
export const caveDungeonConfig = new CaveDungeonConfig();
dungeonConfigRegistry.register(caveDungeonConfig); 