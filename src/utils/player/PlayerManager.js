import { Scene } from 'phaser';
import { CorePlayerManager } from './CorePlayerManager';
import { PlayerInteractionManager } from './PlayerInteractionManager';
import { PlayerStatsManager } from './PlayerStatsManager';
import { PlayerDebugManager } from './PlayerDebugManager';
import { PlayerHealthSystem } from './PlayerHealthSystem';
import playerStatsService from './PlayerStatsService';
import { logger, LogCategory } from '../Logger';

/**
 * PlayerManager - Main player manager that coordinates all specialized player managers
 * This class serves as a facade for all player-related functionality
 */
export class PlayerManager {
    /**
     * Constructor for the PlayerManager
     * @param {Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     */
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        
        // Store a reference to the stats service
        this.statsService = playerStatsService;
        
        // Initialize health system first (as other systems depend on it)
        this.healthSystem = new PlayerHealthSystem(scene);
        
        // Initialize managers
        this.coreManager = new CorePlayerManager(scene, mapManager);
        this.interactionManager = new PlayerInteractionManager(scene, mapManager);
        this.statsManager = new PlayerStatsManager(scene, mapManager);
        this.debugManager = new PlayerDebugManager(scene, mapManager);
        
        logger.info(LogCategory.PLAYER, "PlayerManager initialized");
    }

    /**
     * Get the player sprite
     * @returns {Phaser.GameObjects.GameObject} - The player sprite
     */
    getPlayer() {
        return this.coreManager.getPlayer();
    }

    /**
     * Get the player stats
     * @returns {Object} - The player stats
     */
    getPlayerStats() {
        return this.statsService.getStats();
    }

    /**
     * Handle player click event
     * @param {Function} onPlaceFlag - Callback when a flag is placed
     */
    handleClick(onPlaceFlag) {
        return this.interactionManager.handleClick(onPlaceFlag);
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
     * Show a god mode heal effect
     * @param {number} amount - The amount healed
     */
    showGodModeHealEffect(amount) {
        if (this.statsManager && typeof this.statsManager.showGodModeHealEffect === 'function') {
            this.statsManager.showGodModeHealEffect(amount);
        }
    }

    /**
     * Test the God Mode and Full Heal features
     */
    testFeatures() {
        this.debugManager.testFeatures();
    }

    /**
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        // Update all managers
        this.coreManager.update(delta);
        this.interactionManager.update(delta);
        this.statsManager.update(delta);
        this.debugManager.update(delta);
        
        // No need to explicitly update the health system as it's event-based
        // and doesn't have its own update method
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy all managers
        this.debugManager.destroy();
        this.statsManager.destroy();
        this.interactionManager.destroy();
        this.coreManager.destroy();
        
        // Note: PlayerHealthSystem doesn't have a destroy method as it's event-based
        // and doesn't create any resources that need explicit cleanup
        
        logger.info(LogCategory.PLAYER, "PlayerManager destroyed");
    }
} 