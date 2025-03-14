import { CoreUIManager } from './CoreUIManager';
import { MedievalVitals } from '../../ui/vitals';
import { logger, LogCategory } from '../Logger';

/**
 * VitalsManager - Handles player stats display
 * Manages health, XP, and other player stats UI
 * Updates UI based on player state changes
 * Handles special states like god mode, aggression
 */
export class VitalsManager extends CoreUIManager {
    /**
     * Constructor for the VitalsManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     */
    constructor(scene) {
        super(scene);
        
        this.vitals = null;
        
        // Initialize vitals if player stats are available
        if (this.scene.playerStats) {
            this.initializeVitals();
        }
    }

    /**
     * Initialize the vitals UI
     */
    initializeVitals() {
        // Create the MedievalVitals component
        this.vitals = new MedievalVitals(this.scene);
        
        // Set initial values
        this.updateHealthBar(
            this.scene.playerStats.health,
            this.scene.playerStats.maxHealth
        );
        
        this.updateXPBar(
            this.scene.playerStats.xp,
            this.scene.playerStats.xpToNextLevel
        );
        
        if (this.scene.playerStats.gold !== undefined) {
            this.updateGold(this.scene.playerStats.gold);
        }
    }

    /**
     * Update the health bar
     * @param {number} health - The current health
     * @param {number} maxHealth - The maximum health
     */
    updateHealthBar(health, maxHealth) {
        if (!this.vitals) return;
        
        // Log health update for debugging
        logger.info(
            LogCategory.UI, 
            `Updating health bar: ${health}/${maxHealth}`
        );
        
        // Update the health bar
        this.vitals.updateHealthBar(health, maxHealth);
        
        // Update health bar color based on health percentage
        const healthPercent = Math.max(0, health / maxHealth);
        if (healthPercent <= 0.3) {
            this.vitals.healthFill.style.backgroundColor = '#c0392b'; // Red color
            this.vitals.healthFill.style.animation = 'pulse 1.5s infinite';
        } else {
            this.vitals.healthFill.style.backgroundColor = '#c0392b'; // Red color
            this.vitals.healthFill.style.animation = 'none';
        }
    }

    /**
     * Update the XP bar
     * @param {number} xp - The current XP
     * @param {number} xpToNextLevel - The XP required for the next level
     */
    updateXPBar(xp, xpToNextLevel) {
        if (!this.vitals) return;
        
        this.vitals.updateXPBar(xp, xpToNextLevel);
    }

    /**
     * Update weight display
     * @param {number} currentWeight - The current weight
     * @param {number} maxWeight - The maximum weight capacity
     */
    updateWeight(currentWeight, maxWeight) {
        if (!this.vitals) return;
        
        this.vitals.updateWeightDisplay(currentWeight, maxWeight);
    }

    /**
     * Update gold with animation
     * @param {number} gold - The new gold amount
     * @param {boolean} animate - Whether to animate the change
     */
    updateGold(gold, animate = true) {
        if (!this.vitals) return;
        
        this.vitals.updateGoldWithAnimation(gold, animate);
    }

    /**
     * Set god mode in the UI
     * @param {boolean} enabled - Whether god mode is enabled
     */
    setGodMode(enabled) {
        if (!this.vitals) return;
        
        this.vitals.setGodMode(enabled);
    }

    /**
     * Set aggression state in the UI
     * @param {boolean} isAggressive - Whether the player is aggressive
     */
    setAggression(isAggressive) {
        if (!this.vitals) return;
        
        this.vitals.setAggression(isAggressive);
    }

    /**
     * Show a message using the vitals component
     * @param {string} text - The message text
     * @param {string} type - The message type (info, success, warning, error)
     * @param {number} duration - The duration to show the message
     */
    showMessage(text, type = 'info', duration = 3000) {
        if (!this.vitals) return;
        
        this.vitals.showMessage(text, type, duration);
    }

    /**
     * Show a level up notification
     * @param {number} level - The new level
     */
    showLevelUp(level) {
        if (!this.vitals) return;
        
        this.vitals.showLevelUpNotification(level);
    }

    /**
     * Update method to be called in the scene's update loop
     */
    update() {
        if (!this.vitals || !this.scene.playerStats) return;
        
        // Update health
        this.updateHealthBar(
            this.scene.playerStats.health,
            this.scene.playerStats.maxHealth
        );
        
        // Update XP
        this.updateXPBar(
            this.scene.playerStats.xp,
            this.scene.playerStats.xpToNextLevel
        );
        
        // Update weight if available from player stats
        if (this.scene.playerStats.currentWeight !== undefined && 
            this.scene.playerStats.maxWeight !== undefined) {
            this.updateWeight(
                this.scene.playerStats.currentWeight,
                this.scene.playerStats.maxWeight
            );
        } 
        // Try to get weight from inventory if available
        else if (this.scene.inventoryManager && this.scene.inventoryManager.getInventory) {
            const inventory = this.scene.inventoryManager.getInventory();
            if (inventory) {
                this.updateWeight(
                    inventory.getTotalWeight(),
                    inventory.getMaxWeight()
                );
            }
        }
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy the vitals component
        if (this.vitals) {
            this.vitals.destroy();
            this.vitals = null;
        }
        
        // Call parent destroy
        super.destroy();
    }
} 