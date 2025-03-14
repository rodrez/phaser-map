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
        
        // Store a reference to the stats service
        this.statsService = playerStatsService;
        
        // For backward compatibility, set scene.playerStats to point to the service's stats
        this.scene.playerStats = this.statsService.getStats();
        
        // Register this system in the scene for other systems to access
        this.scene.playerHealthSystem = this;
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.info(LogCategory.HEALTH, "PlayerHealthSystem initialized");
    }
    
    /**
     * Set up event listeners for health-related events
     */
    setupEventListeners() {
        if (this.scene.events) {
            // Listen for god mode toggle events
            this.scene.events.on('godModeEnabled', (enabled) => {
                if (enabled !== this.statsService.getStat('godMode')) {
                    if (enabled) {
                        this.statsService.setStat('godMode', true);
                        this.checkGodModeHealing();
                    } else {
                        this.statsService.setStat('godMode', false);
                    }
                    logger.info(LogCategory.PLAYER, `God mode ${enabled ? 'enabled' : 'disabled'} via event`);
                }
            });
            
            // Listen for stats service events and forward them to the scene
            this.statsService.on('stats-changed', (changedStats) => {
                if (this._updatingFromEvent) return;
                this._updatingFromEvent = true;
                
                // Update UI if health changed
                if ('health' in changedStats) {
                    this.updateUI(true);
                }
                
                // Check for player death
                if (changedStats.health !== undefined && 
                    changedStats.health <= 0 && 
                    !this.statsService.getStat('godMode')) {
                    this.handlePlayerDeath();
                }
                
                this._updatingFromEvent = false;
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
     * Apply damage to the player
     * @param {number} damage - The amount of damage to apply
     * @param {string} source - The source of the damage
     * @returns {number} - The actual damage applied
     */
    takeDamage(damage, source = 'unknown') {
        return this.statsService.takeDamage(damage, source);
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
     * Heal the player to full health
     * @param {string} source - The source of the full heal
     * @returns {number} - The amount healed
     */
    healToFull(source = 'full heal') {
        const amountHealed = this.statsService.healToFull(source);
        
        // Show full heal effect if available
        if (amountHealed > 0 && this.scene.playerManager?.statsManager?.showFullHealEffect) {
            this.scene.playerManager.statsManager.showFullHealEffect(amountHealed);
        }
        
        return amountHealed;
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