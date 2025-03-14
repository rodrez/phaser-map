import type { Scene, Physics, GameObjects } from 'phaser';
// @ts-expect-error - No type definitions available
import { MapManager } from '../utils/MapManager';
// @ts-expect-error - No type definitions available
import { PlayerManager } from '../utils/player/PlayerManager';
import type { ItemSystem } from '../items/item';
import type { BaseMonster } from './BaseMonster';
import { MonsterType, MonsterBehavior } from './MonsterTypes';
import type { MonsterData } from './MonsterTypes';
import { MonsterFactory } from './MonsterFactory';
// @ts-expect-error - No type definitions available
import { logger, LogCategory } from '../utils/Logger';
import { MonsterRegistry, initializeMonsterDefinitions } from './definitions';

export class MonsterSystem {
    private scene: Scene;
    private mapManager: MapManager;
    private playerManager: PlayerManager;
    private itemSystem: ItemSystem;
    private monsters: BaseMonster[] = [];
    private monsterGroup: Physics.Arcade.Group;
    private monsterRegistry!: MonsterRegistry; // Using definite assignment assertion
    private spawnTimer = 0;
    private maxMonsters = 15;

    constructor(scene: Scene, mapManager: MapManager, playerManager: PlayerManager, itemSystem: ItemSystem) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.itemSystem = itemSystem;
        
        // Initialize monster registry
        this.initializeMonsterRegistry();
        
        // Create monster physics group
        this.monsterGroup = this.scene.physics.add.group({
            collideWorldBounds: true
        });
        
        // Set up collision with player
        this.scene.physics.add.collider(
            this.playerManager.getPlayer() as Physics.Arcade.Sprite,
            this.monsterGroup,
            this.handlePlayerCollision.bind(this) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
        );
        
        // Spawn initial monsters
        this.spawnRandomMonsters(8, 600);
    }
    
    private initializeMonsterRegistry(): void {
        try {
            // Get the registry instance
            this.monsterRegistry = MonsterRegistry.getInstance();
            
            // Initialize all monster definitions
            initializeMonsterDefinitions();
            
            logger.info(
                LogCategory.MONSTER, 
                `Monster registry initialized with ${this.monsterRegistry.getAllDefinitions().length} monsters`
            );
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(LogCategory.MONSTER, `Failed to initialize monster registry: ${errorMessage}`);
            // Fall back to legacy initialization if loading fails
            this.initializeLegacyMonsterData();
        }
    }
    
    /**
     * Legacy method to initialize monster data directly
     * This is used as a fallback if loading from the registry fails
     * @deprecated Use the monster registry instead
     */
    private initializeLegacyMonsterData(): void {
        logger.warn(LogCategory.MONSTER, 'Using legacy monster data initialization');
        
        // Create a new registry instance
        this.monsterRegistry = MonsterRegistry.getInstance();
        
        // Stag - peaceful but defends itself
        this.monsterRegistry.registerDefinition({
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
        this.monsterRegistry.registerDefinition({
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
    }
    
    // Spawn a monster of the given type at the specified position
    public spawnMonster(type: MonsterType, x: number, y: number): BaseMonster | null {
        // Get monster data from registry
        const data = this.monsterRegistry.getDefinition(type);
        
        if (!data) {
            logger.error(LogCategory.MONSTER, `Monster type ${type} not found in monster registry`);
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
                scene.monsterPopupSystem?.showMonsterPopup(monster, pointer.worldX, pointer.worldY);
            });
        }
        
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
            const types = this.monsterRegistry.getAllDefinitions().map(def => def.type);
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            // Spawn the monster
            this.spawnMonster(randomType, x, y);
        }
    }
    
    // Handle collision between player and monster
    private handlePlayerCollision(player: Physics.Arcade.Sprite, monster: BaseMonster): void {
        // This is just a basic collision handler
        // More complex interaction would be handled by the combat system
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
    
    /**
     * Get the monster registry
     */
    public getMonsterRegistry(): MonsterRegistry {
        return this.monsterRegistry;
    }

    /**
     * Clean up resources when destroying the system
     */
    public destroy(): void {
        try {
            // Destroy all monsters
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                const monster = this.monsters[i];
                if (monster && monster.active) {
                    try {
                        monster.destroy();
                    } catch (error) {
                        logger.error(LogCategory.MONSTER, `Error destroying monster: ${error}`);
                    }
                }
            }
            
            // Clear the monsters array
            this.monsters = [];
            
            // Destroy the monster group
            if (this.monsterGroup) {
                this.monsterGroup.destroy(true);
            }
            
            // Remove collision handlers
            if (this.scene && this.scene.physics) {
                this.scene.physics.world.colliders.destroy();
            }
            
            // Clear references
            this.playerManager = null as unknown as PlayerManager;
            this.itemSystem = null as unknown as ItemSystem;
            this.mapManager = null as unknown as MapManager;
            
            logger.info(LogCategory.MONSTER, "Monster system destroyed");
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error in MonsterSystem.destroy(): ${error}`);
        }
    }
} 