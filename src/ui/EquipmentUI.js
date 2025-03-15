import { logger, LogCategory } from '../utils/Logger';
import { ItemType } from '../items/item-types';

/**
 * UI component for displaying and interacting with equipment
 */
export class EquipmentUI {
    /**
     * Create a new equipment UI
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} equipmentManager - The equipment manager
     * @param {Object} options - Configuration options
     */
    constructor(scene, equipmentManager, options = {}) {
        this.scene = scene;
        this.equipmentManager = equipmentManager;
        
        // Register this UI with the equipment manager
        this.equipmentManager.setEquipmentUI(this);
        
        // UI elements
        this.container = null;
        this.background = null;
        this.slots = {};
        this.icons = {};
        this.labels = {};
        this.closeButton = null;
        
        // UI state
        this.visible = false;
        
        // Options
        this.options = {
            x: options.x || 100,
            y: options.y || 100,
            width: options.width || 300,
            height: options.height || 400,
            padding: options.padding || 10,
            slotSize: options.slotSize || 64,
            backgroundColor: options.backgroundColor || 0x333333,
            backgroundAlpha: options.backgroundAlpha || 0.8,
            borderColor: options.borderColor || 0x666666,
            borderWidth: options.borderWidth || 2,
            slotColor: options.slotColor || 0x222222,
            slotBorderColor: options.slotBorderColor || 0x444444,
            textColor: options.textColor || '#FFFFFF',
            fontSize: options.fontSize || '16px',
            fontFamily: options.fontFamily || 'Arial',
            ...options
        };
        
        // Initialize the UI
        this.initialize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.info(LogCategory.UI, 'EquipmentUI initialized with simplified slots');
    }
    
    /**
     * Initialize the UI
     */
    initialize() {
        // Create container for all UI elements
        this.container = this.scene.add.container(this.options.x, this.options.y);
        this.container.setDepth(100);
        
        // Create background
        this.background = this.scene.add.rectangle(
            0,
            0,
            this.options.width,
            this.options.height,
            this.options.backgroundColor,
            this.options.backgroundAlpha
        );
        this.background.setOrigin(0, 0);
        this.background.setStrokeStyle(this.options.borderWidth, this.options.borderColor);
        this.container.add(this.background);
        
        // Create title
        const title = this.scene.add.text(
            this.options.width / 2,
            this.options.padding,
            'Equipment',
            {
                fontFamily: this.options.fontFamily,
                fontSize: parseInt(this.options.fontSize) + 4 + 'px',
                color: this.options.textColor,
                align: 'center'
            }
        );
        title.setOrigin(0.5, 0);
        this.container.add(title);
        
        // Create close button
        this.closeButton = this.scene.add.text(
            this.options.width - this.options.padding,
            this.options.padding,
            'X',
            {
                fontFamily: this.options.fontFamily,
                fontSize: this.options.fontSize,
                color: this.options.textColor
            }
        );
        this.closeButton.setOrigin(1, 0);
        this.closeButton.setInteractive({ useHandCursor: true });
        this.closeButton.on('pointerdown', () => this.hide());
        this.container.add(this.closeButton);
        
        // Create equipment slots
        this.createEquipmentSlots();
        
        // Hide the UI initially
        this.container.setVisible(false);
        
        // Make the container fixed to the camera
        this.container.setScrollFactor(0);
    }
    
    /**
     * Create equipment slots
     */
    createEquipmentSlots() {
        const slotSize = this.options.slotSize;
        const padding = this.options.padding;
        const startY = padding * 3 + 20; // Below title
        
        // Define slot positions and labels for simplified equipment
        const slotConfig = [
            { slot: 'weapon', label: 'Weapon', x: this.options.width / 2, y: startY },
            { slot: 'armor', label: 'Armor', x: this.options.width / 2, y: startY + slotSize + padding },
            { slot: 'ringLeft', label: 'Left Ring', x: this.options.width / 2 - slotSize - padding, y: startY + 2 * (slotSize + padding) },
            { slot: 'ringRight', label: 'Right Ring', x: this.options.width / 2 + slotSize + padding, y: startY + 2 * (slotSize + padding) }
        ];
        
        // Create each slot
        for (const config of slotConfig) {
            // Create slot background
            const slot = this.scene.add.rectangle(
                config.x,
                config.y,
                slotSize,
                slotSize,
                this.options.slotColor
            );
            slot.setOrigin(0.5);
            slot.setStrokeStyle(1, this.options.slotBorderColor);
            slot.setInteractive({ useHandCursor: true });
            
            // Add slot to container
            this.container.add(slot);
            
            // Store reference to slot
            this.slots[config.slot] = slot;
            
            // Create label
            const label = this.scene.add.text(
                config.x,
                config.y + slotSize / 2 + 5,
                config.label,
                {
                    fontFamily: this.options.fontFamily,
                    fontSize: parseInt(this.options.fontSize) - 2 + 'px',
                    color: this.options.textColor,
                    align: 'center'
                }
            );
            label.setOrigin(0.5, 0);
            
            // Add label to container
            this.container.add(label);
            
            // Store reference to label
            this.labels[config.slot] = label;
            
            // Create empty icon placeholder
            const icon = this.scene.add.sprite(config.x, config.y, 'default-item');
            icon.setOrigin(0.5);
            icon.setScale(2); // Scale up the icon to fit the slot
            icon.setVisible(false); // Hide initially
            
            // Add icon to container
            this.container.add(icon);
            
            // Store reference to icon
            this.icons[config.slot] = icon;
            
            // Set up slot interaction
            this.setupSlotInteraction(config.slot, slot);
        }
    }
    
    /**
     * Set up interaction for a slot
     * @param {string} slotName - The name of the slot
     * @param {Phaser.GameObjects.Rectangle} slot - The slot rectangle
     */
    setupSlotInteraction(slotName, slot) {
        // Unequip item on click
        slot.on('pointerdown', () => {
            const item = this.equipmentManager.getEquippedItem(slotName);
            if (item) {
                this.equipmentManager.unequip(slotName);
            }
        });
        
        // Show tooltip on hover
        slot.on('pointerover', () => {
            const item = this.equipmentManager.getEquippedItem(slotName);
            if (item) {
                // TODO: Show tooltip with item details
            }
            
            // Highlight slot
            slot.setStrokeStyle(2, 0xffffff);
        });
        
        // Hide tooltip on hover out
        slot.on('pointerout', () => {
            // TODO: Hide tooltip
            
            // Remove highlight
            slot.setStrokeStyle(1, this.options.slotBorderColor);
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for equipment changes
        this.equipmentManager.events.on('equipment-changed', this.refresh, this);
        
        // We're now handling the 'E' key in the menu system
        // No need to set up a keyboard listener here
        
        // Add debug message to help troubleshoot
        logger.info(LogCategory.UI, 'Equipment UI event listeners set up. Equipment menu can be toggled from the main menu or with E key.');
    }
    
    /**
     * Refresh the UI to reflect current equipment
     */
    refresh() {
        // Get all equipped items
        const equipment = this.equipmentManager.getAllEquippedItems();
        
        // Update each slot
        for (const [slot, item] of Object.entries(equipment)) {
            const icon = this.icons[slot];
            
            if (!icon) continue; // Skip if icon doesn't exist for this slot
            
            if (item) {
                // Update icon texture
                icon.setTexture(item.iconUrl || 'default-item');
                icon.setVisible(true);
                
                // Update slot appearance based on item rarity
                const rarityColor = this.getRarityColor(item.rarity);
                this.slots[slot].setStrokeStyle(2, rarityColor);
            } else {
                // Hide icon for empty slot
                icon.setVisible(false);
                
                // Reset slot appearance
                this.slots[slot].setStrokeStyle(1, this.options.slotBorderColor);
            }
        }
    }
    
    /**
     * Get color for item rarity
     * @param {string} rarity - The item rarity
     * @returns {number} - The color as a hex value
     */
    getRarityColor(rarity) {
        switch (rarity) {
            case 'common':
                return 0xffffff;
            case 'uncommon':
                return 0x1eff00;
            case 'rare':
                return 0x0070dd;
            case 'epic':
                return 0xa335ee;
            case 'legendary':
                return 0xff8000;
            case 'mythic':
                return 0xe6cc80;
            default:
                return 0xffffff;
        }
    }
    
    /**
     * Show the equipment UI
     */
    show() {
        if (this.visible) return;
        
        this.container.setVisible(true);
        this.visible = true;
        
        // Refresh to show current equipment
        this.refresh();
        
        logger.info(LogCategory.UI, 'EquipmentUI shown');
    }
    
    /**
     * Hide the equipment UI
     */
    hide() {
        if (!this.visible) return;
        
        this.container.setVisible(false);
        this.visible = false;
        
        logger.info(LogCategory.UI, 'EquipmentUI hidden');
    }
    
    /**
     * Toggle the equipment UI visibility
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
        
        // Log the toggle action to help with debugging
        logger.info(LogCategory.UI, `Equipment UI toggled. Visible: ${this.visible}`);
    }
    
    /**
     * Update the UI
     */
    update() {
        // Nothing to update every frame for now
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.equipmentManager.events.off('equipment-changed', this.refresh, this);
        
        // Destroy all UI elements
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
        // Clear references
        this.slots = {};
        this.icons = {};
        this.labels = {};
        this.closeButton = null;
        this.background = null;
        
        logger.info(LogCategory.UI, 'EquipmentUI destroyed');
    }
} 