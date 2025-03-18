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
import { MonsterPositionManager } from './MonsterPositionManager';

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
    private positionManager: MonsterPositionManager;
    private environment: any; // Using any type since Environment doesn't have TypeScript definitions
    private coordinateCache: any; // Using any type since CoordinateCache doesn't have TypeScript definitions

    constructor(scene: Scene, mapManager: MapManager, playerManager: PlayerManager, itemSystem: ItemSystem) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.itemSystem = itemSystem;
        
        // Initialize monster registry
        this.initializeMonsterRegistry();
        
        // Initialize position manager
        this.positionManager = new MonsterPositionManager(scene, mapManager);
        
        // Get coordinate cache from map manager
        this.coordinateCache = this.mapManager.getCoordinateCache();
        
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
            logger.error(LogCategory.MONSTER, `Monster type ${type} not found in registry`);
            return null;
        }
        
        try {
            // Create monster instance using factory
            const monster = MonsterFactory.createMonster(
                this.scene,
                x,
                y,
                data,
                this.playerManager.getPlayer() as Physics.Arcade.Sprite,
                this.itemSystem
            );
            
            if (!monster) {
                logger.error(LogCategory.MONSTER, `Failed to create monster of type ${type}`);
                return null;
            }
            
            // Add to physics group
            this.monsterGroup.add(monster);
            
            // Add to monsters array
            this.monsters.push(monster);
            
            // Register with position manager
            const latLng = this.positionManager.pixelToLatLng(x, y);
            const cacheId = this.positionManager.registerMonster(monster, latLng.lat, latLng.lng);
            
            // Ensure the monster has its lat/lng data set
            monster.setData('lat', latLng.lat);
            monster.setData('lng', latLng.lng);
            
            // If we have a cacheId, store it on the monster and enable coordinate cache
            if (cacheId) {
                monster.setData('cacheId', cacheId);
                monster.useCoordinateCache = true;
                
                // Disable physics body's movement if using coordinate cache
                if (monster.body) {
                    // Use type assertion to access the 'moves' property
                    (monster.body as Physics.Arcade.Body).moves = false;
                }
                
                logger.info(LogCategory.MONSTER, `Monster ${monster.monsterName} registered with coordinate cache`);
            }
            
            // Set up click handler
            monster.on('pointerdown', () => {
                this.scene.events.emit('monster-click', monster);
            });
            
            return monster;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(LogCategory.MONSTER, `Error spawning monster: ${errorMessage}`);
            return null;
        }
    }
    
    public spawnRandomMonsters(count: number, radius: number): void {
        // Get player position
        const player = this.playerManager.getPlayer() as Physics.Arcade.Sprite;
        const playerX = player.x;
        const playerY = player.y;
        
        // Convert player position to lat/lng
        const playerLatLng = this.positionManager.pixelToLatLng(playerX, playerY);
        
        for (let i = 0; i < count; i++) {
            // Skip if we've hit the monster limit
            if (this.monsters.length >= this.maxMonsters) {
                break;
            }
            
            // Generate a random position using the position manager
            const position = this.positionManager.generateRandomPosition(
                playerLatLng.lat,
                playerLatLng.lng,
                radius
            );
            
            // Convert lat/lng to pixel coordinates
            const pixelPos = this.positionManager.latLngToPixel(position.lat, position.lng);
            
            // Choose a random monster type
            const types = this.monsterRegistry.getAllDefinitions().map(def => def.type);
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            // Spawn the monster
            this.spawnMonster(randomType, pixelPos.x, pixelPos.y);
        }
    }
    
    // Handle collision between player and monster
    private handlePlayerCollision(player: Physics.Arcade.Sprite, monster: BaseMonster): void {
        // This is just a basic collision handler
        // More complex interaction would be handled by the combat system
    }
    
    // Update all monsters
    public update(time: number, delta: number): void {
        // Update all monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Skip destroyed monsters
            if (monster.active === false) {
                // Unregister from position manager before removing
                this.positionManager.unregisterMonster(monster);
                
                // Remove from array
                this.monsters.splice(i, 1);
                continue;
            }
            
            // Update monster
            monster.update(time, delta);
            
            // If monster has moved, update its lat/lng position
            if (monster.getData('lat') && monster.getData('lng')) {
                const currentLatLng = this.positionManager.pixelToLatLng(monster.x, monster.y);
                const storedLat = monster.getData('lat');
                const storedLng = monster.getData('lng');
                
                // Only update if position has changed significantly
                const threshold = 0.00001; // Small threshold to avoid unnecessary updates
                if (
                    Math.abs(currentLatLng.lat - storedLat) > threshold ||
                    Math.abs(currentLatLng.lng - storedLng) > threshold
                ) {
                    this.positionManager.updateMonsterPosition(
                        monster,
                        currentLatLng.lat,
                        currentLatLng.lng
                    );
                }
            }
        }
        
        // Spawn new monsters periodically
        this.spawnTimer += delta;
        if (this.spawnTimer > 10000 && this.monsters.length < this.maxMonsters) { // Every 10 seconds
            this.spawnTimer = 0;
            this.spawnRandomMonsters(1, 600);
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
        // Clean up position manager
        this.positionManager.destroy();
        
        // Clean up monsters
        for (const monster of this.monsters) {
            monster.destroy();
        }
        
        this.monsters = [];
        
        // Clean up physics group
        this.monsterGroup.clear(true, true);
        
        // Clear references
        this.playerManager = null as unknown as PlayerManager;
        this.itemSystem = null as unknown as ItemSystem;
        this.mapManager = null as unknown as MapManager;
        
        logger.info(LogCategory.MONSTER, "Monster system destroyed");
    }

    /**
     * Set the environment reference
     * @param environment The environment object
     */
    public setEnvironment(environment: any): void {
        this.environment = environment;
    }

    /**
     * Update the positions of all monsters based on their lat/lng coordinates
     * This is used when returning from the dungeon to ensure monsters are correctly positioned
     */
    public updateMonsterPositions(): void {
        logger.info(LogCategory.MONSTER, `Updating positions for ${this.monsters.length} monsters`);
        
        for (const monster of this.monsters) {
            try {
                // Skip if monster doesn't have lat/lng data
                const lat = monster.getData('lat');
                const lng = monster.getData('lng');
                
                if (!lat || !lng) {
                    logger.warn(LogCategory.MONSTER, `Monster ${monster.monsterType} has no lat/lng data`);
                    continue;
                }
                
                // Check if monster uses coordinate cache
                const cacheId = monster.getData('cacheId');
                const useCache = monster.useCoordinateCache || false;
                
                // Update position based on the method being used
                if (useCache && cacheId && this.coordinateCache) {
                    // Use coordinate cache directly 
                    // No need to manually update position as the cache system will handle it
                    this.coordinateCache.updateLatLng(cacheId, lat, lng);
                    
                    // Force a position update via the cache system
                    const pixelPos = this.coordinateCache.getPixelPosition(cacheId);
                    if (pixelPos) {
                        monster.x = pixelPos.x;
                        monster.y = pixelPos.y;
                    }
                    
                    logger.debug(LogCategory.MONSTER, `Updated monster ${monster.monsterType} position via cache: ${lat}, ${lng} -> ${monster.x}, ${monster.y}`);
                } 
                else if (this.positionManager) {
                    // Use position manager's method
                    this.positionManager.updateMonsterPosition(monster, lat, lng);
                    logger.debug(LogCategory.MONSTER, `Updated monster ${monster.monsterType} position via position manager: ${lat}, ${lng} -> ${monster.x}, ${monster.y}`);
                } 
                else if (this.mapManager) {
                    // Direct conversion using map manager
                    const pixelPos = this.mapManager.latLngToPixel(lat, lng);
                    if (pixelPos && pixelPos.x !== undefined && pixelPos.y !== undefined) {
                        monster.setPosition(pixelPos.x, pixelPos.y);
                        logger.debug(LogCategory.MONSTER, `Updated monster ${monster.monsterType} position via direct conversion: ${lat}, ${lng} -> ${pixelPos.x}, ${pixelPos.y}`);
                    } else {
                        logger.warn(LogCategory.MONSTER, `Invalid pixel position for monster at ${lat}, ${lng}`);
                    }
                }
                
                // Ensure monster is visible and active
                monster.visible = true;
                monster.active = true;
                
                // Ensure health bars and other UI elements are updated
                if (typeof monster.updatePositionFromLatLng === 'function') {
                    monster.updatePositionFromLatLng();
                }
            } catch (error) {
                logger.error(LogCategory.MONSTER, `Error updating monster position: ${error}`);
            }
        }
        
        logger.info(LogCategory.MONSTER, "Monster positions updated");
    }
} 