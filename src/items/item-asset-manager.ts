import type { Scene } from 'phaser';
import { logger, LogCategory } from '../utils/Logger';
import { ItemType, FruitType } from './item-types';

/**
 * Interface for item asset mapping
 */
interface ItemAssetMapping {
    id: string;
    key: string;
    path: string;
    frameWidth?: number;
    frameHeight?: number;
    type?: ItemType;
    subType?: string;
}

/**
 * ItemAssetManager - Manages the mapping and preloading of item assets
 */
export class ItemAssetManager {
    private scene: Scene;
    private assetMappings: Map<string, ItemAssetMapping> = new Map();
    private defaultMapping: ItemAssetMapping;
    private isLoaded: boolean = false;
    private baseAssetPath: string = 'assets';
    
    /**
     * Create a new item asset manager
     * @param scene The Phaser scene
     */
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Set up default mapping for missing assets
        this.defaultMapping = {
            id: 'default',
            key: 'default-item',
            path: '/items/default.png'
        };
        
        // Register default mapping
        this.registerAsset(this.defaultMapping);
        
        // Register built-in assets
        this.registerBuiltInAssets();
        
        logger.info(LogCategory.ASSETS, 'ItemAssetManager initialized');
    }
    
    /**
     * Register built-in item assets
     */
    private registerBuiltInAssets(): void {
        try {
            // Try to load from item registry
            import('./definitions').then(({ ItemRegistry, initializeItemDefinitions }) => {
                // Initialize all item definitions
                initializeItemDefinitions();
                
                // Get the registry instance
                const registry = ItemRegistry.getInstance();
                
                // Get all definitions and register their assets
                const definitions = registry.getAllDefinitions();
                
                // Register assets for all definitions
                definitions.forEach(definition => {
                    this.registerAsset({
                        id: definition.id,
                        key: `item-${definition.id}`,
                        path: definition.imagePath,
                        type: definition.type
                    });
                });
                
                logger.info(LogCategory.ASSETS, `Registered assets for ${definitions.length} items from registry`);
            }).catch(error => {
                logger.error(LogCategory.ASSETS, `Failed to load item definitions for assets: ${error.message}`);
                // Fall back to legacy asset registration if loading fails
                this.registerLegacyAssets();
            });
        } catch (error: any) {
            logger.error(LogCategory.ASSETS, `Error registering item assets: ${error.message}`);
            // Fall back to legacy asset registration if loading fails
            this.registerLegacyAssets();
        }
    }
    
    /**
     * Legacy method to register assets directly
     * This is used as a fallback if loading from the registry fails
     * @deprecated Use the item registry instead
     */
    private registerLegacyAssets(): void {
        logger.warn(LogCategory.ASSETS, 'Using legacy asset registration');
        
        // Register basic resource items
        this.registerAsset({
            id: 'food_apple',
            key: 'item-apple',
            path: '/items/apple.png',
            type: ItemType.CONSUMABLE,
            subType: FruitType.APPLE
        });
        
        this.registerAsset({
            id: 'leather',
            key: 'item-leather',
            path: '/items/leather.png',
            type: ItemType.RESOURCE
        });
        
        this.registerAsset({
            id: 'wood',
            key: 'item-wood',
            path: '/items/wood.png',
            type: ItemType.RESOURCE
        });
        
        // Register weapon items with simplified IDs
        this.registerAsset({
            id: 'sword',
            key: 'item-sword',
            path: '/weapons/sword-48.png',
            type: ItemType.WEAPON
        });
        
        this.registerAsset({
            id: 'crossbow',
            key: 'item-crossbow',
            path: '/weapons/crossbow-48.png',
            type: ItemType.WEAPON
        });
        
        this.registerAsset({
            id: 'axe',
            key: 'item-axe',
            path: '/weapons/axe-48.png',
            type: ItemType.WEAPON
        });
        
        // Add staff weapon
        this.registerAsset({
            id: 'staff',
            key: 'item-staff',
            path: '/weapons/staff-48.png',
            type: ItemType.WEAPON
        });
    }
    
    /**
     * Register an asset mapping
     * @param mapping The asset mapping to register
     */
    registerAsset(mapping: ItemAssetMapping): void {
        this.assetMappings.set(mapping.id, mapping);
        logger.debug(LogCategory.ASSETS, `Registered asset mapping for item: ${mapping.id}`);
    }
    
    /**
     * Register multiple asset mappings
     * @param mappings Array of asset mappings to register
     */
    registerAssets(mappings: ItemAssetMapping[]): void {
        mappings.forEach(mapping => this.registerAsset(mapping));
    }
    
    /**
     * Preload all registered assets
     */
    preloadAssets(): void {
        if (this.isLoaded) {
            logger.warn(LogCategory.ASSETS, 'Assets already loaded, skipping preload');
            return;
        }
        
        logger.info(LogCategory.ASSETS, 'Preloading item assets...');
        
        this.assetMappings.forEach(mapping => {
            const fullPath = `${this.baseAssetPath}${mapping.path}`;
            
            if (mapping.frameWidth && mapping.frameHeight) {
                // Load as spritesheet if frame dimensions are provided
                this.scene.load.spritesheet(
                    mapping.key,
                    fullPath,
                    { frameWidth: mapping.frameWidth, frameHeight: mapping.frameHeight }
                );
                logger.debug(LogCategory.ASSETS, `Loading spritesheet: ${mapping.key} from ${fullPath}`);
            } else {
                // Load as image
                this.scene.load.image(mapping.key, fullPath);
                logger.debug(LogCategory.ASSETS, `Loading image: ${mapping.key} from ${fullPath}`);
            }
        });
        
        this.isLoaded = true;
    }
    
    /**
     * Get the asset key for an item
     * @param itemId The item ID
     * @returns The asset key for the item
     */
    getAssetKey(itemId: string): string {
        const mapping = this.assetMappings.get(itemId);
        
        if (!mapping) {
            logger.warn(LogCategory.ASSETS, `No asset mapping found for item: ${itemId}, using default`);
            return this.defaultMapping.key;
        }
        
        return mapping.key;
    }
    
    /**
     * Get the asset mapping for an item
     * @param itemId The item ID
     * @returns The asset mapping for the item
     */
    getAssetMapping(itemId: string): ItemAssetMapping {
        const mapping = this.assetMappings.get(itemId);
        
        if (!mapping) {
            logger.warn(LogCategory.ASSETS, `No asset mapping found for item: ${itemId}, using default`);
            return this.defaultMapping;
        }
        
        return mapping;
    }
    
    /**
     * Get all asset mappings
     * @returns All asset mappings
     */
    getAllAssetMappings(): ItemAssetMapping[] {
        return Array.from(this.assetMappings.values());
    }
    
    /**
     * Get asset mappings by type
     * @param type The item type
     * @returns Asset mappings for the specified type
     */
    getAssetMappingsByType(type: ItemType): ItemAssetMapping[] {
        return Array.from(this.assetMappings.values())
            .filter(mapping => mapping.type === type);
    }
    
    /**
     * Check if an asset is registered
     * @param itemId The item ID
     * @returns True if the asset is registered
     */
    hasAsset(itemId: string): boolean {
        return this.assetMappings.has(itemId);
    }
    
    /**
     * Get the texture for an item using Phaser's texture system
     * @param itemId The item ID
     * @returns The Phaser texture for the item
     */
    getTexture(itemId: string): Phaser.Textures.Texture | null {
        const key = this.getAssetKey(itemId);
        
        if (!this.scene.textures.exists(key)) {
            logger.warn(LogCategory.ASSETS, `Texture not found for item: ${itemId}, key: ${key}`);
            return this.scene.textures.get(this.defaultMapping.key);
        }
        
        return this.scene.textures.get(key);
    }
    
    /**
     * Create a texture URL for an item (for use in DOM elements)
     * @param itemId The item ID
     * @returns The texture URL for the item
     */
    getTextureUrl(itemId: string): string {
        const mapping = this.assetMappings.get(itemId) || this.defaultMapping;
        
        // Return the full URL path that will work in DOM elements
        // This should match exactly how the assets were loaded in Phaser
        return `assets${mapping.path}`;
    }
    
    /**
     * Get the actual texture object for direct use in Phaser
     * @param itemId The item ID
     * @returns The Phaser texture for the item
     */
    getPhaserTexture(itemId: string): Phaser.Textures.Texture | null {
        const key = this.getAssetKey(itemId);
        
        if (!this.scene.textures.exists(key)) {
            logger.warn(LogCategory.ASSETS, `Texture not found for item: ${itemId}, key: ${key}`);
            return this.scene.textures.get(this.defaultMapping.key);
        }
        
        return this.scene.textures.get(key);
    }
    
    /**
     * Check if assets are loaded
     * @returns True if assets are loaded
     */
    areAssetsLoaded(): boolean {
        return this.isLoaded;
    }
    
    /**
     * Force reload assets
     */
    forceReloadAssets(): void {
        this.isLoaded = false;
        this.preloadAssets();
    }
} 