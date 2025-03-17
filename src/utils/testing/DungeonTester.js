/**
 * DungeonTester - Utility to test dungeon generation
 */

import { dungeonConfigRegistry } from '../../dungeons/core/DungeonConfig';
import { DungeonFactory } from '../../dungeons/core/DungeonFactory';
import { logger, LogCategory } from '../Logger';

/**
 * Test the generation of a specific dungeon
 * @param {Phaser.Scene} scene - The current scene
 * @param {string} dungeonId - The ID of the dungeon to test
 * @param {number} level - The level to test (default: 1)
 * @returns {Object} The generated dungeon object
 */
export function testDungeonGeneration(scene, dungeonId, level = 1) {
  logger.info(LogCategory.DUNGEON, `Testing dungeon generation for ${dungeonId} level ${level}`);
  
  try {
    // Get the dungeon config
    const dungeonConfig = dungeonConfigRegistry.get(dungeonId);
    
    if (!dungeonConfig) {
      logger.error(LogCategory.DUNGEON, `Unknown dungeon type: ${dungeonId}`);
      return null;
    }
    
    // Create a dungeon object
    const dungeon = DungeonFactory.createDungeon(scene, dungeonId, level);
    
    // Log dungeon details
    logger.info(LogCategory.DUNGEON, `Dungeon created: ${dungeon.name}`, {
      id: dungeon.id,
      level: level,
      roomParams: dungeon.roomParams,
      monsterConfig: dungeon.monsterConfig,
      isSpecialLevel: dungeon.isSpecialLevel
    });
    
    return dungeon;
  } catch (error) {
    logger.error(LogCategory.DUNGEON, `Error testing dungeon generation: ${error}`);
    return null;
  }
}

/**
 * Test the Lost Swamp dungeon specifically
 * @param {Phaser.Scene} scene - The current scene
 * @param {number} level - The level to test (default: 4 - boss level)
 * @returns {Object} The generated dungeon object
 */
export function testLostSwampDungeon(scene, level = 4) {
  logger.info(LogCategory.DUNGEON, `Testing Lost Swamp dungeon generation for level ${level}`);
  
  const dungeon = testDungeonGeneration(scene, 'lost-swamp', level);
  
  if (dungeon) {
    // Check for special level configuration
    if (level === 4) {
      if (dungeon.isSpecialLevel && dungeon.specialLevelConfig) {
        logger.info(LogCategory.DUNGEON, 'Lost Swamp level 4 special configuration found:', {
          bossName: dungeon.specialLevelConfig.bossName,
          bossHealth: dungeon.specialLevelConfig.bossHealth,
          guardCount: dungeon.specialLevelConfig.guardCount
        });
      } else {
        logger.warn(LogCategory.DUNGEON, 'Lost Swamp level 4 is missing special configuration!');
      }
    }
  }
  
  return dungeon;
} 