/**
 * This file extends the ItemSystem class with additional methods
 * needed for the asset management system.
 */

import { ItemSystem, BaseItem } from './item';

/**
 * Simple implementation of ItemAssetManager for JavaScript compatibility
 */
class ItemAssetManager {
    constructor(scene) {
        this.scene = scene;
        this.assetMappings = new Map();
        this.baseAssetPath = 'assets';
        this.isLoaded = false;
        this.defaultMapping = {
            id: 'default',
            key: 'default-item',
            path: '/items/default.png'
        };
        
        // Register default mapping
        this.registerAsset(this.defaultMapping);
        
        // Try to load from item registry
        try {
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
                        path: definition.imagePath
                    });
                });
                
                console.log(`Registered assets for ${definitions.length} items from registry`);
            }).catch(error => {
                console.error(`Failed to load item definitions for assets: ${error.message}`);
                // Fall back to legacy asset registration if loading fails
                this.registerLegacyAssets();
            });
        } catch (error) {
            console.error(`Error registering item assets: ${error.message}`);
            // Fall back to legacy asset registration if loading fails
            this.registerLegacyAssets();
        }
    }
    
    /**
     * Legacy method to register assets directly
     * This is used as a fallback if loading from the registry fails
     * @deprecated Use the item registry instead
     */
    registerLegacyAssets() {
        console.warn('Using legacy asset registration');
        
        // Register built-in assets
        this.registerAsset({
            id: 'food_apple',
            key: 'item-apple',
            path: '/items/apple.png'
        });
        
        this.registerAsset({
            id: 'leather',
            key: 'item-leather',
            path: '/items/leather.png'
        });
        
        this.registerAsset({
            id: 'wood',
            key: 'item-wood',
            path: '/items/wood.png'
        });
        
        // Register weapon assets with simplified IDs
        this.registerAsset({
            id: 'sword',
            key: 'item-sword',
            path: '/weapons/sword-48.png'
        });
        
        this.registerAsset({
            id: 'crossbow',
            key: 'item-crossbow',
            path: '/weapons/crossbow-48.png'
        });
        
        this.registerAsset({
            id: 'axe',
            key: 'item-axe',
            path: '/weapons/axe-48.png'
        });
        
        // Add staff weapon
        this.registerAsset({
            id: 'staff',
            key: 'item-staff',
            path: '/weapons/staff-48.png'
        });
    }
    
    registerAsset(mapping) {
        this.assetMappings.set(mapping.id, mapping);
    }
    
    getTextureUrl(itemId) {
        const mapping = this.assetMappings.get(itemId) || this.defaultMapping;
        // Return the full URL path that will work in DOM elements
        // This should match exactly how the assets were loaded in Phaser
        return `assets${mapping.path}`;
    }
    
    preloadAssets() {
        if (this.isLoaded) {
            console.log('Assets already loaded, skipping preload');
            return;
        }
        
        console.log('Preloading item assets...');
        
        this.assetMappings.forEach(mapping => {
            const fullPath = `${this.baseAssetPath}${mapping.path}`;
            
            if (mapping.frameWidth && mapping.frameHeight) {
                // Load as spritesheet if frame dimensions are provided
                this.scene.load.spritesheet(
                    mapping.key,
                    fullPath,
                    { frameWidth: mapping.frameWidth, frameHeight: mapping.frameHeight }
                );
                console.log(`Loading spritesheet: ${mapping.key} from ${fullPath}`);
            } else {
                // Load as image
                this.scene.load.image(mapping.key, fullPath);
                console.log(`Loading image: ${mapping.key} from ${fullPath}`);
            }
        });
        
        this.isLoaded = true;
    }
    
    getAssetKey(itemId) {
        const mapping = this.assetMappings.get(itemId) || this.defaultMapping;
        return mapping.key;
    }
    
    getTexture(itemId) {
        const key = this.getAssetKey(itemId);
        
        if (!this.scene.textures.exists(key)) {
            console.warn(`Texture not found for item: ${itemId}, key: ${key}`);
            return this.scene.textures.get(this.defaultMapping.key);
        }
        
        return this.scene.textures.get(key);
    }
    
    /**
     * Check if assets are loaded
     * @returns {boolean} True if assets are loaded
     */
    areAssetsLoaded() {
        return this.isLoaded;
    }
    
    /**
     * Force reload assets
     */
    forceReloadAssets() {
        this.isLoaded = false;
        this.preloadAssets();
    }
    
    /**
     * Get the actual texture object for direct use in Phaser
     * @param {string} itemId The item ID
     * @returns {Phaser.Textures.Texture} The Phaser texture for the item
     */
    getPhaserTexture(itemId) {
        return this.getTexture(itemId);
    }
}

// Add getAssetManager method to ItemSystem prototype
ItemSystem.prototype.getAssetManager = function() {
    // Create asset manager if it doesn't exist
    if (!this.assetManager) {
        this.assetManager = new ItemAssetManager(this.scene);
    }
    return this.assetManager;
};

// Add updateIconUrl method to BaseItem prototype
BaseItem.prototype.updateIconUrl = function() {
    const assetManager = BaseItem.assetManager || 
        (ItemSystem.prototype.getAssetManager && this.getAssetManager && this.getAssetManager());
    if (assetManager) {
        this.iconUrl = assetManager.getTextureUrl(this.id);
    }
};

// Add static setAssetManager method to BaseItem
BaseItem.assetManager = null;
BaseItem.setAssetManager = function(assetManager) {
    BaseItem.assetManager = assetManager;
};

// Export the extended classes
export { ItemSystem, BaseItem, ItemAssetManager }; 