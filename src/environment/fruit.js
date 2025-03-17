import { logger, LogCategory } from '../utils/Logger';

/**
 * Simple system to handle fruit placement on trees
 */
export class FruitSystem {
    scene;
    environmentGroup;
    mapManager;
    environment;
    coordinateCache;
    
    constructor(scene, environmentGroup) {
        this.scene = scene;
        this.environmentGroup = environmentGroup;
        this.mapManager = scene.mapManager;
    }
    
    /**
     * Set the environment reference
     * @param {Object} environment - The environment object
     */
    setEnvironment(environment) {
        this.environment = environment;
    }
    
    /**
     * Set the map manager reference
     * @param {MapManager} mapManager - The map manager instance
     */
    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }
    
    /**
     * Set the coordinate cache reference
     * @param {Object} coordinateCache - The coordinate cache
     */
    setCoordinateCache(coordinateCache) {
        this.coordinateCache = coordinateCache;
    }
    
    /**
     * Empty method to maintain compatibility with existing code
     * @param {Object} popupSystem - The popup system (not used in simplified version)
     */
    setPopupSystem(popupSystem) {
        // This method is intentionally empty
        // It exists only for compatibility with code that expects it
        logger.info("setPopupSystem called but ignored in simplified FruitSystem", LogCategory.Environment);
    }
    
    /**
     * Generate fruits around a center point using lat/lng coordinates
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     * @param {number} count - Number of fruits to generate (default: 8)
     */
    generateFruits(centerLat, centerLng, radiusMeters, count = 8) {
        // Log generation attempt
        logger.info(LogCategory.ENVIRONMENT, `Generating ${count} fruits around ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)} with radius ${radiusMeters}m`);
        
        if (!this.mapManager) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot generate fruits: mapManager is not available");
            return;
        }
        
        // Track successful fruit creations
        let fruitsCreated = 0;
        
        // Generate random positions within the circle
        for (let i = 0; i < count; i++) {
            try {
                // Generate random angle and distance
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radiusMeters * 0.8; // 80% of radius to keep away from edges
                
                // Calculate position using MapManager's destinationPoint function
                const position = this.mapManager?.destinationPoint(
                    { lat: centerLat, lng: centerLng }, 
                    angle, 
                    distance
                );
                
                // Select a random frame (0-2) for different fruit types
                const frameNumber = Math.floor(Math.random() * 3);
                
                // Create fruit at this position
                const fruit = this.createFruit(position.lat, position.lng, frameNumber);
                
                if (fruit) {
                    fruitsCreated++;
                }
            } catch (error) {
                logger.error(LogCategory.ENVIRONMENT, `Error generating fruit ${i}: ${error}`);
            }
        }
        
        logger.info(LogCategory.ENVIRONMENT, `Successfully created ${fruitsCreated}/${count} fruits`);
    }
    
    /**
     * Generate fruits on a specific tree
     * @param {Phaser.GameObjects.Sprite} tree - The tree to place fruits on
     * @param {number} count - Number of fruits to generate (default: random 1-3)
     */
    generateFruitsOnTree(tree, count = null) {
        if (!tree) {
            logger.error("Cannot generate fruits: tree is null", LogCategory.Environment);
            return;
        }
        
        if (!this.mapManager) {
            logger.error("Cannot generate fruits: mapManager is not available", LogCategory.Environment);
            return;
        }
        
        // Check if the tree is a spruce tree
        const treeType = tree.getData('treeType');
        const treeTexture = tree.texture ? tree.texture.key : null;
        
        // Only generate fruits on spruce trees
        // Check both the treeType data and texture name for "spruce"
        const isSpruce = 
            (treeType && treeType.toLowerCase?.().includes('spruce')) || 
            (treeTexture && treeTexture.toLowerCase?.().includes('spruce'));
            
        if (!isSpruce) {
            logger.info(`Skipping fruit generation: tree is not a spruce (type: ${treeType}, texture: ${treeTexture})`, LogCategory.Environment);
            return;
        }
        
        // If count is not specified, generate a random number between 1 and 3
        const fruitCount = count === null ? Math.floor(Math.random() * 3) + 1 : count; // Random number: 1, 2, or 3
        
        logger.info(`Generating ${fruitCount} fruits on spruce tree at position: (${tree.x}, ${tree.y})`, LogCategory.Environment);
        
        // Get tree position
        const treeX = tree.x;
        const treeY = tree.y;
        const treeWidth = tree.displayWidth;
        const treeHeight = tree.displayHeight;
        
        // Get tree lat/lng
        const treeLat = tree.getData('lat');
        const treeLng = tree.getData('lng');
        
        if (!treeLat || !treeLng) {
            console.error("Cannot generate fruits: tree has no lat/lng data");
            return;
        }
        
        // Generate fruits in the tree canopy
        for (let i = 0; i < fruitCount; i++) {
            try {
                // Calculate position within the tree canopy in pixels
                const offsetX = (Math.random() - 0.5) * treeWidth * 0.6;
                const offsetY = -treeHeight * (0.3 + Math.random() * 0.4); // Upper part of the tree
                
                // Calculate pixel position for the fruit
                const fruitX = treeX + offsetX;
                const fruitY = treeY + offsetY;
                
                // Convert pixel position to lat/lng
                const fruitLatLng = this.mapManager.pixelToLatLng(fruitX, fruitY);
                
                if (!fruitLatLng) {
                    console.error("Failed to convert fruit position to lat/lng");
                    continue;
                }
                
                // Select a random frame (0-2) for different apple types
                const frameNumber = Math.floor(Math.random() * 3);
                
                // Create fruit at this position
                this.createFruit(fruitLatLng.lat, fruitLatLng.lng, frameNumber, tree);
            } catch (error) {
                console.error("Error generating fruit:", error);
            }
        }
    }
    
    /**
     * Create a fruit at the specified lat/lng position
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} frame - Frame number (0-2) for the fruit sprite
     * @param {Phaser.GameObjects.Sprite} parentTree - Optional parent tree
     * @returns {Phaser.GameObjects.Sprite} - The created fruit sprite
     */
    createFruit(lat, lng, frame = 0, parentTree = null) {
        if (!this.mapManager) {
            console.error("Cannot create fruit: mapManager is not available");
            return null;
        }
        
        // Convert lat/lng to pixel coordinates
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        if (!pixelPos) {
            console.error("Failed to convert lat/lng to pixel coordinates");
            return null;
        }
        
        try {
            // Create fruit sprite using the fruits spritesheet with specific frame (0-2)
            const fruit = this.scene.add.sprite(pixelPos.x, pixelPos.y, 'fruits', frame);
            fruit.setOrigin(0.5, 0.5);
            
            // Fruits are 16x16, so we don't need to scale them
            
            // Set a higher depth to ensure fruit appears above the tree
            // If the parent tree exists, set the depth higher than the tree's depth
            if (parentTree && parentTree.depth !== undefined) {
                fruit.setDepth(parentTree.depth + 10); // Set significantly higher than the tree
            } else {
                // Use a high depth value based on y-position to ensure it's above trees
                fruit.setDepth(pixelPos.y + 100);
            }
            
            // Mark depth as set to prevent changes during map movement
            fruit.setData('depthSet', true);
            
            // Store minimal data needed for position updates
            fruit.setData('lat', lat);
            fruit.setData('lng', lng);
            fruit.setData('isFruit', true);
            
            // Store reference to parent tree if provided
            if (parentTree) {
                fruit.setData('parentTree', parentTree);
            }
            
            // Register with environment's coordinate cache if available
            if (this.environment?.registerEnvironmentObject) {
                this.environment.registerEnvironmentObject(fruit, lat, lng);
            }
            
            // Add to environment group
            this.environmentGroup.add(fruit);
            
            return fruit;
        } catch (error) {
            console.error("Error creating fruit:", error);
            return null;
        }
    }
    
    /**
     * Update a fruit's position based on its lat/lng
     * @param {Phaser.GameObjects.Sprite} fruit - The fruit sprite to update
     */
    updateFruitPosition(fruit) {
        const lat = fruit.getData('lat');
        const lng = fruit.getData('lng');
        if (lat && lng) {
            const pixelPos = this.mapManager.latLngToPixel(lat, lng);
            if (pixelPos) {
                fruit.x = pixelPos.x;
                fruit.y = pixelPos.y;
                
                // Only set depth if it hasn't been set before
                if (!fruit.getData('depthSet')) {
                    // If the fruit has a parent tree, use the tree's depth + offset
                    const parentTree = fruit.getData('parentTree');
                    if (parentTree && parentTree.depth !== undefined) {
                        fruit.setDepth(parentTree.depth + 10);
                    } else {
                        // Otherwise use a high depth value based on y-position
                        fruit.setDepth(pixelPos.y + 100);
                    }
                    fruit.setData('depthSet', true);
                }
            }
        }
    }
    
    /**
     * Handle tree destruction by removing attached fruits
     */
    handleTreeDestruction(tree) {
        if (!tree) return;
        
        // Get all fruits near the tree
        const treeX = tree.x;
        const treeY = tree.y;
        const treeWidth = tree.displayWidth;
        
        const fruitSprites = this.environmentGroup.getChildren().filter(obj => {
            return obj instanceof Phaser.GameObjects.Sprite &&
                   obj.getData('isFruit') === true &&
                   Phaser.Math.Distance.Between(obj.x, obj.y, treeX, treeY) < treeWidth * 0.6;
        });
        
        // Simply destroy the fruits
        for (const fruit of fruitSprites) {
            fruit.destroy();
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any remaining fruits
        for (const fruit of this.environmentGroup.getChildren()) {
            if (fruit instanceof Phaser.GameObjects.Sprite && fruit.getData('isFruit')) {
                fruit.destroy();
            }
        }
    }
    
    /**
     * Update all fruit positions based on map changes
     */
    updateFruitPositions() {
        if (!this.mapManager) return;
        
        // Get all fruits from the environment group
        const fruits = this.environmentGroup?.getChildren().filter(obj => 
            obj instanceof Phaser.GameObjects.Sprite && obj.getData('isFruit') === true
        );
        
        // Update each fruit's position
        for (const fruit of fruits) {
            this.updateFruitPosition(fruit);
        }
    }
} 