import { DOMUIHelper } from '../utils/DOMUIHelper';
import { logger, LogCategory } from '../utils/Logger';
import { SkillsUI } from './skills-ui';
import { MedievalEquipmentUI } from './equipment-ui/index';

/**
 * Options for the medieval menu
 * @typedef {Object} MedievalMenuOptions
 * @property {string} [position='left'] - The position of the menu (left, right, top, bottom)
 * @property {string} [orientation='vertical'] - The orientation of the menu (horizontal, vertical)
 * @property {boolean} [showIcons=true] - Whether to show icons in the menu items
 * @property {string} [width='230px'] - The width of the menu
 * @property {string} [iconSize='32px'] - The size of the icons in the menu items
 * @property {string} [menuButtonIcon='☰'] - The icon for the menu button
 */

/**
 * Menu item configuration
 * @typedef {Object} MenuItemConfig
 * @property {string} id - The unique identifier for the menu item
 * @property {string} label - The text label for the menu item
 * @property {string} [icon] - The optional icon for the menu item
 * @property {Function} [onClick] - The optional click handler for the menu item
 * @property {number | string} [badge] - The optional badge value for the menu item
 */

/**
 * MedievalMenu - A medieval-themed HTML/CSS main menu
 * This class creates a DOM-based menu UI with customizable options
 * @extends {Phaser.GameObjects.GameObject}
 * @param {Scene} scene - The Phaser scene instance
 * 
 */
export class MedievalMenu {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.uiHelper = new DOMUIHelper(scene);
        
        // DOM Elements
        this.container = null;
        this.menuButton = null;
        this.menuItems = new Map();
        this.activeItem = null;
        
        // UI Components
        this.skillsUI = null;
        this.equipmentUI = null;
        
        // State
        this.isVisible = false;
        this.menuItemConfigs = [];
        
        // Set default options
        this.options = {
            position: options.position || 'left',
            orientation: options.orientation || 'vertical',
            showIcons: options.showIcons !== undefined ? options.showIcons : true,
            width: options.width || '230px',
            iconSize: options.iconSize || '32px',
            menuButtonIcon: options.menuButtonIcon || '☰',
            menuButtonSize: options.menuButtonSize || '36px',
            menuButtonText: options.menuButtonText || 'Menu'
        };
        
        // Load the CSS files
        this.uiHelper.loadCSS('/styles/medieval-menu.css');
        this.uiHelper.loadCSS('/styles/popups.css'); // Add popup styles for consistent theming
        
        // Create the menu button first (always visible)
        this.createMenuButton();
        
        // Create the main container
        this.createContainer();
        
        // Add default menu items
        this.addDefaultMenuItems();
        
        // Hide the menu by default
        this.container.style.display = 'none';
        
        // Initialize UI components
        this.initializeUIComponents();
    }
    
    /**
     * Creates the menu button that's always visible
     */
    createMenuButton() {
        this.menuButton = this.uiHelper.createElement('div', 'medieval-menu-button custom-popup');
        
        // Apply styles
        const styles = {
            position: 'fixed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            cursor: 'pointer',
            zIndex: '1001',
            bottom: '20px',
            right: '20px',
            fontSize: '16px',
            fontFamily: 'serif',
            fontWeight: 'bold',
            color: '#d4b483',
            width: this.options.width,
            boxSizing: 'border-box'
        };
        
        Object.assign(this.menuButton.style, styles);
        
        // Add parchment texture and decorative corners
        const parchmentTexture = this.uiHelper.createElement('div', 'parchment-texture');
        this.menuButton.appendChild(parchmentTexture);
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.menuButton.appendChild(cornerTopLeft);
        this.menuButton.appendChild(cornerTopRight);
        this.menuButton.appendChild(cornerBottomLeft);
        this.menuButton.appendChild(cornerBottomRight);
        
        // Create a content wrapper for the button content
        const buttonContent = this.uiHelper.createElement('div', 'button-content');
        buttonContent.style.position = 'relative';
        buttonContent.style.zIndex = '2';
        buttonContent.style.display = 'flex';
        buttonContent.style.alignItems = 'center';
        buttonContent.style.justifyContent = 'center';
        buttonContent.style.width = '100%';
        
        // Create icon and text container
        const iconContainer = this.uiHelper.createElement('span', 'menu-button-icon');
        iconContainer.textContent = this.options.menuButtonIcon;
        iconContainer.style.marginRight = '8px';
        iconContainer.style.fontSize = '18px';
        
        const textContainer = this.uiHelper.createElement('span', 'menu-button-text');
        textContainer.textContent = this.options.menuButtonText;
        
        // Add icon and text to button content
        buttonContent.appendChild(iconContainer);
        buttonContent.appendChild(textContainer);
        
        // Add button content to button
        this.menuButton.appendChild(buttonContent);
        
        // Add click handler to toggle menu
        this.menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu button clicked');
            this.toggle();
        });
        
        // Add hover effects
        this.menuButton.addEventListener('mouseenter', () => {
            this.menuButton.classList.add('hover');
        });
        
        this.menuButton.addEventListener('mouseleave', () => {
            if (!this.isVisible) {
                this.menuButton.classList.remove('hover');
            }
        });
        
        // Add to the DOM
        document.body.appendChild(this.menuButton);
    }
    
    /**
     * Creates the main container for the menu
     */
    createContainer() {
        this.container = this.uiHelper.createContainer('medieval-menu custom-popup');
        
        // Set position based on options
        const orientation = this.options.orientation;
        
        // Apply styles based on position and orientation
        const styles = {
            position: 'fixed',
            display: 'flex',
            flexDirection: orientation === 'vertical' ? 'column' : 'row',
            padding: '10px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            zIndex: '1000',
            bottom: '70px',
            right: '20px',
            boxSizing: 'border-box'
        };
        
        // Apply width
        if (orientation === 'vertical') {
            styles.width = this.options.width;
        }
        
        Object.assign(this.container.style, styles);
        
        // Add parchment texture and decorative corners
        const parchmentTexture = this.uiHelper.createElement('div', 'parchment-texture');
        this.container.appendChild(parchmentTexture);
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.container.appendChild(cornerTopLeft);
        this.container.appendChild(cornerTopRight);
        this.container.appendChild(cornerBottomLeft);
        this.container.appendChild(cornerBottomRight);
        
        // Create a content wrapper for the menu items
        this.menuContent = this.uiHelper.createElement('div', 'menu-content');
        this.menuContent.style.position = 'relative';
        this.menuContent.style.zIndex = '2';
        this.menuContent.style.width = '100%';
        this.container.appendChild(this.menuContent);
        
        // Add to the DOM
        document.body.appendChild(this.container);
    }
    
    /**
     * Adds the default menu items
     */
    addDefaultMenuItems() {
        this.menuItemConfigs = [
            { id: 'inventory', label: 'Inventory', icon: '🎒' },
            { id: 'equipment', label: 'Equipment', icon: '🛡️' },
            { id: 'chat', label: 'Chat', icon: '💬' },
            { id: 'craft', label: 'Craft', icon: '⚒️' },
            { id: 'map', label: 'Map', icon: '🗺️' },
            { id: 'character', label: 'Character', icon: '👤' },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
            { id: 'skills', label: 'Skills', icon: '⚔️' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
        ];
        
        // Create menu items
        for (const item of this.menuItemConfigs) {
            this.createMenuItem(item);
        }
    }
    
    /**
     * Creates a menu item
     */
    createMenuItem(config) {
        const { id, label, icon, onClick, badge } = config;
        
        logger.info(LogCategory.MENU, `[MedievalMenu] Creating menu item: ${id}`);
        
        // Create the menu item container
        const menuItem = this.uiHelper.createElement('div', 'medieval-menu-item');
        menuItem.dataset.id = id;
        
        // Apply styles
        const styles = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: this.options.orientation === 'vertical' ? 'flex-start' : 'center',
            padding: '10px',
            margin: '5px 0',
            cursor: 'pointer',
            borderRadius: '5px',
            transition: 'background-color 0.2s, transform 0.1s',
            position: 'relative',
            zIndex: '2'
        };
        
        Object.assign(menuItem.style, styles);
        
        // Add icon if enabled
        if (this.options.showIcons && icon) {
            const iconElement = this.uiHelper.createElement('div', 'medieval-menu-icon');
            iconElement.textContent = icon;
            
            const iconStyles = {
                fontSize: this.options.iconSize,
                marginRight: this.options.orientation === 'vertical' ? '10px' : '0',
                marginBottom: this.options.orientation === 'horizontal' ? '5px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            };
            
            Object.assign(iconElement.style, iconStyles);
            menuItem.appendChild(iconElement);
        }
        
        // Add label
        const labelElement = this.uiHelper.createElement('div', 'medieval-menu-label');
        labelElement.textContent = label;
        
        // Show label based on orientation
        if (this.options.orientation === 'vertical') {
            labelElement.style.display = 'block';
        } else {
            labelElement.style.fontSize = '0.8em';
            labelElement.style.marginTop = '5px';
        }
        
        menuItem.appendChild(labelElement);
        
        // Add badge if provided
        if (badge !== undefined) {
            this.addBadge(menuItem, badge);
        }
        
        // Add click handler with detailed logging
        menuItem.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            
            logger.info(LogCategory.MENU, `[MedievalMenu] Menu item clicked: ${id}`);
            logger.info(LogCategory.MENU, "[MedievalMenu] Event target:", event.target);
            logger.info(LogCategory.MENU, "[MedievalMenu] onClick handler exists:", !!onClick);
            
            // Set this item as active
            this.setActiveItem(id);
            
            // Execute the onClick handler if it exists
            if (onClick) {
                logger.info(LogCategory.MENU, `[MedievalMenu] Executing onClick handler for: ${id}`);
                try {
                    onClick();
                    logger.info(LogCategory.MENU, `[MedievalMenu] onClick handler executed successfully for: ${id}`);
                } catch (error) {
                    logger.error(LogCategory.MENU, `[MedievalMenu] Error executing onClick handler for: ${id}`, error);
                }
            } else {
                logger.info(LogCategory.MENU, `[MedievalMenu] No onClick handler defined for: ${id}`);
            }
        });
        
        // Add hover effects
        menuItem.addEventListener('mouseenter', () => {
            logger.info(LogCategory.MENU, `[MedievalMenu] Mouse enter on menu item: ${id}`);
            if (id !== this.activeItem) {
                menuItem.classList.add('hover');
            }
        });
        
        menuItem.addEventListener('mouseleave', () => {
            logger.info(LogCategory.MENU, `[MedievalMenu] Mouse leave on menu item: ${id}`);
            if (id !== this.activeItem) {
                menuItem.classList.remove('hover');
            }
        });
        
        // Add to container
        this.menuContent.appendChild(menuItem);
        logger.info(LogCategory.MENU, `[MedievalMenu] Menu item added to container: ${id}`);
        
        // Store reference
        this.menuItems.set(id, menuItem);
        logger.info(LogCategory.MENU, `[MedievalMenu] Menu item reference stored: ${id}`);
    }
    
    /**
     * Adds a badge to a menu item
     */
    addBadge(menuItem, value) {
        const badge = this.uiHelper.createElement('div', 'medieval-menu-badge');
        badge.textContent = value.toString();
        
        const badgeStyles = {
            position: 'absolute',
            top: '0',
            right: '0',
            backgroundColor: '#e74c3c',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            transform: 'translate(50%, -50%)',
            zIndex: '3'
        };
        
        Object.assign(badge.style, badgeStyles);
        menuItem.appendChild(badge);
    }
    
    /**
     * Sets the active menu item
     */
    setActiveItem(id) {
        // Reset previous active item
        if (this.activeItem && this.menuItems.has(this.activeItem)) {
            const prevItem = this.menuItems.get(this.activeItem);
            if (prevItem) {
                prevItem.classList.remove('active');
            }
        }
        
        // Set new active item
        if (id && this.menuItems.has(id)) {
            const newItem = this.menuItems.get(id);
            if (newItem) {
                newItem.classList.add('active');
                this.activeItem = id;
            }
        } else {
            this.activeItem = null;
        }
    }
    
    /**
     * Updates a badge value for a menu item
     */
    updateBadge(id, value) {
        if (!this.menuItems.has(id)) return;
        
        const menuItem = this.menuItems.get(id);
        if (!menuItem) return;
        
        // Remove existing badge
        const existingBadge = menuItem.querySelector('.medieval-menu-badge');
        if (existingBadge) {
            menuItem.removeChild(existingBadge);
        }
        
        // Add new badge if value is provided
        if (value !== undefined) {
            this.addBadge(menuItem, value);
        }
    }
    
    /**
     * Sets a click handler for a menu item
     */
    setClickHandler(id, handler) {
        logger.info(LogCategory.MENU, `[MedievalMenu] Setting click handler for menu item: ${id}`);
        
        // First, update the config
        const config = this.menuItemConfigs.find(item => item.id === id);
        if (config) {
            config.onClick = handler;
            logger.info(LogCategory.MENU, `[MedievalMenu] Click handler set in config for: ${id}`);
        } else {
            logger.warn(LogCategory.MENU, `[MedievalMenu] Failed to set click handler: Menu item with id '${id}' not found in configs`);
            return;
        }
        
        // Then, update the DOM element's click handler
        const menuItem = this.menuItems.get(id);
        if (menuItem) {
            logger.info(LogCategory.MENU, `[MedievalMenu] Found menu item DOM element for: ${id}`);
            
            // Remove existing event listeners by cloning the node
            const oldMenuItem = menuItem;
            const newMenuItem = oldMenuItem.cloneNode(true);
            
            // Preserve dataset properties
            newMenuItem.dataset.id = id;
            
            // Replace the old element with the new one
            if (oldMenuItem.parentNode) {
                logger.info(LogCategory.MENU, `[MedievalMenu] Replacing old menu item with new one for: ${id}`);
                oldMenuItem.parentNode.replaceChild(newMenuItem, oldMenuItem);
                
                // Add the new click handler
                newMenuItem.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    logger.info(LogCategory.MENU, `[MedievalMenu] Menu item clicked (updated handler): ${id}`);
                    logger.info(LogCategory.MENU, "[MedievalMenu] Event target:", event.target);
                    this.setActiveItem(id);
                    logger.info(LogCategory.MENU, `[MedievalMenu] Executing updated onClick handler for: ${id}`);
                    handler();
                });
                
                // Update the reference
                this.menuItems.set(id, newMenuItem);
                logger.info(LogCategory.MENU, `[MedievalMenu] Updated menu item reference for: ${id}`);
                
                // Add hover effects
                newMenuItem.addEventListener('mouseenter', () => {
                    if (id !== this.activeItem) {
                        newMenuItem.classList.add('hover');
                    }
                });
                
                newMenuItem.addEventListener('mouseleave', () => {
                    if (id !== this.activeItem) {
                        newMenuItem.classList.remove('hover');
                    }
                });
            } else {
                logger.error(LogCategory.MENU, `[MedievalMenu] Cannot replace menu item: parent node is null for: ${id}`);
            }
        } else {
            logger.error(LogCategory.MENU, `[MedievalMenu] Failed to set click handler: Menu item DOM element with id '${id}' not found`);
        }
    }
    
    /**
     * Shows the menu
     */
    show() {
        logger.info(LogCategory.MENU, '[MedievalMenu] Show method called, isVisible:', this.isVisible);
        if (!this.isVisible) {
            logger.info(LogCategory.MENU, '[MedievalMenu] Setting display to flex');
            this.container.style.display = 'flex';
            this.isVisible = true;
            
            // Update menu button appearance
            this.menuButton.classList.add('active');
            
            // Add entrance animation
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateY(10px)';
            this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                this.container.style.opacity = '1';
                this.container.style.transform = 'translateY(0)';
            }, 10);
            
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is now visible');
        } else {
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is already visible, no action taken');
        }
    }
    
    /**
     * Hides the menu
     */
    hide() {
        logger.info(LogCategory.MENU, '[MedievalMenu] Hide method called, isVisible:', this.isVisible);
        if (this.isVisible) {
            logger.info(LogCategory.MENU, '[MedievalMenu] Setting display to none');
            
            // Add exit animation
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateY(10px)';
            
            // Remove after animation completes
            setTimeout(() => {
                this.container.style.display = 'none';
                this.isVisible = false;
            }, 300); // Match the transition duration
            
            // Update menu button appearance
            this.menuButton.classList.remove('active');
            
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is now hidden');
        } else {
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is already hidden, no action taken');
        }
    }
    
    /**
     * Toggles the menu visibility
     */
    toggle() {
        logger.info(LogCategory.MENU, '[MedievalMenu] Toggle method called, current isVisible:', this.isVisible);
        if (this.isVisible) {
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is visible, hiding it');
            this.hide();
        } else {
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu is hidden, showing it');
            this.show();
        }
        logger.info(LogCategory.MENU, '[MedievalMenu] Toggle complete, new isVisible:', this.isVisible);
    }
    
    /**
     * Initializes UI components
     */
    initializeUIComponents() {
        // Initialize Skills UI
        this.skillsUI = new SkillsUI(this.scene);
        
        // Set click handler for skills menu item
        this.setClickHandler('skills', () => {
            logger.info(LogCategory.MENU, '[MedievalMenu] Skills menu item clicked');
            this.skillsUI.show();
            this.hide(); // Hide the menu when opening skills
        });
        
        // Set click handler for character menu item
        this.setClickHandler('character', () => {
            logger.info(LogCategory.MENU, '[MedievalMenu] Character menu item clicked');
            // Emit the openCharacter event to show the character stats UI
            this.scene.events.emit('openCharacter');
            this.hide(); // Hide the menu when opening character stats
        });
        
        // Set click handler for equipment menu item
        this.setClickHandler('equipment', () => {
            logger.info(LogCategory.MENU, '[MedievalMenu] Equipment menu item clicked');
            // Emit the openEquipment event to show the equipment UI
            this.scene.events.emit('openEquipment');
            this.hide(); // Hide the menu when opening equipment
        });
        
        // Set click handler for chat menu item
        this.setClickHandler('chat', () => {
            logger.info(LogCategory.MENU, '[MedievalMenu] Chat menu item clicked');
            // Emit the openChat event to show the chat UI
            this.scene.events.emit('openChat');
            this.hide(); // Hide the menu when opening chat
        });
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    /**
     * Set up keyboard shortcuts for menu items
     */
    setupKeyboardShortcuts() {
        // Add keyboard event listener for the E key to open equipment
        const keyHandler = (event) => {
            // E key to toggle equipment
            if (event.key === 'e' || event.key === 'E') {
                // Only trigger if not typing in an input field
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    logger.info(LogCategory.MENU, '[MedievalMenu] E key pressed, opening equipment');
                    this.setActiveItem('equipment');
                    this.scene.events.emit('openEquipment');
                }
            }
        };
        
        // Add the event listener
        document.addEventListener('keydown', keyHandler);
        
        // Store the handler so we can remove it later
        this.keyboardHandler = keyHandler;
    }
    
    /**
     * Destroys the menu and removes it from the DOM
     */
    destroy() {
        logger.info(LogCategory.MENU, '[MedievalMenu] Destroying menu');
        
        try {
            // Hide the menu first to prevent visual glitches
            if (this.isVisible) {
                // Force immediate hide instead of animation
                if (this.container) {
                    this.container.style.display = 'none';
                }
                this.isVisible = false;
            }
            
            // Remove keyboard event listeners
            if (this.keyboardHandler) {
                document.removeEventListener('keydown', this.keyboardHandler);
                this.keyboardHandler = null;
            }
            
            // Destroy UI components first (to ensure proper cleanup order)
            if (this.skillsUI) {
                logger.info(LogCategory.MENU, '[MedievalMenu] Destroying skills UI component');
                try {
                    this.skillsUI.destroy();
                } catch (error) {
                    logger.error(LogCategory.MENU, '[MedievalMenu] Error destroying skills UI:', error);
                }
                this.skillsUI = null;
            }
            
            // Remove event listeners from menu items by replacing them with clones
            if (this.menuItems) {
                this.menuItems.forEach((item, id) => {
                    if (item && item.parentNode) {
                        logger.info(LogCategory.MENU, `[MedievalMenu] Removing event listeners from menu item: ${id}`);
                        const clone = item.cloneNode(true);
                        item.parentNode?.replaceChild(clone, item);
                    }
                });
            }
            
            // Remove the menu container
            if (this.container) {
                logger.info(LogCategory.MENU, '[MedievalMenu] Removing menu container');
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
                this.container = null;
            }
            
            // Remove the menu button
            if (this.menuButton) {
                logger.info(LogCategory.MENU, '[MedievalMenu] Removing menu button');
                // Remove event listeners by replacing with clone
                if (this.menuButton.parentNode) {
                    const clone = this.menuButton.cloneNode(false);
                    this.menuButton.parentNode.replaceChild(clone, this.menuButton);
                    clone.parentNode.removeChild(clone);
                }
                this.menuButton = null;
            }
            
            // Clear references
            this.menuItems.clear();
            this.menuItemConfigs = [];
            this.activeItem = null;
            this.menuContent = null;
            
            logger.info(LogCategory.MENU, '[MedievalMenu] Menu destroyed successfully');
        } catch (error) {
            logger.error(LogCategory.MENU, '[MedievalMenu] Error during menu destruction:', error);
        }
    }
} 