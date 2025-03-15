# Equipment System

This document explains how to use the equipment system in your game.

## Overview

The equipment system allows players to equip weapons, armor, and rings to enhance their stats. The system consists of:

- **EquipmentManager**: Manages equipped items and their stats
- **EquipmentUI**: Provides a UI for equipping and unequipping items
- **EquipmentVisualManager**: Shows equipped items on the player character

## Simplified Equipment Slots

The equipment system has been simplified to include:

- **Weapon**: A single weapon slot
- **Armor**: A single armor slot (instead of separate helmet, chest, boots, etc.)
- **Rings**: Two ring slots (left and right)

## How to Initialize

To initialize the equipment system in your game scene:

```javascript
import { initializeEquipmentSystem, addTestEquipment } from '../test-equipment';

// In your scene's create method:
initializeEquipmentSystem(this);

// Optionally add test equipment:
addTestEquipment(this);
```

## Opening the Equipment Menu

Press the `E` key to open/close the equipment menu.

You can also toggle the equipment menu programmatically:

```javascript
// Show the equipment menu
this.equipmentUI.show();

// Hide the equipment menu
this.equipmentUI.hide();

// Toggle the equipment menu
this.equipmentUI.toggle();
```

## Equipping Items

Items can be equipped from the inventory by:

1. Opening the inventory
2. Right-clicking on an equippable item
3. Selecting "Equip" from the context menu

## Unequipping Items

Items can be unequipped by:

1. Opening the equipment menu (press `E`)
2. Clicking on an equipped item

## Equipment Stats

Equipment provides bonuses to the player's stats:

- **Weapons** provide attack damage
- **Armor** provides defense
- **Rings** can provide both attack and defense bonuses

## Troubleshooting

If the equipment menu doesn't open:

1. Make sure the equipment system is initialized in your scene
2. Check the console for any error messages
3. Verify that the `E` key is not being used by another system
4. Try calling `this.equipmentUI.toggle()` directly to see if it works

## Adding Custom Equipment

To add custom equipment, you need to:

1. Create item definitions in the item registry
2. Make sure they have the correct item type (WEAPON, ARMOR, or RING)
3. Add appropriate attributes (damage for weapons, defense for armor, etc.)

Example:

```javascript
// Add a custom ring
ItemRegistry.getInstance().registerDefinition({
    id: 'ring_of_strength',
    name: 'Ring of Strength',
    description: 'Increases attack damage',
    imagePath: 'ring_strength',
    type: ItemType.RING,
    rarity: ItemRarity.RARE,
    weight: 0.1,
    value: 500,
    stackable: false,
    maxStackSize: 1,
    usable: false,
    attributes: {
        damage: 5
    }
});
``` 