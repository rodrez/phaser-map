import { logger, LogCategory } from '../Logger';

/**
 * PlayerHealthSystem - Single source of truth for player health
 * Manages all health-related functionality including damage, healing, and god mode
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
        
        // Initialize player stats if not already available
        if (!this.scene.playerStats) {
            this.scene.playerStats = {
                health: 100,
                maxHealth: 100,
                godMode: false
            };
        }
        
        // Store a reference to player stats for easier access
        this.playerStats = this.scene.playerStats;
        
        // Ensure godMode property exists
        if (this.playerStats.godMode === undefined) {
            this.playerStats.godMode = false;
        }
        
        // Register this system in the scene for other systems to access
        this.scene.playerHealthSystem = this;
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.info(LogCategory.PLAYER, "PlayerHealthSystem initialized");
    }
    
    /**
     * Set up event listeners for health-related events
     */
    setupEventListeners() {
        if (this.scene.events) {
            // Listen for god mode toggle events
            this.scene.events.on('godModeEnabled', (enabled) => {
                this.playerStats.godMode = enabled;
                logger.info(LogCategory.PLAYER, `God mode ${enabled ? 'enabled' : 'disabled'} via event`);
                
                // If god mode is enabled and health is below threshold, heal
                if (enabled) {
                    this.checkGodModeHealing();
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
        // Calculate actual damage (can be modified by defense, etc.)
        const actualDamage = Math.max(1, damage);
        
        // Store current health before damage
        const oldHealth = this.playerStats.health;
        
        // Apply damage to player
        this.playerStats.health = Math.max(0, this.playerStats.health - actualDamage);
        
        // Log the damage
        logger.info(
            LogCategory.PLAYER, 
            `Player took ${actualDamage} damage from ${source}. Health: ${oldHealth} -> ${this.playerStats.health}/${this.playerStats.maxHealth}`
        );
        
        // Show damage text if player manager is available
        if (this.scene.playerManager?.statsManager?.showDamageText) {
            this.scene.playerManager.statsManager.showDamageText(actualDamage);
        }
        
        // Update UI
        this.updateUI(true);
        
        // Check if god mode should trigger healing
        this.checkGodModeHealing();
        
        // Check if player is dead (only if not in god mode)
        if (this.playerStats.health <= 0 && !this.playerStats.godMode) {
            this.handlePlayerDeath();
        }
        
        return actualDamage;
    }
    
    /**
     * Heal the player by a specific amount
     * @param {number} amount - The amount to heal
     * @param {string} source - The source of healing
     * @returns {number} - The actual amount healed
     */
    heal(amount, source = 'potion') {
        // Calculate how much we can actually heal
        const maxHealAmount = this.playerStats.maxHealth - this.playerStats.health;
        const actualHealAmount = Math.min(maxHealAmount, amount);
        
        // If no healing needed, return early
        if (actualHealAmount <= 0) {
            logger.info(LogCategory.PLAYER, `Heal attempt from ${source} - Player already at full health`);
            return 0;
        }
        
        // Store current health before healing
        const oldHealth = this.playerStats.health;
        
        // Apply healing
        this.playerStats.health += actualHealAmount;
        
        // Log the healing
        logger.info(
            LogCategory.PLAYER, 
            `Player healed for ${actualHealAmount} from ${source}. Health: ${oldHealth} -> ${this.playerStats.health}/${this.playerStats.maxHealth}`
        );
        
        // Show healing effect if player manager is available
        if (this.scene.playerManager?.statsManager?.showHealEffect) {
            this.scene.playerManager.statsManager.showHealEffect(actualHealAmount);
        }
        
        // Update UI
        this.updateUI(true);
        
        return actualHealAmount;
    }
    
    /**
     * Heal the player to full health
     * @param {string} source - The source of the full heal
     * @returns {number} - The amount healed
     */
    healToFull(source = 'full heal') {
        const currentHealth = this.playerStats.health;
        const healAmount = this.playerStats.maxHealth - currentHealth;
        
        // Use the heal method with the specified source
        const amountHealed = this.heal(healAmount, source);
        
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
        if (this.playerStats.godMode === true) {
            logger.info(LogCategory.PLAYER, "God mode active, checking if healing is needed");
            
            // Get the current health
            const currentHealth = this.playerStats.health;
            
            // Only heal if health is below 50% of max health
            const healthThreshold = this.playerStats.maxHealth * 0.5; // 50% of max health
            if (currentHealth < healthThreshold) {
                logger.info(LogCategory.PLAYER, `Health ${currentHealth}/${this.playerStats.maxHealth} is below 50% threshold, triggering god mode healing`);
                
                // Calculate heal amount
                const healAmount = this.playerStats.maxHealth - currentHealth;
                
                // Immediately heal the player to full health
                this.playerStats.health = this.playerStats.maxHealth;
                
                // Show special god mode heal effect
                if (this.scene.playerManager?.statsManager?.showGodModeHealEffect) {
                    this.scene.playerManager.statsManager.showGodModeHealEffect(healAmount);
                }
                
                // Update UI
                this.updateUI();
                
                // Show a message if UI manager is available
                if (this.scene.uiManager) {
                    this.scene.uiManager.showMedievalMessage("God Mode: Thou art fully healed!", "success", 1500);
                }
                
                logger.info(LogCategory.PLAYER, `God mode healed player for ${healAmount} health (below 50% threshold). Health: ${currentHealth} -> ${this.playerStats.health}/${this.playerStats.maxHealth}`);
            } else {
                logger.info(LogCategory.PLAYER, `Health ${currentHealth}/${this.playerStats.maxHealth} is above 50% threshold, no god mode healing needed`);
            }
        }
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
        // Toggle god mode
        this.playerStats.godMode = !this.playerStats.godMode;
        
        // If enabling god mode, heal player to full health
        if (this.playerStats.godMode) {
            this.healToFull('god mode toggle');
        }
        
        // Update UI
        this.updateUI();
        
        // Emit event that god mode has changed using the safe method
        this.safeEmitEvent('godModeChanged', this.playerStats.godMode);
        
        logger.info(LogCategory.PLAYER, `God mode ${this.playerStats.godMode ? 'enabled' : 'disabled'}`);
        
        return this.playerStats.godMode;
    }
    
    /**
     * Safely emit an event without causing recursion
     * @param {string} eventName - The name of the event to emit
     * @param {any} data - The data to pass with the event
     */
    safeEmitEvent(eventName, data) {
        if (!this.scene.events) return;
        
        // Use the recursion guard to prevent infinite loops
        if (!this._updatingFromEvent) {
            this._updatingFromEvent = true;
            this.scene.events.emit(eventName, data);
            this._updatingFromEvent = false;
        }
    }
    
    /**
     * Update the UI to reflect current health
     * @param {boolean} forcedVisible - Whether to force the health bar to be visible
     */
    updateUI(forcedVisible = false) {
        // Update floating health bar if available
        if (this.scene.playerManager?.statsManager?.updatePlayerHealthBar) {
            this.scene.playerManager.statsManager.updatePlayerHealthBar(forcedVisible);
        }
        
        // Update UI if available
        if (this.scene.uiManager) {
            this.scene.uiManager.updateHealthBar();
            
            // Update god mode indicator
            if (this.scene.uiManager.setGodMode) {
                this.scene.uiManager.setGodMode(this.playerStats.godMode);
            }
        }
        
        // Emit event that player stats have changed using the safe method
        this.safeEmitEvent('player-stats-changed');
    }
    
    /**
     * Get the current player health
     * @returns {number} - The current health
     */
    getHealth() {
        return this.playerStats.health;
    }
    
    /**
     * Get the maximum player health
     * @returns {number} - The maximum health
     */
    getMaxHealth() {
        return this.playerStats.maxHealth;
    }
    
    /**
     * Check if god mode is enabled
     * @returns {boolean} - Whether god mode is enabled
     */
    isGodModeEnabled() {
        return this.playerStats.godMode === true;
    }
} 