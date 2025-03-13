import { CoreUIManager } from './CoreUIManager';
import { MedievalMenu } from '../../ui/menu';
import { logger, LogCategory } from '../Logger';

/**
 * MenuManager - Handles all menu-related functionality
 * Creates and manages the game menu
 * Handles menu items, badges, and click handlers
 * Manages keyboard shortcuts for menu items
 */
export class MenuManager extends CoreUIManager {
    /**
     * Constructor for the MenuManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} options - Menu options
     */
    constructor(scene, options = {}) {
        super(scene);
        
        this.menu = null;
        this.menuKeyHandler = null;
        this.menuOptions = options;
        
        // Initialize the menu
        this.initializeMenu();
    }

    /**
     * Initialize the medieval menu with custom options
     */
    initializeMenu() {
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
        const menuOptions = { ...defaultOptions, ...this.menuOptions };
        
        // Create the menu
        this.menu = new MedievalMenu(this.scene, menuOptions);
        
        // Set up menu item handlers
        this.setupMenuHandlers();
        
        // Set up keyboard shortcuts for the menu
        this.setupMenuKeyboardShortcuts();
    }
    
    /**
     * Set up handlers for menu items
     */
    setupMenuHandlers() {
        if (!this.menu) return;
        
        // Set up click handlers for each menu item
        this.menu.setClickHandler('map', () => {
            logger.info(LogCategory.UI, 'Map menu item clicked');
            this.scene.events.emit('openMap');
        });
        
        this.menu.setClickHandler('inventory', () => {
            logger.info(LogCategory.UI, 'Inventory menu item clicked');
            this.scene.events.emit('openInventory');
        });
        
        this.menu.setClickHandler('character', () => {
            logger.info(LogCategory.UI, 'Character menu item clicked');
            this.scene.events.emit('openCharacter');
        });
        
        this.menu.setClickHandler('settings', () => {
            logger.info(LogCategory.UI, 'Settings menu item clicked');
            this.scene.events.emit('openSettings');
        });
    }
    
    /**
     * Set up keyboard shortcuts for the menu
     */
    setupMenuKeyboardShortcuts() {
        if (!this.scene || !this.menu) return;
        
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
     * Reposition the menu based on screen size
     */
    repositionMenu() {
        if (!this.menu) return;
        
        // Get the current screen dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Reposition the menu button
        if (this.menu.menuButton) {
            // Keep the menu button at the bottom right
            this.menu.menuButton.style.bottom = '20px';
            this.menu.menuButton.style.right = '20px';
        }
        
        // Reposition the menu container
        if (this.menu.container) {
            // Position the menu above the menu button
            this.menu.container.style.bottom = '70px';
            this.menu.container.style.right = '20px';
            
            // Adjust width for small screens
            if (width < 768) {
                this.menu.container.style.width = '160px';
            } else {
                this.menu.container.style.width = this.menu.options.width;
            }
        }
    }
    
    /**
     * Resize UI elements
     */
    resizeUI() {
        // Reposition the menu
        this.repositionMenu();
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
     * @param {string} config.id - The unique identifier for the menu item
     * @param {string} config.label - The text label for the menu item
     * @param {string} [config.icon] - The optional icon for the menu item
     * @param {Function} [config.onClick] - The optional click handler for the menu item
     * @param {number|string} [config.badge] - The optional badge value for the menu item
     */
    addMenuItem(config) {
        if (!this.menu) return;
        
        // First check if this item already exists
        const existingItem = this.menu.menuItems.get(config.id);
        
        if (existingItem) {
            logger.info(LogCategory.UI, `Menu item with id '${config.id}' already exists. Updating it.`);
            
            // Update the click handler if provided
            if (config.onClick) {
                this.menu.setClickHandler(config.id, config.onClick);
            }
            
            // Update the badge if provided
            if (config.badge !== undefined) {
                this.menu.updateBadge(config.id, config.badge);
            }
        } else {
            // Create a new menu item
            try {
                // We need to add it to the menuItemConfigs array first
                this.menu.menuItemConfigs.push(config);
                
                // Then create the menu item
                this.menu.createMenuItem(config);
                
                logger.info(LogCategory.UI, `Added new menu item: ${config.id}`);
            } catch (error) {
                logger.error(LogCategory.UI, `Failed to add menu item: ${config.id}`, error);
            }
        }
    }
    
    /**
     * Remove a menu item from the menu
     * @param {string} id - The ID of the menu item to remove
     */
    removeMenuItem(id) {
        if (!this.menu) return;
        
        const menuItem = this.menu.menuItems.get(id);
        
        if (menuItem) {
            // Remove from DOM
            if (menuItem.parentNode) {
                menuItem.parentNode.removeChild(menuItem);
            }
            
            // Remove from map
            this.menu.menuItems.delete(id);
            
            // Remove from configs
            const configIndex = this.menu.menuItemConfigs.findIndex(item => item.id === id);
            if (configIndex !== -1) {
                this.menu.menuItemConfigs.splice(configIndex, 1);
            }
            
            logger.info(LogCategory.UI, `Removed menu item: ${id}`);
        } else {
            logger.warn(LogCategory.UI, `Menu item with id '${id}' not found.`);
        }
    }
    
    /**
     * Update menu badges based on game state
     * @param {Object} gameState - The current game state
     */
    updateMenuBadges(gameState) {
        if (!this.menu) return;
        
        // Example: Update inventory badge based on new items
        if (gameState?.playerStats?.newItems) {
            this.updateMenuBadge('inventory', gameState.playerStats.newItems);
        }
        
        // Example: Update map badge based on new discoveries
        if (gameState?.mapManager?.newDiscoveries) {
            this.updateMenuBadge('map', gameState.mapManager.newDiscoveries);
        }
        
        // Example: Update communication badge based on new messages
        if (gameState?.playerStats?.newMessages) {
            this.updateMenuBadge('communication', gameState.playerStats.newMessages);
        }
    }
    
    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove keyboard event listener
        if (this.menuKeyHandler) {
            document.removeEventListener('keydown', this.menuKeyHandler);
            this.menuKeyHandler = null;
        }
        
        // Destroy the menu
        if (this.menu && typeof this.menu.destroy === 'function') {
            this.menu.destroy();
            this.menu = null;
        }
        
        // Call parent destroy
        super.destroy();
    }
} 