import { logger, LogCategory } from '../utils/Logger';
import { dungeonConfigRegistry } from '../dungeons/core/DungeonConfig';
import { DungeonFactory } from '../dungeons/core/DungeonFactory';
import { lostSwampDungeonConfig } from '../dungeons/types/LostSwampDungeon';
import { InteractiveSprite } from '../utils/InteractiveGameObject';
import { makeInteractive } from '../utils/interactionUtils';

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
        

        // Check if the texture exists
        if (!this.scene.textures.exists(entranceTexture)) {
            logger.error(LogCategory.DUNGEON, `Texture not found: ${entranceTexture}`);
            
            // Try with a fallback texture
            const fallbackTexture = 'lost-swamp-entrance';
            logger.info(LogCategory.DUNGEON, `Trying fallback texture: ${fallbackTexture}`);
            
            if (this.scene.textures.exists(fallbackTexture)) {
                logger.info(LogCategory.DUNGEON, `Using fallback texture: ${fallbackTexture}`);
                
                // Create as InteractiveSprite instead of basic sprite
                const entrance = new InteractiveSprite(
                    this.scene, 
                    pixelPos.x, 
                    pixelPos.y, 
                    fallbackTexture,
                    {
                        objectType: 'dungeon-entrance',
                        hitArea: {
                            useHandCursor: true,
                            pixelPerfect: true,
                            alphaTolerance: 128
                        }
                    }
                );
                
                return this.setupEntranceData(entrance, lat, lng, dungeonConfig);
            }
            
            logger.error(LogCategory.DUNGEON, `Fallback texture not found: ${fallbackTexture}`);
            return null;
        }
        
        // Create as InteractiveSprite instead of basic sprite
        const entrance = new InteractiveSprite(
            this.scene, 
            pixelPos.x, 
            pixelPos.y, 
            entranceTexture,
            {
                objectType: 'dungeon-entrance',
                hitArea: {
                    useHandCursor: true,
                    pixelPerfect: true,
                    alphaTolerance: 128
                }
            }
        );
        
        return this.setupEntranceData(entrance, lat, lng, dungeonConfig);
    }
    
    /**
     * Set up entrance data and interaction behavior
     * @param {InteractiveSprite} entrance - The entrance sprite to set up
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} dungeonConfig - The dungeon configuration
     * @returns {InteractiveSprite} The configured entrance sprite
     */
    setupEntranceData(entrance, lat, lng, dungeonConfig) {
        // Set appropriate scale and depth
        entrance.setScale(0.5);
        entrance.setDepth(5);
        
        // Store dungeon info and coordinates in the entrance
        logger.info(LogCategory.DUNGEON, "Storing dungeon info in entrance sprite");
        entrance.setData('dungeonId', dungeonConfig.id);
        entrance.setData('dungeonName', dungeonConfig.name);
        entrance.setData('dungeonDescription', dungeonConfig.description);
        entrance.setData('lat', lat);
        entrance.setData('lng', lng);
        entrance.setData('type', 'dungeon-entrance');
        
        // Override the onSingleClick method (from InteractiveSprite)
        entrance.onSingleClick = () => {
            // Log that entrance was directly clicked
            console.log("DUNGEON DEBUG: Dungeon entrance directly clicked!");
            this.handleDungeonEntranceClick(entrance);
        };
        
        // Add hover effect by overriding handlePointerOver/Out
        const originalHandlePointerOver = entrance.handlePointerOver;
        entrance.handlePointerOver = function() {
            originalHandlePointerOver.call(this);
            this.setScale(0.55);
        };
        
        const originalHandlePointerOut = entrance.handlePointerOut;
        entrance.handlePointerOut = function() {
            originalHandlePointerOut.call(this);
            this.setScale(0.5);
        };
        
        // Add to environment group
        if (this.environmentGroup) {
            this.environmentGroup.add(entrance);
        }
        
        // Add to dungeonEntrances array
        this.dungeonEntrances.push(entrance);
        
        // Add a method to update the position based on map changes
        entrance.updatePosition = () => {
            const newPixelPos = this.mapManager.latLngToPixel(lat, lng);
            if (newPixelPos) {
                entrance.x = newPixelPos.x;
                entrance.y = newPixelPos.y;
            }
        };
        
        return entrance;
    }
    
    /**
     * Alternative method to make an existing sprite into an interactive dungeon entrance
     * @param {Phaser.GameObjects.Sprite} sprite - Existing sprite to convert
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} dungeonConfig - The dungeon configuration
     * @returns {Phaser.GameObjects.Sprite} The configured sprite
     */
    makeInteractiveDungeonEntrance(sprite, lat, lng, dungeonConfig) {
        if (!sprite) return null;
        
        // Store dungeon info and coordinates
        sprite.setData('dungeonId', dungeonConfig.id);
        sprite.setData('dungeonName', dungeonConfig.name);
        sprite.setData('dungeonDescription', dungeonConfig.description);
        sprite.setData('lat', lat);
        sprite.setData('lng', lng);
        sprite.setData('type', 'dungeon-entrance');
        
        // Set depth and scale
        sprite.setScale(0.5);
        sprite.setDepth(5);
        
        // Use makeInteractive utility to add interaction behavior
        makeInteractive(this.scene, sprite, 
            // Single click handler
            (entranceObj) => {
                console.log("DUNGEON DEBUG: Dungeon entrance clicked via makeInteractive!");
                this.handleDungeonEntranceClick(entranceObj);
            },
            // Options
            {
                objectType: 'dungeon-entrance',
                hitArea: {
                    useHandCursor: true,
                    pixelPerfect: true,
                    alphaTolerance: 128
                }
            }
        );
        
        // Add custom hover effects
        sprite.on('pointerover', () => {
            sprite.setScale(0.55);
        });
        
        sprite.on('pointerout', () => {
            sprite.setScale(0.5);
        });
        
        // Add to collections
        if (this.environmentGroup) {
            this.environmentGroup.add(sprite);
        }
        
        this.dungeonEntrances.push(sprite);
        
        // Add position update method
        sprite.updatePosition = () => {
            const newPixelPos = this.mapManager.latLngToPixel(lat, lng);
            if (newPixelPos) {
                sprite.x = newPixelPos.x;
                sprite.y = newPixelPos.y;
            }
        };
        
        return sprite;
    }
    
    /**
     * Handle dungeon entrance click
     * @param {Phaser.GameObjects.Sprite} entrance - The clicked dungeon entrance
     */
    handleDungeonEntranceClick(entrance) {
        logger.info(LogCategory.DUNGEON, '=== Dungeon entrance clicked ===');
        
        // Check if entrance is valid
        if (!entrance) {
            logger.error(LogCategory.DUNGEON, 'Invalid entrance object: null or undefined');
            return;
        }
        
        // Get dungeon data from the entrance
        const dungeonId = entrance.getData('dungeonId');
        const dungeonName = entrance.getData('dungeonName');
        const dungeonDescription = entrance.getData('dungeonDescription');
        
        logger.info(LogCategory.DUNGEON, `Dungeon entrance clicked: ${dungeonName} (${dungeonId})`);
        
        // Check if we have valid dungeon data
        if (!dungeonId) {
            logger.error(LogCategory.DUNGEON, 'Entrance missing dungeonId data');
            return;
        }
        
        // Try to get popupSystem from the scene if our local reference is null
        if (!this.popupSystem && this.scene && this.scene.popupSystem) {
            logger.info(LogCategory.DUNGEON, 'Local popupSystem reference is null, using scene.popupSystem instead');
            this.popupSystem = this.scene.popupSystem;
        }
        
        // Also try from uiManager as a fallback
        if (!this.popupSystem && this.scene && this.scene.uiManager && this.scene.uiManager.popupSystem) {
            logger.info(LogCategory.DUNGEON, 'Using uiManager.popupSystem as fallback');
            this.popupSystem = this.scene.uiManager.popupSystem;
        }
        
        // Check if popupSystem is available
        if (!this.popupSystem) {
            logger.warn(LogCategory.DUNGEON, 'Cannot show dungeon entrance popup: popupSystem is not available');
            
            // Show error message to the player if possible instead of entering the dungeon directly
            if (this.scene?.uiManager?.showMedievalMessage) {
                this.scene.uiManager.showMedievalMessage(
                    `Discovered ${dungeonName}! The popup system is not available.`,
                    'warning',
                    3000
                );
            }
            return;
        }
        
        // Create dungeon icon SVG
        const dungeonIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8B4513" stroke-width="2">
            <rect x="3" y="10" width="18" height="11" />
            <path d="M2 10 L12 3 L22 10" />
            <rect x="9" y="13" width="6" height="8" />
        </svg>`;
        
        // Show a popup with dungeon info and enter option using the standard popup
        logger.info(LogCategory.DUNGEON, 'Showing dungeon entrance popup');
        try {
            // Use createCenteredStandardPopup for consistent styling with trees and monsters
            this.popupSystem.createCenteredStandardPopup({
                title: dungeonName,
                description: dungeonDescription,
                icon: dungeonIcon,
                actions: [
                    {
                        text: 'Enter Dungeon',
                        onClick: () => {
                            logger.info(LogCategory.DUNGEON, 'Player chose to enter dungeon');
                            this.enterDungeon(dungeonId);
                        },
                        className: "popup-button-success"
                    },
                    {
                        text: 'Info',
                        onClick: () => {
                            logger.info(LogCategory.DUNGEON, 'Player chose to view dungeon info');
                            this.showDungeonInfo(dungeonId);
                        },
                        className: "popup-button-info"
                    }
                ],
                className: 'dungeon-popup',
                closeButton: true,
                width: 400
            });
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error showing popup: ${error.message}`);
            
            // Show error message instead of entering the dungeon directly
            if (this.scene?.uiManager?.showMedievalMessage) {
                this.scene.uiManager.showMedievalMessage(
                    `Cannot show information for ${dungeonName}. Try again later.`,
                    'error',
                    3000
                );
            }
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
            <p>${dungeonConfig.description}</p>
            <p>Difficulty: ${this.getDifficultyText(dungeonConfig.difficulty)}</p>
            <p>Recommended Level: ${dungeonConfig.minLevel}+</p>
            <p>Special Features: ${dungeonConfig.specialMechanics.join(', ')}</p>
        `;
        
        // Try to get popupSystem from the scene if our local reference is null
        if (!this.popupSystem && this.scene && this.scene.popupSystem) {
            logger.info(LogCategory.DUNGEON, 'Local popupSystem reference is null, using scene.popupSystem instead');
            this.popupSystem = this.scene.popupSystem;
        }
        
        // Also try from uiManager as a fallback
        if (!this.popupSystem && this.scene && this.scene.uiManager && this.scene.uiManager.popupSystem) {
            logger.info(LogCategory.DUNGEON, 'Using uiManager.popupSystem as fallback');
            this.popupSystem = this.scene.uiManager.popupSystem;
        }
        
        // Check if popupSystem is available
        if (!this.popupSystem) {
            logger.warn(LogCategory.DUNGEON, 'Cannot show dungeon info popup: popupSystem is not available');
            
            // Show error message instead
            if (this.scene?.uiManager?.showMedievalMessage) {
                this.scene.uiManager.showMedievalMessage(
                    `Cannot show information for ${dungeonConfig.name}. Try again later.`,
                    'warning',
                    3000
                );
            }
            return;
        }
        
        // Create dungeon icon SVG
        const dungeonIcon = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8B4513" stroke-width="2">
            <rect x="3" y="10" width="18" height="11" />
            <path d="M2 10 L12 3 L22 10" />
            <rect x="9" y="13" width="6" height="8" />
        </svg>`;
        
        // Show a popup with the detailed info
        logger.info(LogCategory.DUNGEON, 'Showing dungeon info popup');
        try {
            // Use createCenteredStandardPopup for consistent styling with trees and monsters
            this.popupSystem.createCenteredStandardPopup({
                title: `About ${dungeonConfig.name}`,
                description: detailedInfo,
                icon: dungeonIcon,
                actions: [
                    {
                        text: 'Enter Dungeon',
                        onClick: () => {
                            this.enterDungeon(dungeonId);
                        },
                        className: "popup-button-success"
                    }
                ],
                className: 'dungeon-info-popup',
                closeButton: true,
                width: 500
            });
        } catch (error) {
            logger.error(LogCategory.DUNGEON, `Error showing info popup: ${error.message}`);
            
            // Show error message
            if (this.scene?.uiManager?.showMedievalMessage) {
                this.scene.uiManager.showMedievalMessage(
                    `Cannot show detailed information for ${dungeonConfig.name}. Try again later.`,
                    'error',
                    3000
                );
            }
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
     * Clean up resources when the dungeon entrance system is destroyed
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
        
        logger.info(LogCategory.DUNGEON, "Dungeon entrance system destroyed");
    }
} 