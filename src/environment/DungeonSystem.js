import { logger, LogCategory } from '../utils/Logger';
import { dungeonConfigRegistry } from '../dungeons/core/DungeonConfig';
import { DungeonFactory } from '../dungeons/core/DungeonFactory';
import { lostSwampDungeonConfig } from '../dungeons/types/LostSwampDungeon';

/**
 * DungeonEntranceSystem - Manages dungeon entrances in the game world
 * Integrates with the environment system to place and manage dungeon entrances
 */
export class DungeonEntranceSystem {
    scene;
    environmentGroup;
    environment;
    mapManager;
    coordinateCache;
    popupSystem;
    dungeonEntrances = [];
    
    /**
     * Constructor for DungeonEntranceSystem
     * @param {Object} scene - The Phaser scene
     * @param {Phaser.GameObjects.Group} environmentGroup - The environment group to add dungeon entrances to
     */
    constructor(scene, environmentGroup) {
        // Ensure DUNGEON category is enabled for logging
        const loggerInstance = logger.getInstance ? logger.getInstance() : logger;
        if (loggerInstance.setCategory) {
            loggerInstance.setCategory(LogCategory.DUNGEON, true);
            console.log("DUNGEON logging category explicitly enabled");
        }
        
        // Direct console.log to check parameters
        console.log(`DIRECT LOG: DungeonEntranceSystem constructor called with scene: ${scene ? 'valid' : 'null'}, environmentGroup: ${environmentGroup ? 'valid' : 'null'}`);
        
        this.scene = scene;
        this.environmentGroup = environmentGroup;
        
        // Check if environmentGroup is properly initialized
        if (!this.environmentGroup) {
            console.log("DIRECT LOG: WARNING - environmentGroup is not initialized in DungeonEntranceSystem constructor");
        }
        
        // Initialize dungeonEntrances array
        this.dungeonEntrances = [];
        
        // Ensure the Lost Swamp dungeon is registered
        if (!dungeonConfigRegistry.get('lost-swamp')) {
            console.log("DIRECT LOG: Registering Lost Swamp dungeon configuration");
            dungeonConfigRegistry.register(lostSwampDungeonConfig);
            logger.info(LogCategory.DUNGEON, `Manually registered Lost Swamp dungeon: ${lostSwampDungeonConfig.name} (${lostSwampDungeonConfig.id})`);
        } else {
            console.log("DIRECT LOG: Lost Swamp dungeon configuration already registered");
        }
        
        logger.info(LogCategory.DUNGEON, "Dungeon entrance system initialized");
    }
    
    /**
     * Set the environment reference
     * @param {Environment} environment - The environment instance
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
     * Set the popup system reference
     * @param {PopupSystem} popupSystem - The popup system instance
     */
    setPopupSystem(popupSystem) {
        this.popupSystem = popupSystem;
    }
    
    /**
     * Generate dungeon entrances around a center point
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     */
    generateDungeonEntrances(centerLat, centerLng, radiusMeters) {
        // Direct console.log to ensure we see this regardless of logger configuration
        console.log(`DIRECT LOG: generateDungeonEntrances called with center: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}, radius: ${radiusMeters}m`);
        
        // Test log messages with both categories
        logger.info(LogCategory.ENVIRONMENT, "TEST LOG - ENVIRONMENT CATEGORY: generateDungeonEntrances method called");
        logger.info(LogCategory.DUNGEON, "TEST LOG - DUNGEON CATEGORY: generateDungeonEntrances method called");
        
        logger.info(LogCategory.DUNGEON, `Starting dungeon entrance generation at center: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}, radius: ${radiusMeters}m`);
        
        // Get all available dungeon configs
        const dungeonConfigs = dungeonConfigRegistry.getAll();
        
        logger.info(LogCategory.DUNGEON, `Found ${dungeonConfigs.length} dungeon configs in registry`);
        if (dungeonConfigs.length > 0) {
            logger.info(LogCategory.DUNGEON, `Available dungeon types: ${dungeonConfigs.map(c => c.id).join(', ')}`);
        }
        
        if (!dungeonConfigs || dungeonConfigs.length === 0) {
            logger.warn(LogCategory.DUNGEON, "No dungeon configs found, cannot generate dungeon entrances");
            return;
        }
        
        // Filter to only include the Lost Swamp dungeon
        const lostSwampConfig = dungeonConfigs.find(config => config.id === 'lost-swamp');
        
        if (!lostSwampConfig) {
            logger.warn(LogCategory.DUNGEON, "Lost Swamp dungeon config not found");
            return;
        }
        
        logger.info(LogCategory.DUNGEON, `Found Lost Swamp dungeon config: ${lostSwampConfig.name} (${lostSwampConfig.id})`);
        logger.info(LogCategory.DUNGEON, "Generating entrance for Lost Swamp dungeon only");
        
        try {
            // Place the Lost Swamp entrance at a fixed position to the right of the origin
            // Using 0 degrees (east/right) and 60% of the radius for consistent placement
            const angle = 0; // 0 degrees = east/right direction
            const distance = radiusMeters * 0.6; // 60% of radius for better visibility while staying inside boundary
            
            logger.info(LogCategory.DUNGEON, `Calculating entrance position with angle: 0 degrees, distance: ${distance}m`);
            
            // Check if mapManager is available
            if (!this.mapManager) {
                logger.error(LogCategory.DUNGEON, "MapManager is not available, cannot calculate entrance position");
                return;
            }
            
            logger.info(LogCategory.DUNGEON, "Using MapManager to calculate destination point from center");
            
            // Calculate position using MapManager's destinationPoint function
            const position = this.mapManager.destinationPoint(
                { lat: centerLat, lng: centerLng }, 
                angle, 
                distance
            );
            
            if (!position) {
                logger.error(LogCategory.DUNGEON, "Failed to calculate entrance position, destinationPoint returned null");
                return;
            }
            
            logger.info(LogCategory.DUNGEON, `Fixed entrance position calculated: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
            
            // Create dungeon entrance at this position
            logger.info(LogCategory.DUNGEON, "Creating dungeon entrance at calculated position");
            const entrance = this.createDungeonEntrance(position.lat, position.lng, lostSwampConfig);
            
            if (entrance) {
                logger.info(LogCategory.DUNGEON, `Successfully created entrance for ${lostSwampConfig.name} with ID: ${entrance.getData ? entrance.getData('dungeonId') : 'unknown'}`);
            } else {
                logger.error(LogCategory.DUNGEON, `Failed to create entrance for ${lostSwampConfig.name}`);
            }
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error generating entrance for Lost Swamp: ${error}`);
            logger.error(LogCategory.DUNGEON, `Error stack: ${error.stack}`);
        }
        
        logger.info(LogCategory.DUNGEON, `Dungeon entrance generation complete. Created ${this.dungeonEntrances.length} entrances`);
    }
    
    /**
     * Create a dungeon entrance at the specified position
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} dungeonConfig - The dungeon configuration
     * @returns {Phaser.GameObjects.Sprite} The created dungeon entrance sprite
     */
    createDungeonEntrance(lat, lng, dungeonConfig) {
        // Direct console.log to ensure we see this regardless of logger configuration
        console.log(`DIRECT LOG: createDungeonEntrance called for ${dungeonConfig.name} at position: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        logger.info(LogCategory.DUNGEON, `Creating dungeon entrance for ${dungeonConfig.name} at position: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        if (!this.mapManager) {
            console.log("DIRECT LOG: MapManager is not available, cannot create dungeon entrance");
            logger.error(LogCategory.DUNGEON, "Cannot create dungeon entrance: mapManager is not available");
            return null;
        }
        
        // Convert lat/lng to pixel coordinates
        logger.info(LogCategory.DUNGEON, "Converting lat/lng to pixel coordinates");
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        if (!pixelPos) {
            logger.error(LogCategory.DUNGEON, `Failed to convert coordinates to pixels: ${lat}, ${lng}`);
            return null;
        }
        
        logger.info(LogCategory.DUNGEON, `Converted to pixel coordinates: x=${pixelPos.x}, y=${pixelPos.y}`);
        
        // Create the entrance sprite using the entrance image from the dungeon's directory
        const entranceTexture = `${dungeonConfig.id}-entrance`;
        logger.info(LogCategory.DUNGEON, `Creating entrance with texture key: ${entranceTexture} for dungeon: ${dungeonConfig.name}`);
        
        // Helper function to set up entrance
        const setupEntrance = (entranceSprite) => {
            // Set appropriate scale and depth
            entranceSprite.setScale(0.5);
            entranceSprite.setDepth(5);
            
            // Store dungeon info and coordinates in the entrance
            logger.info(LogCategory.DUNGEON, "Storing dungeon info in entrance sprite");
            entranceSprite.setData('dungeonId', dungeonConfig.id);
            entranceSprite.setData('dungeonName', dungeonConfig.name);
            entranceSprite.setData('dungeonDescription', dungeonConfig.description);
            entranceSprite.setData('lat', lat);
            entranceSprite.setData('lng', lng);
            entranceSprite.setData('type', 'dungeon-entrance');
            
            // IMPORTANT FIX: Check for trees at this position and ensure we don't interfere with them
            const nearbyTrees = this.findNearbyTrees(entranceSprite.x, entranceSprite.y, 50);
            if (nearbyTrees.length > 0) {
                console.log(`DUNGEON DEBUG: Found ${nearbyTrees.length} trees near dungeon entrance. Adding special handling.`);
                
                // Make the entrance interactive with a very specific hit area - just the center 
                // This ensures we don't accidentally capture tree clicks
                entranceSprite.setInteractive({
                    hitArea: new Phaser.Geom.Circle(entranceSprite.width/2, entranceSprite.height/2, entranceSprite.width/4),
                    hitAreaCallback: Phaser.Geom.Circle.Contains,
                    useHandCursor: true
                });
            } else {
                // No trees nearby, use standard (but still precise) interaction area
                entranceSprite.setInteractive({ 
                    useHandCursor: true,
                    pixelPerfect: true,
                    alphaTolerance: 128
                });
            }
            
            // Add click handler with debug logging
            entranceSprite.on('pointerdown', (pointer) => {
                // Log that entrance was directly clicked
                console.log("DUNGEON DEBUG: Dungeon entrance directly clicked!");
                
                // Only prevent propagation if this is a direct click on the entrance
                // This allows clicks on trees to propagate correctly
                if (pointer?.event) {
                    // Check if the click is within the inner part of the entrance
                    const localX = pointer.x - entranceSprite.x + entranceSprite.width / 2;
                    const localY = pointer.y - entranceSprite.y + entranceSprite.height / 2;
                    
                    // Only if click is well within the entrance sprite
                    if (localX > entranceSprite.width * 0.2 && 
                        localX < entranceSprite.width * 0.8 &&
                        localY > entranceSprite.height * 0.2 && 
                        localY < entranceSprite.height * 0.8) {
                        // Stop propagation for direct hits
                        pointer.event?.stopPropagation();
                    }
                }
                
                this.handleDungeonEntranceClick(entranceSprite);
            });
            
            // Add hover effect
            entranceSprite.on('pointerover', () => {
                entranceSprite.setScale(0.55);
            });
            
            entranceSprite.on('pointerout', () => {
                entranceSprite.setScale(0.5);
            });
            
            // Add to environment group
            if (this.environmentGroup) {
                this.environmentGroup.add(entranceSprite);
            }
            
            // Add to dungeonEntrances array
            this.dungeonEntrances.push(entranceSprite);
            
            // Add a method to update the position based on map changes
            entranceSprite.updatePosition = () => {
                const newPixelPos = this.mapManager.latLngToPixel(lat, lng);
                if (newPixelPos) {
                    entranceSprite.x = newPixelPos.x;
                    entranceSprite.y = newPixelPos.y;
                }
            };
            
            return entranceSprite;
        };
        
        // HELPER METHOD: Find trees near a given coordinate
        this.findNearbyTrees = (x, y, radius = 50) => {
            if (!this.environmentGroup) return [];
            
            const trees = [];
            for (const obj of this.environmentGroup.getChildren()) {
                if (obj.getData && obj.getData('type') === 'tree') {
                    const dist = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
                    if (dist <= radius) {
                        trees.push(obj);
                    }
                }
            }
            return trees;
        };
        
        // Create the entrance sprite
        const entrance = this.scene.add.sprite(pixelPos.x, pixelPos.y, entranceTexture);
        
        // Check if the texture exists
        if (!this.scene.textures.exists(entranceTexture)) {
            logger.error(LogCategory.DUNGEON, `Texture not found: ${entranceTexture}`);
            
            // Try with a fallback texture
            const fallbackTexture = 'lost-swamp-entrance';
            logger.info(LogCategory.DUNGEON, `Trying fallback texture: ${fallbackTexture}`);
            
            if (this.scene.textures.exists(fallbackTexture)) {
                logger.info(LogCategory.DUNGEON, `Using fallback texture: ${fallbackTexture}`);
                const fallbackEntrance = this.scene.add.sprite(pixelPos.x, pixelPos.y, fallbackTexture);
                return setupEntrance(fallbackEntrance);
            }
            
            logger.error(LogCategory.DUNGEON, `Fallback texture not found: ${fallbackTexture}`);
            return null;
        }
        
        return setupEntrance(entrance);
    }
    
    /**
     * Handle dungeon entrance click
     * @param {Phaser.GameObjects.Sprite} entrance - The clicked dungeon entrance
     */
    handleDungeonEntranceClick(entrance) {
        logger.info(LogCategory.DUNGEON, '=== Dungeon entrance clicked ===');
        console.log("DIRECT LOG: handleDungeonEntranceClick called");
        
        // Check if entrance is valid
        if (!entrance) {
            logger.error(LogCategory.DUNGEON, 'Invalid entrance object: null or undefined');
            console.log("DIRECT LOG: Invalid entrance object: null or undefined");
            return;
        }
        
        // Get dungeon data from the entrance
        const dungeonId = entrance.getData('dungeonId');
        const dungeonName = entrance.getData('dungeonName');
        const dungeonDescription = entrance.getData('dungeonDescription');
        
        logger.info(LogCategory.DUNGEON, `Dungeon entrance clicked: ${dungeonName} (${dungeonId})`);
        console.log(`DIRECT LOG: Dungeon entrance clicked: ${dungeonName} (${dungeonId})`);
        logger.info(LogCategory.DUNGEON, `Entrance data: id=${dungeonId}, name=${dungeonName}, description=${dungeonDescription ? 'present' : 'missing'}`);
        
        // Check if we have valid dungeon data
        if (!dungeonId) {
            logger.error(LogCategory.DUNGEON, 'Entrance missing dungeonId data');
            console.log("DIRECT LOG: Entrance missing dungeonId data");
            return;
        }
        
        // Check if popupSystem is available and has the showPopup method
        if (!this.popupSystem || typeof this.popupSystem.showPopup !== 'function') {
            logger.warn(LogCategory.DUNGEON, 'Cannot show dungeon entrance popup: popupSystem is not available or missing showPopup method');
            console.log("DIRECT LOG: Cannot show dungeon entrance popup: popupSystem is not available or missing showPopup method, entering dungeon directly");
            this.enterDungeon(dungeonId);
            return;
        }
        
        // Show a popup with dungeon info and enter option
        logger.info(LogCategory.DUNGEON, 'Showing dungeon entrance popup');
        try {
            this.popupSystem.showPopup({
                title: dungeonName,
                content: dungeonDescription,
                buttons: [
                    {
                        text: 'Enter Dungeon',
                        callback: () => {
                            logger.info(LogCategory.DUNGEON, 'Player chose to enter dungeon');
                            this.enterDungeon(dungeonId);
                        }
                    },
                    {
                        text: 'Info',
                        callback: () => {
                            logger.info(LogCategory.DUNGEON, 'Player chose to view dungeon info');
                            this.showDungeonInfo(dungeonId);
                        }
                    },
                    {
                        text: 'Cancel',
                        callback: () => {
                            logger.info(LogCategory.DUNGEON, 'Player cancelled dungeon entrance');
                            // Just close the popup
                        }
                    }
                ]
            });
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error showing popup: ${error.message}`);
            console.log(`DIRECT LOG: Error showing popup: ${error.message}`);
            // Fall back to entering the dungeon directly
            this.enterDungeon(dungeonId);
        }
    }
    
    /**
     * Show detailed information about a dungeon
     * @param {string} dungeonId - The ID of the dungeon
     */
    showDungeonInfo(dungeonId) {
        // Get the dungeon config
        const dungeonConfig = dungeonConfigRegistry.get(dungeonId);
        
        if (!dungeonConfig) {
            logger.error(LogCategory.DUNGEON, `Unknown dungeon type: ${dungeonId}`);
            return;
        }
        
        // Create a more detailed description
        const detailedInfo = `
            <h3>${dungeonConfig.name}</h3>
            <p>${dungeonConfig.description}</p>
            <p>Difficulty: ${this.getDifficultyText(dungeonConfig.difficulty)}</p>
            <p>Recommended Level: ${dungeonConfig.minLevel}+</p>
            <p>Special Features: ${dungeonConfig.specialMechanics.join(', ')}</p>
        `;
        
        // Check if popupSystem is available and has the showPopup method
        if (!this.popupSystem || typeof this.popupSystem.showPopup !== 'function') {
            logger.warn(LogCategory.DUNGEON, 'Cannot show dungeon info popup: popupSystem is not available or missing showPopup method');
            console.log("DIRECT LOG: Cannot show dungeon info popup: popupSystem is not available or missing showPopup method, entering dungeon directly");
            this.enterDungeon(dungeonId);
            return;
        }
        
        // Show a popup with the detailed info
        try {
            this.popupSystem.showPopup({
                title: `About ${dungeonConfig.name}`,
                content: detailedInfo,
                buttons: [
                    {
                        text: 'Enter Dungeon',
                        callback: () => {
                            this.enterDungeon(dungeonId);
                        }
                    },
                    {
                        text: 'Close',
                        callback: () => {
                            // Just close the popup
                        }
                    }
                ]
            });
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error showing info popup: ${error.message}`);
            console.log(`DIRECT LOG: Error showing info popup: ${error.message}`);
            // Fall back to entering the dungeon directly
            this.enterDungeon(dungeonId);
        }
    }
    
    /**
     * Get text representation of difficulty level
     * @param {number} difficulty - The difficulty level (1-5)
     * @returns {string} Text representation of the difficulty
     */
    getDifficultyText(difficulty) {
        switch(difficulty) {
            case 1: return 'Easy';
            case 2: return 'Normal';
            case 3: return 'Challenging';
            case 4: return 'Hard';
            case 5: return 'Very Hard';
            default: return 'Unknown';
        }
    }
    
    /**
     * Enter a dungeon
     * @param {string} dungeonId - The ID of the dungeon to enter
     */
    enterDungeon(dungeonId) {
        logger.info(LogCategory.DUNGEON, `=== Entering dungeon: ${dungeonId} ===`);
        console.log(`DIRECT LOG: Entering dungeon: ${dungeonId}`);
        
        try {
            // Check if scene is valid
            if (!this.scene) {
                logger.error(LogCategory.DUNGEON, "Cannot enter dungeon: scene is not available");
                console.log("DIRECT LOG: Cannot enter dungeon: scene is not available");
                return;
            }
            
            // Get the dungeon config
            logger.info(LogCategory.DUNGEON, `Looking up dungeon config for: ${dungeonId}`);
            const dungeonConfig = dungeonConfigRegistry.get(dungeonId);
            
            if (!dungeonConfig) {
                logger.error(LogCategory.DUNGEON, `Unknown dungeon type: ${dungeonId}`);
                console.log(`DIRECT LOG: Unknown dungeon type: ${dungeonId}`);
                return;
            }
            
            logger.info(LogCategory.DUNGEON, `Found dungeon config: ${dungeonConfig.name} (${dungeonConfig.id})`);
            console.log(`DIRECT LOG: Found dungeon config: ${dungeonConfig.name} (${dungeonConfig.id})`);
            
            // Create a proper dungeon object using the DungeonFactory
            const dungeonLevel = 1;
            logger.info(LogCategory.DUNGEON, `Creating dungeon object for ${dungeonConfig.name}, level ${dungeonLevel}`);
            
            let dungeon;
            try {
                dungeon = DungeonFactory.createDungeon(this.scene, dungeonId, dungeonLevel);
            } catch (dungeonError) {
                logger.error(LogCategory.DUNGEON, `Error creating dungeon: ${dungeonError.message}`);
                console.log(`DIRECT LOG: Error creating dungeon: ${dungeonError.message}`);
                
                // Show error message to the player if possible
                if (this.scene?.uiManager?.showMedievalMessage) {
                    this.scene.uiManager.showMedievalMessage(
                        `Cannot enter ${dungeonConfig.name}: failed to create dungeon.`,
                        'error',
                        3000
                    );
                }
                return;
            }
            
            if (!dungeon) {
                logger.error(LogCategory.DUNGEON, `Failed to create dungeon object for ${dungeonId}`);
                console.log(`DIRECT LOG: Failed to create dungeon object for ${dungeonId}`);
                
                // Show error message to the player if possible
                if (this.scene?.uiManager?.showMedievalMessage) {
                    this.scene.uiManager.showMedievalMessage(
                        `Cannot enter ${dungeonConfig.name}: failed to create dungeon.`,
                        'error',
                        3000
                    );
                }
                return;
            }
            
            logger.info(LogCategory.DUNGEON, `Successfully created dungeon object: ${dungeon.name}, level: ${dungeon.level}`);
            
            // Ensure the dungeon has all required properties
            if (!dungeon.levels) {
                logger.warn(LogCategory.DUNGEON, 'Dungeon object missing levels property, setting default value');
                dungeon.levels = dungeonConfig.maxLevel || 4;
            }
            
            if (!dungeon.currentLevel) {
                logger.warn(LogCategory.DUNGEON, 'Dungeon object missing currentLevel property, setting default value');
                dungeon.currentLevel = dungeonLevel;
            }
            
            // Store the dungeon in the registry for the DungeonScene to access
            logger.info(LogCategory.DUNGEON, 'Storing dungeon object in scene registry');
            this.scene.registry.set('currentDungeon', dungeon);
            
            logger.info(LogCategory.DUNGEON, `Created dungeon object: ${dungeon.name}, levels: ${dungeon.levels}`);
            
            // Check if the scene has the start method
            if (!this.scene.scene || typeof this.scene.scene.start !== 'function') {
                logger.error(LogCategory.DUNGEON, "Cannot start DungeonScene: scene.start method is not available");
                console.log("DIRECT LOG: Cannot start DungeonScene: scene.start method is not available");
                return;
            }
            
            // Start the dungeon scene with the dungeonId and level
            logger.info(LogCategory.DUNGEON, `Starting DungeonScene with dungeonId: ${dungeonId}, level: ${dungeonLevel}`);
            console.log(`DIRECT LOG: Starting DungeonScene with dungeonId: ${dungeonId}, level: ${dungeonLevel}`);
            
            try {
                this.scene.scene.start('DungeonScene', { 
                    dungeonId: dungeonId, 
                    level: dungeonLevel
                });
                logger.info(LogCategory.DUNGEON, 'Scene transition initiated');
            } catch (sceneError) {
                logger.error(LogCategory.DUNGEON, `Error starting DungeonScene: ${sceneError.message}`);
                console.log(`DIRECT LOG: Error starting DungeonScene: ${sceneError.message}`);
                
                // Show error message to the player if possible
                if (this.scene?.uiManager?.showMedievalMessage) {
                    this.scene.uiManager.showMedievalMessage(
                        'Cannot enter dungeon: failed to start dungeon scene.',
                        'error',
                        3000
                    );
                }
            }
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error entering dungeon: ${error}`);
            logger.error(LogCategory.DUNGEON, `Error stack: ${error.stack}`);
            console.log(`DIRECT LOG: Error entering dungeon: ${error.message}`);
            
            // Show error message to the player if possible
            if (this.scene?.uiManager?.showMedievalMessage) {
                this.scene.uiManager.showMedievalMessage(
                    'Cannot enter dungeon: an error occurred.',
                    'error',
                    3000
                );
            }
        }
    }
    
    /**
     * Get color for dungeon entrance particles based on dungeon type
     * @param {string} dungeonId - The dungeon ID
     * @returns {number} The color as a hex value
     */
    getDungeonEntranceColor(dungeonId) {
        // Different colors for different dungeon types
        switch (dungeonId) {
            case 'lost-swamp': return 0x00aa77; // Swampy green
            case 'cave': return 0x8866ff; // Purple
            case 'forest': return 0x22cc44; // Forest green
            default: return 0x00ffff; // Cyan (default)
        }
    }
    
    /**
     * Update all dungeon entrance positions based on map changes
     */
    updateDungeonEntrancePositions() {
        if (!this.mapManager) return;
        
        for (const entrance of this.dungeonEntrances) {
            if (entrance?.updatePosition) {
                entrance.updatePosition();
            }
        }
    }
    
    /**
     * Register a dungeon entrance with the environment system
     * @param {Object} entrance - The dungeon entrance object
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    registerDungeonEntrance(entrance, lat, lng) {
        if (!entrance) return;
        
        // Store coordinates in the entrance
        entrance.setData('lat', lat);
        entrance.setData('lng', lng);
        
        // Add to the dungeonEntrances array if not already there
        if (!this.dungeonEntrances.includes(entrance)) {
            this.dungeonEntrances.push(entrance);
        }
        
        // Register with map manager for position updates if available
        if (this.mapManager?.registerMapObject) {
            this.mapManager.registerMapObject(entrance, lat, lng);
        }
        
        logger.info(LogCategory.DUNGEON, `Registered dungeon entrance at (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    }
    
    /**
     * Clean up resources when the dungeon system is destroyed
     */
    destroy() {
        // Clean up particle emitters
        for (const entrance of this.dungeonEntrances) {
            const sprite = entrance?.getAt ? entrance.getAt(2) : null;
            if (sprite?.particleEmitter) {
                sprite.particleEmitter.destroy();
            }
        }
        
        // Clear the dungeonEntrances array
        this.dungeonEntrances = [];
        
        // Clear references
        this.scene = null;
        this.environmentGroup = null;
        this.environment = null;
        this.mapManager = null;
        this.coordinateCache = null;
        this.popupSystem = null;
        
        logger.info(LogCategory.DUNGEON, "Dungeon system destroyed");
    }
} 