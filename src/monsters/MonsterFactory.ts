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
        console.log('DEBUG: MonsterFactory.createMonster called', {
            type: monsterData.type,
            name: monsterData.name,
            isBoss: monsterData.isBoss,
            position: { x, y }
        });
        
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
                console.log('Creating Lizardfolk King with position:', { x, y }, 'and data:', monsterData);
                
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
                const king = new Lizardfolk(scene, x, y, bossData, playerSprite, itemSystem);
                
                // Add special properties to make it look like a king
                king.setScale(bossData.scale || 1.5);
                king.setTint(0xffdd00); // Gold tint
                
                console.log('Lizardfolk King created successfully');
                
                return king;
                
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