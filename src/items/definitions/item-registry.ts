import { logger, LogCategory } from '../../utils/Logger';
import { 
    BaseItem, 
    WeaponItem, 
    ArmorItem, 
    ConsumableItem,
    RingItem
} from '../item';
import {
    ItemType,
    WeaponType,
    ArmorType,
    ItemRarity
} from '../item-types';

// Base interface for all item definitions
export interface ItemDefinition {
    id: string;
    name: string;
    description: string;
    imagePath: string;  // Path to the image asset
    type: ItemType;
    rarity: ItemRarity;
    weight: number;
    value: number;
    level?: number;
    stackable: boolean;
    maxStackSize: number;
    usable: boolean;
    durability?: number;
    maxDurability?: number;
    uses?: number;
    maxUses?: number;
    attributes?: Record<string, any>;
}

// Weapon-specific definition
export interface WeaponDefinition extends ItemDefinition {
    type: ItemType.WEAPON;
    weaponType: WeaponType;
    damage: number;
    // Add other weapon-specific properties here
}

// Armor-specific definition
export interface ArmorDefinition extends ItemDefinition {
    type: ItemType.ARMOR;
    armorType: ArmorType;
    defense: number;
    // Add other armor-specific properties here
}

// Consumable-specific definition
export interface ConsumableDefinition extends ItemDefinition {
    type: ItemType.CONSUMABLE;
    healthRestore?: number;
    manaRestore?: number;
    effectDuration?: number;
    // Add other consumable-specific properties here
}

// Resource-specific definition
export interface ResourceDefinition extends ItemDefinition {
    type: ItemType.RESOURCE;
    // Add resource-specific properties here
}

// Ring-specific definition
export interface RingDefinition extends ItemDefinition {
    type: ItemType.RING;
    // Add ring-specific properties here
}

// Central registry for all item definitions
export class ItemRegistry {
    private static instance: ItemRegistry;
    private definitions: Map<string, ItemDefinition> = new Map();
    
    private constructor() {
        // Private constructor for singleton pattern
    }
    
    // Get the singleton instance
    public static getInstance(): ItemRegistry {
        if (!ItemRegistry.instance) {
            ItemRegistry.instance = new ItemRegistry();
        }
        return ItemRegistry.instance;
    }
    
    // Register a single item definition
    public registerDefinition(definition: ItemDefinition): void {
        if (this.definitions.has(definition.id)) {
            logger.warn(LogCategory.ITEMS, `Item definition with ID ${definition.id} already exists. Overwriting.`);
        }
        this.definitions.set(definition.id, definition);
        logger.debug(LogCategory.ITEMS, `Registered item definition: ${definition.id}`);
    }
    
    // Register multiple item definitions
    public registerDefinitions(definitions: ItemDefinition[]): void {
        definitions.forEach(def => this.registerDefinition(def));
    }
    
    // Get a definition by ID
    public getDefinition(id: string): ItemDefinition | undefined {
        return this.definitions.get(id);
    }
    
    // Get all definitions
    public getAllDefinitions(): ItemDefinition[] {
        return Array.from(this.definitions.values());
    }
    
    // Get definitions by type
    public getDefinitionsByType(type: ItemType): ItemDefinition[] {
        return this.getAllDefinitions().filter(def => def.type === type);
    }
    
    // Create a BaseItem instance from a definition
    public createItemFromDefinition(definition: ItemDefinition): BaseItem {
        switch (definition.type) {
            case ItemType.WEAPON:
                return this.createWeaponFromDefinition(definition as WeaponDefinition);
            case ItemType.ARMOR:
                return this.createArmorFromDefinition(definition as ArmorDefinition);
            case ItemType.RING:
                return this.createRingFromDefinition(definition as RingDefinition);
            case ItemType.CONSUMABLE:
                return this.createConsumableFromDefinition(definition as ConsumableDefinition);
            default:
                // For resources and other basic items
                return new BaseItem({
                    id: definition.id,
                    name: definition.name,
                    description: definition.description,
                    iconUrl: definition.imagePath,
                    type: definition.type,
                    rarity: definition.rarity,
                    weight: definition.weight,
                    value: definition.value,
                    level: definition.level,
                    stackable: definition.stackable,
                    maxStackSize: definition.maxStackSize,
                    usable: definition.usable,
                    durability: definition.durability,
                    maxDurability: definition.maxDurability,
                    uses: definition.uses,
                    maxUses: definition.maxUses,
                    attributes: definition.attributes
                });
        }
    }
    
    private createWeaponFromDefinition(definition: WeaponDefinition): WeaponItem {
        return new WeaponItem({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            iconUrl: definition.imagePath,
            type: ItemType.WEAPON,
            rarity: definition.rarity,
            weight: definition.weight,
            value: definition.value,
            level: definition.level,
            stackable: definition.stackable,
            maxStackSize: definition.maxStackSize,
            usable: definition.usable,
            durability: definition.durability,
            maxDurability: definition.maxDurability,
            weaponType: definition.weaponType,
            attributes: {
                damage: definition.damage,
                ...definition.attributes
            }
        });
    }
    
    private createArmorFromDefinition(definition: ArmorDefinition): ArmorItem {
        return new ArmorItem({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            iconUrl: definition.imagePath,
            type: ItemType.ARMOR,
            rarity: definition.rarity,
            weight: definition.weight,
            value: definition.value,
            level: definition.level,
            stackable: definition.stackable,
            maxStackSize: definition.maxStackSize,
            usable: definition.usable,
            durability: definition.durability,
            maxDurability: definition.maxDurability,
            armorType: definition.armorType,
            attributes: {
                defense: definition.defense,
                ...definition.attributes
            }
        });
    }
    
    private createConsumableFromDefinition(definition: ConsumableDefinition): ConsumableItem {
        return new ConsumableItem({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            iconUrl: definition.imagePath,
            type: ItemType.CONSUMABLE,
            rarity: definition.rarity,
            weight: definition.weight,
            value: definition.value,
            stackable: definition.stackable,
            maxStackSize: definition.maxStackSize,
            usable: definition.usable,
            uses: definition.uses,
            maxUses: definition.maxUses,
            healthRestore: definition.healthRestore,
            manaRestore: definition.manaRestore,
            effectDuration: definition.effectDuration,
            tempAttributes: definition.attributes
        });
    }
    
    private createRingFromDefinition(definition: RingDefinition): RingItem {
        return new RingItem({
            id: definition.id,
            name: definition.name,
            description: definition.description,
            iconUrl: definition.imagePath,
            type: ItemType.RING,
            rarity: definition.rarity,
            weight: definition.weight,
            value: definition.value,
            level: definition.level,
            stackable: definition.stackable,
            maxStackSize: definition.maxStackSize,
            usable: definition.usable,
            durability: definition.durability,
            maxDurability: definition.maxDurability,
            uses: definition.uses,
            maxUses: definition.maxUses,
            attributes: definition.attributes
        });
    }
} 