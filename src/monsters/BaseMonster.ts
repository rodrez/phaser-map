import { type Scene, Physics, GameObjects, Math as PhaserMath } from 'phaser';
import { ItemSystem } from '../items/item';
import { ItemType } from '../items/item-types';
import { MonsterType, MonsterBehavior, MonsterAttributes, MonsterLoot, MonsterState, MonsterData } from './MonsterTypes';
import { logger, LogCategory } from '../utils/Logger';

export abstract class BaseMonster extends Physics.Arcade.Sprite {
    public monsterType: MonsterType;
    public monsterName: string;
    public behavior: MonsterBehavior;
    public attributes: MonsterAttributes;
    public lootTable: MonsterLoot[];
    public currentState: MonsterState = MonsterState.IDLE;
    public isAutoAttacking= false;
    public goldReward: number;
    public xpReward: number;
    public isBoss: boolean = false; // Flag to identify boss monsters
    public useCoordinateCache: boolean = false; // Flag to indicate if this monster is using the coordinate cache

    protected spawnPoint: PhaserMath.Vector2;
    protected wanderTarget: PhaserMath.Vector2 | null = null;
    protected wanderTimer= 0;
    protected stateTimer= 0;
    protected lastStateChange= 0;

    protected playerSprite: Physics.Arcade.Sprite;
    protected itemSystem: ItemSystem;
    
    // Auto-attack properties
    protected readonly ATTACK_RANGE: number = 40; // Range at which monster can attack player
    protected attackIndicator: GameObjects.Graphics | null = null;

    protected healthBar: GameObjects.Graphics;

    constructor(scene: Scene, x: number, y: number, monsterData: MonsterData, playerSprite: Physics.Arcade.Sprite, itemSystem: ItemSystem) {
        super(scene, x, y, monsterData.spriteKey);
        
        this.monsterType = monsterData.type;
        this.monsterName = monsterData.name;
        this.behavior = monsterData.behavior;
        this.attributes = { ...monsterData.attributes };
        this.lootTable = [...monsterData.lootTable];
        this.goldReward = monsterData.goldReward || 0;
        this.xpReward = monsterData.xpReward || 0;
        this.isBoss = monsterData.isBoss || false; // Set boss flag from monster data
        
        this.playerSprite = playerSprite;
        this.itemSystem = itemSystem;
        
        // Set up sprite
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        if (monsterData.scale) {
            this.setScale(monsterData.scale);
        }
        
        // Make monster interactive (clickable)
        this.setInteractive({ useHandCursor: true });
        
        // Set appropriate depth to ensure monsters are visible
        // We want monsters to be above the map but below the player (player depth is 100)
        this.setDepth(50);
        
        // Store spawn location
        this.spawnPoint = new PhaserMath.Vector2(x, y);
        
        // Set up health bar
        this.healthBar = scene.add.graphics();
        this.updateHealthBar();
    }

    /**
     * Update the monster's position based on its lat/lng coordinates
     * This is called by the coordinate cache system
     */
    public updatePositionFromLatLng(): void {
        // Update health bar position
        this.updateHealthBar();
        
        // Update attack indicator position if it exists
        if (this.attackIndicator) {
            this.updateAttackIndicator();
        }
    }

    /**
     * Get the monster's current pixel position
     * @returns The monster's current pixel position
     */
    public getPixelPosition(): { x: number, y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Set the monster's pixel position
     * @param x X coordinate
     * @param y Y coordinate
     */
    public setPixelPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
        
        // Update health bar and attack indicator
        this.updateHealthBar();
        if (this.attackIndicator) {
            this.updateAttackIndicator();
        }
    }

    protected updateHealthBar(): void {
        if (!this.healthBar) return;
        
        this.healthBar.clear();
        
        // Validate health values to prevent NaN
        if (isNaN(this.attributes.health) || this.attributes.health === undefined) {
            logger.error(LogCategory.MONSTER, `Invalid health value: ${this.attributes.health}, resetting to 0`);
            this.attributes.health = 0;
        }
        
        if (isNaN(this.attributes.maxHealth) || this.attributes.maxHealth <= 0) {
            logger.error(LogCategory.MONSTER, `Invalid maxHealth value: ${this.attributes.maxHealth}, resetting to 1`);
            this.attributes.maxHealth = 1;
        }
        
        // Position the health bar above the monster
        const barX = this.x - 20;
        // Bar is 10 pixels below the monster
        const barY = this.y + this.height / 2;
        
        // Set depth to ensure health bar is always visible
        this.healthBar.setDepth(60); // Above the monster but below the player
        
        // Background (red)
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(barX, barY, 40, 5);
        
        // Calculate health percentage safely
        let healthPercentage = this.attributes.health / this.attributes.maxHealth;
        
        // Validate health percentage
        if (isNaN(healthPercentage) || healthPercentage < 0) {
            healthPercentage = 0;
        } else if (healthPercentage > 1) {
            healthPercentage = 1;
        }
        
        // Health (green)
        this.healthBar.fillStyle(0x00ff00);
        this.healthBar.fillRect(barX, barY, 40 * healthPercentage, 5);
        
        // Border (white)
        this.healthBar.lineStyle(1, 0xffffff, 0.8);
        this.healthBar.strokeRect(barX, barY, 40, 5);
    }

    public changeState(newState: MonsterState): void {
        if (newState === this.currentState) return;
        
        // Reset state-specific timers
        this.stateTimer = 0;
        this.lastStateChange = this.scene.time.now;
        
        // Handle exiting the current state
        // Add any cleanup code here
        
        // Set the new state
        this.currentState = newState;
        
        // Handle entering the new state
        // Add any setup code here
    }

    public takeDamage(amount: number): void {
        // Validate amount to ensure it's a number
        if (isNaN(amount) || amount === undefined) {
            logger.error(LogCategory.MONSTER, `Invalid damage amount: ${amount}`);
            amount = 0;
        }
        
        // Calculate actual damage after defense
        const actualDamage = Math.max(1, amount - (this.attributes.defense || 0));
        
        // Ensure health is a valid number before reducing it
        if (isNaN(this.attributes.health)) {
            logger.error(LogCategory.MONSTER, 'Health is NaN, resetting to 1');
            this.attributes.health = 1;
        }
        
        // Reduce health
        this.attributes.health = Math.max(0, this.attributes.health - actualDamage);
        
        // Ensure health is still a valid number after calculation
        if (isNaN(this.attributes.health)) {
            logger.error(LogCategory.MONSTER, 'Health became NaN after damage calculation, setting to 0');
            this.attributes.health = 0;
        }
        
        // Update health bar
        this.updateHealthBar();
        
        // Show damage text
        this.showDamageText(actualDamage);
        
        // Check if dead
        if (this.attributes.health <= 0) {
            this.die();
            return;
        }
        
        // Set auto-attacking flag when damaged
        this.isAutoAttacking = true;
        
        // React based on behavior
        switch (this.behavior) {
            case MonsterBehavior.PASSIVE:
                this.changeState(MonsterState.FLEEING);
                break;
                
            case MonsterBehavior.NEUTRAL:
                // Neutral monsters become aggressive when attacked
                this.changeState(MonsterState.CHASING);
                break;
                
            case MonsterBehavior.AGGRESSIVE:
            case MonsterBehavior.TERRITORIAL:
                this.changeState(MonsterState.CHASING);
                break;
        }
    }

    /**
     * Shows a floating damage text above the monster
     * @param amount The amount of damage to display
     */
    protected showDamageText(amount: number): void {
        const damageText = this.scene.add.text(
            this.x, 
            this.y - this.height / 2, 
            `-${amount}`, 
            { fontFamily: 'Arial', fontSize: '16px', color: '#FF0000' }
        );
        
        this.scene.tweens.add({
            targets: damageText,
            y: damageText.y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => damageText.destroy()
        });
    }

    /**
     * Attack the player using the combat system
     * @returns {boolean} Whether the attack was successful
     */
    protected attackPlayer(): boolean {
        // Use combat system if available
        const combatSystem = (this.scene as any).combatSystem;
        if (combatSystem) {
            // The combat system now returns whether the attack was successful
            const attackSuccessful = combatSystem.monsterAttackPlayer(this, this.attributes.damage);
            return attackSuccessful;
        } else {
            // Fallback for backward compatibility
            const playerSystem = (this.scene as any).playerSystem;
            if (playerSystem && typeof playerSystem.takeDamage === 'function') {
                playerSystem.takeDamage(this.attributes.damage);
                return true;
            } else {
                console.log(`${this.monsterName} attacks player for ${this.attributes.damage} damage`);
                return true;
            }
        }
    }

    protected die(): void {
        // Set state to dead
        this.currentState = MonsterState.DEAD;
        
        // Clear auto-attacking flag and hide indicator
        this.isAutoAttacking = false;
        this.hideAttackIndicator();
        
        // Destroy the health bar
        if (this.healthBar) {
            this.healthBar.destroy();
        }
        
        // Drop loot
        this.dropLoot();
        
        // Reward player with gold and XP
        this.rewardPlayer();
        
        // Play death animation or effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    protected dropLoot(): void {
        for (const loot of this.lootTable) {
            // Check drop chance
            if (Math.random() <= loot.dropChance) {
                // Determine quantity
                const quantity = Phaser.Math.Between(
                    loot.minQuantity, 
                    loot.maxQuantity
                );
                
                if (quantity > 0) {
                    // Add some randomness to drop position
                    const dropX = this.x + Phaser.Math.Between(-10, 10);
                    const dropY = this.y + Phaser.Math.Between(-10, 10);
                    
                    // Create the item
                    const item = this.itemSystem.createItem(loot.itemId);
                    
                    if (item) {
                        // Here we would add the item to the world
                        // For now, just log it
                        console.log(`Dropped ${quantity}x ${item.name} at (${dropX}, ${dropY})`);
                        
                        // Add to player inventory directly for now
                        const gameScene = this.scene as any;
                        if (gameScene.givePlayerItem) {
                            gameScene.givePlayerItem(loot.itemId, quantity);
                        }
                    }
                }
            }
        }
    }

    /**
     * Rewards the player with gold and XP for killing this monster
     */
    protected rewardPlayer(): void {
        const gameScene = this.scene as any;
        
        // Add gold to player
        if (this.goldReward > 0) {
            // Use the Game scene's addGold method if available
            if (gameScene.addGold) {
                gameScene.addGold(this.goldReward);
            } else {
                // Fallback for backward compatibility
                gameScene.playerStats.gold += this.goldReward;
                
                // Show gold reward text
                this.showRewardText(this.goldReward, '#FFD700');
            }
        }
        
        // Add XP to player
        if (this.xpReward > 0) {
            // Use the Game scene's addXP method instead of directly modifying playerStats
            if (gameScene.addXP) {
                gameScene.addXP(this.xpReward);
            } else {
                // Fallback for backward compatibility
                gameScene.playerStats.xp += this.xpReward;
                
                // Show XP reward text
                this.showRewardText(`+${this.xpReward} XP`, '#00FFFF');
            }
        }
    }
    
    /**
     * Shows a floating reward text above the monster
     * @param text The text to display
     * @param color The color of the text
     */
    protected showRewardText(text: string | number, color: string): void {
        const textStr = typeof text === 'number' ? `+${text} gold` : text;
        const rewardText = this.scene.add.text(
            this.x, 
            this.y - this.height / 2 - 20, 
            textStr, 
            { fontFamily: 'Arial', fontSize: '16px', color: color, stroke: '#000000', strokeThickness: 3 }
        );
        rewardText.setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: rewardText,
            y: rewardText.y - 40,
            alpha: 0,
            duration: 1500,
            onComplete: () => rewardText.destroy()
        });
    }

    public update(time: number, delta: number): void {
        if (this.currentState === MonsterState.DEAD) return;
        
        // Update health bar position
        this.updateHealthBar();
        
        // Update attack indicator
        if (this.isAutoAttacking) {
            this.showAttackIndicator();
            this.updateAttackIndicator();
        } else {
            this.hideAttackIndicator();
        }
        
        // Calculate distance to player
        const distToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.playerSprite.x, this.playerSprite.y
        );
        
        // Update current state
        switch (this.currentState) {
            case MonsterState.IDLE:
                this.handleIdleState(time, delta, distToPlayer);
                break;
                
            case MonsterState.WANDERING:
                this.handleWanderingState(time, delta, distToPlayer);
                break;
                
            case MonsterState.FLEEING:
                this.handleFleeingState(time, delta, distToPlayer);
                break;
                
            case MonsterState.CHASING:
                this.handleChasingState(time, delta, distToPlayer);
                break;
                
            case MonsterState.ATTACKING:
                this.handleAttackingState(time, delta, distToPlayer);
                break;
                
            case MonsterState.RETURNING:
                this.handleReturningState(time, delta);
                break;
        }
    }

    // These methods should be implemented by subclasses to provide specific behavior
    protected abstract handleIdleState(time: number, delta: number, distToPlayer: number): void;
    protected abstract handleWanderingState(time: number, delta: number, distToPlayer: number): void;
    protected abstract handleFleeingState(time: number, delta: number, distToPlayer: number): void;
    protected abstract handleChasingState(time: number, delta: number, distToPlayer: number): void;
    protected abstract handleAttackingState(time: number, delta: number, distToPlayer: number): void;
    protected abstract handleReturningState(time: number, delta: number): void;

    protected setNewWanderTarget(): void {
        // Set a random point within a certain radius of the spawn point
        const wanderRadius = 30;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * wanderRadius;
        
        const x = this.spawnPoint.x + Math.cos(angle) * distance;
        const y = this.spawnPoint.y + Math.sin(angle) * distance;
        
        this.wanderTarget = new PhaserMath.Vector2(x, y);
    }

    // Helper method to safely check if an animation exists
    protected animationExists(key: string): boolean {
        try {
            return this.anims.exists(key);
        } catch (error) {
            console.error(`Error checking if animation ${key} exists:`, error);
            return false;
        }
    }
    
    // Helper method to safely play an animation
    protected safePlayAnimation(key: string): boolean {
        if (!this.animationExists(key)) {
            return false;
        }
        
        try {
            this.anims.play(key);
            return true;
        } catch (error) {
            console.error(`Error playing animation ${key}:`, error);
            return false;
        }
    }

    /**
     * Shows a visual indicator that this monster is attacking the player
     */
    protected showAttackIndicator(): void {
        // Remove any existing indicator
        this.hideAttackIndicator();
        
        // Create a new indicator
        this.attackIndicator = this.scene.add.graphics();
        this.attackIndicator.lineStyle(2, 0xff0000, 1);
        this.attackIndicator.lineBetween(this.x, this.y, this.playerSprite.x, this.playerSprite.y);
        this.attackIndicator.setDepth(this.depth - 1);
    }
    
    /**
     * Hides the attack indicator
     */
    protected hideAttackIndicator(): void {
        if (this.attackIndicator) {
            this.attackIndicator.destroy();
            this.attackIndicator = null as unknown as GameObjects.Graphics;
        }
    }
    
    /**
     * Updates the attack indicator position
     */
    protected updateAttackIndicator(): void {
        if (this.attackIndicator && this.isAutoAttacking) {
            this.attackIndicator.clear();
            this.attackIndicator.lineStyle(2, 0xff0000, 1);
            this.attackIndicator.lineBetween(this.x, this.y, this.playerSprite.x, this.playerSprite.y);
        }
    }

    /**
     * Override the destroy method to ensure proper cleanup
     * @param fromScene Whether this Game Object is being destroyed by the Scene
     */
    public destroy(fromScene?: boolean): void {
        try {
            // Clean up health bar if it exists
            if (this.healthBar) {
                this.healthBar.destroy();
                this.healthBar = null as unknown as GameObjects.Graphics;
            }
            
            // Clean up attack indicator if it exists
            if (this.attackIndicator) {
                this.attackIndicator.destroy();
                this.attackIndicator = null as unknown as GameObjects.Graphics;
            }
            
            // Clear references
            this.playerSprite = null as unknown as Physics.Arcade.Sprite;
            this.itemSystem = null as unknown as ItemSystem;
            this.wanderTarget = null;
            
            // Call the parent destroy method
            super.destroy(fromScene);
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error in BaseMonster destroy: ${error}`);
        }
    }

    /**
     * Override setVelocity to handle coordinate cache integration
     * @param x X velocity
     * @param y Y velocity
     */
    public setVelocity(x: number, y: number): this {
        // If using coordinate cache, we need to update lat/lng instead of using physics
        if (this.useCoordinateCache) {
            // Calculate new position based on velocity and delta time (assuming 16ms frame time)
            const deltaTime = 16 / 1000; // 16ms in seconds
            const newX = this.x + x * deltaTime;
            const newY = this.y + y * deltaTime;
            
            // Store the intended direction for animation purposes
            if (this.body) {
                this.body.velocity.x = x;
                this.body.velocity.y = y;
            }
            
            // Update lat/lng based on new position
            if (this.scene && (this.scene as any).mapManager) {
                const mapManager = (this.scene as any).mapManager;
                const latLng = mapManager.pixelToLatLng(newX, newY);
                
                // Update data
                this.setData('lat', latLng.lat);
                this.setData('lng', latLng.lng);
                
                // If we have a position manager, update through it
                if ((this.scene as any).monsterSystem && (this.scene as any).monsterSystem.positionManager) {
                    const positionManager = (this.scene as any).monsterSystem.positionManager;
                    positionManager.updateMonsterPosition(this, latLng.lat, latLng.lng);
                }
            }
            
            return this;
        }
        
        // Otherwise use normal physics
        return super.setVelocity(x, y);
    }
} 