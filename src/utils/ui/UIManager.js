import { Scene } from 'phaser';
import { CoreUIManager } from './CoreUIManager';
import { NotificationManager } from './NotificationManager';
import { VitalsManager } from './VitalsManager';
import { EnvironmentUIManager } from './EnvironmentUIManager';
import { uiRegistry } from './UIComponentRegistry';
import { logger, LogCategory } from '../Logger';
import { MedievalMenu } from '../../ui/menu';
import { PopupSystem } from '../../ui/popup';

/**
 * UIManager - Main UI manager that coordinates all specialized UI managers
 * This class serves as a facade for all UI-related functionality
 */
export class UIManager {
    /**
     * Constructor for the UIManager
     * @param {Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     */
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        
        // Initialize managers
        this.coreManager = new CoreUIManager(scene);
        this.notificationManager = new NotificationManager(scene);
        this.vitalsManager = new VitalsManager(scene);
        this.environmentManager = new EnvironmentUIManager(scene);
        
        // Initialize popup system
        this.popupSystem = new PopupSystem(scene, mapManager);
        
        // Register managers in the registry
        uiRegistry.register('core', this.coreManager);
        uiRegistry.register('notification', this.notificationManager);
        uiRegistry.register('vitals', this.vitalsManager);
        uiRegistry.register('environment', this.environmentManager);
        
        // Initialize the main menu directly
        this.menu = new MedievalMenu(scene);
        
        // Create basic UI elements
        this.createBasicUI();
        
        // Set up flag counter
        this.createFlagCounter();
        
        // Set up menu item handlers
        this.setupMenuHandlers();
    }

    /**
     * Create basic UI elements
     */
    createBasicUI() {
        // Add info text
        this.infoText = this.coreManager.createText(10, 10, 'Click on the map to move\nClick on the player to place a flag\nClick on flags to travel to them', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Add reset button
        const resetButton = this.scene.add.text(this.scene.cameras.main.width - 10, 10, 'Reset', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#FF5252',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.coreManager.createDOMButton(resetButton, () => {
            logger.info(LogCategory.UI, 'Reset button clicked');
            this.scene.scene.restart();
        });
        
        this.coreManager.addUIElement(resetButton);
        
        // Add place flag button
        this.placeButton = this.scene.add.text(this.scene.cameras.main.width - 10, 60, 'Place Flag', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#4285F4',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.coreManager.createDOMButton(this.placeButton, () => {
            logger.info(LogCategory.UI, 'Place flag button clicked');
            // We'll use an event to communicate with the Game scene
            this.scene.events.emit('placeFlag');
        });
        
        this.coreManager.addUIElement(this.placeButton);
        
        // Add regenerate environment button
        const regenerateButton = this.scene.add.text(this.scene.cameras.main.width - 10, 110, 'Regenerate Environment', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#4CAF50',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.coreManager.createDOMButton(regenerateButton, () => {
            logger.info(LogCategory.UI, 'Regenerate environment button clicked');
            // Get player position
            const player = this.scene.playerManager.getPlayer();
            // Regenerate environment around player
            this.scene.environment.generateEnvironment(player.x, player.y, 300);
            // Show message
            this.showMedievalMessage('The lands around thee have been transformed!', 'success');
        });
        
        this.coreManager.addUIElement(regenerateButton);
        
        // Add test status effects button
        const testEffectsButton = this.scene.add.text(this.scene.cameras.main.width - 10, 160, 'Apply Status Effects', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#9C27B0', // Purple color
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.coreManager.createDOMButton(testEffectsButton, () => {
            logger.info(LogCategory.UI, 'Test status effects button clicked');
            // Call the method to apply test status effects
            if (typeof this.scene.applyTestStatusEffects === 'function') {
                this.scene.applyTestStatusEffects();
            } else {
                logger.error(LogCategory.UI, 'applyTestStatusEffects method not found in Game scene');
            }
        });
        
        this.coreManager.addUIElement(testEffectsButton);
    }

    /**
     * Create the flag counter
     */
    createFlagCounter() {
        // Add flag counter
        this.flagCounter = this.coreManager.createText(10, 80, 'Flags: 0', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Set up flag-related event listeners
        this.setupFlagEventListeners();
    }

    /**
     * Set up flag-related event listeners
     */
    setupFlagEventListeners() {
        // Listen for flag placement events
        this.scene.events.on('flagPlaced', () => {
            this.updateFlagCounter();
            // Update menu badge if menu exists
            this.updateMenuBadge('placeFlag', this.mapManager.flags.length);
        });
        
        // Listen for flag removal events
        this.scene.events.on('flagRemoved', () => {
            this.updateFlagCounter();
            // Update menu badge if menu exists
            this.updateMenuBadge('placeFlag', this.mapManager.flags.length);
        });
        
        // Listen for all flags cleared event
        this.scene.events.on('flagsCleared', () => {
            this.updateFlagCounter();
            // Update menu badge if menu exists
            this.updateMenuBadge('placeFlag', 0);
        });
    }

    /**
     * Update the flag counter
     */
    updateFlagCounter() {
        // Update flag counter text
        this.flagCounter.setText(`Flags: ${this.mapManager.flags.length}`);
    }

    /**
     * Show a message
     * @param {string} text - The message text
     * @param {string} type - The message type (info, success, warning, error)
     * @param {number} duration - The duration to show the message
     */
    showMedievalMessage(text, type = 'info', duration = 3000) {
        this.notificationManager.showMessage(text, type, duration);
    }

    /**
     * Show a level up notification
     * @param {number} level - The new level
     */
    showLevelUp(level) {
        this.vitalsManager.showLevelUp(level);
    }

    /**
     * Set god mode in the UI
     * @param {boolean} enabled - Whether god mode is enabled
     */
    setGodMode(enabled) {
        this.vitalsManager.setGodMode(enabled);
    }

    /**
     * Set aggression state in the UI
     * @param {boolean} isAggressive - Whether the player is aggressive
     */
    setAggression(isAggressive) {
        this.vitalsManager.setAggression(isAggressive);
    }

    /**
     * Update gold with animation
     * @param {number} gold - The new gold amount
     * @param {boolean} animate - Whether to animate the change
     */
    updateGold(gold, animate = true) {
        this.vitalsManager.updateGold(gold, animate);
    }

    /**
     * Get the menu instance
     * @returns {MedievalMenu} The menu instance
     */
    getMenu() {
        return this.menu;
    }

    /**
     * Show the menu
     */
    showMenu() {
        if (this.menu) {
            this.menu.show();
        }
    }

    /**
     * Hide the menu
     */
    hideMenu() {
        if (this.menu) {
            this.menu.hide();
        }
    }

    /**
     * Toggle the menu visibility
     */
    toggleMenu() {
        if (this.menu) {
            this.menu.toggle();
        }
    }

    /**
     * Set a click handler for a menu item
     * @param {string} id - The ID of the menu item
     * @param {Function} handler - The click handler function
     */
    setMenuItemHandler(id, handler) {
        if (this.menu) {
            this.menu.setClickHandler(id, handler);
        }
    }

    /**
     * Update a badge value for a menu item
     * @param {string} id - The ID of the menu item
     * @param {number|string} value - The badge value to display
     */
    updateMenuBadge(id, value) {
        if (this.menu) {
            this.menu.updateBadge(id, value);
        }
    }

    /**
     * Set the active menu item
     * @param {string} id - The ID of the menu item to set as active
     */
    setActiveMenuItem(id) {
        if (this.menu) {
            this.menu.setActiveItem(id);
        }
    }

    /**
     * Add a custom menu item to the menu
     * @param {Object} config - The menu item configuration
     */
    addMenuItem(config) {
        if (this.menu) {
            // Convert the config to the format expected by MedievalMenu
            const menuItemConfig = {
                id: config.id,
                label: config.text || config.label,
                icon: config.icon,
                onClick: config.handler || config.onClick,
                badge: config.badge
            };
            
            // Create the menu item
            this.menu.createMenuItem(menuItemConfig);
            
            // Set the click handler
            if (menuItemConfig.onClick) {
                this.menu.setClickHandler(menuItemConfig.id, menuItemConfig.onClick);
            }
            
            logger.info(LogCategory.UI, `Added menu item: ${menuItemConfig.id}`);
        } else {
            logger.warn(LogCategory.UI, 'Cannot add menu item: menu not initialized');
        }
    }

    /**
     * Remove a menu item from the menu
     * @param {string} id - The ID of the menu item to remove
     */
    removeMenuItem(id) {
        if (this.menu && this.menu.menuItems && this.menu.menuItems.has(id)) {
            // Remove the menu item
            const menuItem = this.menu.menuItems.get(id);
            if (menuItem && menuItem.parentNode) {
                menuItem.parentNode.removeChild(menuItem);
            }
            
            // Remove from the map
            this.menu.menuItems.delete(id);
            
            logger.info(LogCategory.UI, `Removed menu item: ${id}`);
        } else {
            logger.warn(LogCategory.UI, `Cannot remove menu item: ${id} not found or menu not initialized`);
        }
    }

    /**
     * Update the health bar
     */
    updateHealthBar() {
        if (this.scene.playerStats) {
            this.vitalsManager.updateHealthBar(
                this.scene.playerStats.health,
                this.scene.playerStats.maxHealth
            );
        }
    }

    /**
     * Update method to be called in the scene's update loop
     */
    update() {
        // Update all registered components
        uiRegistry.update();
    }

    /**
     * Update positions of all UI elements
     * Called when returning from the dungeon scene to ensure UI is in the correct position
     */
    updateUIPositions() {
        logger.info(LogCategory.UI, 'Updating UI element positions');
        
        // Reposition menu buttons
        if (this.menu) {
            this.menu.resizeUI();
        }
        
        // Update vitals display
        if (this.vitalsManager) {
            this.vitalsManager.updatePositions();
        }
        
        // Update player-related UI elements if available
        if (this.scene.playerManager) {
            const player = this.scene.playerManager.getPlayer();
            if (player) {
                // Update any UI elements that follow the player
                if (this.scene.playerHealthBar) {
                    const barY = player.y - player.height / 2 - 15;
                    this.scene.playerHealthBar.x = player.x - 20;
                    this.scene.playerHealthBar.y = barY;
                }
            }
        }
        
        // Invalidate any fixed UI elements
        if (this.scene.uiElements) {
            this.scene.uiElements.forEach(element => {
                if (element && !element.destroyed) {
                    // If it's a fixed UI element (scroll factor 0), make sure it's in the right position
                    if (element.scrollFactor && element.scrollFactor.x === 0) {
                        // Force position update for fixed UI elements
                        element.x = element.x;
                        element.y = element.y;
                    }
                }
            });
        }
        
        logger.info(LogCategory.UI, 'UI positions updated');
    }

    /**
     * Destroy all UI elements and managers
     */
    destroy() {
        // Destroy all managers
        this.coreManager.destroy();
        this.notificationManager.destroy();
        this.vitalsManager.destroy();
        this.environmentManager.destroy();
        
        // Destroy the menu directly
        if (this.menu) {
            this.menu.destroy();
            this.menu = null;
        }
    }

    /**
     * Set up menu item handlers
     */
    setupMenuHandlers() {
        // Make sure the menu is initialized
        if (!this.menu || !this.menu.menuItems) return;
        
        // Set up inventory handler if not already set
        const inventoryItem = this.menu.menuItems.get('inventory');
        if (inventoryItem) {
            this.menu.setClickHandler('inventory', () => {
                logger.info(LogCategory.UI, 'Inventory menu item clicked');
                this.scene.events.emit('openInventory');
                this.menu.hide();
            });
        }
        
        // Set up chat handler if not already set
        const chatItem = this.menu.menuItems.get('chat');
        if (chatItem) {
            this.menu.setClickHandler('chat', () => {
                logger.info(LogCategory.UI, 'Chat menu item clicked');
                this.scene.events.emit('openChat');
                this.menu.hide();
            });
        }
    }

    /**
     * Show a custom popup with the given content and options
     * @param {Object} content - The popup content object with html and buttons
     * @param {Object} options - The popup options
     * @returns {HTMLElement|null} The created popup element or null if creation failed
     */
    showCustomPopup(content, options = {}) {
        logger.info(LogCategory.UI, 'Showing custom popup');
        
        // If no popup system, create one
        if (!this.popupSystem) {
            logger.info(LogCategory.UI, 'Creating PopupSystem for UIManager');
            this.popupSystem = new PopupSystem(this.scene, this.mapManager);
        }
        
        // Default to centered popup if no position is specified
        if (options.centered || (!options.x && !options.y && !options.lat && !options.lon)) {
            return this.popupSystem.createCenteredPopup(content, options);
        }
        
        // Create popup at screen position if x and y are provided
        if (options.x !== undefined && options.y !== undefined) {
            return this.popupSystem.createPopupAtScreenPosition(content, options, options.x, options.y);
        }
        
        // Create popup at lat/lon position if lat and lon are provided
        if (options.lat !== undefined && options.lon !== undefined) {
            return this.popupSystem.createPopup(options.lat, options.lon, content, options);
        }
        
        // Fallback to centered popup
        return this.popupSystem.createCenteredPopup(content, options);
    }
    
    /**
     * Close a specific popup
     * @param {HTMLElement} popup - The popup element to close
     */
    closePopup(popup) {
        if (this.popupSystem) {
            this.popupSystem.closePopup(popup);
        }
    }
    
    /**
     * Close all popups
     */
    closeAllPopups() {
        if (this.popupSystem) {
            this.popupSystem.closeAllPopups();
        }
    }
} 