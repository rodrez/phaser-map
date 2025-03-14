import { ItemType, ArmorType, ItemRarity } from '../../item';
import { ArmorDefinition } from '../item-registry';

// Define all armor pieces
export const armorDefinitions: ArmorDefinition[] = [
    // Leather Chest
    {
        id: 'armor_leather_chest',
        name: 'Leather Chest',
        description: 'A basic leather chest piece. Offers minimal protection.',
        imagePath: '/items/leather_chest.png',
        type: ItemType.ARMOR,
        armorType: ArmorType.CHEST,
        rarity: ItemRarity.COMMON,
        weight: 3.0,
        value: 8,
        level: 1,
        stackable: false,
        maxStackSize: 1,
        usable: true,
        durability: 30,
        maxDurability: 30,
        defense: 5
    }
]; 