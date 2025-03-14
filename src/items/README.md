# Inventory System Documentation

This document provides an overview of the inventory system, how it works, and how to use it in your game.

## Overview

The inventory system is designed to be flexible, maintainable, and easy to use. It consists of several key components:

1. **Item Registry**: A central repository for all item definitions
2. **Item System**: Manages item creation and asset loading
3. **Inventory Manager**: Handles adding/removing items from the inventory
4. **Inventory**: The core data structure that stores items
5. **Inventory UI**: A user interface for displaying and interacting with the inventory

## Directory Structure

```
src/items/
├── definitions/            # Item definitions
│   ├── weapons/           # Weapon definitions
│   │   ├── metal-weapons.ts  # Special metal weapons
│   │   └── index.ts       # Exports all weapon definitions
│   ├── armor/             # Armor definitions
│   ├── consumables/       # Consumable definitions
│   ├── resources/         # Resource definitions
│   ├── item-registry.ts   # Item registry class
│   └── index.ts           # Exports all definitions
├── item.ts                # Base item classes and item system
├── inventory.ts           # Inventory class
├── inventory-manager.js   # Inventory manager
├── item-asset-manager.ts  # Asset manager for items
└── item-system-extension.js # JavaScript extension for item system
```

## Item Registry

The Item Registry is the central source of truth for all item definitions. It provides methods for registering, retrieving, and creating items from definitions.

### Key Features

- **Single Source of Truth**: All item definitions are stored in one place
- **Type Safety**: TypeScript interfaces ensure correct item definitions
- **Easy Registration**: Simple methods for registering new items
- **Item Creation**: Methods for creating item instances from definitions

### Usage

```typescript
// Get the registry instance
const registry = ItemRegistry.getInstance();

// Register a new item definition
registry.registerDefinition({
    id: 'my_item',
    name: 'My Item',
    description: 'A custom item',
    imagePath: '/items/my-item.png',
    type: ItemType.RESOURCE,
    rarity: ItemRarity.COMMON,
    weight: 1.0,
    value: 10,
    stackable: true,
    maxStackSize: 20,
    usable: false
});

// Get a definition by ID
const definition = registry.getDefinition('my_item');

// Create an item instance from a definition
const item = registry.createItemFromDefinition(definition);
```

## Item System

The Item System manages the creation and loading of items in the game. It uses the Item Registry to create items and the Item Asset Manager to load assets.

### Key Features

- **Dynamic Loading**: Loads item definitions from the registry
- **Fallback Mechanism**: Falls back to legacy methods if loading fails
- **Asset Management**: Handles preloading of item assets

### Usage

```javascript
// Create an item system in a Phaser scene
this.itemSystem = new ItemSystem(this);

// Preload item assets
this.itemSystem.preloadAssets();

// Get an item by ID
const item = this.itemSystem.getItem('sword');

// Create a new instance of an item
const newItem = this.itemSystem.createItem('sword');
```

## Inventory Manager

The Inventory Manager provides a high-level interface for managing the player's inventory. It handles adding, removing, and moving items, as well as saving and loading the inventory.

### Key Features

- **Item Registry Integration**: Uses the item registry to create items
- **UI Integration**: Updates the UI when the inventory changes
- **Persistence**: Methods for saving and loading the inventory
- **Convenience Methods**: Easy-to-use methods for common operations

### Usage

```javascript
// Create an inventory manager in a Phaser scene
this.inventoryManager = new InventoryManager(this, this.itemSystem, {
    maxSlots: 30,
    maxWeight: 100
});

// Add an item to the inventory
this.inventoryManager.addItem('sword', 1);

// Remove an item from the inventory
this.inventoryManager.removeItemById('sword', 1);

// Check if the player has an item
const hasSword = this.inventoryManager.hasItem('sword');

// Save the inventory
this.inventoryManager.saveInventory('player_inventory');

// Load the inventory
this.inventoryManager.loadInventory('player_inventory');
```

## Inventory

The Inventory class is the core data structure that stores items. It provides methods for adding, removing, and moving items, as well as querying the inventory.

### Key Features

- **Weight System**: Tracks the weight of items and enforces a weight limit
- **Slot System**: Organizes items into slots
- **Stacking**: Automatically stacks stackable items
- **Querying**: Methods for finding items by type or ID

### Usage

```typescript
// Create a new inventory
const inventory = new Inventory(30, 100);

// Add an item to the inventory
inventory.addItem(item, 1);

// Remove an item from the inventory
inventory.removeItem(0, 1);

// Move an item from one slot to another
inventory.moveItem(0, 1, 1);

// Get all items in the inventory
const items = inventory.getAllItems();

// Get the total weight of the inventory
const weight = inventory.getTotalWeight();
```

## Inventory UI

The Inventory UI provides a user interface for displaying and interacting with the inventory. It includes features like item tooltips, searching, and filtering.

### Key Features

- **Responsive Design**: Adjusts to different screen sizes
- **Item Tooltips**: Shows detailed information about items
- **Search and Filter**: Allows searching and filtering items
- **Drag and Drop**: Supports drag and drop for moving items
- **Customizable**: Many options for customizing the UI

### Usage

```javascript
// Create an inventory UI in a Phaser scene
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

// Show the inventory UI
this.inventoryUI.show();

// Hide the inventory UI
this.inventoryUI.hide();

// Refresh the inventory UI
this.inventoryUI.refreshInventory();
```

## Adding New Items

To add a new item to the game:

1. Create a new item definition in the appropriate file in the `definitions` directory
2. Register the item definition in the registry
3. Add the item to the player's inventory using the inventory manager

### Example: Adding a New Weapon

```typescript
// In src/items/definitions/weapons/index.ts
import { ItemType, WeaponType, ItemRarity } from '../../item';
import { WeaponDefinition } from '../item-registry';

// Define a new weapon
const myWeapon: WeaponDefinition = {
    id: 'my_weapon',
    name: 'My Weapon',
    description: 'A powerful new weapon',
    imagePath: '/weapons/my-weapon.png',
    type: ItemType.WEAPON,
    weaponType: WeaponType.SWORD,
    rarity: ItemRarity.RARE,
    weight: 3.0,
    value: 50,
    level: 5,
    stackable: false,
    maxStackSize: 1,
    usable: false,
    durability: 50,
    maxDurability: 50,
    damage: 20,
    attributes: {
        normal: true,
        critChance: 0.1,
        critDamage: 2.0
    }
};

// Add to the weapon definitions
export const weaponDefinitions: WeaponDefinition[] = [
    // ... existing weapons
    myWeapon
];
```

## Example Usage

See the `src/examples/inventory-example.js` file for a complete example of how to use the inventory system in a Phaser scene.

## Best Practices

1. **Use the Item Registry**: Always define items in the registry rather than creating them directly
2. **Organize by Type**: Keep item definitions organized by type in the appropriate directories
3. **Use the Inventory Manager**: Use the inventory manager for all inventory operations
4. **Update the UI**: Always refresh the UI after making changes to the inventory
5. **Handle Errors**: Check return values and handle errors appropriately
6. **Save Regularly**: Save the inventory regularly to prevent data loss 