import { ItemType, ItemRarity } from '../../item-types';
import { ConsumableDefinition } from '../item-registry';

// Define all consumables
export const consumableDefinitions: ConsumableDefinition[] = [
    // Apple
    {
        id: 'food_apple',
        name: 'Apple',
        description: 'A fresh, juicy apple. Restores a small amount of health.',
        imagePath: '/items/apple.png',
        type: ItemType.CONSUMABLE,
        rarity: ItemRarity.COMMON,
        weight: 0.2,
        value: 2,
        stackable: true,
        maxStackSize: 10,
        usable: true,
        healthRestore: 5
    },
    
    // Minor Healing Potion
    {
        id: 'consumable_minor_healing_potion',
        name: 'Minor Healing Potion',
        description: 'A small potion that restores a little health.',
        imagePath: '/items/minor_healing_potion.png',
        type: ItemType.CONSUMABLE,
        rarity: ItemRarity.COMMON,
        weight: 0.2,
        value: 5,
        stackable: true,
        maxStackSize: 20,
        usable: true,
        uses: 1,
        maxUses: 1,
        healthRestore: 20
    }
]; 