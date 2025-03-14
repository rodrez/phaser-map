import { logger, LogCategory } from "../utils/Logger";
import { Inventory } from "./inventory";
import { ItemRegistry } from "./definitions";

/**
 * InventoryManager - Manages the player's inventory and provides methods for adding/removing items
 */
export class InventoryManager {
    /**
     * Create a new inventory manager
     * @param {Object} scene - The scene this manager belongs to
     * @param {Object} itemSystem - The item system to use for item lookups
     * @param {Object} options - Configuration options
     */
    constructor(scene, itemSystem, options = {}) {
        this.scene = scene;
        this.itemSystem = itemSystem;
        this.inventoryUI = null;
        
        // Get the asset manager from the item system
        this.assetManager = itemSystem.getAssetManager();
        
        // Ensure assets are loaded
        if (this.assetManager) {
            try {
                // Check if assets are loaded (if the method exists)
                if (typeof this.assetManager.areAssetsLoaded === 'function' && !this.assetManager.areAssetsLoaded()) {
                    logger.info(LogCategory.INVENTORY, 'Preloading inventory assets');
                    this.assetManager.preloadAssets();
                }
            } catch (e) {
                // If the method doesn't exist, just preload assets directly
                logger.info(LogCategory.INVENTORY, 'Preloading inventory assets (fallback)');
                this.assetManager.preloadAssets();
            }
        }
        
        // Create the inventory
        const maxSlots = options.maxSlots || 30;
        const maxWeight = options.maxWeight || 100;
        this.inventory = new Inventory(maxSlots, maxWeight);
        
        // Try to get the item registry
        try {
            this.itemRegistry = ItemRegistry.getInstance();
        } catch (e) {
            logger.warn(LogCategory.INVENTORY, 'Could not get item registry, falling back to item system');
            this.itemRegistry = null;
        }
        
        logger.info(LogCategory.INVENTORY, `Inventory manager created with ${maxSlots} slots and ${maxWeight} max weight`);
    }
    
    /**
     * Set the inventory UI component
     * @param {Object} inventoryUI - The inventory UI component
     */
    setInventoryUI(inventoryUI) {
        this.inventoryUI = inventoryUI;
    }
    
    /**
     * Get the inventory
     * @returns {Inventory} The inventory
     */
    getInventory() {
        return this.inventory;
    }
    
    /**
     * Add default items to the inventory for testing
     */
    addDefaultItems() {
        logger.info(LogCategory.INVENTORY, "Adding default items to inventory");
        
        // Add weapons
        this.addItem('sword', 1);
        this.addItem('crossbow', 1);
        this.addItem('axe', 1);
        this.addItem('staff', 1);
        
        // Add resources
        this.addItem('wood', 10);
        this.addItem('leather', 5);
        
        // Add consumables
        this.addItem('food_apple', 3);
        
        // Refresh the UI if it exists
        this.refreshUI();
    }
    
    /**
     * Add an item to the inventory
     * @param {string} itemId - The ID of the item to add
     * @param {number} quantity - The quantity to add
     * @returns {boolean} - Whether the item was successfully added
     */
    addItem(itemId, quantity = 1) {
        let item;
        
        // Try to get the item from the registry first if available
        if (this.itemRegistry) {
            const definition = this.itemRegistry.getDefinition(itemId);
            if (definition) {
                item = this.itemRegistry.createItemFromDefinition(definition);
            }
        }
        
        // Fall back to the item system if registry failed or is not available
        if (!item) {
            item = this.itemSystem.getItem(itemId);
        }
        
        if (!item) {
            logger.error(LogCategory.INVENTORY, `Failed to add item to inventory: Item ${itemId} not found`);
            return false;
        }
        
        const remainingItems = this.inventory.addItem(item, quantity);
        const addedQuantity = quantity - remainingItems;
        
        if (addedQuantity > 0) {
            logger.info(LogCategory.INVENTORY, `Added ${addedQuantity}x ${item.name} to inventory`);
        }
        
        if (remainingItems > 0) {
            logger.warn(LogCategory.INVENTORY, `Could not add ${remainingItems}x ${item.name} to inventory (full or over weight limit)`);
        }
        
        // Refresh the inventory UI if it's visible and available
        this.refreshUI();
        
        return addedQuantity > 0;
    }
    
    /**
     * Add multiple items to the inventory
     * @param {Array<{id: string, quantity: number}>} items - Array of items to add
     * @returns {Array<{id: string, quantity: number, added: number}>} - Results of adding each item
     */
    addItems(items) {
        if (!Array.isArray(items)) {
            logger.error(LogCategory.INVENTORY, 'Failed to add items: items parameter must be an array');
            return [];
        }
        
        const results = [];
        
        items.forEach(itemData => {
            if (!itemData.id || typeof itemData.id !== 'string') {
                logger.error(LogCategory.INVENTORY, 'Failed to add item: invalid item ID');
                results.push({ id: itemData.id || 'unknown', quantity: 0, added: 0 });
                return;
            }
            
            const quantity = itemData.quantity || 1;
            const item = this.itemSystem.getItem(itemData.id);
            
            if (!item) {
                logger.error(LogCategory.INVENTORY, `Failed to add item to inventory: Item ${itemData.id} not found`);
                results.push({ id: itemData.id, quantity, added: 0 });
                return;
            }
            
            const remainingItems = this.inventory.addItem(item, quantity);
            const addedQuantity = quantity - remainingItems;
            
            results.push({ id: itemData.id, quantity, added: addedQuantity });
            
            if (addedQuantity > 0) {
                logger.info(LogCategory.INVENTORY, `Added ${addedQuantity}x ${item.name} to inventory`);
            }
            
            if (remainingItems > 0) {
                logger.warn(LogCategory.INVENTORY, `Could not add ${remainingItems}x ${item.name} to inventory (full or over weight limit)`);
            }
        });
        
        // Refresh the inventory UI if it's visible and available
        this.refreshUI();
        
        return results;
    }
    
    /**
     * Remove an item from the inventory by its ID
     * @param {string} itemId - The ID of the item to remove
     * @param {number} quantity - The quantity to remove
     * @returns {number} - The actual quantity removed
     */
    removeItemById(itemId, quantity = 1) {
        // Find all stacks of this item
        const allItems = this.inventory.getAllItems();
        let remainingToRemove = quantity;
        let totalRemoved = 0;
        
        // Find stacks with this item ID
        const matchingStacks = allItems.filter(stack => stack.item.id === itemId);
        
        if (matchingStacks.length === 0) {
            logger.warn(LogCategory.INVENTORY, `Cannot remove item ${itemId}: Not found in inventory`);
            return 0;
        }
        
        // Remove from each stack until we've removed the requested quantity
        for (let i = 0; i < matchingStacks.length && remainingToRemove > 0; i++) {
            const stack = matchingStacks[i];
            const stackIndex = this.inventory.getAllSlots().findIndex(s => s === stack);
            
            if (stackIndex !== -1) {
                const removed = this.inventory.removeItem(stackIndex, remainingToRemove);
                totalRemoved += removed;
                remainingToRemove -= removed;
                
                logger.info(LogCategory.INVENTORY, `Removed ${removed}x ${stack.item.name} from inventory`);
            }
        }
        
        // Refresh the inventory UI if it's visible and available
        this.refreshUI();
        
        return totalRemoved;
    }
    
    /**
     * Remove an item from a specific inventory slot
     * @param {number} slotIndex - The index of the slot to remove from
     * @param {number} quantity - The quantity to remove
     * @returns {number} - The actual quantity removed
     */
    removeItemFromSlot(slotIndex, quantity = 1) {
        const slot = this.inventory.getSlot(slotIndex);
        if (!slot) {
            logger.warn(LogCategory.INVENTORY, `Cannot remove item from slot ${slotIndex}: Slot is empty`);
            return 0;
        }
        
        const removed = this.inventory.removeItem(slotIndex, quantity);
        
        if (removed > 0) {
            logger.info(LogCategory.INVENTORY, `Removed ${removed}x ${slot.item.name} from inventory slot ${slotIndex}`);
            
            // Refresh the inventory UI if it's visible and available
            this.refreshUI();
        }
        
        return removed;
    }
    
    /**
     * Move an item from one slot to another
     * @param {number} fromSlot - The source slot index
     * @param {number} toSlot - The destination slot index
     * @param {number} quantity - The quantity to move (defaults to all)
     * @returns {boolean} - Whether the move was successful
     */
    moveItem(fromSlot, toSlot, quantity = null) {
        const sourceSlot = this.inventory.getSlot(fromSlot);
        if (!sourceSlot) {
            logger.warn(LogCategory.INVENTORY, `Cannot move item from slot ${fromSlot}: Slot is empty`);
            return false;
        }
        
        // If quantity is null, move all items
        if (quantity === null) {
            quantity = sourceSlot.quantity;
        }
        
        // Ensure we're not trying to move more than exists
        quantity = Math.min(quantity, sourceSlot.quantity);
        
        // Try to move the item
        const success = this.inventory.moveItem(fromSlot, toSlot, quantity);
        
        if (success) {
            logger.info(LogCategory.INVENTORY, `Moved ${quantity}x ${sourceSlot.item.name} from slot ${fromSlot} to slot ${toSlot}`);
            
            // Refresh the inventory UI if it's visible and available
            this.refreshUI();
        } else {
            logger.warn(LogCategory.INVENTORY, `Failed to move ${quantity}x ${sourceSlot.item.name} from slot ${fromSlot} to slot ${toSlot}`);
        }
        
        return success;
    }
    
    /**
     * Check if the player has a specific item in their inventory
     * @param {string} itemId - The ID of the item to check for
     * @param {number} quantity - The minimum quantity required
     * @returns {boolean} - Whether the player has the required quantity of the item
     */
    hasItem(itemId, quantity = 1) {
        const allItems = this.inventory.getAllItems();
        const matchingStacks = allItems.filter(stack => stack.item.id === itemId);
        
        if (matchingStacks.length === 0) {
            return false;
        }
        
        // Sum up the quantities of all matching stacks
        const totalQuantity = matchingStacks.reduce((sum, stack) => sum + stack.quantity, 0);
        
        return totalQuantity >= quantity;
    }
    
    /**
     * Get the total quantity of a specific item in the inventory
     * @param {string} itemId - The ID of the item to check for
     * @returns {number} - The total quantity of the item in the inventory
     */
    getItemQuantity(itemId) {
        const allItems = this.inventory.getAllItems();
        const matchingStacks = allItems.filter(stack => stack.item.id === itemId);
        
        if (matchingStacks.length === 0) {
            return 0;
        }
        
        // Sum up the quantities of all matching stacks
        return matchingStacks.reduce((sum, stack) => sum + stack.quantity, 0);
    }
    
    /**
     * Use an item from the inventory
     * @param {number} slotIndex - The index of the slot containing the item to use
     * @returns {boolean} - Whether the item was successfully used
     */
    useItem(slotIndex) {
        const itemStack = this.inventory.getSlot(slotIndex);
        if (!itemStack) {
            logger.warn(LogCategory.INVENTORY, `Cannot use item in slot ${slotIndex}: Slot is empty`);
            return false;
        }
        
        const item = itemStack.item;
        
        if (!item.usable) {
            logger.warn(LogCategory.INVENTORY, `Cannot use item ${item.name}: Item is not usable`);
            return false;
        }
        
        logger.info(LogCategory.INVENTORY, `Using item: ${item.name}`);
        
        const used = item.use();
        
        if (used) {
            // If the item is now empty (all uses consumed), remove it from inventory
            if (itemStack.isEmpty()) {
                this.inventory.removeItem(slotIndex, 1);
            }
            
            // Refresh the inventory UI if it's visible and available
            this.refreshUI();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Refresh the inventory UI if it's visible and available
     */
    refreshUI() {
        if (this.inventoryUI && this.inventoryUI.isVisible) {
            this.inventoryUI.refreshInventory();
        }
    }
    
    /**
     * Save the inventory to local storage
     * @param {string} key - The key to save the inventory under
     * @returns {boolean} - Whether the save was successful
     */
    saveInventory(key = 'player_inventory') {
        try {
            // Get all items in the inventory
            const items = this.inventory.getAllItems().map(stack => ({
                id: stack.item.id,
                quantity: stack.quantity,
                slotIndex: this.inventory.getAllSlots().indexOf(stack)
            }));
            
            // Save to local storage
            localStorage.setItem(key, JSON.stringify(items));
            
            logger.info(LogCategory.INVENTORY, `Inventory saved to local storage with key: ${key}`);
            return true;
        } catch (e) {
            logger.error(LogCategory.INVENTORY, `Failed to save inventory: ${e.message}`);
            return false;
        }
    }
    
    /**
     * Load the inventory from local storage
     * @param {string} key - The key to load the inventory from
     * @returns {boolean} - Whether the load was successful
     */
    loadInventory(key = 'player_inventory') {
        try {
            // Get the saved inventory data
            const savedData = localStorage.getItem(key);
            if (!savedData) {
                logger.warn(LogCategory.INVENTORY, `No saved inventory found with key: ${key}`);
                return false;
            }
            
            // Parse the saved data
            const items = JSON.parse(savedData);
            
            // Clear the current inventory
            this.clear();
            
            // Add each item to the inventory
            items.forEach(itemData => {
                const item = this.itemSystem.getItem(itemData.id);
                if (item) {
                    // If a slot index is specified, try to add to that slot
                    if (itemData.slotIndex !== undefined) {
                        this.inventory.addItemToSlot(itemData.slotIndex, item, itemData.quantity);
                    } else {
                        // Otherwise, add to the first available slot
                        this.inventory.addItem(item, itemData.quantity);
                    }
                } else {
                    logger.warn(LogCategory.INVENTORY, `Failed to load item ${itemData.id}: Item not found`);
                }
            });
            
            // Refresh the UI
            this.refreshUI();
            
            logger.info(LogCategory.INVENTORY, `Inventory loaded from local storage with key: ${key}`);
            return true;
        } catch (e) {
            logger.error(LogCategory.INVENTORY, `Failed to load inventory: ${e.message}`);
            return false;
        }
    }
    
    /**
     * Clear the inventory
     */
    clear() {
        this.inventory.clear();
        this.refreshUI();
        logger.info(LogCategory.INVENTORY, "Inventory cleared");
    }
    
    /**
     * Destroy the inventory manager
     */
    destroy() {
        this.inventory = null;
        this.inventoryUI = null;
        logger.info(LogCategory.INVENTORY, "Inventory manager destroyed");
    }
} 