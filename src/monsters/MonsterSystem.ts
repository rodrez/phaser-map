import type { Scene, Physics, GameObjects } from 'phaser';
import type { MapManager } from '../utils/MapManager';
import type { PlayerManager } from '../utils/player/PlayerManager';
import type { ItemSystem } from '../items/item';
import type { BaseMonster } from './BaseMonster';
import { MonsterType, MonsterBehavior } from './MonsterTypes';
import type { MonsterData } from './MonsterTypes';
import { MonsterFactory } from './MonsterFactory';
import { logger, LogCategory } from '../utils/Logger';

export class MonsterSystem {
    private scene: Scene;
    private mapManager: MapManager;
    private playerManager: PlayerManager;
    private itemSystem: ItemSystem;
    private monsters: BaseMonster[] = [];
    private monsterGroup: Physics.Arcade.Group;
    private monsterData: Map<MonsterType, MonsterData> = new Map();
    private spawnTimer = 0;
    private maxMonsters = 15;

    constructor(scene: Scene, mapManager: MapManager, playerManager: PlayerManager, itemSystem: ItemSystem) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.itemSystem = itemSystem;
        
        // Initialize monster data
        this.initializeMonsterData();
        
        // Create monster physics group
        this.monsterGroup = this.scene.physics.add.group({
            collideWorldBounds: true
        });
        
        // Set up collision with player
        this.scene.physics.add.collider(
            this.playerManager.getPlayer() as Physics.Arcade.Sprite,
            this.monsterGroup,
            this.handlePlayerCollision.bind(this)
        );
        
        // Spawn initial monsters
        this.spawnRandomMonsters(8, 600);
    }
    
    private initializeMonsterData(): void {
        // Stag - peaceful but defends itself
        this.monsterData.set(MonsterType.STAG, {
            type: MonsterType.STAG,
            name: 'Stag',
            behavior: MonsterBehavior.NEUTRAL,
            attributes: {
                health: 40,
                maxHealth: 40,
                damage: 5,
                defense: 2,
                speed: 110,
                detectionRadius: 150,
                fleeRadius: 200,
                aggroRadius: 100
            },
            lootTable: [
                {
                    itemId: 'leather',
                    minQuantity: 1,
                    maxQuantity: 3,
                    dropChance: 0.9
                }
            ],
            spriteKey: 'deer',
            scale: .75,
            goldReward: 5,
            xpReward: 10
        });
        
        // Wolf - aggressive predator
        this.monsterData.set(MonsterType.WOLF, {
            type: MonsterType.WOLF,
            name: 'Wolf',
            behavior: MonsterBehavior.AGGRESSIVE,
            attributes: {
                health: 60,
                maxHealth: 60,
                damage: 10,
                defense: 2,
                speed: 120,
                detectionRadius: 200,
                aggroRadius: 250,
                returnRadius: 300
            },
            lootTable: [
                {
                    itemId: 'wolf_pelt',
                    minQuantity: 1,
                    maxQuantity: 1,
                    dropChance: 0.7
                },
                {
                    itemId: 'wolf_fang',
                    minQuantity: 1,
                    maxQuantity: 2,
                    dropChance: 0.5
                }
            ],
            spriteKey: 'wolf',
            scale: 1,
            goldReward: 10,
            xpReward: 20
        });
        
        // TODO: Add more monster types here (bear, boar, etc.)
    }
    
    // Handle collision between player and monster
    private handlePlayerCollision(player: Physics.Arcade.Sprite, monster: Physics.Arcade.Sprite & { behavior?: MonsterBehavior, changeState?: (state: string) => void }): void {
        // For passive monsters, make them flee
        if (monster.behavior === MonsterBehavior.PASSIVE) {
            monster.changeState?.('fleeing');
            return;
        }
        
        // Use the combat system if available
        const combatSystem = (this.scene as { combatSystem?: unknown }).combatSystem;
        if (combatSystem) {
            // We don't handle actual damage here - that's done in the monster's attacking state
            // This is just for collision response
            
            // If the monster is neutral, make it aggressive when collided with
            if (monster.behavior === MonsterBehavior.NEUTRAL) {
                monster.changeState?.('chasing');
            }
        } else {
            // Fallback for backward compatibility
            logger.warn(LogCategory.MONSTER, 'Combat system not found, using fallback collision handling');
        }
    }
    
    // Spawn a monster of the given type at the specified position
    public spawnMonster(type: MonsterType, x: number, y: number): BaseMonster | null {
        // Get monster data
        const data = this.monsterData.get(type);
        
        if (!data) {
            logger.error(LogCategory.MONSTER, `Monster type ${type} not found in monster data`);
            return null;
        }
        
        // Check if the required texture exists
        if (!this.scene.textures.exists(data.spriteKey)) {
            logger.warn(LogCategory.MONSTER, `Texture ${data.spriteKey} not found for monster type ${type}. Creating a placeholder texture.`);
            
            // Create a placeholder texture
            const graphics = this.scene.make.graphics({x: 0, y: 0});
            graphics.fillStyle(0xFF0000);
            graphics.fillRect(0, 0, 64, 64);
            graphics.generateTexture(data.spriteKey, 64, 64);
        }
        
        // Create the monster using the factory
        const monster = MonsterFactory.createMonster(
            this.scene,
            x,
            y,
            data,
            this.playerManager.getPlayer() as Physics.Arcade.Sprite,
            this.itemSystem
        );
        
        // Set depth to ensure monsters are visible but below player
        monster.setDepth(50);
        
        // Add to group and track
        this.monsterGroup.add(monster);
        this.monsters.push(monster);
        
        // If there's a MonsterPopupSystem, register direct click handlers for this monster
        const scene = this.scene as { monsterPopupSystem?: { showMonsterPopup: (monster: BaseMonster, x: number, y: number) => void } };
        if (scene.monsterPopupSystem) {
            monster.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                logger.info(LogCategory.MONSTER, `Direct click on monster: ${monster.monsterName}`);
                scene.monsterPopupSystem?.showMonsterPopup(monster, pointer.worldX, pointer.worldY);
            });
        }
        
        logger.info(LogCategory.MONSTER, `Spawned ${data.name} at (${x}, ${y})`);
        
        return monster;
    }
    
    // Spawn random monsters around the player
    public spawnRandomMonsters(count: number, radius: number): void {
        // Get player position
        const player = this.playerManager.getPlayer() as Physics.Arcade.Sprite;
        const playerX = player.x;
        const playerY = player.y;
        
        for (let i = 0; i < count; i++) {
            // Skip if we've hit the monster limit
            if (this.monsters.length >= this.maxMonsters) {
                break;
            }
            
            // Generate a random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = playerX + Math.cos(angle) * distance;
            const y = playerY + Math.sin(angle) * distance;
            
            // Choose a random monster type
            const types = Array.from(this.monsterData.keys());
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            // Spawn the monster
            this.spawnMonster(randomType, x, y);
        }
    }
    
    // Update all monsters
    public update(time: number, delta: number): void {
        // Update each monster
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Skip destroyed monsters and remove them from the array
            if (!monster.active) {
                this.monsters.splice(i, 1);
                continue;
            }
            
            // Update monster
            monster.update(time, delta);
        }
        
        // Periodically spawn new monsters
        this.spawnTimer += delta;
        if (this.spawnTimer > 10000) { // Every 10 seconds
            this.spawnTimer = 0;
            
            // Only spawn if we're below the monster limit
            if (this.monsters.length < this.maxMonsters) {
                const spawnCount = Math.min(3, this.maxMonsters - this.monsters.length);
                this.spawnRandomMonsters(spawnCount, 800);
            }
        }
    }
    
    /**
     * Get all monsters
     */
    public getMonsters(): BaseMonster[] {
        return this.monsters;
    }
    
    /**
     * Get the number of monsters
     */
    public getMonsterCount(): number {
        return this.monsters.length;
    }
    
    /**
     * Get monsters that are currently auto-attacking the player
     */
    public getAutoAttackingMonsters(): BaseMonster[] {
        return this.monsters.filter(monster => 
            monster.active && monster.isAutoAttacking
        );
    }
} 