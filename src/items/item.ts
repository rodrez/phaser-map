import type { Scene } from 'phaser';
import { ItemAssetManager } from './item-asset-manager';
import { logger, LogCategory } from '../utils/Logger';
import { 
    ItemType, 
    ItemRarity, 
    FruitType, 
    WeaponType, 
    ArmorType, 
    ItemAttributes, 
    CraftingRequirement 
} from './item-types';

// Base item interface
export interface IItem {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    type: ItemType;
    rarity: ItemRarity;
    weight: number;
    value: number; // Gold value when sold
    level?: number;
    stackable: boolean;
    maxStackSize: number;
    usable: boolean;
    attributes?: ItemAttributes;
    craftingRequirements?: CraftingRequirement[];
    durability?: number;
    maxDurability?: number;
    uses?: number;
    maxUses?: number;
}

// Base Item class that implements the IItem interface
export class BaseItem implements IItem {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    type: ItemType;
    rarity: ItemRarity;
    weight: number;
    value: number;
    level?: number;
    stackable: boolean;
    maxStackSize: number;
    usable: boolean;
    attributes?: ItemAttributes;
    craftingRequirements?: CraftingRequirement[];
    durability?: number;
    maxDurability?: number;
    uses?: number;
    maxUses?: number;
    
    // Static reference to the asset manager
    private static assetManager: ItemAssetManager | null = null;
    
    constructor(itemData: IItem) {
        this.id = itemData.id;
        this.name = itemData.name;
        this.description = itemData.description;
        this.iconUrl = this.getIconUrl(itemData.id, itemData.iconUrl);
        this.type = itemData.type;
        this.rarity = itemData.rarity;
        this.weight = itemData.weight;
        this.value = itemData.value;
        this.level = itemData.level;
        this.stackable = itemData.stackable;
        this.maxStackSize = itemData.maxStackSize;
        this.usable = itemData.usable;
        this.attributes = itemData.attributes;
        this.craftingRequirements = itemData.craftingRequirements;
        this.durability = itemData.durability;
        this.maxDurability = itemData.maxDurability;
        this.uses = itemData.uses;
        this.maxUses = itemData.maxUses;
    }
    
    /**
     * Set the asset manager for all items
     * @param assetManager The asset manager to use
     */
    static setAssetManager(assetManager: ItemAssetManager): void {
        BaseItem.assetManager = assetManager;
    }
    
    /**
     * Get the asset manager
     * @returns The asset manager
     */
    static getAssetManager(): ItemAssetManager | null {
        return BaseItem.assetManager;
    }
    
    /**
     * Get the icon URL for an item
     * @param id The item ID
     * @param fallbackUrl The fallback URL to use if no asset manager is available
     * @returns The icon URL
     */
    private getIconUrl(id: string, fallbackUrl: string): string {
        // If we have a direct URL already (starts with / or http), use it
        if (fallbackUrl && (fallbackUrl.startsWith('/') || fallbackUrl.startsWith('http'))) {
            return fallbackUrl;
        }
        
        // If we have an asset manager, get the URL from it
        if (BaseItem.assetManager) {
            return BaseItem.assetManager.getTextureUrl(id);
        }
        
        // If all else fails, construct a simple path
        if (fallbackUrl) {
            return `assets/items/${fallbackUrl}`;
        }
        
        // Last resort default
        return 'assets/items/default.png';
    }
    
    /**
     * Update the icon URL using the asset manager
     */
    updateIconUrl(): void {
        if (BaseItem.assetManager) {
            this.iconUrl = BaseItem.assetManager.getTextureUrl(this.id);
        }
    }
    
    // Common methods
    use(): boolean {
        if (!this.usable) return false;
        
        if (this.uses !== undefined && this.maxUses !== undefined) {
            if (this.uses <= 0) return false;
            this.uses--;
        }
        
        return true;
    }
    
    applyDamage(amount: number): boolean {
        if (this.durability === undefined || this.maxDurability === undefined) return false;
        
        this.durability = Math.max(0, this.durability - amount);
        return this.durability > 0;
    }
    
    repair(amount: number): boolean {
        if (this.durability === undefined || this.maxDurability === undefined) return false;
        
        this.durability = Math.min(this.maxDurability, this.durability + amount);
        return true;
    }
    
    isBroken(): boolean {
        if (this.durability === undefined) return false;
        return this.durability <= 0;
    }
    
    getRepairCost(): number {
        if (this.durability === undefined || this.maxDurability === undefined) return 0;
        
        const missingDurability = this.maxDurability - this.durability;
        return Math.ceil((missingDurability / this.maxDurability) * this.value * 0.5);
    }
    
    getConditionPercentage(): number {
        if (this.durability === undefined || this.maxDurability === undefined) return 100;
        return Math.floor((this.durability / this.maxDurability) * 100);
    }
    
    // Get a color representation of the item's condition
    getConditionColor(): string {
        const percentage = this.getConditionPercentage();
        
        if (percentage > 75) return '#00FF00'; // Green
        if (percentage > 50) return '#FFFF00'; // Yellow
        if (percentage > 25) return '#FFA500'; // Orange
        return '#FF0000'; // Red
    }
    
    // Get a color representation of the item's rarity
    getRarityColor(): string {
        switch (this.rarity) {
            case ItemRarity.COMMON: return '#FFFFFF'; // White
            case ItemRarity.UNCOMMON: return '#00FF00'; // Green
            case ItemRarity.RARE: return '#0070DD'; // Blue
            case ItemRarity.EPIC: return '#A335EE'; // Purple
            case ItemRarity.LEGENDARY: return '#FF8000'; // Orange
            default: return '#FFFFFF';
        }
    }
    
    // Get a formatted string with the item name colored by rarity
    getFormattedName(): string {
        return `<span style="color: ${this.getRarityColor()}">${this.name}</span>`;
    }
    
    // Clone this item
    clone(): BaseItem {
        return new BaseItem({...this});
    }
}

// Specialized class for Weapon items
export class WeaponItem extends BaseItem {
    weaponType: WeaponType;
    
    constructor(itemData: IItem & { weaponType: WeaponType }) {
        super(itemData);
        this.weaponType = itemData.weaponType;
        this.type = ItemType.WEAPON;
    }
    
    getAttackDamage(): number {
        if (!this.attributes || this.attributes.damage === undefined) return 0;
        
        // Factor in condition - weapons at lower durability do less damage
        if (this.durability !== undefined && this.maxDurability !== undefined) {
            const conditionFactor = Math.max(0.5, this.durability / this.maxDurability);
            return Math.floor(this.attributes.damage * conditionFactor);
        }
        
        return this.attributes.damage;
    }
}

// Specialized class for Armor items
export class ArmorItem extends BaseItem {
    armorType: ArmorType;
    
    constructor(itemData: IItem & { armorType: ArmorType }) {
        super(itemData);
        this.armorType = itemData.armorType;
        this.type = ItemType.ARMOR;
    }
    
    getDefenseValue(): number {
        if (!this.attributes || this.attributes.defense === undefined) return 0;
        
        // Factor in condition - armor at lower durability provides less defense
        if (this.durability !== undefined && this.maxDurability !== undefined) {
            const conditionFactor = Math.max(0.5, this.durability / this.maxDurability);
            return Math.floor(this.attributes.defense * conditionFactor);
        }
        
        return this.attributes.defense;
    }
}

// Specialized class for Ring items
export class RingItem extends BaseItem {
    constructor(itemData: IItem) {
        super(itemData);
        this.type = ItemType.RING;
    }
    
    // Get the attack bonus provided by the ring
    getAttackBonus(): number {
        if (!this.attributes || this.attributes.damage === undefined) return 0;
        return this.attributes.damage;
    }
    
    // Get the defense bonus provided by the ring
    getDefenseBonus(): number {
        if (!this.attributes || this.attributes.defense === undefined) return 0;
        return this.attributes.defense;
    }
}

// Specialized class for Consumable items
export class ConsumableItem extends BaseItem {
    // Effects that happen when the item is consumed
    healthRestore?: number;
    manaRestore?: number;
    tempAttributes?: ItemAttributes;
    effectDuration?: number; // In milliseconds
    
    constructor(itemData: IItem & {
        healthRestore?: number,
        manaRestore?: number,
        tempAttributes?: ItemAttributes,
        effectDuration?: number
    }) {
        super(itemData);
        this.type = ItemType.CONSUMABLE;
        this.healthRestore = itemData.healthRestore;
        this.manaRestore = itemData.manaRestore;
        this.tempAttributes = itemData.tempAttributes;
        this.effectDuration = itemData.effectDuration;
    }
    
    override use(): boolean {
        // Use the base implementation first to decrement uses if applicable
        if (!super.use()) return false;
        
        // Consumable-specific logic would be implemented by the consumer of this class
        // For example, the player system would apply healing, etc.
        
        return true;
    }
}

// Item stack class for inventory management
export class ItemStack {
    item: BaseItem;
    quantity: number;
    
    constructor(item: BaseItem, quantity: number = 1) {
        this.item = item;
        this.quantity = Math.min(quantity, item.maxStackSize);
    }
    
    // Add items to the stack, respecting the max stack size
    add(count: number): number {
        const spaceAvailable = this.item.maxStackSize - this.quantity;
        const amountToAdd = Math.min(count, spaceAvailable);
        
        this.quantity += amountToAdd;
        return count - amountToAdd; // Return the remaining amount that couldn't be added
    }
    
    // Remove items from the stack
    remove(count: number): number {
        const amountToRemove = Math.min(count, this.quantity);
        this.quantity -= amountToRemove;
        return amountToRemove;
    }
    
    // Check if the stack can accept more of this item
    canAddMore(): boolean {
        return this.quantity < this.item.maxStackSize;
    }
    
    // Get the space available in this stack
    getAvailableSpace(): number {
        return this.item.maxStackSize - this.quantity;
    }
    
    // Check if the stack is empty
    isEmpty(): boolean {
        return this.quantity <= 0;
    }
    
    // Check if another item can stack with this one
    canStackWith(otherItem: BaseItem): boolean {
        if (!this.item.stackable || !otherItem.stackable) return false;
        return this.item.id === otherItem.id;
    }
    
    // Split this stack into two stacks
    split(amount: number): ItemStack | null {
        if (amount <= 0 || amount >= this.quantity) return null;
        
        const newStack = new ItemStack(this.item.clone(), amount);
        this.quantity -= amount;
        return newStack;
    }
    
    // Get the total weight of this stack
    getTotalWeight(): number {
        return this.item.weight * this.quantity;
    }
    
    // Get the total value of this stack
    getTotalValue(): number {
        return this.item.value * this.quantity;
    }
}

// Item System class to manage items
export class ItemSystem {
    private scene: Scene;
    private itemDatabase: Map<string, BaseItem> = new Map();
    private assetManager: ItemAssetManager;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create the asset manager
        this.assetManager = new ItemAssetManager(scene);
        
        // Set the asset manager for all items
        BaseItem.setAssetManager(this.assetManager);
        
        // Initialize the item database
        this.initializeItems();
        
        // Log that the item system is initialized
        logger.info(LogCategory.ITEMS, 'ItemSystem initialized with asset manager');
    }
    
    /**
     * Preload all item assets
     */
    preloadAssets(): void {
        logger.info(LogCategory.ITEMS, 'Preloading item assets...');
        this.assetManager.preloadAssets();
        logger.info(LogCategory.ITEMS, 'Item assets preloaded');
    }
    
    /**
     * Get the asset manager
     * @returns The asset manager
     */
    getAssetManager(): ItemAssetManager {
        return this.assetManager;
    }
    
    private initializeItems(): void {
        try {
            // Import the item registry dynamically to avoid circular dependencies
            import('./definitions').then(({ ItemRegistry, initializeItemDefinitions }) => {
                // Initialize all item definitions
                initializeItemDefinitions();
                
                // Get the registry instance
                const registry = ItemRegistry.getInstance();
                
                // Get all definitions and create items
                const definitions = registry.getAllDefinitions();
                
                // Register all items in the database
                definitions.forEach(definition => {
                    const item = registry.createItemFromDefinition(definition);
                    this.registerItem(item);
                });
                
                logger.info(LogCategory.ITEMS, `Loaded ${definitions.length} items from registry`);
            }).catch(error => {
                logger.error(LogCategory.ITEMS, `Failed to load item definitions: ${error.message}`);
                // Fall back to legacy item initialization if loading fails
                this.initializeLegacyItems();
            });
        } catch (error) {
            logger.error(LogCategory.ITEMS, `Error initializing items: ${error.message}`);
            // Fall back to legacy item initialization if loading fails
            this.initializeLegacyItems();
        }
    }
    
    /**
     * Legacy method to initialize items directly
     * This is used as a fallback if loading from the registry fails
     * @deprecated Use the item registry instead
     */
    private initializeLegacyItems(): void {
        logger.warn(LogCategory.ITEMS, 'Using legacy item initialization');
        
        // Register weapons with simplified IDs
        this.registerItem(new WeaponItem({
            id: 'sword',
            name: 'Sword',
            description: 'A well-crafted sword. Sharp and reliable.',
            iconUrl: '/weapons/sword-48.png',
            type: ItemType.WEAPON,
            rarity: ItemRarity.UNCOMMON,
            weight: 2.5,
            value: 25,
            level: 3,
            stackable: false,
            maxStackSize: 1,
            usable: false,
            durability: 40,
            maxDurability: 40,
            weaponType: WeaponType.SWORD,
            attributes: {
                damage: 12,
                normal: true
            }
        }));
        
        // Add more legacy items here...
    }
    
    // Register a new item in the database
    registerItem(item: BaseItem): void {
        this.itemDatabase.set(item.id, item);
    }
    
    // Get an item by ID
    getItem(id: string): BaseItem | undefined {
        return this.itemDatabase.get(id);
    }
    
    // Create a new instance of an item by ID
    createItem(id: string): BaseItem | null {
        const template = this.getItem(id);
        if (!template) return null;
        
        return template.clone();
    }
    
    // Get all items of a specific type
    getItemsByType(type: ItemType): BaseItem[] {
        const items: BaseItem[] = [];
        
        this.itemDatabase.forEach(item => {
            if (item.type === type) {
                items.push(item);
            }
        });
        
        return items;
    }
    
    // Get all items that match a search term
    searchItems(term: string): BaseItem[] {
        const items: BaseItem[] = [];
        const searchTerm = term.toLowerCase();
        
        this.itemDatabase.forEach(item => {
            if (
                item.name.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm)
            ) {
                items.push(item);
            }
        });
        
        return items;
    }
} 