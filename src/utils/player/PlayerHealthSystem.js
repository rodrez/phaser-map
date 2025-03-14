import { logger, LogCategory } from '../Logger';
import playerStatsService from './PlayerStatsService';

/**
 * PlayerHealthSystem - Manages player health functionality
 * Acts as a bridge between the game scene and the PlayerStatsService
 */
export class PlayerHealthSystem {
    /**
     * Constructor for the PlayerHealthSystem
     * @param {Phaser.Scene} scene - The Phaser scene this system belongs to
     */
    constructor(scene) {
        this.scene = scene;
        
        // Initialize recursion guard
        this._updatingFromEvent = false;
        this._updatingHealthBar = false;
        
        // Store a reference to the stats service
        this.statsService = playerStatsService;
        
        // For backward compatibility, set scene.playerStats to point to the service's stats
        this.scene.playerStats = this.statsService.getStats();
        
        // Register this system in the scene for other systems to access
        this.scene.playerHealthSystem = this;
        
        // Set up event listeners with error handling
        try {
            this.setupEventListeners();
        } catch (error) {
            logger.error(LogCategory.HEALTH, `Error setting up event listeners: ${error.message}`);
            console.error("Error in PlayerHealthSystem.setupEventListeners:", error);
        }
        
        logger.info(LogCategory.HEALTH, "PlayerHealthSystem initialized");
    }
    
    /**
     * Set up event listeners for health-related events
     */
    setupEventListeners() {
        if (this.scene.events) {
            // Listen for scene shutdown to clean up
            this.scene.events.once('shutdown', () => {
                this.cleanupEventListeners();
            });
            
            // Listen for health changes
            this.statsService.on('stats-changed', (stats) => {
                if ('health' in stats) {
                    // Check for player death
                    if (stats.health <= 0) {
                        this.handlePlayerDeath();
                    }
                    
                    // Update UI if available
                    this.updateUI();
                }
            });
            
            // Listen for damage events
            this.statsService.on('damage-taken', (data) => {
                // Show damage text if player manager is available
                if (this.scene.playerManager?.statsManager?.showDamageText) {
                    this.scene.playerManager.statsManager.showDamageText(data.damage);
                }
                
                // Emit event to scene
                this.safeEmitEvent('player-damage-taken', data.damage);
                
                // Check if god mode should trigger healing
                this.checkGodModeHealing();
            });
            
            // Listen for dodge events
            this.statsService.on('attack-dodged', (data) => {
                // Show dodge effect if player manager is available
                if (this.scene.playerManager?.statsManager?.showDodgeEffect) {
                    this.scene.playerManager.statsManager.showDodgeEffect();
                } else {
                    // Fallback: Show a text indicator for dodge
                    if (this.scene.playerManager?.statsManager?.showDamageText) {
                        // Use the damage text system to show "DODGE!" instead
                        const player = this.scene.playerManager.getPlayer();
                        if (player) {
                            const dodgeText = this.scene.add.text(
                                player.x, 
                                player.y - 20, 
                                'DODGE!', 
                                { fontFamily: 'Arial', fontSize: '16px', color: '#00FF00', fontWeight: 'bold' }
                            );
                            dodgeText.setDepth(2001);
                            
                            // Animate the dodge text
                            this.scene.tweens.add({
                                targets: dodgeText,
                                y: dodgeText.y - 30,
                                alpha: 0,
                                duration: 800,
                                onComplete: () => dodgeText.destroy()
                            });
                        }
                    }
                }
                
                // Emit event to scene
                this.safeEmitEvent('player-attack-dodged', data.source);
            });
            
            // Listen for healing events
            this.statsService.on('healing', (data) => {
                // Show healing effect if player manager is available
                if (this.scene.playerManager?.statsManager?.showHealEffect) {
                    this.scene.playerManager.statsManager.showHealEffect(data.amount);
                }
            });
            
            // Listen for god mode healing events
            this.statsService.on('god-mode-healing', (data) => {
                // Show special god mode heal effect
                if (this.scene.playerManager?.statsManager?.showGodModeHealEffect) {
                    this.scene.playerManager.statsManager.showGodModeHealEffect(data.amount);
                }
                
                // Show a message if UI manager is available
                if (this.scene.uiManager) {
                    this.scene.uiManager.showMedievalMessage("God Mode: Thou art fully healed!", "success", 1500);
                }
            });
        }
    }
    
    /**
     * Clean up event listeners when the scene is shut down
     */
    cleanupEventListeners() {
        // Remove all listeners from the stats service
        this.statsService.removeAllListeners('stats-changed');
        this.statsService.removeAllListeners('damage-taken');
        this.statsService.removeAllListeners('attack-dodged');
        this.statsService.removeAllListeners('healing');
        this.statsService.removeAllListeners('god-mode-healing');
        
        logger.info(LogCategory.HEALTH, "PlayerHealthSystem event listeners cleaned up");
    }
    
    /**
     * Apply damage to the player
     * @param {number} damage - The amount of damage to apply
     * @param {string} source - The source of the damage
     * @returns {number} - The actual damage applied
     */
    takeDamage(damage, source = 'unknown') {
        try {
            // Ensure damage is a valid number before passing it to the stats service
            if (isNaN(damage) || damage === undefined) {
                logger.error(LogCategory.HEALTH, `PlayerHealthSystem received invalid damage: ${damage}, defaulting to 0`);
                damage = 0;
            }
            
            // Convert to number to ensure proper calculation
            damage = Number(damage);
            
            // Pass to stats service and get the actual damage applied
            const actualDamage = this.statsService.takeDamage(damage, source);
            
            // Ensure the return value is a valid number
            if (isNaN(actualDamage)) {
                logger.error(LogCategory.HEALTH, `PlayerHealthSystem received NaN from statsService.takeDamage, returning 0`);
                return 0;
            }
            
            return Number(actualDamage);
        } catch (error) {
            logger.error(LogCategory.HEALTH, `Error in PlayerHealthSystem.takeDamage: ${error.message}`);
            return 0;
        }
    }
    
    /**
     * Heal the player by a specific amount
     * @param {number} amount - The amount to heal
     * @param {string} source - The source of healing
     * @returns {number} - The actual amount healed
     */
    heal(amount, source = 'potion') {
        return this.statsService.heal(amount, source);
    }
    
    /**
     * Check if god mode should trigger healing
     */
    checkGodModeHealing() {
        return this.statsService.checkGodModeHealing();
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath() {
        logger.info(LogCategory.PLAYER, 'Player died');
        
        // Show death message
        if (this.scene.uiManager) {
            this.scene.uiManager.showMedievalMessage('You have died!', 'error', 5000);
        }
        
        // Transition to game over scene after a delay
        this.scene.time.delayedCall(2000, () => {
            this.scene.scene.start('GameOver');
        });
    }
    
    /**
     * Toggle god mode
     * @returns {boolean} - The new god mode state
     */
    toggleGodMode() {
        const newGodModeState = this.statsService.toggleGodMode();
        
        // Update UI
        this.updateUI();
        
        // Emit event that god mode has changed using the safe method
        this.safeEmitEvent('godModeChanged', newGodModeState);
        
        return newGodModeState;
    }
    
    /**
     * Safely emit an event without causing recursion
     * @param {string} eventName - The name of the event to emit
     * @param {any} data - The data to emit with the event
     */
    safeEmitEvent(eventName, data) {
        if (this._updatingFromEvent) return;
        
        this._updatingFromEvent = true;
        if (this.scene.events) {
            this.scene.events.emit(eventName, data);
        }
        this._updatingFromEvent = false;
    }
    
    /**
     * Update the UI to reflect current health
     * @param {boolean} forcedVisible - Whether to force the health bar to be visible
     */
    updateUI(forcedVisible = false) {
        // Update health bar if player manager is available
        if (this.scene.playerManager?.statsManager?.updatePlayerHealthBar) {
            this.scene.playerManager.statsManager.updatePlayerHealthBar(forcedVisible);
        }
    }
    
    /**
     * Get the current player health
     * @returns {number} - The current health
     */
    getHealth() {
        return this.statsService.getStat('health');
    }
    
    /**
     * Get the maximum player health
     * @returns {number} - The maximum health
     */
    getMaxHealth() {
        return this.statsService.getStat('maxHealth');
    }
    
    /**
     * Check if god mode is enabled
     * @returns {boolean} - Whether god mode is enabled
     */
    isGodModeEnabled() {
        return this.statsService.getStat('godMode');
    }
} 