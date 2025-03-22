import type { Scene, Physics } from "phaser";
import type { ItemSystem } from "../items/item";
import type { BaseMonster } from "./BaseMonster";
import { MonsterType } from "./MonsterTypes";
import type { MonsterData } from "./MonsterTypes";
import { Stag } from "./types/Stag";
import { Wolf } from "./types/Wolf";
import { Boar } from "./types/Boar";
import { Lizardfolk } from "./types/Lizardfolk";
import { Dragon } from "./types/Dragon";
import { Ogre } from "./types/Ogre";
import { logger, LogCategory } from "../utils/Logger";

// Convert class with static methods to a simple object with functions
export const MonsterFactory = {
  // Create a monster instance based on the monster type
  createMonster(
    scene: Scene,
    x: number,
    y: number,
    monsterData: MonsterData,
    playerSprite: Physics.Arcade.Sprite,
    itemSystem: ItemSystem,
  ): BaseMonster {
    logger.info(
      LogCategory.MONSTER,
      "DEBUG: MonsterFactory.createMonster called",
      {
        type: monsterData.type,
        name: monsterData.name,
        isBoss: monsterData.isBoss,
        position: { x, y },
      },
    );

    switch (monsterData.type) {
      case MonsterType.STAG:
        return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);

      case MonsterType.WOLF:
        return new Wolf(scene, x, y, monsterData, playerSprite, itemSystem);

      case MonsterType.BEAR:
        // Bear implementation not yet added
        logger.warn(
          LogCategory.MONSTER,
          "Bear monster type not implemented yet, using Wolf instead",
        );
        return new Wolf(scene, x, y, monsterData, playerSprite, itemSystem);

      case MonsterType.BOAR:
        return new Boar(scene, x, y, monsterData, playerSprite, itemSystem);

      case MonsterType.LIZARDFOLK:
        return new Lizardfolk(
          scene,
          x,
          y,
          monsterData,
          playerSprite,
          itemSystem,
        );

      case MonsterType.LIZARDFOLK_KING: {
        // For now, use Lizardfolk with enhanced stats for the king
        logger.info(
          LogCategory.MONSTER,
          "Creating Lizardfolk King (boss monster)",
        );
        logger.info(
          LogCategory.MONSTER,
          "Creating Lizardfolk King with position:",
          { x, y },
          "and data:",
          monsterData,
        );

        // Enhance the monster data for the boss
        const bossData = { ...monsterData };
        bossData.scale = 2.0; // Make the boss larger
        bossData.attributes = bossData.attributes || {};
        bossData.attributes.health = bossData.attributes?.health || 500;
        bossData.attributes.maxHealth = bossData.attributes?.maxHealth || 500;
        bossData.attributes.damage = bossData.attributes?.damage || 30;
        bossData.attributes.defense = bossData.attributes?.defense || 15;
        bossData.isBoss = true; // Ensure it's marked as a boss

        // Create a Lizardfolk instance with the enhanced boss data
        const king = new Lizardfolk(
          scene,
          x,
          y,
          bossData,
          playerSprite,
          itemSystem,
        );

        // Add special properties to make it look like a king
        king.setScale(bossData.scale || 1.5);
        king.setTint(0xffdd00); // Gold tint

        logger.info(
          LogCategory.MONSTER,
          "Lizardfolk King created successfully",
        );

        return king;
      }

      case MonsterType.DRAGON:
        return new Dragon(scene, x, y, monsterData, playerSprite, itemSystem);

      case MonsterType.OGRE:
        return new Ogre(scene, x, y, monsterData, playerSprite, itemSystem);

      default:
        logger.error(
          LogCategory.MONSTER,
          `Unknown monster type: ${monsterData.type}`,
        );
        // Default to Stag as a fallback
        return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);
    }
  },
};

