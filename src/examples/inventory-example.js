import { Scene } from 'phaser';
import { ItemSystem } from '../items/item';
import { InventoryManager } from '../items/inventory-manager';
import { InventoryUI } from '../ui/inventory-ui/InventoryUIBase';
import { logger, LogCategory } from '../utils/Logger';

/**
 * Example scene that demonstrates how to use the inventory system
 */
export class InventoryExample extends Scene {
    constructor() {
        super({ key: 'InventoryExample' });
    }
    
    preload() {
        // Preload assets
        this.load.image('background', 'assets/backgrounds/inventory-bg.jpg');
    }
    
    create() {
        // Add background
        this.add.image(0, 0, 'background')
            .setOrigin(0, 0)
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        
        // Initialize the item system
        this.itemSystem = new ItemSystem(this);
        
        // Preload item assets
        this.itemSystem.preloadAssets();
        
        // Create inventory manager
        this.inventoryManager = new InventoryManager(this, this.itemSystem, {
            maxSlots: 30,
            maxWeight: 100
        });
        
        // Create inventory UI
        this.inventoryUI = new InventoryUI(this, {
            inventory: this.inventoryManager.getInventory(),
            itemSystem: this.itemSystem,
            title: 'Player Inventory',
            onItemClick: (item, index) => this.handleItemClick(item, index),
            onItemRightClick: (item, index) => this.handleItemRightClick(item, index),
            onClose: () => console.log('Inventory closed')
        });
        
        // Set the inventory UI in the manager
        this.inventoryManager.setInventoryUI(this.inventoryUI);
        
        // Add default items to inventory
        this.inventoryManager.addDefaultItems();
        
        // Add UI buttons
        this.createUIButtons();
        
        // Log that the scene is ready
        logger.info(LogCategory.SCENE, 'Inventory example scene created');
    }
    
    /**
     * Create UI buttons for interacting with the inventory
     */
    createUIButtons() {
        // Create a button to toggle the inventory
        const toggleButton = this.add.text(20, 20, 'Toggle Inventory', {
            fontSize: '24px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#333',
            color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (this.inventoryUI.isVisible) {
                this.inventoryUI.hide();
            } else {
                this.inventoryUI.show();
            }
        });
        
        // Create a button to add a random item
        const addItemButton = this.add.text(20, 80, 'Add Random Item', {
            fontSize: '24px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#333',
            color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.addRandomItem();
        });
        
        // Create a button to save inventory
        const saveButton = this.add.text(20, 140, 'Save Inventory', {
            fontSize: '24px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#333',
            color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const saved = this.inventoryManager.saveInventory();
            if (saved) {
                this.showMessage('Inventory saved successfully!');
            } else {
                this.showMessage('Failed to save inventory!', true);
            }
        });
        
        // Create a button to load inventory
        const loadButton = this.add.text(20, 200, 'Load Inventory', {
            fontSize: '24px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#333',
            color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const loaded = this.inventoryManager.loadInventory();
            if (loaded) {
                this.showMessage('Inventory loaded successfully!');
            } else {
                this.showMessage('No saved inventory found!', true);
            }
        });
        
        // Create a button to clear inventory
        const clearButton = this.add.text(20, 260, 'Clear Inventory', {
            fontSize: '24px',
            padding: { x: 10, y: 5 },
            backgroundColor: '#333',
            color: '#ffffff'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.inventoryManager.clear();
            this.showMessage('Inventory cleared!');
        });
    }
    
    /**
     * Handle item click
     * @param {BaseItem} item - The clicked item
     * @param {number} index - The index of the item in the inventory
     */
    handleItemClick(item, index) {
        logger.info(LogCategory.INVENTORY, `Clicked item: ${item.name} at index ${index}`);
        
        // Show a message with item details
        this.showMessage(`Selected: ${item.name}`);
    }
    
    /**
     * Handle item right click (use item)
     * @param {BaseItem} item - The clicked item
     * @param {number} index - The index of the item in the inventory
     */
    handleItemRightClick(item, index) {
        logger.info(LogCategory.INVENTORY, `Right-clicked item: ${item.name} at index ${index}`);
        
        // Try to use the item if it's usable
        if (item.usable) {
            const used = this.inventoryManager.useItem(index);
            if (used) {
                this.showMessage(`Used: ${item.name}`);
            } else {
                this.showMessage(`Cannot use: ${item.name}`, true);
            }
        } else {
            this.showMessage(`${item.name} is not usable`, true);
        }
    }
    
    /**
     * Add a random item to the inventory
     */
    addRandomItem() {
        // Define possible items to add
        const possibleItems = [
            { id: 'sword', quantity: 1 },
            { id: 'axe', quantity: 1 },
            { id: 'crossbow', quantity: 1 },
            { id: 'staff', quantity: 1 },
            { id: 'wood', quantity: Math.floor(Math.random() * 5) + 1 },
            { id: 'leather', quantity: Math.floor(Math.random() * 3) + 1 },
            { id: 'food_apple', quantity: Math.floor(Math.random() * 2) + 1 },
            { id: 'mercurium_sword', quantity: 1 },
            { id: 'thornite_axe', quantity: 1 },
            { id: 'infernium_crossbow', quantity: 1 }
        ];
        
        // Select a random item
        const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        
        // Add the item to the inventory
        const added = this.inventoryManager.addItem(randomItem.id, randomItem.quantity);
        
        if (added) {
            this.showMessage(`Added: ${randomItem.quantity}x ${randomItem.id}`);
        } else {
            this.showMessage('Inventory is full or over weight limit!', true);
        }
    }
    
    /**
     * Show a message on the screen
     * @param {string} message - The message to show
     * @param {boolean} isError - Whether this is an error message
     */
    showMessage(message, isError = false) {
        // Remove existing message if any
        if (this.messageText) {
            this.messageText.destroy();
        }
        
        // Create new message
        this.messageText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 50,
            message,
            {
                fontSize: '24px',
                padding: { x: 20, y: 10 },
                backgroundColor: isError ? '#aa0000' : '#006600',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Auto-remove after 3 seconds
        this.time.delayedCall(3000, () => {
            if (this.messageText) {
                this.messageText.destroy();
                this.messageText = null;
            }
        });
    }
} 