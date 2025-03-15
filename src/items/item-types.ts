// Enum for item types
export enum ItemType {
    WEAPON = 'weapon',
    ARMOR = 'armor',
    RING = 'ring',
    CONSUMABLE = 'consumable',
    RESOURCE = 'resource',
    QUEST = 'quest',
    TOOL = 'tool',
    MISC = 'misc'
}

// Enum for item rarities
export enum ItemRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary',
    MYTHIC = 'mythic'
}

// Enum for fruit types
export enum FruitType {
    APPLE = 'apple',
    ORANGE = 'orange',
    CHERRY = 'cherry',
    BANANA = 'banana',
    PEAR = 'pear'
}

// Enum for weapon types
export enum WeaponType {
    SWORD = 'sword',
    AXE = 'axe',
    BOW = 'bow',
    STAFF = 'staff',
    DAGGER = 'dagger',
    SPEAR = 'spear',
    SHURIKEN = 'shuriken',
    CROSSBOW = 'crossbow',
}

// Enum for armor types
export enum ArmorType {
    HELMET = 'helmet',
    CHEST = 'chest',
    BOOTS = 'boots',
    SHIELD = 'shield'
}

// Interface for item attributes
export interface ItemAttributes {
    // Combat attributes
    damage?: number;
    defense?: number;
    attackSpeed?: number;
    
    // Elemental attributes
    poison?: boolean;
    normal?: boolean;
    fire?: boolean;
    ice?: boolean;
    electric?: boolean;
    holy?: boolean;
    demonic?: boolean;
}

// Interface for crafting requirements
export interface CraftingRequirement {
    itemId: string;
    quantity: number;
} 