/**
 * Dungeon System - Main export file
 * Exports all dungeon-related modules
 */

// Import logger
import { logger, LogCategory } from "../utils/Logger";

// Core dungeon system
export { DungeonSystem } from "./core/DungeonSystem";
export { DungeonFactory } from "./core/DungeonFactory";
export { BaseDungeonConfig, dungeonConfigRegistry } from "./core/DungeonConfig";
export { DungeonEventSystem } from "./core/DungeonEventSystem";

// Dungeon UI
export { DungeonUIManager } from "./ui/DungeonUIManager";

// Dungeon types
export {
  ForestDungeonConfig,
  forestDungeonConfig,
} from "./types/ForestDungeon";
export { CaveDungeonConfig, caveDungeonConfig } from "./types/CaveDungeon";
export {
  LostSwampDungeonConfig,
  lostSwampDungeonConfig,
} from "./types/LostSwampDungeon";

// Register all dungeon types
import { lostSwampDungeonConfig } from "./types/LostSwampDungeon";
import { dungeonConfigRegistry } from "./core/DungeonConfig";

// This ensures all dungeon types are registered
const registerAllDungeonTypes = () => {
  // For testing, only register the Lost Swamp dungeon
  if (!dungeonConfigRegistry.get(lostSwampDungeonConfig.id)) {
    dungeonConfigRegistry.register(lostSwampDungeonConfig);
    logger.info(
      LogCategory.DUNGEON,
      "Registered Lost Swamp dungeon for testing",
    );
  }

  // Add more dungeon types here as they are created
};

// Register all dungeon types when this module is imported
registerAllDungeonTypes();

