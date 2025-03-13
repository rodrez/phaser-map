import { Scene, Physics } from 'phaser';
import { ItemSystem } from '../items/item';
import { BaseMonster } from './BaseMonster';
import { MonsterData, MonsterType } from './MonsterTypes';
import { Stag } from './Stag';
import { Wolf } from './Wolf';

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
                console.warn('Bear monster type not implemented yet, using Wolf instead');
                return new Wolf(scene, x, y, monsterData, playerSprite, itemSystem);
                
            case MonsterType.BOAR:
                // Boar implementation not yet added
                console.warn('Boar monster type not implemented yet, using Stag instead');
                return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);
                
            default:
                console.error(`Unknown monster type: ${monsterData.type}`);
                // Default to Stag as a fallback
                return new Stag(scene, x, y, monsterData, playerSprite, itemSystem);
        }
    }
} 