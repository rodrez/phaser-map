import { CorePlayerManager } from './CorePlayerManager';
import { MedievalMenu } from '../../ui/menu';
import { logger, LogCategory } from '../Logger';

/**
 * Custom debug menu that extends MedievalMenu but overrides the default menu items
 */
class DebugMenu extends MedievalMenu {
    constructor(scene, options = {}) {
        super(scene, options);
    }
    
    /**
     * Override the default menu items method to do nothing
     * This prevents the default game menu items from being added
     */
    addDefaultMenuItems() {
        // Do nothing - we don't want default items
        this.menuItemConfigs = [];
    }
}

/**
 * PlayerDebugManager - Handles player debug features
 * Manages god mode, debug menu, and testing features
 */
export class PlayerDebugManager extends CorePlayerManager {
    /**
     * Constructor for the PlayerDebugManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     */
    constructor(scene, mapManager) {
        super(scene, mapManager);
        
        this.playerMenu = null;
        this.godModeGlow = null;
        
        // Initialize the debug menu
        this.initializeDebugMenu();
        
        // Set up keyboard listener for 'G' key to toggle god mode
        this.keyG = this.scene.input.keyboard.addKey('G');
        this.keyG.on('down', () => {
            this.toggleGodMode();
            
            // Show a message when god mode is toggled
            if (this.scene.uiManager) {
                const status = this.scene.playerStats?.godMode ? 'ENABLED' : 'DISABLED';
                this.scene.uiManager.showMedievalMessage(`God Mode ${status}`, 'info', 2000);
            }
        });
        
        logger.info(LogCategory.PLAYER, "God mode keybind added (press 'G' to toggle)");
    }

    /**
     * Initialize the debug menu
     */
    initializeDebugMenu() {
        try {
            // Create a debug menu
            this.playerMenu = new DebugMenu(this.scene, {
                position: 'left',
                menuButtonText: 'Debug Menu'
            });
            
            // Add debug menu items
            this.playerMenu.createMenuItem({
                id: 'godmode',
                label: 'God Mode: OFF',
                icon: '��️',
                onClick: () => this.toggleGodMode()
            });
            
            logger.info(LogCategory.PLAYER, "Debug menu initialized");
        } catch (error) {
            logger.error(LogCategory.PLAYER, "Error initializing debug menu:", error);
        }
    }

    /**
     * Toggle god mode for the player
     */
    toggleGodMode() {
        // Use the PlayerHealthSystem
        if (this.scene.playerHealthSystem) {
            const isEnabled = this.scene.playerHealthSystem.toggleGodMode();
            
            // Update the menu item label if menu exists
            if (this.playerMenu && this.playerMenu.menuItems) {
                const godModeItem = this.playerMenu.menuItems.get('godmode');
                if (godModeItem) {
                    const label = godModeItem.querySelector('.medieval-menu-label');
                    if (label) {
                        label.textContent = `God Mode: ${isEnabled ? 'ON' : 'OFF'}`;
                    }
                }
            }
            
            // Visual effect to show god mode status
            if (this.player) {
                // Add a glow effect when god mode is on
                if (isEnabled) {
                    // Create a glow effect
                    this.godModeGlow = this.scene.add.sprite(this.player.x, this.player.y, 'player');
                    this.godModeGlow.setScale(1.2);
                    this.godModeGlow.setAlpha(0.5);
                    this.godModeGlow.setTint(0xffff00);
                    this.godModeGlow.setDepth(1999); // Just below player
                } else if (this.godModeGlow) {
                    // Remove the glow effect
                    this.godModeGlow.destroy();
                    this.godModeGlow = null;
                }
            }
            
            // Show a message when god mode is toggled
            if (this.scene.uiManager) {
                const status = isEnabled ? 'ENABLED' : 'DISABLED';
                this.scene.uiManager.showMedievalMessage(`God Mode ${status}`, 'info', 2000);
            }
        } else {
            logger.error(LogCategory.PLAYER, "PlayerHealthSystem not available, cannot toggle god mode");
        }
    }
    
    /**
     * Set up hooks to implement god mode functionality
     * This allows the player to take damage but immediately heal back to full health
     */
    setupGodModeHooks() {
        // This method is no longer needed as PlayerHealthSystem handles god mode
        // But we'll keep it for backward compatibility
        logger.info(LogCategory.PLAYER, "Using PlayerHealthSystem for god mode functionality");
        
        // Notify the health system about god mode
        if (this.scene.events) {
            this.scene.events.emit('godModeEnabled', true);
        }
    }
    
    /**
     * Test the God Mode and Full Heal features
     * This function simulates damage and healing to verify that the features work
     */
    testFeatures() {
        logger.info(LogCategory.PLAYER, "Testing debug features...");
        
        // Get player stats
        const playerStats = this.scene.playerStats;
        if (!playerStats) {
            logger.error(LogCategory.PLAYER, "Cannot test features: playerStats not found");
            return;
        }
        
        // Display current player stats
        logger.info(LogCategory.PLAYER, "Current player stats:", {
            health: playerStats.health,
            maxHealth: playerStats.maxHealth,
            godMode: playerStats.godMode
        });
        
        // Calculate the damage needed to bring health below 50%
        const healthThreshold = playerStats.maxHealth * 0.5;
        let testDamage;
        
        if (playerStats.health > healthThreshold) {
            // If health is above 50%, calculate damage to bring it to 40% (well below threshold)
            testDamage = Math.ceil(playerStats.health - (playerStats.maxHealth * 0.4));
            logger.info(LogCategory.PLAYER, `Applying ${testDamage} damage to bring health below 50% threshold`);
        } else {
            // If health is already below 50%, just apply a small amount of damage
            testDamage = Math.max(10, Math.floor(playerStats.health * 0.2));
            logger.info(LogCategory.PLAYER, `Health already below 50% threshold, applying ${testDamage} damage`);
        }
        
        // Apply damage using the PlayerHealthSystem
        if (this.scene.playerHealthSystem) {
            this.scene.playerHealthSystem.takeDamage(testDamage, 'test');
            
            // Wait a moment and then check if god mode healing triggered
            this.scene.time.delayedCall(500, () => {
                logger.info(
                    LogCategory.PLAYER, 
                    `After damage, health is ${playerStats.health}/${playerStats.maxHealth}, god mode is ${playerStats.godMode ? 'ON' : 'OFF'}`
                );
                
                // If god mode is on, health should be full if it was below 50%
                if (playerStats.godMode) {
                    if (playerStats.health === playerStats.maxHealth) {
                        logger.info(LogCategory.PLAYER, "✅ God mode healing worked correctly!");
                        
                        // Show a success message
                        if (this.scene.uiManager) {
                            this.scene.uiManager.showMedievalMessage("God Mode test successful!", "success", 2000);
                        }
                    } else {
                        logger.warn(LogCategory.PLAYER, "❌ God mode healing did not work as expected!");
                        
                        // Show a warning message
                        if (this.scene.uiManager) {
                            this.scene.uiManager.showMedievalMessage("God Mode test failed!", "warning", 2000);
                        }
                    }
                } else {
                    logger.info(LogCategory.PLAYER, "God mode is off, no healing expected");
                    
                    // Show an info message
                    if (this.scene.uiManager) {
                        this.scene.uiManager.showMedievalMessage("Enable God Mode to test healing", "info", 2000);
                    }
                }
            });
        } else {
            logger.error(LogCategory.PLAYER, "PlayerHealthSystem not available, cannot test features");
        }
    }

    /**
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        super.update(delta);
        
        // Update god mode glow position if it exists
        if (this.godModeGlow && this.player) {
            this.godModeGlow.x = this.player.x;
            this.godModeGlow.y = this.player.y;
        }
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy the player menu
        if (this.playerMenu) {
            this.playerMenu.destroy();
            this.playerMenu = null;
        }
        
        // Remove keyboard listeners
        if (this.keyC) {
            this.keyC.removeAllListeners();
            this.keyC = null;
        }
        
        if (this.keyG) {
            this.keyG.removeAllListeners();
            this.keyG = null;
        }
        
        // Destroy god mode glow if it exists
        if (this.godModeGlow) {
            this.godModeGlow.destroy();
            this.godModeGlow = null;
        }
        
        // Call parent destroy
        super.destroy();
    }
} 