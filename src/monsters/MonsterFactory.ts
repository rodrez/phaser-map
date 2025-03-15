import { Scene, Physics } from 'phaser';
import { ItemSystem } from '../items/item';
import { BaseMonster } from './BaseMonster';
import { MonsterData, MonsterType } from './MonsterTypes';
import { Stag } from './Stag';
import { Wolf } from './Wolf';
import { Boar } from './Boar';
import { Lizardfolk } from './Lizardfolk';
import { Dragon } from './Dragon';
import { Ogre } from './Ogre';
import { logger, LogCategory } from '../utils/Logger';

export class MonsterFactory {
    // Create a monster instance based on the monster type
    public static createMonster(
        scene: Scene, 
        x: number, 
        y: number, 
        monsterData: MonsterData, 
        playerSprite: Physics.Arcade.Sprite, 
        itemSystem: ItemSystem
    ): BaseMonster {
        switch (monsterData.type) {
            case MonsterType.STAG:
                return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.WOLF:
                return new Wolf(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.BEAR:
                // Bear implementation not yet added
                logger.warn(LogCategory.MONSTER, 'Bear monster type not implemented yet, using Wolf instead');
                return new Wolf(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.BOAR:
                return new Boar(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.LIZARDFOLK:
                return new Lizardfolk(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.LIZARDFOLK_KING:
                // For now, use Lizardfolk with enhanced stats for the king
                logger.info(LogCategory.MONSTER, 'Creating Lizardfolk King (boss monster)');
                // Enhance the monster data for the boss
                const bossData = { ...monsterData };
                bossData.scale = 2.0; // Make the boss larger
                bossData.attributes = bossData.attributes || {};
                bossData.attributes.health = bossData.attributes?.health || 200;
                bossData.attributes.maxHealth = bossData.attributes?.maxHealth || 200;
                bossData.attributes.damage = bossData.attributes?.damage || 20;
                bossData.attributes.defense = bossData.attributes?.defense || 10;
                return new Lizardfolk(scene, x, y, bossData, playerSprite, itemSystem);
                
            case MonsterType.DRAGON:
                return new Dragon(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.OGRE:
                return new Ogre(scene, x, y, monsterData, playerSprite, itemSystem);
                
            default:
                logger.error(LogCategory.MONSTER, `Unknown monster type: ${monsterData.type}`);
                // Default to Stag as a fallback
                return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);
        }
    }
} 