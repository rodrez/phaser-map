import { CorePlayerManager } from './CorePlayerManager';
import playerStatsService from './PlayerStatsService';
import { logger, LogCategory } from '../Logger';

/**
 * PlayerStatsManager - Handles player stats visualization and effects
 * Manages health bar, damage/healing visual effects
 */
export class PlayerStatsManager extends CorePlayerManager {
    /**
     * Constructor for the PlayerStatsManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     */
    constructor(scene, mapManager) {
        super(scene, mapManager);
        
        this.healthBar = null;
        this.healthBarTimer = null;
        
        // Use the stats service
        this.statsService = playerStatsService;
        
        // For backward compatibility, also reference scene.playerStats
        this.playerStats = this.scene.playerStats;
        
        // Create player health bar
        this.createPlayerHealthBar();
        
        // Listen for stats changes
        this.setupEventListeners();
        
        logger.info(LogCategory.PLAYER, "PlayerStatsManager initialized");
    }

    /**
     * Set up event listeners for stats-related events
     */
    setupEventListeners() {
        // Listen for stats changes
        this.statsService.on('stats-changed', (changedStats) => {
            // Update health bar if health changed
            if ('health' in changedStats) {
                this.updatePlayerHealthBar(true);
            }
        });
    }

    /**
     * Create a floating health bar above the player
     */
    createPlayerHealthBar() {
        // Create a graphics object for the health bar
        this.healthBar = this.scene.add.graphics();
        
        // Set a high depth to ensure it's visible above most objects but below UI
        this.healthBar.setDepth(1990); // Below player (2000) but above most objects
        
        // Initial update of the health bar
        this.updatePlayerHealthBar();
        
        logger.info(LogCategory.PLAYER, "Player health bar created");
    }
    
    /**
     * Update the player's floating health bar
     * @param {boolean} forcedVisible - Whether to force the health bar to be visible
     */
    updatePlayerHealthBar(forcedVisible = false) {
        if (!this.healthBar || !this.player) return;
        
        // Prevent potential recursion
        if (this._updatingHealthBar) return;
        this._updatingHealthBar = true;
        
        // Clear previous graphics
        this.healthBar.clear();
        
        // Get current health percentage
        const healthPercent = this.playerStats.health / this.playerStats.maxHealth;
        
        // Set bar dimensions
        const barWidth = 40;
        const barHeight = 5;
        
        // Position the bar above the player
        const barX = this.player.x - barWidth / 2;
        const barY = this.player.y - this.player.height / 2 - 15; // 15 pixels above player
        
        // Draw background (red)
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw health (green)
        this.healthBar.fillStyle(0x00ff00);
        this.healthBar.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Draw border (white)
        this.healthBar.lineStyle(1, 0xffffff, 0.8);
        this.healthBar.strokeRect(barX, barY, barWidth, barHeight);
        
        // Show the health bar if:
        // 1. Player is not at full health, or
        // 2. God mode is active, or
        // 3. forcedVisible is true (e.g., after taking damage)
        this.healthBar.setVisible(healthPercent < 1 || this.playerStats.godMode || forcedVisible);
        
        // If forcedVisible is true, set a timer to hide the bar after a few seconds
        // but only if the player is at full health and not in god mode
        if (forcedVisible && healthPercent >= 1 && !this.playerStats.godMode) {
            // Cancel any existing timer
            if (this.healthBarTimer) {
                this.scene.time.removeEvent(this.healthBarTimer);
            }
            
            // Set a new timer to hide the health bar after 3 seconds
            this.healthBarTimer = this.scene.time.delayedCall(3000, () => {
                if (this.healthBar && this.playerStats.health >= this.playerStats.maxHealth && !this.playerStats.godMode) {
                    this.healthBar.setVisible(false);
                }
            });
        }
        
        // Reset the recursion guard
        this._updatingHealthBar = false;
    }

    /**
     * Show damage text above the player
     * @param {number} amount - The amount of damage to display
     */
    showDamageText(amount) {
        if (!this.player) return;
        
        // Ensure amount is a valid number
        if (isNaN(amount) || amount === undefined) {
            logger.error(LogCategory.PLAYER, `Invalid damage amount for display: ${amount}, defaulting to 1`);
            amount = 1;
        }
        
        // Convert to number and ensure it's positive for display
        amount = Math.abs(Number(amount));
        
        // Create a damage text
        const damageText = this.scene.add.text(
            this.player.x, 
            this.player.y - 20, 
            `-${amount}`, 
            { fontFamily: 'Arial', fontSize: '16px', color: '#FF0000', fontWeight: 'bold' }
        );
        damageText.setDepth(2001);
        
        // Animate the damage text
        this.scene.tweens.add({
            targets: damageText,
            y: damageText.y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => damageText.destroy()
        });
    }
    
    /**
     * Show a healing effect
     * @param {number} amount - The amount healed
     */
    showHealEffect(amount) {
        if (!this.player) return;
        
        // Create a healing text
        const healText = this.scene.add.text(
            this.player.x, 
            this.player.y - 20, 
            `+${amount}`, 
            { fontFamily: 'Arial', fontSize: '16px', color: '#00FF00', fontWeight: 'bold' }
        );
        healText.setDepth(2001);
        
        // Animate the healing text
        this.scene.tweens.add({
            targets: healText,
            y: healText.y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => healText.destroy()
        });
        
        // Create a healing effect
        const healEffect = this.scene.add.sprite(this.player.x, this.player.y, 'player');
        healEffect.setScale(1.2);
        healEffect.setAlpha(0.5);
        healEffect.setTint(0x00ff00);
        healEffect.setDepth(1998); // Below player
        
        // Animate the healing effect
        this.scene.tweens.add({
            targets: healEffect,
            scale: 1.8,
            alpha: 0,
            duration: 500,
            onComplete: () => healEffect.destroy()
        });
    }

    /**
     * Show a healing effect for god mode
     * @param {number} amount - The amount healed
     */
    showGodModeHealEffect(amount) {
        // Log the god mode healing
        logger.info(
            LogCategory.PLAYER, 
            `God Mode healed player for ${amount}. Health now at ${this.playerStats.health}/${this.playerStats.maxHealth}`
        );
        
        // Use the standard heal effect but with a special color
        if (this.player) {
            // Create a healing text with special formatting for god mode
            const healText = this.scene.add.text(
                this.player.x, 
                this.player.y - 20, 
                `+${amount}`, 
                { fontFamily: 'Arial', fontSize: '16px', color: '#FFFF00', fontWeight: 'bold' }
            );
            healText.setDepth(2001);
            
            // Animate the healing text
            this.scene.tweens.add({
                targets: healText,
                y: healText.y - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => healText.destroy()
            });
            
            // Create a special god mode healing effect (yellow instead of green)
            const healEffect = this.scene.add.sprite(this.player.x, this.player.y, 'player');
            healEffect.setScale(1.2);
            healEffect.setAlpha(0.5);
            healEffect.setTint(0xffff00); // Yellow for god mode
            healEffect.setDepth(1998); // Below player
            
            // Animate the healing effect
            this.scene.tweens.add({
                targets: healEffect,
                scale: 1.8,
                alpha: 0,
                duration: 500,
                onComplete: () => healEffect.destroy()
            });
        }
    }

    /**
     * Show a full heal effect (more dramatic than regular healing)
     * @param {number} amount - The amount healed
     */
    showFullHealEffect(amount) {
        // Show a more dramatic healing effect for full heal
        if (this.player) {
            // Create a larger healing effect
            const fullHealEffect = this.scene.add.sprite(this.player.x, this.player.y, 'player');
            fullHealEffect.setScale(1.5);
            fullHealEffect.setAlpha(0.7);
            fullHealEffect.setTint(0x00ff00);
            fullHealEffect.setDepth(1998); // Below player
            
            // Animate the healing effect
            this.scene.tweens.add({
                targets: fullHealEffect,
                scale: 2.5,
                alpha: 0,
                duration: 800,
                onComplete: () => {
                    fullHealEffect.destroy();
                }
            });
        }
        
        // Show a message to the player if UI manager is available
        if (this.scene.uiManager) {
            this.scene.uiManager.showMedievalMessage('Fully healed!', 'success', 2000);
        }
    }

    /**
     * Show dodge effect above the player
     */
    showDodgeEffect() {
        if (!this.player) return;
        
        // Create a dodge text
        const dodgeText = this.scene.add.text(
            this.player.x, 
            this.player.y - 20, 
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
        
        // Add a visual effect around the player
        const circle = this.scene.add.circle(
            this.player.x,
            this.player.y,
            30,
            0x00FF00,
            0.5
        );
        circle.setDepth(2000);
        
        // Animate the circle
        this.scene.tweens.add({
            targets: circle,
            scale: 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => circle.destroy()
        });
    }

    /**
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        super.update(delta);
        
        // Always update the health bar to reflect current health
        // but preserve its current visibility state
        if (this.healthBar && !this._updatingHealthBar) {
            const isHealthBarVisible = this.healthBar.visible;
            this.updatePlayerHealthBar(isHealthBarVisible);
        }
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy health bar if it exists
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }
        
        // Call parent destroy
        super.destroy();
    }
} 