import { Scene } from 'phaser';
import { CorePlayerManager } from './CorePlayerManager';
import { PlayerInteractionManager } from './PlayerInteractionManager';
import { PlayerStatsManager } from './PlayerStatsManager';
import { PlayerHealthSystem } from './PlayerHealthSystem';
import playerStatsService from './PlayerStatsService';
import { logger, LogCategory } from '../Logger';
import { StatusEffectSystem } from '../StatusEffectSystem';

/**
 * Base PlayerManager class - Contains common player functionality
 * This class handles core player features that are shared between
 * the main game (geo-location based) and dungeons (traditional controls)
 */
export class PlayerManager {
    /**
     * Constructor for the PlayerManager
     * @param {Object} scene - The scene containing the player
     */
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.cursors = null;
        this.playerSpeed = 160;
        
        // Common player state
        this.isMoving = false;
        this.facingDirection = 'down'; // down, up, left, right
        this.playerName = 'Adventurer'; // Default player name
        
        // Store a reference to the stats service
        this.statsService = playerStatsService;
        
        // Initialize health system
        this.healthSystem = new PlayerHealthSystem(scene);
        
        // Initialize status effect system
        this.statusEffectSystem = new StatusEffectSystem(this);
        
        // Register this manager in the scene for other systems to access
        this.scene.playerManager = this;
        
        logger.info(LogCategory.PLAYER, 'Base player manager initialized');
    }
    
    /**
     * Set the player's name
     * @param {string} name - The player's name
     */
    setPlayerName(name) {
        if (name && typeof name === 'string') {
            this.playerName = name;
            
            // Update the player's name in the stats service
            if (this.statsService) {
                this.statsService.setPlayerName(name);
            }
            
            // Update any UI elements that display the player's name
            if (this.scene.events) {
                this.scene.events.emit('player-name-changed', name);
            }
            
            logger.info(LogCategory.PLAYER, `Player name set to: ${name}`);
        }
    }
    
    /**
     * Get the player's name
     * @returns {string} The player's name
     */
    getPlayerName() {
        return this.playerName;
    }
    
    /**
     * Get the player stats
     * @returns {Object} - The player stats
     */
    getPlayerStats() {
        if (this.statsService) {
            return this.statsService.getStats();
        }
        return null;
    }
    
    /**
     * Get the player sprite
     * @returns {Phaser.GameObjects.GameObject} - The player sprite
     */
    getPlayer() {
        return this.player;
    }
    
    /**
     * Setup the player sprite with common properties
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {string} spriteKey - The key for the player sprite
     * @returns {Object} - The player sprite
     */
    setupPlayer(x = 400, y = 300, spriteKey = 'player') {
        // Create player sprite
        this.player = this.scene.physics.add.sprite(x, y, spriteKey);
        
        // Set up basic player properties
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.1);
        this.player.setDepth(10); // Ensure player is above other objects
        
        // Enable physics on the player
        this.scene.physics.world.enable(this.player);
        
        // Set player body properties
        this.player.body.setSize(24, 32); // Adjust hitbox size
        this.player.body.offset.y = 16; // Adjust hitbox position
        
        // Setup player animations
        this.setupPlayerAnimations(spriteKey);
        
        // Setup keyboard input
        this.setupKeyboardControls();
        
        logger.info(LogCategory.PLAYER, `Player created at position (${x}, ${y})`);
        
        return this.player;
    }
    
    /**
     * Setup player animations
     * @param {string} spriteKey - The key for the player sprite
     */
    setupPlayerAnimations(spriteKey = 'player') {
        const frameRate = 8;
        
        // Avoid recreating animations if they already exist
        if (this.scene.anims.exists("player-idle")) {
            return;
        }
        
        // Idle animation (frames 0-2)
        this.scene.anims.create({
            key: "player-idle",
            frames: this.scene.anims.generateFrameNumbers(spriteKey, {
                start: 0,
                end: 2,
            }),
            frameRate: frameRate,
            repeat: -1,
        });
        
        // Movement animations (frames 3-5)
        this.scene.anims.create({
            key: "player-move",
            frames: this.scene.anims.generateFrameNumbers(spriteKey, {
                start: 3,
                end: 5,
            }),
            frameRate: frameRate,
            repeat: -1,
        });
        
        // Play the idle animation by default
        if (this.player) {
            this.player.anims.play("player-idle", true);
        }
        
        logger.info(LogCategory.PLAYER, "Player animations set up");
    }
    
    /**
     * Setup keyboard controls
     */
    setupKeyboardControls() {
        // Create cursor keys for movement
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        
        // Log the cursor keys to verify they're properly initialized
        logger.info(LogCategory.PLAYER, "Keyboard controls initialized:", 
            this.cursors ? "Cursors created successfully" : "Failed to create cursors");
        
        // Add god mode toggle on 'G' key
        this.scene.input.keyboard.on('keydown-G', () => {
            // Toggle god mode
            const godModeEnabled = this.toggleGodMode();
            
            // Show message if UI manager is available
            if (this.scene.uiManager) {
                if (godModeEnabled) {
                    this.scene.uiManager.showMedievalMessage("God Mode Enabled!", "success", 2000);
                } else {
                    this.scene.uiManager.showMedievalMessage("God Mode Disabled!", "info", 2000);
                }
            }
            
            logger.info(LogCategory.PLAYER, `God Mode ${godModeEnabled ? 'enabled' : 'disabled'}`);
        });
        
        logger.info(LogCategory.PLAYER, "Keyboard controls set up");
    }
    
    /**
     * Handle basic keyboard movement
     * This is used in contexts where direct control is allowed (like dungeons)
     * @param {number} delta - Time since last update
     * @returns {boolean} - Whether the player moved
     */
    handleKeyboardMovement(delta) {
        if (!this.player || !this.cursors) {
            logger.warn(LogCategory.PLAYER, "Cannot handle keyboard movement: " + 
                (!this.player ? "Player is null" : "Cursors are null"));
            return false;
        }
        
        // Reset velocity
        this.player.setVelocity(0);
        
        let isMoving = false;
        
        // Handle movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
            this.player.flipX = true;
            this.facingDirection = 'left';
            isMoving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.playerSpeed);
            this.player.flipX = false;
            this.facingDirection = 'right';
            isMoving = true;
        }
        
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-this.playerSpeed);
            this.facingDirection = 'up';
            isMoving = true;
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(this.playerSpeed);
            this.facingDirection = 'down';
            isMoving = true;
        }
        
        // Normalize diagonal movement
        if (isMoving && 
            ((this.cursors.up.isDown || this.cursors.down.isDown) && 
             (this.cursors.left.isDown || this.cursors.right.isDown))) {
            // Normalize the velocity for diagonal movement
            this.player.body.velocity.normalize().scale(this.playerSpeed);
        }
        
        // Update animation based on movement
        if (isMoving) {
            this.player.anims.play('player-move', true);
        } else {
            this.player.anims.play('player-idle', true);
        }
        
        this.isMoving = isMoving;
        return isMoving;
    }
    
    /**
     * Move player to a specific position with animation
     * @param {number} x - Target x position
     * @param {number} y - Target y position
     * @param {number} duration - Duration of movement in ms (0 for instant)
     * @param {Function} onComplete - Callback when movement completes
     */
    movePlayerToPosition(x, y, duration = 0, onComplete = null) {
        if (!this.player) {
            logger.warn(LogCategory.PLAYER, "Cannot move player: Player is null");
            return;
        }
        
        logger.debug(LogCategory.PLAYER, `Moving player from (${this.player.x}, ${this.player.y}) to (${x}, ${y}) with duration ${duration}ms`);
        
        // Calculate direction for proper animation
        const dirX = x - this.player.x;
        const dirY = y - this.player.y;
        
        // Set the player's flip based on horizontal direction
        if (dirX < 0) {
            this.player.flipX = true;
            this.facingDirection = 'left';
        } else if (dirX > 0) {
            this.player.flipX = false;
            this.facingDirection = 'right';
        }
        
        // Update facing direction based on dominant direction
        if (Math.abs(dirY) > Math.abs(dirX)) {
            if (dirY < 0) {
                this.facingDirection = 'up';
            } else {
                this.facingDirection = 'down';
            }
        }
        
        // If duration is 0, move instantly
        if (duration === 0) {
            logger.debug(LogCategory.PLAYER, `Instant movement to (${x}, ${y})`);
            this.player.setPosition(x, y);
            if (onComplete) onComplete();
            return;
        }
        
        // Play movement animation
        this.player.anims.play('player-move', true);
        
        // Create a tween to move the player
        try {
            logger.debug(LogCategory.PLAYER, `Creating tween to move player to (${x}, ${y}) over ${duration}ms`);
            this.scene.tweens.add({
                targets: this.player,
                x: x,
                y: y,
                duration: duration,
                ease: 'Power2',
                onComplete: () => {
                    // Return to idle animation when movement completes
                    this.player.anims.play('player-idle', true);
                    this.isMoving = false;
                    
                    logger.debug(LogCategory.PLAYER, `Movement tween completed to (${this.player.x}, ${this.player.y})`);
                    
                    if (onComplete) onComplete();
                }
            });
            
            this.isMoving = true;
        } catch (error) {
            logger.error(LogCategory.PLAYER, `Error creating movement tween: ${error.message}`);
            // Fallback to instant movement
            this.player.setPosition(x, y);
            if (onComplete) onComplete();
        }
    }
    
    /**
     * Get the player's current position
     * @returns {Object} - The player's position {x, y}
     */
    getPlayerPosition() {
        if (!this.player) return { x: 0, y: 0 };
        return { x: this.player.x, y: this.player.y };
    }
    
    /**
     * Get the player's facing direction
     * @returns {string} - The direction the player is facing ('up', 'down', 'left', 'right')
     */
    getPlayerFacingDirection() {
        return this.facingDirection;
    }
    
    /**
     * Check if the player is currently moving
     * @returns {boolean} - Whether the player is moving
     */
    isPlayerMoving() {
        return this.isMoving;
    }
    
    /**
     * Handle player taking damage
     * @param {number} damage - The amount of damage to take
     * @param {string} source - The source of the damage (optional)
     * @returns {number} - The actual damage taken
     */
    takeDamage(damage, source = 'unknown') {
        try {
            // Ensure damage is a valid number
            if (isNaN(damage) || damage === undefined) {
                logger.error(LogCategory.PLAYER, `PlayerManager received invalid damage: ${damage}, defaulting to 0`);
                damage = 0;
            }
            
            // Convert to number to ensure proper calculation
            damage = Number(damage);
            
            // Pass to health system and get the actual damage applied
            const actualDamage = this.healthSystem.takeDamage(damage, source);
            
            // Ensure the return value is a valid number
            if (isNaN(actualDamage)) {
                logger.error(LogCategory.PLAYER, `PlayerManager received NaN from healthSystem.takeDamage, returning 0`);
                return 0;
            }
            
            return Number(actualDamage);
        } catch (error) {
            logger.error(LogCategory.PLAYER, `Error in PlayerManager.takeDamage: ${error.message}`);
            return 0;
        }
    }

    /**
     * Heal the player by a specific amount
     * @param {number} amount - The amount to heal
     * @param {string} source - The source of healing (optional)
     * @returns {number} - The actual amount healed
     */
    heal(amount, source = 'potion') {
        return this.healthSystem.heal(amount, source);
    }

    /**
     * Toggle god mode for the player
     */
    toggleGodMode() {
        return this.healthSystem.toggleGodMode();
    }

    /**
     * Apply a status effect to the player
     * @param {string} type - The type of status effect
     * @param {Object} config - Configuration for the status effect
     * @returns {boolean} - Whether the effect was applied
     */
    applyStatusEffect(type, config) {
        return this.statusEffectSystem.applyEffect(type, config);
    }
    
    /**
     * Remove a status effect from the player
     * @param {string} type - The type of status effect to remove
     * @returns {boolean} - Whether an effect was removed
     */
    removeStatusEffect(type) {
        return this.statusEffectSystem.removeEffect(type);
    }
    
    /**
     * Clear all status effects from the player
     */
    clearAllStatusEffects() {
        this.statusEffectSystem.clearAllEffects();
    }
    
    /**
     * Check if the player has a specific status effect
     * @param {string} type - The type of status effect to check
     * @returns {boolean} - Whether the effect is active
     */
    hasStatusEffect(type) {
        return this.statusEffectSystem.hasEffect(type);
    }
    
    /**
     * Get all active status effects on the player
     * @returns {Array} - Array of active status effects
     */
    getActiveStatusEffects() {
        return this.statusEffectSystem.getActiveEffects();
    }
    
    /**
     * Update method called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Update status effects
        if (this.statusEffectSystem) {
            this.statusEffectSystem.update(delta);
        }
        
        // This base update doesn't handle movement
        // Subclasses should override this method to implement their specific movement
    }
    
    /**
     * Clean up resources when the manager is destroyed
     */
    destroy() {
        logger.info(LogCategory.PLAYER, 'Destroying player manager');
        
        // Clear all status effects
        if (this.statusEffectSystem) {
            this.statusEffectSystem.clearAllEffects();
        }
        
        // The player sprite will be destroyed by the scene
        this.player = null;
        this.cursors = null;
    }
} 