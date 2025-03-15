import { Scene } from 'phaser';
import { CorePlayerManager } from './CorePlayerManager';
import { PlayerInteractionManager } from './PlayerInteractionManager';
import { PlayerStatsManager } from './PlayerStatsManager';
import { PlayerHealthSystem } from './PlayerHealthSystem';
import playerStatsService from './PlayerStatsService';
import { logger, LogCategory } from '../Logger';
import { StatusEffectSystem } from '../StatusEffectSystem';

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
        
        // Initialize status effect system
        this.statusEffectSystem = new StatusEffectSystem(this);
        
        // Initialize managers
        this.coreManager = new CorePlayerManager(scene, mapManager);
        this.interactionManager = new PlayerInteractionManager(scene, mapManager);
        this.statsManager = new PlayerStatsManager(scene, mapManager);
        
        // Register this manager in the scene for other systems to access
        this.scene.playerManager = this;
        
        // TESTING
        // Add key listener for god mode toggle
        this.godModeKey = this.scene.input.keyboard.addKey('G');
        this.godModeKey.on('down', () => {
            this.toggleGodMode();
            logger.info(LogCategory.PLAYER, "God mode toggled by keyboard");
        });
        
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
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        // Update all managers
        this.coreManager.update(delta);
        this.interactionManager.update(delta);
        this.statsManager.update(delta);
        
        // Update status effects
        this.statusEffectSystem.update(delta);
        
        // No need to explicitly update the health system as it's event-based
        // and doesn't have its own update method
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy all managers
        this.statsManager.destroy();
        this.interactionManager.destroy();
        this.coreManager.destroy();
        
        // Note: PlayerHealthSystem and StatusEffectSystem don't have destroy methods as they're event-based
        // and don't create any resources that need explicit cleanup
        
        logger.info(LogCategory.PLAYER, "PlayerManager destroyed");
    }
} 