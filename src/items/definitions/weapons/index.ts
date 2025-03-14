import { ItemType, WeaponType, ItemRarity } from '../../item';
import { WeaponDefinition } from '../item-registry';
import metalWeaponDefinitions from './metal-weapons';

// Define basic weapons
const basicWeaponDefinitions: WeaponDefinition[] = [
    // Sword
    {
        id: 'sword',
        name: 'Sword',
        description: 'A well-crafted sword. Sharp and reliable.',
        imagePath: '/weapons/sword-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.SWORD,
        rarity: ItemRarity.UNCOMMON,
        weight: 2.5,
        value: 25,
        level: 3,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 40,
        maxDurability: 40,
        damage: 12,
        attributes: {
            normal: true
        }
    },
    
    // Battle Axe
    {
        id: 'axe',
        name: 'Battle Axe',
        description: 'A heavy battle axe that can cleave through armor.',
        imagePath: '/weapons/axe-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.AXE,
        rarity: ItemRarity.UNCOMMON,
        weight: 4.5,
        value: 30,
        level: 4,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 35,
        maxDurability: 35,
        damage: 15,
        attributes: {
            normal: true
        }
    },
    
    // Crossbow
    {
        id: 'crossbow',
        name: 'Hunter\'s Crossbow',
        description: 'A precise crossbow favored by hunters. Good range and accuracy.',
        imagePath: '/weapons/crossbow-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.CROSSBOW,
        rarity: ItemRarity.UNCOMMON,
        weight: 3.2,
        value: 35,
        level: 4,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 25,
        maxDurability: 25,
        damage: 14,
        attributes: {
            normal: true
        }
    },
    
    // Staff
    {
        id: 'staff',
        name: 'Combat Staff',
        description: 'A sturdy wooden staff reinforced with metal bands. Effective for both offense and defense.',
        imagePath: '/weapons/staff-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.STAFF,
        rarity: ItemRarity.UNCOMMON,
        weight: 1.8,
        value: 45,
        level: 5,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 30,
        maxDurability: 30,
        damage: 10,
        attributes: {
            normal: true
        }
    }
];

// Combine all weapon definitions
export const weaponDefinitions: WeaponDefinition[] = [
    ...basicWeaponDefinitions,
    ...metalWeaponDefinitions
]; 