import { logger, LogCategory } from './Logger';
import Phaser from 'phaser';

/**
 * Enum for status effect types
 */
export const StatusEffectType = {
    POISON: 'poison',
    BURN: 'burn',
    FROZEN: 'frozen',
    STUNNED: 'stunned',
    PINNED: 'pinned',
    // Add more status effects here as needed
};

/**
 * Class representing a single status effect instance
 */
export class StatusEffect {
    /**
     * Create a new status effect
     * @param {string} type - The type of status effect (from StatusEffectType)
     * @param {Object} config - Configuration for the status effect
     * @param {number} config.damage - Damage per tick
     * @param {number} config.duration - Duration in milliseconds
     * @param {number} config.tickInterval - Interval between damage ticks in milliseconds
     * @param {Object} config.source - The source of the status effect (e.g., monster, trap)
     */
    constructor(type, config) {
        this.type = type;
        this.damage = config.damage || 1;
        this.duration = config.duration || 5000; // Default 5 seconds
        this.tickInterval = config.tickInterval || 1000; // Default 1 second
        this.source = config.source || null;
        
        // Internal tracking
        this.remainingDuration = this.duration;
        this.timeSinceLastTick = 0;
        this.totalDamageDealt = 0;
        this.tickCount = 0;
    }
    
    /**
     * Update the status effect
     * @param {number} delta - Time delta in milliseconds
     * @returns {Object} - Information about the tick if one occurred
     */
    update(delta) {
        // Reduce remaining duration
        this.remainingDuration -= delta;
        
        // Check if effect has expired
        if (this.remainingDuration <= 0) {
            return { expired: true, ticked: false, damage: 0 };
        }
        
        // Increment time since last tick
        this.timeSinceLastTick += delta;
        
        // Check if it's time for a damage tick
        if (this.timeSinceLastTick >= this.tickInterval) {
            // Reset tick timer
            this.timeSinceLastTick -= this.tickInterval;
            
            // Increment counters
            this.totalDamageDealt += this.damage;
            this.tickCount++;
            
            // Return tick information
            return { 
                expired: false, 
                ticked: true, 
                damage: this.damage,
                type: this.type,
                source: this.source ? (this.source.monsterName || 'unknown') : 'unknown'
            };
        }
        
        // No tick occurred
        return { expired: false, ticked: false, damage: 0 };
    }
    
    /**
     * Get the remaining duration as a percentage
     * @returns {number} - Percentage of duration remaining (0-100)
     */
    getRemainingPercentage() {
        return (this.remainingDuration / this.duration) * 100;
    }
    
    /**
     * Get a description of the status effect
     * @returns {string} - Description of the status effect
     */
    getDescription() {
        const secondsRemaining = Math.ceil(this.remainingDuration / 1000);
        
        switch (this.type) {
            case StatusEffectType.POISON:
                return `Poisoned: ${this.damage} damage every ${this.tickInterval / 1000}s (${secondsRemaining}s remaining)`;
            case StatusEffectType.BURN:
                return `Burning: ${this.damage} damage every ${this.tickInterval / 1000}s (${secondsRemaining}s remaining)`;
            case StatusEffectType.FROZEN:
                return `Frozen: Movement speed reduced by ${this.damage}% (${secondsRemaining}s remaining)`;
            case StatusEffectType.STUNNED:
                return `Stunned: Cannot attack (${secondsRemaining}s remaining)`;
            case StatusEffectType.PINNED:
                return `Pinned: Cannot move (${secondsRemaining}s remaining)`;
            default:
                return `${this.type}: ${this.damage} damage every ${this.tickInterval / 1000}s (${secondsRemaining}s remaining)`;
        }
    }
}

/**
 * System for managing status effects on the player
 */
export class StatusEffectSystem extends Phaser.Events.EventEmitter {
    /**
     * Create a new status effect system
     * @param {Object} playerManager - The player manager instance
     */
    constructor(playerManager) {
        super();
        
        this.playerManager = playerManager;
        this.activeEffects = new Map(); // Map of effect type to StatusEffect instance
        
        logger.info(LogCategory.COMBAT, "StatusEffectSystem initialized");
    }
    
    /**
     * Apply a status effect to the player
     * @param {string} type - The type of status effect (from StatusEffectType)
     * @param {Object} config - Configuration for the status effect
     * @returns {boolean} - Whether the effect was applied
     */
    applyEffect(type, config) {
        // Validate effect type
        if (!Object.values(StatusEffectType).includes(type)) {
            logger.error(LogCategory.COMBAT, `Invalid status effect type: ${type}`);
            return false;
        }
        
        // Create the effect
        const effect = new StatusEffect(type, config);
        
        // If an effect of this type already exists, replace it if the new one is stronger
        // or extend the duration if it's the same strength
        if (this.activeEffects.has(type)) {
            const existingEffect = this.activeEffects.get(type);
            
            // If new effect does more damage, replace the existing one
            if (effect.damage > existingEffect.damage) {
                this.activeEffects.set(type, effect);
                logger.info(
                    LogCategory.COMBAT, 
                    `Replaced ${type} effect with stronger version (${existingEffect.damage} -> ${effect.damage} damage)`
                );
            } else if (effect.damage === existingEffect.damage) {
                // If same damage, extend the duration
                existingEffect.remainingDuration = Math.max(
                    existingEffect.remainingDuration,
                    effect.duration
                );
                logger.info(
                    LogCategory.COMBAT, 
                    `Extended ${type} effect duration to ${existingEffect.remainingDuration / 1000}s`
                );
            } else {
                // New effect is weaker, don't replace
                logger.info(
                    LogCategory.COMBAT, 
                    `Ignored weaker ${type} effect (${effect.damage} vs existing ${existingEffect.damage})`
                );
                return false;
            }
        } else {
            // No existing effect of this type, add it
            this.activeEffects.set(type, effect);
            logger.info(
                LogCategory.COMBAT, 
                `Applied ${type} effect: ${effect.damage} damage every ${effect.tickInterval / 1000}s for ${effect.duration / 1000}s`
            );
        }
        
        // Emit event for UI updates
        this.emit('effect-applied', { type, effect });
        
        return true;
    }
    
    /**
     * Remove a status effect
     * @param {string} type - The type of status effect to remove
     * @returns {boolean} - Whether an effect was removed
     */
    removeEffect(type) {
        if (!this.activeEffects.has(type)) {
            return false;
        }
        
        // Remove the effect
        this.activeEffects.delete(type);
        
        // Emit event for UI updates
        this.emit('effect-removed', { type });
        
        logger.info(LogCategory.COMBAT, `Removed ${type} effect`);
        
        return true;
    }
    
    /**
     * Clear all status effects
     */
    clearAllEffects() {
        const effectTypes = Array.from(this.activeEffects.keys());
        
        // Clear the effects map
        this.activeEffects.clear();
        
        // Emit events for each removed effect
        for (const type of effectTypes) {
            this.emit('effect-removed', { type });
        }
        
        logger.info(LogCategory.COMBAT, `Cleared all status effects (${effectTypes.length} removed)`);
    }
    
    /**
     * Get all active status effects
     * @returns {Array} - Array of active status effects
     */
    getActiveEffects() {
        return Array.from(this.activeEffects.values());
    }
    
    /**
     * Check if a specific status effect is active
     * @param {string} type - The type of status effect to check
     * @returns {boolean} - Whether the effect is active
     */
    hasEffect(type) {
        return this.activeEffects.has(type);
    }
    
    /**
     * Update all status effects
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        // Skip update if no active effects
        if (this.activeEffects.size === 0) {
            return;
        }
        
        // Track effects to remove
        const effectsToRemove = [];
        
        // Update each effect and apply damage if needed
        for (const [type, effect] of this.activeEffects.entries()) {
            const result = effect.update(delta);
            
            // Check if effect expired
            if (result.expired) {
                effectsToRemove.push(type);
                continue;
            }
            
            // Apply damage if a tick occurred
            if (result.ticked && result.damage > 0) {
                try {
                    // Apply damage to player
                    const damageSource = `${type} effect`;
                    
                    let actualDamage = 0;
                    
                    // Access the health system directly if available
                    if (this.playerManager.healthSystem) {
                        // Get the stats service from the health system
                        const statsService = this.playerManager.healthSystem.statsService;
                        
                        // Get current stats for damage calculation
                        const stats = statsService.getStats();
                        const defense = isNaN(stats.defense) ? 0 : Number(stats.defense);
                        const damageReduction = defense * 0.5;
                        actualDamage = Math.max(1, Math.floor(result.damage - damageReduction));
                        
                        // Store current health before damage
                        const oldHealth = stats.health;
                        
                        // Apply damage directly (bypassing dodge)
                        // NOTE: Status effects intentionally bypass dodge chance since they represent
                        // ongoing conditions that can't be dodged once applied (poison, burn, etc.)
                        stats.health = Math.max(0, stats.health - actualDamage);
                        
                        // Log the damage
                        logger.info(
                            LogCategory.HEALTH, 
                            `Player took ${actualDamage} damage from ${damageSource} (${result.damage} base, ${damageReduction.toFixed(1)} reduced by defense). Health: ${oldHealth} -> ${stats.health}/${stats.maxHealth}`
                        );
                        
                        // Emit damage taken event
                        statsService.emit('damage-taken', { 
                            damage: actualDamage, 
                            baseDamage: result.damage,
                            damageReduction,
                            source: damageSource, 
                            oldHealth, 
                            newHealth: stats.health 
                        });
                        
                        // Emit stats changed event
                        statsService.emit('stats-changed', { health: stats.health });
                        
                        // Update UI if needed
                        if (this.playerManager.healthSystem.updateUI) {
                            this.playerManager.healthSystem.updateUI();
                        }
                    } else {
                        // Fallback to regular takeDamage which might include dodge check
                        actualDamage = this.playerManager.takeDamage(result.damage, damageSource);
                        
                        // Add a warning log that dodge might still be applied
                        logger.warn(
                            LogCategory.COMBAT,
                            `Using fallback damage method for status effects - dodge might still be applied`
                        );
                    }
                    
                    // Emit tick event
                    this.emit('effect-tick', { 
                        type, 
                        damage: actualDamage,
                        source: result.source
                    });
                    
                    logger.info(
                        LogCategory.COMBAT, 
                        `${type} effect dealt ${actualDamage} damage to player`
                    );
                } catch (error) {
                    logger.error(
                        LogCategory.COMBAT, 
                        `Error applying ${type} effect damage: ${error.message}`
                    );
                }
            }
        }
        
        // Remove expired effects
        for (const type of effectsToRemove) {
            this.removeEffect(type);
        }
    }
    
    /**
     * Get a specific status effect
     * @param {string} type - The type of status effect to get
     * @returns {StatusEffect|null} - The status effect or null if not found
     */
    getEffect(type) {
        return this.activeEffects.get(type) || null;
    }
} 