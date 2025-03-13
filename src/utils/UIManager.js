import { Scene } from 'phaser';
import { DOMUIHelper } from './DOMUIHelper';
import { MedievalVitals } from '../ui/vitals';
import { MedievalMenu } from '../ui/menu';
import { logger, LogCategory } from '../utils/Logger';
import { LoggerPanel } from '../ui/logger-panel';
/**
 * UIManager class to handle all UI-related functionality
 * This class manages UI elements, buttons, and messages
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
        this.uiContainer = null;
        this.flagCounter = null;
        this.placeButton = null;
        this.infoText = null;
        this.environmentInfo = null;
        
        // DOM UI Helper
        this.domUIHelper = new DOMUIHelper(scene);
        
        // UI Components
        this.uiComponents = {};
        
        // Create UI elements
        this.createUI();
        
        // Handle window resize
        this.scene.scale.on('resize', this.resizeUI, this);
        
        // Listen for environment-related events
        this.setupEnvironmentEventListeners();
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create UI container
        this.uiContainer = this.scene.add.container(0, 0);
        
        // Add info text
        this.infoText = this.scene.add.text(10, 10, 'Click on the map to move\nClick on the player to place a flag\nClick on flags to travel to them', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.uiContainer.add(this.infoText);
        
        // Add flag counter
        this.flagCounter = this.scene.add.text(10, 80, 'Flags: 0', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.uiContainer.add(this.flagCounter);
        
        // Add environment info text
        this.environmentInfo = this.scene.add.text(10, 120, 'Environment: Normal', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.uiContainer.add(this.environmentInfo);
        
        // Add reset button
        const resetButton = this.scene.add.text(this.scene.cameras.main.width - 10, 10, 'Reset', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#FF5252',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.createDOMButton(resetButton, () => {
            logger.info(LogCategory.UI, 'Reset button clicked');
            this.scene.scene.restart();
        });
        
        this.uiContainer.add(resetButton);
        
        // Add place flag button
        this.placeButton = this.scene.add.text(this.scene.cameras.main.width - 10, 60, 'Place Flag', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#4285F4',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.createDOMButton(this.placeButton, () => {
            logger.info(LogCategory.UI, 'Place flag button clicked');
            // We'll use an event to communicate with the Game scene
            this.scene.events.emit('placeFlag');
        });
        
        this.uiContainer.add(this.placeButton);
        
        // Add regenerate environment button
        const regenerateButton = this.scene.add.text(this.scene.cameras.main.width - 10, 110, 'Regenerate Environment', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#4CAF50',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.createDOMButton(regenerateButton, () => {
            logger.info(LogCategory.UI, 'Regenerate environment button clicked');
            // Get player position
            const player = this.scene.playerManager.getPlayer();
            // Regenerate environment around player
            this.scene.environment.generateEnvironment(player.x, player.y, 300);
            // Show message
            this.showMedievalMessage('The lands around thee have been transformed!', 'success');
        });
        
        this.uiContainer.add(regenerateButton);
        
        // Initialize UI components
        this.initializeUIComponents();
    }
    
    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        // Initialize MedievalVitals if player stats are available
        if (this.scene.playerStats) {
            this.uiComponents.vitals = new MedievalVitals(this.scene);
            
            // Initialize the medieval menu with custom options
            this.initializeMedievalMenu();
        }
        
        // Initialize LoggerPanel
        this.loggerPanel = new LoggerPanel();
        // You can add more UI components here as needed
    }
    
    /**
     * Initialize the medieval menu with custom options
     * @param {Object} [options] - Optional custom options for the menu
     */
    initializeMedievalMenu(options = {}) {
        // Default options
        const defaultOptions = {
            position: 'right',
            orientation: 'vertical',
            showIcons: true,
            width: '200px',
            iconSize: '24px',
            menuButtonText: 'Game Menu'
        };
        
        // Merge default options with provided options
        const menuOptions = { ...defaultOptions, ...options };
        
        // Create the menu
        this.uiComponents.menu = new MedievalMenu(this.scene, menuOptions);
        
        // Set up menu item handlers
        this.setupMenuHandlers();
        
        // Add custom menu items if needed
        this.addCustomMenuItems();
        
        // Listen for game events that should update the menu
        this.setupMenuEventListeners();
        
        // Set up keyboard shortcuts for the menu
        this.setupMenuKeyboardShortcuts();
    }
    
    /**
     * Set up handlers for menu items
     */
    setupMenuHandlers() {
        if (!this.uiComponents.menu) return;
        
        // Set up click handlers for each menu item
        this.uiComponents.menu.setClickHandler('map', () => {
            logger.info(LogCategory.UI, 'Map menu item clicked');
            this.showMedievalMessage('Opening map...', 'info');
            // Emit an event that the game scene can listen for
            this.scene.events.emit('openMap');
            
            // If we have a mapManager, we can directly interact with it
            if (this.mapManager) {
                // For example, toggle the map visibility or open a fullscreen map
                this.showMedievalMessage('Showing map markers', 'info');
            }
        });
        
        this.uiComponents.menu.setClickHandler('inventory', () => {
            logger.info(LogCategory.UI, 'Inventory menu item clicked');
            this.showMedievalMessage('Opening inventory...', 'info');
            this.scene.events.emit('openInventory');
        });
        
        this.uiComponents.menu.setClickHandler('character', () => {
            logger.info(LogCategory.UI, 'Character menu item clicked');
            this.showMedievalMessage('Opening character sheet...', 'info');
            this.scene.events.emit('openCharacter');
        });
        
        this.uiComponents.menu.setClickHandler('settings', () => {
            logger.info(LogCategory.UI, 'Settings menu item clicked');
            this.showMedievalMessage('Opening settings...', 'info');
            this.scene.events.emit('openSettings');
        });
        
        // Add more handlers for other menu items as needed
    }
    
    /**
     * Add custom menu items specific to this game
     */
    addCustomMenuItems() {
        if (!this.uiComponents.menu) return;
        
        // Example: Add a custom "Place Flag" menu item
    }
    
    /**
     * Create a DOM button
     * @param {Phaser.GameObjects.Text} textObject - The text object to use as a button
     * @param {Function} callback - The callback function to call when the button is clicked
     */
    createDOMButton(textObject, callback) {
        // Create a div for the button
        const button = document.createElement('div');
        button.className = 'phaser-button';
        button.style.position = 'absolute';
        button.style.padding = '5px 10px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '40';
        button.style.backgroundColor = textObject.style.backgroundColor || '#4285F4';
        button.style.color = textObject.style.color || '#ffffff';
        button.style.fontFamily = textObject.style.fontFamily || 'Arial';
        button.style.fontSize = `${textObject.style.fontSize}px` || '16px';
        button.style.borderRadius = '4px';
        button.innerText = textObject.text;
        
        // Position the button
        button.style.right = '10px';
        button.style.top = `${textObject.y}px`;
        
        // Add the button to the game container
        document.getElementById('game-container').appendChild(button);
        
        // Add a click event listener to the button
        button.addEventListener('click', (e) => {
            callback();
            e.stopPropagation();
        });
        
        // Store a reference to the button
        textObject.domElement = button;
    }
    
    /**
     * Set up keyboard shortcuts for the menu
     */
    setupMenuKeyboardShortcuts() {
        if (!this.scene || !this.uiComponents.menu) return;
        
        // Add a keyboard event listener to the document
        const keyHandler = (event) => {
            // ESC key to toggle menu
            if (event.key === 'Escape') {
                this.toggleMenu();
            }
            
            // M key to toggle map
            if (event.key === 'm' || event.key === 'M') {
                // Only trigger if not typing in an input field
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    this.setActiveMenuItem('map');
                    this.scene.events.emit('openMap');
                }
            }
            
            // I key to toggle inventory
            if (event.key === 'i' || event.key === 'I') {
                // Only trigger if not typing in an input field
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    this.setActiveMenuItem('inventory');
                    this.scene.events.emit('openInventory');
                }
            }
            
            // C key to toggle character
            if (event.key === 'c' || event.key === 'C') {
                // Only trigger if not typing in an input field
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    this.setActiveMenuItem('character');
                    this.scene.events.emit('openCharacter');
                }
            }
        };
        
        // Add the event listener
        document.addEventListener('keydown', keyHandler);
        
        // Store the handler so we can remove it later
        this.menuKeyHandler = keyHandler;
    }
    
    /**
     * Resize UI elements
     */
    resizeUI() {
        // Update button positions
        if (this.uiContainer?.list) {
            for (let i = 0; i < this.uiContainer.list.length; i++) {
                const item = this.uiContainer.list[i];
                if (item?.domElement) {
                    item.domElement.style.top = `${item.y}px`;
                }
            }
        }
        
        // Reposition the menu if needed
        this.repositionMenu();
    }
    
    /**
     * Reposition the menu based on screen size
     */
    repositionMenu() {
        if (!this.uiComponents.menu) return;
        
        const menu = this.uiComponents.menu;
        
        // Get the current screen dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Reposition the menu button
        if (menu.menuButton) {
            // Keep the menu button at the bottom right
            menu.menuButton.style.bottom = '20px';
            menu.menuButton.style.right = '20px';
        }
        
        // Reposition the menu container
        if (menu.container) {
            // Position the menu above the menu button
            menu.container.style.bottom = '70px';
            menu.container.style.right = '20px';
            
            // Adjust width for small screens
            if (width < 768) {
                menu.container.style.width = '160px';
            } else {
                menu.container.style.width = menu.options.width;
            }
        }
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
     * @param {string} backgroundColor - The background color of the message
     * @param {number} duration - The duration to show the message in milliseconds
     */
    showMessage(text, backgroundColor, duration = 2000) {
        // If MedievalVitals is available, use it instead
        if (this.uiComponents.vitals) {
            // Convert backgroundColor to message type
            let type = 'info';
            if (backgroundColor === '#4CAF50' || backgroundColor === '#27ae60') {
                type = 'success';
            } else if (backgroundColor === '#FF5252' || backgroundColor === '#c0392b') {
                type = 'error';
            } else if (backgroundColor === '#f39c12' || backgroundColor === '#f0c070') {
                type = 'warning';
            }
            
            this.showMedievalMessage(text, type, duration);
            return;
        }
        
        // Create a DOM-based medieval styled message
        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.bottom = '20px';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translateX(-50%)';
        messageContainer.style.padding = '15px 25px';
        messageContainer.style.zIndex = '1001';
        messageContainer.style.textAlign = 'center';
        messageContainer.style.backgroundColor = '#2a1a0a'; // Dark brown background
        messageContainer.style.color = '#e8d4b9'; // Light parchment text color
        messageContainer.style.borderRadius = '8px';
        messageContainer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
        messageContainer.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        messageContainer.style.border = `3px solid ${backgroundColor}`;
        messageContainer.style.minWidth = '280px';
        messageContainer.style.maxWidth = '80%';
        
        // Add decorative corners
        const cornerTopLeft = document.createElement('div');
        cornerTopLeft.style.position = 'absolute';
        cornerTopLeft.style.top = '0';
        cornerTopLeft.style.left = '0';
        cornerTopLeft.style.width = '12px';
        cornerTopLeft.style.height = '12px';
        cornerTopLeft.style.borderTop = `2px solid ${backgroundColor}`;
        cornerTopLeft.style.borderLeft = `2px solid ${backgroundColor}`;
        
        const cornerTopRight = document.createElement('div');
        cornerTopRight.style.position = 'absolute';
        cornerTopRight.style.top = '0';
        cornerTopRight.style.right = '0';
        cornerTopRight.style.width = '12px';
        cornerTopRight.style.height = '12px';
        cornerTopRight.style.borderTop = `2px solid ${backgroundColor}`;
        cornerTopRight.style.borderRight = `2px solid ${backgroundColor}`;
        
        const cornerBottomLeft = document.createElement('div');
        cornerBottomLeft.style.position = 'absolute';
        cornerBottomLeft.style.bottom = '0';
        cornerBottomLeft.style.left = '0';
        cornerBottomLeft.style.width = '12px';
        cornerBottomLeft.style.height = '12px';
        cornerBottomLeft.style.borderBottom = `2px solid ${backgroundColor}`;
        cornerBottomLeft.style.borderLeft = `2px solid ${backgroundColor}`;
        
        const cornerBottomRight = document.createElement('div');
        cornerBottomRight.style.position = 'absolute';
        cornerBottomRight.style.bottom = '0';
        cornerBottomRight.style.right = '0';
        cornerBottomRight.style.width = '12px';
        cornerBottomRight.style.height = '12px';
        cornerBottomRight.style.borderBottom = `2px solid ${backgroundColor}`;
        cornerBottomRight.style.borderRight = `2px solid ${backgroundColor}`;
        
        messageContainer.appendChild(cornerTopLeft);
        messageContainer.appendChild(cornerTopRight);
        messageContainer.appendChild(cornerBottomLeft);
        messageContainer.appendChild(cornerBottomRight);
        
        // Add medieval prefix based on message type
        let prefix = '';
        if (backgroundColor === '#4CAF50' || backgroundColor === '#27ae60') {
            prefix = 'Huzzah! ';
        } else if (backgroundColor === '#FF5252' || backgroundColor === '#c0392b') {
            prefix = 'Alas! ';
        } else if (backgroundColor === '#f39c12' || backgroundColor === '#f0c070') {
            prefix = 'Hearken! ';
        } else {
            prefix = 'Behold! ';
        }
        
        // Create content wrapper for the message text
        const contentWrapper = document.createElement('div');
        contentWrapper.style.position = 'relative';
        contentWrapper.style.zIndex = '2';
        
        // Set message text with prefix
        contentWrapper.textContent = prefix + text;
        messageContainer.appendChild(contentWrapper);
        
        // Add to DOM
        document.getElementById('game-container')?.appendChild(messageContainer) || 
            document.body.appendChild(messageContainer);
        
        // Add fade-in animation
        messageContainer.style.opacity = '0';
        messageContainer.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => {
            messageContainer.style.opacity = '1';
        }, 10);
        
        // Remove after duration with fade-out
        setTimeout(() => {
            messageContainer.style.opacity = '0';
            setTimeout(() => {
                if (messageContainer.parentNode) {
                    messageContainer.parentNode.removeChild(messageContainer);
                }
            }, 300);
        }, duration);
    }
    
    /**
     * Update UI components
     */
    update() {
        // Update medieval vitals if they exist
        if (this.uiComponents.vitals) {
            // Update health
            this.uiComponents.vitals.updateHealthBar(
                this.scene.playerStats.health,
                this.scene.playerStats.maxHealth
            );
            
            // Update XP
            this.uiComponents.vitals.updateXPBar(
                this.scene.playerStats.xp,
                this.scene.playerStats.xpToNextLevel
            );
        }
        
        // Update menu badges if menu exists
        if (this.uiComponents.menu) {
            this.updateMenuBadges();
        }
    }
    
    /**
     * Update menu badges based on game state
     */
    updateMenuBadges() {
        if (!this.uiComponents.menu) return;
        
        // Example: Update inventory badge based on new items
        if (this.scene.playerStats?.newItems) {
            this.updateMenuBadge('inventory', this.scene.playerStats.newItems);
        }
        
        // Example: Update map badge based on new discoveries
        if (this.mapManager?.newDiscoveries) {
            this.updateMenuBadge('map', this.mapManager.newDiscoveries);
        }
        
        // Example: Update communication badge based on new messages
        if (this.scene.playerStats?.newMessages) {
            this.updateMenuBadge('communication', this.scene.playerStats.newMessages);
        }
    }
    
    /**
     * Show a message using the MedievalVitals component if available
     * @param {string} text - The message text
     * @param {string} type - The message type (info, success, warning, error)
     * @param {number} duration - The duration to show the message
     */
    showMedievalMessage(text, type = 'info', duration = 3000) {
        // Add medieval prefix based on message type
        let prefix = '';
        switch (type) {
            case 'success':
                prefix = 'Huzzah! ';
                break;
            case 'error':
                prefix = 'Alas! ';
                break;
            case 'warning':
                prefix = 'Hearken! ';
                break;
            default:
                prefix = 'Behold! ';
                break;
        }
        
        // Create message with prefix if needed
        const messageText = text.startsWith(prefix) ? text : prefix + text;
        
        if (this.uiComponents.vitals) {
            this.uiComponents.vitals.showMessage(messageText, type, duration);
        } else {
            // Fallback to regular message
            const bgColors = {
                info: '#3498db',
                success: '#27ae60',
                warning: '#f39c12',
                error: '#c0392b'
            };
            this.showMessage(messageText, bgColors[type] || bgColors.info, duration);
        }
    }
    
    /**
     * Show a level up notification using the MedievalVitals component if available
     * @param {number} level - The new level
     */
    showLevelUp(level) {
        const medievalLevelMessage = `Thy prowess grows! Thou hast attained level ${level}!`;
        
        if (this.uiComponents.vitals) {
            this.uiComponents.vitals.showLevelUpNotification(level);
        } else {
            // Fallback to regular message with medieval styling
            this.showMessage(medievalLevelMessage, '#f0c070');
        }
    }
    
    /**
     * Set god mode in the UI
     * @param {boolean} enabled - Whether god mode is enabled
     */
    setGodMode(enabled) {
        if (this.uiComponents.vitals) {
            this.uiComponents.vitals.setGodMode(enabled);
        }
    }
    
    /**
     * Set aggression state in the UI
     * @param {boolean} isAggressive - Whether the player is aggressive
     */
    setAggression(isAggressive) {
        if (this.uiComponents.vitals) {
            this.uiComponents.vitals.setAggression(isAggressive);
        }
    }
    
    /**
     * Update gold with animation
     * @param {number} gold - The new gold amount
     * @param {boolean} animate - Whether to animate the change
     */
    updateGold(gold, animate = true) {
        if (this.uiComponents.vitals) {
            this.uiComponents.vitals.updateGoldWithAnimation(gold, animate);
        }
    }
    
    /**
     * Get the medieval menu component
     * @returns {MedievalMenu|null} The medieval menu component or null if not available
     */
    getMenu() {
        return this.uiComponents.menu || null;
    }
    
    /**
     * Show the medieval menu
     */
    showMenu() {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.show();
        }
    }
    
    /**
     * Hide the medieval menu
     */
    hideMenu() {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.hide();
        }
    }
    
    /**
     * Toggle the medieval menu visibility
     */
    toggleMenu() {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.toggle();
        }
    }
    
    /**
     * Set a click handler for a menu item
     * @param {string} id - The ID of the menu item
     * @param {Function} handler - The click handler function
     */
    setMenuItemHandler(id, handler) {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.setClickHandler(id, handler);
        }
    }
    
    /**
     * Update a badge value for a menu item
     * @param {string} id - The ID of the menu item
     * @param {number|string} value - The badge value to display
     */
    updateMenuBadge(id, value) {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.updateBadge(id, value);
        }
    }
    
    /**
     * Set the active menu item
     * @param {string} id - The ID of the menu item to set as active
     */
    setActiveMenuItem(id) {
        if (this.uiComponents.menu) {
            this.uiComponents.menu.setActiveItem(id);
        }
    }
    
    /**
     * Add a custom menu item to the medieval menu
     * @param {Object} config - The menu item configuration
     * @param {string} config.id - The unique identifier for the menu item
     * @param {string} config.label - The text label for the menu item
     * @param {string} [config.icon] - The optional icon for the menu item
     * @param {Function} [config.onClick] - The optional click handler for the menu item
     * @param {number|string} [config.badge] - The optional badge value for the menu item
     */
    addMenuItem(config) {
        if (!this.uiComponents.menu) return;
        
        // First check if this item already exists
        const menu = this.uiComponents.menu;
        const existingItem = menu.menuItems.get(config.id);
        
        if (existingItem) {
            logger.info(LogCategory.UI, `Menu item with id '${config.id}' already exists. Updating it.`);
            
            // Update the click handler if provided
            if (config.onClick) {
                menu.setClickHandler(config.id, config.onClick);
            }
            
            // Update the badge if provided
            if (config.badge !== undefined) {
                menu.updateBadge(config.id, config.badge);
            }
        } else {
            // Create a new menu item
            try {
                // We need to add it to the menuItemConfigs array first
                menu.menuItemConfigs.push(config);
                
                // Then create the menu item
                menu.createMenuItem(config);
                
                logger.info(LogCategory.UI, `Added new menu item: ${config.id}`);
            } catch (error) {
                logger.error(LogCategory.UI, `Failed to add menu item: ${config.id}`, error);
            }
        }
    }
    
    /**
     * Remove a menu item from the medieval menu
     * @param {string} id - The ID of the menu item to remove
     */
    removeMenuItem(id) {
        if (!this.uiComponents.menu) return;
        
        const menu = this.uiComponents.menu;
        const menuItem = menu.menuItems.get(id);
        
        if (menuItem) {
            // Remove from DOM
            if (menuItem.parentNode) {
                menuItem.parentNode.removeChild(menuItem);
            }
            
            // Remove from map
            menu.menuItems.delete(id);
            
            // Remove from configs
            const configIndex = menu.menuItemConfigs.findIndex(item => item.id === id);
            if (configIndex !== -1) {
                menu.menuItemConfigs.splice(configIndex, 1);
            }
            
            logger.info(LogCategory.UI, `Removed menu item: ${id}`);
        } else {
            logger.warn(LogCategory.UI, `Menu item with id '${id}' not found.`);
        }
    }
    
    
    /**
     * Set up event listeners for game events that should update the menu
     */
    setupMenuEventListeners() {
        if (!this.scene || !this.uiComponents.menu) return;
        
        // Listen for flag placement events to update the flag count badge
        this.scene.events.on('flagPlaced', () => {
            if (this.mapManager?.flags) {
                this.updateMenuBadge('placeFlag', this.mapManager.flags.length);
                this.updateFlagCounter(); // Update the flag counter UI as well
            }
        });
        
        // Listen for flag removal events
        this.scene.events.on('flagRemoved', () => {
            if (this.mapManager?.flags) {
                this.updateMenuBadge('placeFlag', this.mapManager.flags.length);
                this.updateFlagCounter(); // Update the flag counter UI as well
            }
        });
        
        // Listen for all flags cleared event
        this.scene.events.on('flagsCleared', () => {
            this.updateMenuBadge('placeFlag', 0);
            this.updateFlagCounter(); // Update the flag counter UI as well
        });
        
        // Listen for new discoveries on the map
        this.scene.events.on('newDiscovery', () => {
            if (this.mapManager) {
                // Increment the new discoveries counter
                this.mapManager.newDiscoveries = (this.mapManager.newDiscoveries || 0) + 1;
                this.updateMenuBadge('map', this.mapManager.newDiscoveries);
            }
        });
        
        // Listen for when the player views the map (to clear the badge)
        this.scene.events.on('mapViewed', () => {
            if (this.mapManager) {
                this.mapManager.newDiscoveries = 0;
                this.updateMenuBadge('map', undefined); // Remove the badge
            }
        });
    }
    
    /**
     * Set up event listeners for environment-related events
     */
    setupEnvironmentEventListeners() {
        // Listen for player entering healing aura
        this.scene.events.on('player-in-healing-aura', () => {
            this.environmentInfo.setText('Environment: Healing Aura');
            this.environmentInfo.setBackgroundColor('rgba(160, 232, 160, 0.7)');
        });
        
        // Listen for player leaving healing aura
        this.scene.events.on('player-left-healing-aura', () => {
            this.environmentInfo.setText('Environment: Normal');
            this.environmentInfo.setBackgroundColor('rgba(255, 255, 255, 0.7)');
        });
        
        // Listen for player stats changed (for healing effects)
        this.scene.events.on('player-stats-changed', () => {
            if (this.uiComponents.vitals) {
                this.uiComponents.vitals.updateHealth(
                    this.scene.playerStats.health,
                    this.scene.playerStats.maxHealth
                );
            }
        });
    }
    
    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove DOM elements
        if (this.uiContainer?.list) {
            for (let i = 0; i < this.uiContainer.list.length; i++) {
                const item = this.uiContainer.list[i];
                if (item?.domElement?.parentNode) {
                    item.domElement.parentNode.removeChild(item.domElement);
                }
            }
        }
        
        // Remove keyboard event listener
        if (this.menuKeyHandler) {
            document.removeEventListener('keydown', this.menuKeyHandler);
            this.menuKeyHandler = null;
        }
        
        // Remove event listeners
        this.scene.scale.off('resize', this.resizeUI, this);
        this.scene.events.off('player-in-healing-aura');
        this.scene.events.off('player-left-healing-aura');
        this.scene.events.off('player-stats-changed');
        
        // Destroy UI components
        for (const key in this.uiComponents) {
            if (this.uiComponents[key] && typeof this.uiComponents[key].destroy === 'function') {
                this.uiComponents[key].destroy();
            }
        }
        
        // Clean up DOM UI Helper
        if (this.domUIHelper) {
            this.domUIHelper.cleanupCSS();
        }
        
        // Destroy the UI container
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
    }
} 