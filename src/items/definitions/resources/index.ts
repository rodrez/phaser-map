import { ItemType, ItemRarity } from '../../item-types';
import { ResourceDefinition } from '../item-registry';

// Define all resources
export const resourceDefinitions: ResourceDefinition[] = [
    // Wood
    {
        id: 'wood',
        name: 'Wood',
        description: 'A piece of wood gathered from trees. Used for crafting and building.',
        imagePath: '/items/wood.png',
        type: ItemType.RESOURCE,
        rarity: ItemRarity.COMMON,
        weight: 0.5,
        value: 1,
        stackable: true,
        maxStackSize: 50,
        usable: false
    },
    
    // Leather
    {
        id: 'leather',
        name: 'Leather',
        description: 'Tanned animal hide. Used for crafting armor and other items.',
        imagePath: '/items/leather.png',
        type: ItemType.RESOURCE,
        rarity: ItemRarity.COMMON,
        weight: 0.5,
        value: 5,
        stackable: true,
        maxStackSize: 20,
        usable: false
    }
]; 