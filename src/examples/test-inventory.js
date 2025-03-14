import { InventoryExample } from './inventory-example';

/**
 * This script tests the inventory UI with a large number of items
 * to verify scrolling and item display functionality.
 * It specifically tests the 4-items-per-row layout and responsive design.
 */

// Create a new instance of the InventoryExample scene
const scene = new InventoryExample();

// Override the addDefaultItems method to add more items for testing
scene.inventoryManager.addDefaultItems = function() {
    console.log("Adding test items to inventory");
    
    // Add a large number of items to test scrolling and the 4-items-per-row layout
    // We'll add enough items to create multiple complete rows plus a partial row
    
    // Add weapons (should create multiple rows)
    for (let i = 0; i < 7; i++) {
        this.addItem('sword', 1);
        this.addItem('crossbow', 1);
        this.addItem('axe', 1);
        this.addItem('staff', 1);
    }
    
    // Add special weapons
    for (let i = 0; i < 3; i++) {
        this.addItem('mercurium_sword', 1);
        this.addItem('thornite_axe', 1);
        this.addItem('infernium_crossbow', 1);
    }
    
    // Add resources with varying quantities
    this.addItem('wood', 50);
    this.addItem('wood', 25);
    this.addItem('leather', 30);
    this.addItem('leather', 15);
    
    // Add consumables
    for (let i = 0; i < 5; i++) {
        this.addItem('food_apple', 1 + i);
    }
    
    // Refresh the UI
    this.refreshUI();
    
    console.log("Test items added to inventory - testing 4-items-per-row layout");
};

// Export the test scene
export default scene; 