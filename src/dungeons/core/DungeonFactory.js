/**
 * DungeonFactory - Factory for creating dungeon instances
 * Uses the dungeon configuration system to create and configure dungeons
 */

import { logger, LogCategory } from '../../utils/Logger';
import { dungeonConfigRegistry } from './DungeonConfig';
import { MonsterFactory } from '../../monsters/MonsterFactory';
import { MonsterType } from '../../monsters/MonsterTypes';
import playerReferenceService from '../../utils/player/PlayerReferenceService';

/**
 * DungeonFactory class
 * Creates and configures dungeon instances based on dungeon type and level
 */
export class DungeonFactory {
  /**
   * Create a dungeon instance
   * @param {Object} scene - The Phaser scene
   * @param {string} dungeonId - The ID of the dungeon type to create
   * @param {number} level - The dungeon level
   * @param {Object} options - Additional options for dungeon creation
   * @returns {Object} The created dungeon instance
   */
  static createDungeon(scene, dungeonId, level, options = {}) {
    // Get the dungeon configuration
    const dungeonConfig = dungeonConfigRegistry.get(dungeonId);
    
    if (!dungeonConfig) {
      logger.error(LogCategory.DUNGEON, `Unknown dungeon type: ${dungeonId}`);
      throw new Error(`Unknown dungeon type: ${dungeonId}`);
    }
    
    logger.info(LogCategory.DUNGEON, `Creating dungeon: ${dungeonConfig.name} (Level ${level})`);
    
    // Create the dungeon data object
    const dungeon = {
      id: dungeonId,
      name: dungeonConfig.name,
      description: dungeonConfig.description,
      level: level,
      config: dungeonConfig,
      
      // Get room generation parameters from the config
      roomParams: dungeonConfig.getRoomGenerationParams(level),
      
      // Get monster configuration from the config
      monsterConfig: dungeonConfig.getMonsterConfig(level),
      
      // Get treasure configuration from the config
      treasureConfig: dungeonConfig.getTreasureConfig(level),
      
      // Store special mechanics
      specialMechanics: dungeonConfig.specialMechanics,
      
      // Add any additional options
      ...options
    };
    
    // Add dungeon-specific data based on the dungeon type
    switch (dungeonId) {
      case 'forest-dungeon':
        dungeon.weatherConfig = dungeonConfig.getWeatherConfig(level);
        break;
        
      case 'cave-dungeon':
        dungeon.hazardConfig = dungeonConfig.getHazardConfig(level);
        dungeon.crystalEffects = dungeonConfig.getCrystalEffects(level);
        break;
        
      case 'lost-swamp':
        dungeon.hazardConfig = dungeonConfig.getHazardConfig(level);
        
        // Check if this is a special level (like level 4 with the Lizardfolk King)
        if (dungeonConfig.isSpecialLevel && dungeonConfig.isSpecialLevel(level)) {
          dungeon.specialLevelConfig = dungeonConfig.getSpecialLevelConfig(level);
          dungeon.isSpecialLevel = true;
          
          logger.info(LogCategory.DUNGEON, `Special level configuration loaded for ${dungeonConfig.name} level ${level}`, {
            bossName: dungeon.specialLevelConfig.bossName,
            guardCount: dungeon.specialLevelConfig.guardCount
          });
        }
        break;
        
      // Add cases for other dungeon types as needed
    }
    
    logger.info(LogCategory.DUNGEON, `Dungeon created: ${dungeon.name} (Level ${level})`, {
      roomCount: dungeon.roomParams.numRooms,
      monsterTypes: dungeon.monsterConfig.types,
      specialMechanics: dungeon.specialMechanics
    });
    
    return dungeon;
  }
  
  /**
   * Create a monster for a dungeon
   * @param {Object} scene - The Phaser scene
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @param {Object} dungeon - The dungeon instance
   * @param {string} monsterType - The type of monster to create (optional, random if not specified)
   * @param {boolean} isBoss - Whether this is a boss monster
   * @param {Object} playerSprite - The player sprite
   * @param {Object} itemSystem - The item system
   * @returns {Object} The created monster
   */
  static createMonster(scene, x, y, dungeon, monsterType, isBoss, playerSprite, itemSystem) {
    // Get the monster configuration from the dungeon
    const monsterConfig = dungeon.monsterConfig;
    
    // If no monster type is specified, pick a random one from the available types
    if (!monsterType) {
      const availableTypes = isBoss ? monsterConfig.bossTypes : monsterConfig.types;
      if (availableTypes && availableTypes.length > 0) {
        monsterType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        logger.info(LogCategory.DUNGEON, `Selected random monster type: ${monsterType}`);
      } else {
        // Fallback to a default monster type if no types are available
        monsterType = isBoss ? MonsterType.LIZARDFOLK_KING : MonsterType.WOLF;
        logger.warn(LogCategory.DUNGEON, `No monster types available, using default: ${monsterType}`);
      }
    }
    
    // Validate the monster type
    if (!this.isValidMonsterType(monsterType)) {
      logger.warn(LogCategory.DUNGEON, `Invalid monster type: ${monsterType}, using default monster type`);
      // Use a default monster type from the available types
      const availableTypes = isBoss ? monsterConfig.bossTypes : monsterConfig.types;
      if (availableTypes && availableTypes.length > 0) {
        monsterType = availableTypes[0];
      } else {
        // Fallback to a basic monster type
        monsterType = isBoss ? MonsterType.LIZARDFOLK_KING : MonsterType.WOLF;
      }
    }
    
    // If playerSprite is null, try to get it from the PlayerReferenceService
    if (!playerSprite) {
      playerSprite = playerReferenceService.getPlayerSprite();
      if (playerSprite) {
        logger.info(LogCategory.DUNGEON, 'Retrieved player sprite from PlayerReferenceService');
      } else {
        logger.warn(LogCategory.DUNGEON, 'Could not find player sprite, monster may not function correctly');
      }
    }
    
    // Create the monster data
    const monsterData = {
      type: monsterType,
      name: `Level ${dungeon.level} ${monsterType}`,
      isBoss: isBoss,
      level: dungeon.level,
      
      // Apply dungeon-specific monster behaviors
      behaviors: {
        packBehavior: monsterConfig.packBehavior,
        territorialBehavior: monsterConfig.territorialBehavior,
        ambushBehavior: monsterConfig.ambushBehavior,
        echoLocation: monsterConfig.echoLocation,
        darkvision: monsterConfig.darkvision,
        poisonAttack: monsterConfig.poisonAttack,
        ambushFromWater: monsterConfig.ambushFromWater,
        packTactics: monsterConfig.packTactics
      },
      
      // Scale monster attributes based on level
      attributes: {
        health: 50 + (dungeon.level * 20) * (isBoss ? 3 : 1),
        maxHealth: 50 + (dungeon.level * 20) * (isBoss ? 3 : 1),
        damage: 10 + (dungeon.level * 3) * (isBoss ? 2 : 1),
        defense: 5 + (dungeon.level * 2) * (isBoss ? 2 : 1),
        speed: 100 + (dungeon.level * 5) * (isBoss ? 0.8 : 1) // Bosses are slightly slower
      },
      
      // Add default loot table to prevent "lootTable is not iterable" error
      lootTable: [
        {
          itemId: 'gold_coin',
          minQuantity: dungeon.level,
          maxQuantity: dungeon.level * 3,
          dropChance: 0.8
        }
      ],
      
      // Apply dungeon-specific monster attributes
      stealthBonus: monsterConfig.stealthBonus || 0,
      poisonDamage: monsterConfig.poisonDamage || 0,
      poisonDuration: monsterConfig.poisonDuration || 0
    };
    
    // If this is a boss, enhance it further
    if (isBoss) {
      monsterData.scale = 1.5;
      monsterData.dropRate = 1.0; // Bosses always drop items
      monsterData.goldMultiplier = 2.0; // Bosses drop more gold
      
      // Add better loot for boss monsters
      monsterData.lootTable = [
        {
          itemId: 'gold_pouch',
          minQuantity: 1,
          maxQuantity: 1,
          dropChance: 1.0
        },
        {
          itemId: 'healing_potion',
          minQuantity: 1,
          maxQuantity: 2,
          dropChance: 0.8
        },
        {
          itemId: 'rare_gem',
          minQuantity: 1,
          maxQuantity: 1,
          dropChance: 0.5
        }
      ];
    }
    
    // Special handling for specific boss monsters
    if (isBoss && dungeon.isSpecialLevel && dungeon.specialLevelConfig) {
      // Check if this is a special boss like the Lizardfolk King
      if (monsterType === MonsterType.LIZARDFOLK_KING && dungeon.id === 'lost-swamp' && dungeon.level === 4) {
        // Override with specific boss stats from the special level config
        monsterData.name = dungeon.specialLevelConfig.bossName;
        monsterData.level = dungeon.specialLevelConfig.bossLevel;
        monsterData.attributes.health = dungeon.specialLevelConfig.bossHealth;
        monsterData.attributes.maxHealth = dungeon.specialLevelConfig.bossHealth;
        monsterData.attributes.damage = dungeon.specialLevelConfig.bossDamage;
        monsterData.attributes.defense = dungeon.specialLevelConfig.bossDefense;
        monsterData.scale = 2.0; // Make the Lizardfolk King larger
        
        // Add special loot for the Lizardfolk King
        monsterData.lootTable = [
          {
            itemId: 'crown-of-the-lizard-king',
            minQuantity: 1,
            maxQuantity: 1,
            dropChance: 1.0
          },
          {
            itemId: 'royal-lizard-scale',
            minQuantity: 2,
            maxQuantity: 5,
            dropChance: 0.9
          },
          {
            itemId: 'swamp-treasure',
            minQuantity: 1,
            maxQuantity: 1,
            dropChance: 0.7
          }
        ];
        
        logger.info(LogCategory.DUNGEON, `Creating special boss: ${monsterData.name}`, {
          health: monsterData.attributes.health,
          damage: monsterData.attributes.damage,
          defense: monsterData.attributes.defense
        });
      }
    }
    
    logger.info(LogCategory.DUNGEON, `Creating monster: ${monsterData.name}`, {
      type: monsterType,
      isBoss: isBoss,
      level: dungeon.level,
      position: { x, y }
    });
    
    // Use the MonsterFactory to create the actual monster instance
    return MonsterFactory.createMonster(scene, x, y, monsterData, playerSprite, itemSystem);
  }
  
  /**
   * Check if a monster type is valid
   * @param {string|MonsterType} type - The monster type to check
   * @returns {boolean} - Whether the monster type is valid
   */
  static isValidMonsterType(type) {
    // If it's already a MonsterType enum value, it's valid
    if (Object.values(MonsterType).includes(type)) {
      return true;
    }
    
    // If it's a string, check if it matches any MonsterType enum value
    if (typeof type === 'string') {
      for (const key in MonsterType) {
        if (MonsterType[key] === type || MonsterType[key].toLowerCase() === type.toLowerCase()) {
          return true;
        }
      }
    }
    
    // Not a valid monster type
    return false;
  }
  
  /**
   * Create a room for a dungeon
   * @param {Object} scene - The Phaser scene
   * @param {Object} dungeon - The dungeon instance
   * @param {string} roomType - The type of room to create
   * @param {Object} position - The position of the room
   * @param {Object} options - Additional options for room creation
   * @returns {Object} The created room
   */
  static createRoom(scene, dungeon, roomType, position, options = {}) {
    // Get the room parameters from the dungeon
    const roomParams = dungeon.roomParams;
    
    // If no room type is specified, pick a random one from the available types
    if (!roomType) {
      roomType = roomParams.roomTypes[Math.floor(Math.random() * roomParams.roomTypes.length)];
    }
    
    // Determine room size based on room type and parameters
    let width, height;
    
    if (roomType === 'boss') {
      // Boss rooms are always the maximum size
      width = roomParams.roomSizeRange.max.width;
      height = roomParams.roomSizeRange.max.height;
    } else {
      // Random size within the range for other room types
      width = roomParams.roomSizeRange.min.width + 
        Math.random() * (roomParams.roomSizeRange.max.width - roomParams.roomSizeRange.min.width);
      height = roomParams.roomSizeRange.min.height + 
        Math.random() * (roomParams.roomSizeRange.max.height - roomParams.roomSizeRange.min.height);
    }
    
    // Create the room data
    const room = {
      id: `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: roomType,
      width: Math.floor(width),
      height: Math.floor(height),
      position: position || { x: 0, y: 0 },
      isBossRoom: roomType === 'boss',
      isCleared: false,
      monsters: new Map(),
      
      // Add dungeon-specific room properties
      ...this.getDungeonSpecificRoomProperties(dungeon, roomType)
    };
    
    // Special handling for boss rooms in special levels
    if (room.isBossRoom && dungeon.isSpecialLevel && dungeon.specialLevelConfig) {
      room.isSpecialBossRoom = true;
      room.specialBossConfig = dungeon.specialLevelConfig;
      
      logger.info(LogCategory.DUNGEON, `Created special boss room for ${dungeon.name} level ${dungeon.level}`, {
        bossName: dungeon.specialLevelConfig.bossName,
        guardCount: dungeon.specialLevelConfig.guardCount
      });
    }
    
    // Add any additional options
    Object.assign(room, options);
    
    logger.info(LogCategory.DUNGEON, `Created room: ${room.id}`, {
      type: roomType,
      size: { width: room.width, height: room.height },
      position: room.position,
      isBossRoom: room.isBossRoom
    });
    
    return room;
  }
  
  /**
   * Get dungeon-specific room properties based on dungeon type
   * @param {Object} dungeon - The dungeon instance
   * @param {string} roomType - The type of room
   * @returns {Object} Dungeon-specific room properties
   */
  static getDungeonSpecificRoomProperties(dungeon, roomType) {
    const properties = {};
    
    // Add properties based on dungeon type
    switch (dungeon.id) {
      case 'forest-dungeon':
        // Add forest-specific room properties
        properties.weatherEffect = dungeon.weatherConfig ? 
          dungeon.weatherConfig[Math.floor(Math.random() * dungeon.weatherConfig.length)] : 'none';
        properties.forestDensity = dungeon.roomParams.forestDensity || 0.5;
        properties.hasWaterFeatures = dungeon.roomParams.hasWaterFeatures || false;
        break;
        
      case 'cave-dungeon':
        // Add cave-specific room properties
        properties.lightLevel = dungeon.roomParams.defaultLightLevel || 'dim';
        properties.hazards = [];
        
        // Add hazards based on room type and hazard chance
        if (dungeon.hazardConfig && Math.random() < dungeon.roomParams.hazardChance) {
          const hazardType = dungeon.roomParams.hazardTypes[
            Math.floor(Math.random() * dungeon.roomParams.hazardTypes.length)
          ];
          
          properties.hazards.push({
            type: hazardType,
            config: dungeon.hazardConfig
          });
        }
        
        // Add crystals based on room type and crystal density
        if (roomType === 'crystal-chamber' || Math.random() < dungeon.roomParams.crystalDensity) {
          properties.crystals = [];
          
          // Add 1-3 crystals
          const crystalCount = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < crystalCount; i++) {
            const crystalType = dungeon.roomParams.crystalTypes[
              Math.floor(Math.random() * dungeon.roomParams.crystalTypes.length)
            ];
            
            properties.crystals.push({
              type: crystalType,
              effects: dungeon.crystalEffects ? dungeon.crystalEffects[crystalType] : {}
            });
          }
        }
        break;
        
      case 'lost-swamp':
        // Add swamp-specific room properties
        properties.fogDensity = dungeon.roomParams.fogDensity || 0.5;
        properties.waterDepth = dungeon.roomParams.waterDepth || 0.3;
        properties.hazards = [];
        
        // Add quicksand hazard if the room has it
        if (dungeon.roomParams.hasQuicksand) {
          properties.hazards.push({
            type: 'quicksand',
            config: dungeon.hazardConfig
          });
        }
        
        // Add poison gas hazard for certain room types
        if (roomType === 'deep-water' || roomType === 'muddy-ground') {
          properties.hazards.push({
            type: 'poison-gas',
            config: dungeon.hazardConfig,
            poisonLevel: dungeon.roomParams.poisonLevel
          });
        }
        
        // Set movement penalties based on room type
        switch (roomType) {
          case 'shallow-water':
            properties.movementPenalty = 0.2;
            break;
          case 'deep-water':
            properties.movementPenalty = 0.5;
            properties.staminaDrain = dungeon.hazardConfig.deepWaterStaminaDrain;
            break;
          case 'muddy-ground':
            properties.movementPenalty = 0.3;
            break;
          default:
            properties.movementPenalty = 0;
        }
        
        // Special handling for boss room in level 4
        if (roomType === 'boss' && dungeon.level === 4 && dungeon.isSpecialLevel) {
          properties.guardPositions = [
            { x: -100, y: -100 },
            { x: 100, y: -100 },
            { x: -100, y: 100 },
            { x: 100, y: 100 }
          ];
          properties.bossPosition = { x: 0, y: 0 };
          properties.specialRewards = dungeon.specialLevelConfig.specialRewards;
        }
        break;
        
      // Add cases for other dungeon types as needed
    }
    
    return properties;
  }
} 