import { ItemType, WeaponType, ItemRarity } from '../../item';
import { WeaponDefinition } from '../item-registry';

// Define metal weapons with special attributes based on the Metal_Attributes_Table.csv
export const metalWeaponDefinitions: WeaponDefinition[] = [
    // Mercurium Sword - Steals 20% of target's movement speed
    {
        id: 'mercurium_sword',
        name: 'Mercurium Sword',
        description: 'A sword forged from rare Mercurium. Steals 20% of target\'s movement speed for a duration.',
        imagePath: '/weapons/mercurium-sword-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.SWORD,
        rarity: ItemRarity.RARE,
        weight: 2.8,
        value: 75,
        level: 10,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 50,
        maxDurability: 50,
        damage: 18,
        attributes: {
            normal: true,
            metalType: 'Mercurium',
            debuff: 'movement_speed',
            debuffAmount: 0.2,
            debuffDuration: 30 // seconds
        }
    },
    
    // Thornite Axe - Target takes additional damage upon attacking you
    {
        id: 'thornite_axe',
        name: 'Thornite Battle Axe',
        description: 'A battle axe infused with Thornite. Target takes additional damage upon attacking you.',
        imagePath: '/weapons/thornite-axe-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.AXE,
        rarity: ItemRarity.RARE,
        weight: 5.2,
        value: 85,
        level: 12,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 45,
        maxDurability: 45,
        damage: 22,
        attributes: {
            normal: true,
            metalType: 'Thornite',
            debuff: 'reflect_damage',
            debuffAmount: 5, // flat damage
            debuffDuration: 45 // seconds
        }
    },
    
    // Infernium Crossbow - Deals damage over time and spreads to nearby targets
    {
        id: 'infernium_crossbow',
        name: 'Infernium Crossbow',
        description: 'A crossbow crafted with Infernium. Deals damage over time and spreads to nearby targets.',
        imagePath: '/weapons/infernium-crossbow-48.png',
        type: ItemType.WEAPON,
        weaponType: WeaponType.CROSSBOW,
        rarity: ItemRarity.EPIC,
        weight: 3.5,
        value: 120,
        level: 15,
        stackable: false,
        maxStackSize: 1,
        usable: false,
        durability: 35,
        maxDurability: 35,
        damage: 16,
        attributes: {
            normal: true,
            metalType: 'Infernium',
            debuff: 'damage_over_time',
            debuffAmount: 3, // damage per tick
            debuffTick: 3, // seconds between ticks
            debuffDuration: 30, // seconds
            spreadRadius: 250 // distance in meters to spread effect
        }
    }
];

// Export the metal weapon definitions
export default metalWeaponDefinitions; 