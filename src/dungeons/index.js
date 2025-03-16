/**
 * Dungeon System - Main export file
 * Exports all dungeon-related modules
 */

// Core dungeon system
export { DungeonSystem } from './core/DungeonSystem';
export { DungeonFactory } from './core/DungeonFactory';
export { BaseDungeonConfig, dungeonConfigRegistry } from './core/DungeonConfig';
export { DungeonEventSystem } from './core/DungeonEventSystem';

// Dungeon UI
export { DungeonUIManager } from './ui/DungeonUIManager';

// Dungeon types
export { ForestDungeonConfig, forestDungeonConfig } from './types/ForestDungeon';
export { CaveDungeonConfig, caveDungeonConfig } from './types/CaveDungeon';
export { LostSwampDungeonConfig, lostSwampDungeonConfig } from './types/LostSwampDungeon';

// Register all dungeon types
import { forestDungeonConfig } from './types/ForestDungeon';
import { caveDungeonConfig } from './types/CaveDungeon';
import { lostSwampDungeonConfig } from './types/LostSwampDungeon';
import { dungeonConfigRegistry } from './core/DungeonConfig';

// This ensures all dungeon types are registered
const registerAllDungeonTypes = () => {
  // Forest dungeon
  if (!dungeonConfigRegistry.get(forestDungeonConfig.id)) {
    dungeonConfigRegistry.register(forestDungeonConfig);
  }
  
  // Cave dungeon
  if (!dungeonConfigRegistry.get(caveDungeonConfig.id)) {
    dungeonConfigRegistry.register(caveDungeonConfig);
  }
  
  // Lost Swamp dungeon
  if (!dungeonConfigRegistry.get(lostSwampDungeonConfig.id)) {
    dungeonConfigRegistry.register(lostSwampDungeonConfig);
  }
  
  // Add more dungeon types here as they are created
};

// Register all dungeon types when this module is imported
registerAllDungeonTypes(); 