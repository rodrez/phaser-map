import { logger, LogCategory } from '../utils/Logger';
import { dungeonConfigRegistry } from '../dungeons/core/DungeonConfig';

/**
 * DungeonPortalSystem - Manages dungeon portals in the game world
 */
export class DungeonPortalSystem {
    scene;
    environmentGroup;
    environment;
    mapManager;
    coordinateCache;
    popupSystem;
    portals = [];
    
    /**
     * Constructor for DungeonPortalSystem
     * @param {Object} scene - The Phaser scene
     * @param {Phaser.GameObjects.Group} environmentGroup - The environment group to add portals to
     */
    constructor(scene, environmentGroup) {
        this.scene = scene;
        this.environmentGroup = environmentGroup;
        
        // Initialize portals array
        this.portals = [];
        
        logger.info(LogCategory.ENVIRONMENT, "Portal system initialized");
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
     * Generate dungeon portals around a center point
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     */
    generatePortals(centerLat, centerLng, radiusMeters) {
        // Get all available dungeon configs
        const dungeonConfigs = dungeonConfigRegistry.getAll();
        
        if (!dungeonConfigs || dungeonConfigs.length === 0) {
            logger.warn(LogCategory.ENVIRONMENT, "No dungeon configs found, cannot generate portals");
            return;
        }
        
        logger.info(LogCategory.ENVIRONMENT, `Generating portals for ${dungeonConfigs.length} dungeons`);
        
        // For each dungeon config, create a portal at a random position
        dungeonConfigs.forEach(config => {
            try {
                // Generate random angle and distance
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radiusMeters * 0.7; // 70% of radius to keep away from edges
                
                // Calculate position using MapManager's destinationPoint function
                const position = this.mapManager.destinationPoint(
                    { lat: centerLat, lng: centerLng }, 
                    angle, 
                    distance
                );
                
                // Create portal at this position
                this.createPortal(position.lat, position.lng, config);
            } catch (error) {
                logger.error(LogCategory.ENVIRONMENT, `Error generating portal for ${config.name}: ${error}`);
            }
        });
        
        logger.info(LogCategory.ENVIRONMENT, `Successfully created ${this.portals.length} dungeon portals`);
    }
    
    /**
     * Create a dungeon portal at the specified position
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {Object} dungeonConfig - The dungeon configuration
     * @returns {Phaser.GameObjects.Sprite} The created portal sprite
     */
    createPortal(lat, lng, dungeonConfig) {
        if (!this.mapManager) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot create portal: mapManager is not available");
            return null;
        }
        
        // Convert lat/lng to pixel coordinates
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        
        // Create the portal sprite
        const portal = this.scene.add.sprite(pixelPos.x, pixelPos.y, 'portal');
        portal.setScale(0.3); // Smaller than in-dungeon portals
        portal.setAlpha(0.9);
        portal.setDepth(10); // Above most environment objects
        
        // Store dungeon info in the portal
        portal.setData('dungeonId', dungeonConfig.id);
        portal.setData('dungeonName', dungeonConfig.name);
        portal.setData('dungeonDescription', dungeonConfig.description);
        portal.setData('lat', lat);
        portal.setData('lng', lng);
        
        // Add to environment group
        this.environmentGroup.add(portal);
        
        // Add to portals array
        this.portals.push(portal);
        
        // Add particle effect
        try {
            // Create the particle emitter
            const emitter = this.scene.add.particles(pixelPos.x, pixelPos.y, 'particle', {
                speed: { min: 5, max: 20 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.2, end: 0 },
                blendMode: 'ADD',
                lifespan: 1500,
                tint: this.getDungeonPortalColor(dungeonConfig.id),
                frequency: 200,
                quantity: 1
            });
            
            // Store the emitter with the portal for cleanup
            portal.particleEmitter = emitter;
        } catch (error) {
            logger.warn(LogCategory.ENVIRONMENT, `Failed to create portal particles: ${error.message}`);
            
            // Create a simple animation instead as fallback
            this.scene.tweens.add({
                targets: portal,
                scale: { from: 0.25, to: 0.35 },
                alpha: { from: 0.8, to: 1 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Make the portal interactive
        portal.setInteractive({ useHandCursor: true });
        
        // Add click handler
        portal.on('pointerdown', () => {
            this.handlePortalClick(portal);
        });
        
        logger.info(LogCategory.ENVIRONMENT, `Created portal for ${dungeonConfig.name} at (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        
        return portal;
    }
    
    /**
     * Handle portal click
     * @param {Phaser.GameObjects.Sprite} portal - The clicked portal
     */
    handlePortalClick(portal) {
        const dungeonId = portal.getData('dungeonId');
        const dungeonName = portal.getData('dungeonName');
        const dungeonDescription = portal.getData('dungeonDescription');
        
        logger.info(LogCategory.ENVIRONMENT, `Portal clicked: ${dungeonName} (${dungeonId})`);
        
        // Show a popup with dungeon info and enter option
        if (this.popupSystem) {
            this.popupSystem.showPopup({
                title: dungeonName,
                content: dungeonDescription,
                buttons: [
                    {
                        text: 'Enter Dungeon',
                        callback: () => {
                            this.enterDungeon(dungeonId);
                        }
                    },
                    {
                        text: 'Cancel',
                        callback: () => {
                            // Just close the popup
                        }
                    }
                ]
            });
        }
    }
    
    /**
     * Enter a dungeon
     * @param {string} dungeonId - The ID of the dungeon to enter
     */
    enterDungeon(dungeonId) {
        logger.info(LogCategory.ENVIRONMENT, `Entering dungeon: ${dungeonId}`);
        
        try {
            // Get the dungeon config
            const dungeonConfig = dungeonConfigRegistry.get(dungeonId);
            
            if (!dungeonConfig) {
                logger.error(LogCategory.ENVIRONMENT, `Unknown dungeon type: ${dungeonId}`);
                return;
            }
            
            // Create a dungeon object to store in the registry
            const dungeon = {
                id: dungeonId,
                name: dungeonConfig.name,
                description: dungeonConfig.description,
                levels: dungeonConfig.maxLevel || 5,
                currentLevel: 1
            };
            
            // Store the dungeon in the registry for the DungeonScene to access
            this.scene.registry.set('currentDungeon', dungeon);
            
            logger.info(LogCategory.ENVIRONMENT, `Starting dungeon scene for: ${dungeon.name}`);
            
            // Start the dungeon scene with the dungeonId and level
            this.scene.scene.start('DungeonScene', { 
                dungeonId: dungeonId, 
                level: 1 
            });
        } catch (error) {
            logger.error(LogCategory.ENVIRONMENT, `Error entering dungeon: ${error}`);
        }
    }
    
    /**
     * Get the particle color for a dungeon portal based on dungeon ID
     * @param {string} dungeonId - The dungeon ID
     * @returns {number} The color as a hexadecimal number
     */
    getDungeonPortalColor(dungeonId) {
        // Different colors for different dungeons
        switch (dungeonId) {
            case 'forest-dungeon':
                return 0x00ff00; // Green
            case 'cave-dungeon':
                return 0xff9900; // Orange
            case 'lost-swamp':
                return 0x00ffff; // Cyan
            default:
                return 0xffffff; // White
        }
    }
    
    /**
     * Update portal positions based on map changes
     */
    updatePortalPositions() {
        if (!this.mapManager) return;
        
        this.portals.forEach(portal => {
            const lat = portal.getData('lat');
            const lng = portal.getData('lng');
            
            if (lat && lng) {
                const pixelPos = this.mapManager.latLngToPixel(lat, lng);
                portal.x = pixelPos.x;
                portal.y = pixelPos.y;
                
                // Update particle emitter position if it exists
                if (portal.particleEmitter) {
                    portal.particleEmitter.setPosition(pixelPos.x, pixelPos.y);
                }
            }
        });
    }
    
    /**
     * Clean up resources when the portal system is destroyed
     */
    destroy() {
        // Clean up portals
        this.portals.forEach(portal => {
            // Clean up particle emitter if it exists
            if (portal.particleEmitter) {
                portal.particleEmitter.stop();
                portal.particleEmitter.destroy();
            }
            
            // Remove event listeners
            portal.off('pointerdown');
            
            // Destroy the portal
            portal.destroy();
        });
        
        // Clear portals array
        this.portals = [];
        
        // Clear references
        this.scene = null;
        this.environmentGroup = null;
        this.environment = null;
        this.mapManager = null;
        this.coordinateCache = null;
        this.popupSystem = null;
    }
} 