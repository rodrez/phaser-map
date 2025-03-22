import { TreeSystem } from './tree';
import { FruitSystem } from './fruit';
import { logger, LogCategory } from '../utils/Logger';
import { DungeonPortalSystem } from './portal';
import { DungeonEntranceSystem } from './DungeonEntranceSystem';
import configManager from '../utils/ConfigManager';

/**
 * Main environment system that coordinates all environment-related subsystems
 */
export class Environment {
    scene;
    environmentGroup;
    treeSystem;
    fruitSystem;
    portalSystem;
    dungeonEntranceSystem;
    popupSystem;
    mapManager;
    coordinateCache;
    environmentEnabled = true;
    configSubscriptionId = null;
    
    constructor(scene) {
        this.scene = scene;
        this.environmentGroup = this.scene.add.group();
        this.mapManager = scene.mapManager;
        
        // Get coordinate cache from map manager
        if (this.mapManager) {
            this.coordinateCache = this.mapManager.getCoordinateCache();
        }
        
        // Get the initial environment enabled state from config
        this.environmentEnabled = configManager.isFeatureEnabled('environment');
        
        // Subscribe to config changes
        this.configSubscriptionId = configManager.subscribe('environment', (enabled) => {
            this.setEnvironmentEnabled(enabled);
        });
        
        // Only initialize subsystems if environment is enabled
        if (this.environmentEnabled) {
            // Initialize subsystems after environment is set up
            this.initializeSubsystems();
            
            // Setup interactions between systems
            this.setupSystemInteractions();
        }
        
        // Add emergency input handler to bypass potential input issues
        this.setupEmergencyTreeHandler();
    }
    
    /**
     * Initialize environment subsystems
     */
    initializeSubsystems() {
        logger.info(LogCategory.ENVIRONMENT, "Initializing environment subsystems");
        
        try {
            // Initialize tree system
            this.treeSystem = new TreeSystem(this.scene, this.environmentGroup);
            logger.info(LogCategory.ENVIRONMENT, "Tree system initialized");
            
            // Initialize fruit system
            this.fruitSystem = new FruitSystem(this.scene, this.environmentGroup);
            logger.info(LogCategory.ENVIRONMENT, "Fruit system initialized");
            
            // Initialize dungeon portal system
            this.portalSystem = new DungeonPortalSystem(this.scene, this.environmentGroup);
            logger.info(LogCategory.ENVIRONMENT, "Portal system initialized");
            
            // Initialize dungeon entrance system
            this.dungeonEntranceSystem = new DungeonEntranceSystem(this.scene, this.environmentGroup);
            logger.info(LogCategory.ENVIRONMENT, "Dungeon entrance system initialized");
            
            // Set environment reference in subsystems
            if (this.treeSystem) {
                this.treeSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in tree system");
            }
            
            if (this.fruitSystem) {
                this.fruitSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in fruit system");
            }
            
            if (this.portalSystem) {
                this.portalSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in portal system");
            }
            
            if (this.dungeonEntranceSystem) {
                this.dungeonEntranceSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in dungeon entrance system");
            }
            
            // Pass map manager to subsystems
            if (this.mapManager) {
                this.treeSystem?.setMapManager(this.mapManager);
                this.fruitSystem?.setMapManager(this.mapManager);
                this.portalSystem?.setMapManager(this.mapManager);
                this.dungeonEntranceSystem?.setMapManager(this.mapManager);
            }
            
            // Pass coordinate cache to subsystems
            if (this.coordinateCache) {
                this.treeSystem.setCoordinateCache(this.coordinateCache);
                this.fruitSystem.setCoordinateCache(this.coordinateCache);
                this.portalSystem.setCoordinateCache(this.coordinateCache);
                this.dungeonEntranceSystem.setCoordinateCache(this.coordinateCache);
            }
            
            // Log successful initialization
            logger.info(LogCategory.ENVIRONMENT, "Environment subsystems initialized successfully");
        } catch (error) {
            logger.error(LogCategory.ENVIRONMENT, "Error initializing environment subsystems:", error);
            logger.error(LogCategory.ENVIRONMENT, "Failed to initialize environment subsystems:", error);
        }
    }
    
    /**
     * Set the popup system reference
     */
    setPopupSystem(popupSystem) {
        this.popupSystem = popupSystem;
        
        // Pass popup system to subsystems
        if (this.treeSystem) {
            this.treeSystem.setPopupSystem(popupSystem);
            logger.info(LogCategory.ENVIRONMENT, "Popup system set in tree system");
        }
        
        if (this.fruitSystem) {
            this.fruitSystem.setPopupSystem(popupSystem);
            logger.info(LogCategory.ENVIRONMENT, "Popup system set in fruit system");
        }
        
        if (this.portalSystem) {
            this.portalSystem.setPopupSystem(popupSystem);
            logger.info(LogCategory.ENVIRONMENT, "Popup system set in portal system");
        }
        
        if (this.dungeonEntranceSystem) {
            this.dungeonEntranceSystem.setPopupSystem(popupSystem);
            logger.info(LogCategory.ENVIRONMENT, "Popup system set in dungeon entrance system");
        }
        
        logger.info(LogCategory.ENVIRONMENT, "Popup system set in environment and subsystems");
    }
    
    /**
     * Setup interactions between different environment systems
     */
    setupSystemInteractions() {
        logger.info(LogCategory.ENVIRONMENT, "Setting up environment system interactions");
        
        // Listen for tree destruction to handle attached fruits
        this.scene.events.on('tree-destroyed', (tree) => {
            logger.info(LogCategory.ENVIRONMENT, "Tree destroyed event received");
            if (this.fruitSystem) {
                this.fruitSystem.handleTreeDestruction(tree);
            }
        });
        
        // Listen for tree interaction events
        this.scene.events.on('tree-interact', (tree) => {
            logger.info(LogCategory.ENVIRONMENT, "Tree interact event received");
            if (this.treeSystem) {
                this.treeSystem.showTreeInteractionPopup(tree);
            }
        });
        
        // Listen for fruit collection events
        this.scene.events.on('fruit-collect', (fruit) => {
            logger.info(LogCategory.ENVIRONMENT, "Fruit collect event received");
            if (this.fruitSystem) {
                this.fruitSystem.createFruitCollectAnimation(fruit);
                // Remove the fruit after collection
                this.scene.time.delayedCall(100, () => {
                    fruit.destroy();
                });
            }
        });
        
        logger.info(LogCategory.ENVIRONMENT, "Environment system interactions set up successfully");
    }
    
    /**
     * Register an environment object with its lat/lng coordinates
     * @param {Object} object - The environment object to register
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    registerEnvironmentObject(object, lat, lng) {
        if (!object) return;
        
        // Check the object type and register with the appropriate subsystem
        const objectType = object.getData ? object.getData('type') : null;
        
        if (objectType === 'tree') {
            this.treeSystem?.registerTree(object, lat, lng);
        } else if (objectType === 'fruit') {
            this.fruitSystem?.registerFruit(object, lat, lng);
        } else if (objectType === 'dungeon-entrance') {
            this.dungeonEntranceSystem?.registerDungeonEntrance(object, lat, lng);
        } else {
            // Generic registration
            if (this.mapManager?.registerMapObject) {
                this.mapManager.registerMapObject(object, lat, lng);
            }
        }
    }
    
    /**
     * Update an environment object's lat/lng
     * @param {Phaser.GameObjects.GameObject} obj - The game object to update
     * @param {number} lat - New latitude
     * @param {number} lng - New longitude
     */
    updateEnvironmentObjectPosition(obj, lat, lng) {
        // Update stored lat/lng
        obj.setData('lat', lat);
        obj.setData('lng', lng);
        
        // Update in coordinate cache if available
        const cacheId = obj.getData('cacheId');
        if (this.coordinateCache && cacheId) {
            this.coordinateCache.updateLatLng(cacheId, lat, lng);
            return;
        }
        
        // Fall back to direct positioning if cache not available
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        obj.x = pixelPos.x;
        obj.y = pixelPos.y;
    }
    
    /**
     * Unregister an environment object from the coordinate cache
     * @param {string} cacheId - The cache ID of the object to unregister
     * @returns {boolean} Whether the unregistration was successful
     */
    unregisterEnvironmentObject(cacheId) {
        if (!cacheId) {
            logger.warn(LogCategory.ENVIRONMENT, "Cannot unregister object: no cache ID provided");
            return false;
        }
        
        if (this.coordinateCache) {
            this.coordinateCache.unregister(cacheId);
            logger.info(LogCategory.ENVIRONMENT, `Unregistered object with cache ID: ${cacheId}`);
            return true;
        }
        
        logger.warn(LogCategory.ENVIRONMENT, "Cannot unregister object: coordinate cache not available");
        return false;
    }
    
    /**
     * Update environment positions based on map changes
     */
    updateEnvironmentPositions() {
        // Update tree positions
        if (this.treeSystem) {
            this.treeSystem.updateTreePositions();
        }
        
        // Update fruit positions
        if (this.fruitSystem) {
            this.fruitSystem.updateFruitPositions();
        }
        
        // Update dungeon entrance positions
        if (this.dungeonEntranceSystem) {
            this.dungeonEntranceSystem.updateDungeonEntrancePositions();
        }
    }
    
    /**
     * Refresh all environment object registrations with the map
     * Called when returning from the dungeon to ensure objects are properly registered
     */
    refreshMapRegistration() {
        logger.info(LogCategory.ENVIRONMENT, 'Refreshing environment object map registrations');
        
        // Get all environment objects
        const environmentObjects = [];
        
        // Add trees
        if (this.treeSystem && this.treeSystem.environmentGroup) {
            const trees = this.treeSystem.environmentGroup.getChildren().filter(obj => 
                obj.getData('isTree') === true
            );
            environmentObjects.push(...trees);
        }
        
        // Add fruits
        if (this.fruitSystem && this.fruitSystem.environmentGroup) {
            const fruits = this.fruitSystem.environmentGroup.getChildren().filter(obj => 
                obj.getData('type') === 'fruit'
            );
            environmentObjects.push(...fruits);
        }
        
        // Add dungeon entrances
        if (this.dungeonEntranceSystem && this.dungeonEntranceSystem.dungeonEntrances) {
            environmentObjects.push(...this.dungeonEntranceSystem.dungeonEntrances);
        }
        
        // Re-register each object with the map
        environmentObjects.forEach(obj => {
            const lat = obj.getData('lat');
            const lng = obj.getData('lng');
            
            if (lat && lng) {
                // First unregister if there's an existing cacheId
                const existingCacheId = obj.getData('cacheId');
                if (existingCacheId && this.coordinateCache) {
                    this.coordinateCache.unregister(existingCacheId);
                }
                
                // Re-register with coordinate cache or map manager
                if (this.coordinateCache) {
                    const newCacheId = this.coordinateCache.register(obj, lat, lng);
                    obj.setData('cacheId', newCacheId);
                } else if (this.mapManager && this.mapManager.registerMapObject) {
                    this.mapManager.registerMapObject(obj, lat, lng);
                }
            }
        });
        
        // Force an update of the coordinate cache
        if (this.coordinateCache && typeof this.coordinateCache.scheduleUpdate === 'function') {
            this.coordinateCache.scheduleUpdate(null); // null means update all
        }
        
        logger.info(LogCategory.ENVIRONMENT, `Refreshed registration for ${environmentObjects.length} environment objects`);
    }
    
    /**
     * Generate environment elements around a center point
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Radius to generate within
     */
    generateEnvironment(centerX, centerY, radius) {
        // Skip generation if environment is disabled
        if (!this.environmentEnabled) {
            logger.info(LogCategory.ENVIRONMENT, "Environment generation skipped (disabled)");
            return;
        }
        
        logger.info(LogCategory.ENVIRONMENT, `Generating environment around (${centerX}, ${centerY}) with radius ${radius}`);
        
        // Get the configured maximum number of environment objects
        const maxObjects = configManager.getPerformanceSetting('maxEnvironmentObjects') || 50;
        
        // Generate trees
        if (this.treeSystem) {
            const treeCount = Math.floor(maxObjects * 0.6); // 60% of objects are trees
            this.treeSystem.generateTrees(centerX, centerY, radius, treeCount);
        }
        
        // Generate fruits
        if (this.fruitSystem) {
            const fruitCount = Math.floor(maxObjects * 0.2); // 20% of objects are fruits
            this.fruitSystem.generateFruits(centerX, centerY, radius, fruitCount);
        }
        
        // Generate dungeon entrances (only a few)
        if (this.dungeonEntranceSystem) {
            this.dungeonEntranceSystem.generateDungeonEntrances(centerX, centerY, radius, 2);
        }
        
        logger.info(LogCategory.ENVIRONMENT, "Environment generation complete");
    }
    
    /**
     * Get all healing auras in the environment
     */
    getHealingAuras() {
        return this.treeSystem.getHealingAuras();
    }
    
    /**
     * Clear all environment objects
     */
    clearEnvironment() {
        this.environmentGroup.clear(true, true);
    }
    
    /**
     * Get the environment group containing all environment objects
     */
    getEnvironmentGroup() {
        return this.environmentGroup;
    }
    
    /**
     * Clean up resources when the environment is destroyed
     */
    destroy() {
        // Unsubscribe from config changes
        if (this.configSubscriptionId) {
            configManager.unsubscribe('environment', this.configSubscriptionId);
            this.configSubscriptionId = null;
        }
        
        // Destroy all environment objects
        if (this.environmentGroup) {
            this.environmentGroup.clear(true, true);
        }
        
        // Destroy subsystems
        if (this.treeSystem) {
            this.treeSystem.destroy();
            this.treeSystem = null;
        }
        
        if (this.fruitSystem) {
            this.fruitSystem.destroy();
            this.fruitSystem = null;
        }
        
        if (this.portalSystem) {
            this.portalSystem.destroy();
            this.portalSystem = null;
        }
        
        if (this.dungeonEntranceSystem) {
            this.dungeonEntranceSystem.destroy();
            this.dungeonEntranceSystem = null;
        }
        
        // Clear arrays and references
        this.popupSystem = null;
        this.mapManager = null;
        this.coordinateCache = null;
        
        logger.info(LogCategory.ENVIRONMENT, "Environment system destroyed");
    }
    
    /**
     * Show a visual effect for a healing aura around a tree
     * @param tree The tree with the healing aura
     */
    showHealingAuraEffect(tree) {
        this.treeSystem.showHealingAuraEffect(tree);
    }
    
    /**
     * Check if player is within any healing aura and apply healing effects
     * @param player The player sprite
     * @param playerStats The player's stats object
     * @param scene The game scene (for particles and tweens)
     * @returns Whether the player is in any healing aura
     */
    checkHealingAuras(
        player, 
        playerStats, 
        scene
    ) {
        // Skip healing auras if disabled in config
        if (!configManager.isFeatureEnabled('healingAuras')) {
            return;
        }
        
        if (!player || !playerStats) return;
        
        // Find trees with healing aura near the player
        const nearbyTrees = this.findNearbyTrees(player.x, player.y, 40);
        
        // Skip if no trees found
        if (nearbyTrees.length === 0) return;
        
        // Check if player is injured
        if (playerStats.health < playerStats.maxHealth) {
            // Apply healing from nearby trees
            let totalHealing = 0;
            
            for (const tree of nearbyTrees) {
                // Ensure tree has aura data
                if (!tree.getData('healingAura')) continue;
                
                // Get healing strength
                const healingStrength = tree.getData('healingStrength') || 0.5;
                
                // Add to total healing
                totalHealing += healingStrength;
                
                // Show visual effect
                this.showHealingAuraEffect(tree);
            }
            
            // Apply healing (min 1 HP, max 5 HP per tree)
            if (totalHealing > 0) {
                // Calculate healing amount based on max health and number of trees
                const healingAmount = Math.min(
                    Math.max(1, Math.floor(totalHealing * 2)), // At least 1 HP, scaling with trees
                    playerStats.maxHealth - playerStats.health, // Don't exceed max health
                    nearbyTrees.length * 5 // Cap at 5 HP per tree
                );
                
                if (healingAmount > 0) {
                    // Apply healing to player stats
                    playerStats.health += healingAmount;
                    
                    // Cap health at max
                    if (playerStats.health > playerStats.maxHealth) {
                        playerStats.health = playerStats.maxHealth;
                    }
                    
                    // Create healing effects
                    this.createHealingEffects(player, healingAmount, scene);
                }
            }
        }
    }
    
    /**
     * Create healing visual effects
     * @param player The player sprite
     * @param healingAmount The amount of healing
     * @param scene The game scene (for particles and tweens)
     */
    createHealingEffects(
        player,
        healingAmount,
        scene
    ) {
        // Create a small healing particle effect
        this.createSmallHealingEffect(player, scene);
        
        // Show healing indicator
        this.showHealingIndicator(player, healingAmount, scene);
    }
    
    /**
     * Create a small healing effect on the player
     * @param player The player sprite
     * @param scene The game scene
     */
    createSmallHealingEffect(
        player,
        scene
    ) {
        // Create a small healing particle effect at the player's position
        const particles = scene.add.particles(player.x, player.y - 20, 'particle', {
            speed: { min: 10, max: 30 },
            angle: { min: 270, max: 360 },
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            tint: [0x88ff88],
            quantity: 3,
            emitting: false
        });
        
        // Emit a small burst of particles
        particles.explode(3, player.x, player.y - 20);
        
        // Destroy the emitter after the particles are done
        scene.time.delayedCall(500, () => {
            particles.destroy();
        });
    }
    
    /**
     * Show a healing indicator
     * @param player The player sprite
     * @param amount The healing amount
     * @param scene The game scene
     */
    showHealingIndicator(
        player,
        amount,
        scene
    ) {
        const healText = scene.add.text(
            player.x, 
            player.y - 40, 
            `+${amount} HP`, 
            {
                fontSize: '18px',
                fontFamily: 'Cinzel, Times New Roman, serif',
                color: '#a0e8a0', // Light green
                stroke: '#2a1a0a', // Dark brown stroke
                strokeThickness: 4,
                align: 'center',
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 4,
                    fill: true
                }
            }
        ).setOrigin(0.5);
        
        // Animate and remove the text
        scene.tweens.add({
            targets: healText,
            y: healText.y - 30,
            alpha: 0,
            duration: 2000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                healText.destroy();
            }
        });
    }
    
    /**
     * Setup emergency tree click handler to bypass input capture issues
     */
    setupEmergencyTreeHandler() {
        console.log("TREE FIX: Setting up emergency tree click handler");
        
        // Add a direct input listener to the scene
        this.scene.input.on('pointerdown', (pointer) => {
            // Only proceed if left mouse button
            if (pointer.button !== 0) return;
            
            // Skip if on UI (likely above the game area)
            if (pointer.y < 100) return;
            
            console.log(`TREE FIX: Global click at (${pointer.worldX}, ${pointer.worldY})`);
            
            // Find trees near the click point
            const trees = this.findNearbyTrees(pointer.worldX, pointer.worldY, 40);
            if (trees.length > 0) {
                console.log(`TREE FIX: Found ${trees.length} trees near click, forcing interaction`);
                // Emit tree interaction event for the closest tree
                const tree = trees[0];
                this.scene.events.emit('tree-interact', tree);
            }
        });
    }
    
    /**
     * Find trees near a given coordinate
     */
    findNearbyTrees(x, y, radius = 40) {
        if (!this.treeSystem) return [];
        
        const trees = [];
        const allEnvironmentObjects = this.environmentGroup.getChildren();
        
        for (const obj of allEnvironmentObjects) {
            if (obj.getData && obj.getData('type') === 'tree') {
                const dist = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
                if (dist <= radius) {
                    trees.push(obj);
                }
            }
        }
        
        // Sort by distance
        trees.sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(x, y, a.x, a.y);
            const distB = Phaser.Math.Distance.Between(x, y, b.x, b.y);
            return distA - distB;
        });
        
        return trees;
    }
    
    /**
     * Set whether the environment is enabled or disabled
     * @param {boolean} enabled - Whether the environment should be enabled
     */
    setEnvironmentEnabled(enabled) {
        if (this.environmentEnabled === enabled) {
            return; // No change needed
        }
        
        this.environmentEnabled = enabled;
        logger.info(LogCategory.ENVIRONMENT, `Environment ${enabled ? 'enabled' : 'disabled'}`);
        
        if (enabled) {
            // If enabling and subsystems aren't initialized, initialize them
            if (!this.treeSystem) {
                this.initializeSubsystems();
                this.setupSystemInteractions();
            }
            
            // Show all environment objects
            this.showEnvironmentObjects();
            
            // Generate environment around player if none exists
            const player = this.scene.playerManager?.getPlayer();
            if (player && this.environmentGroup.getChildren().length === 0) {
                this.generateEnvironment(player.x, player.y, 300);
            }
        } else {
            // Hide all environment objects when disabled
            this.hideEnvironmentObjects();
        }
    }
    
    /**
     * Hide all environment objects (when environment is disabled)
     */
    hideEnvironmentObjects() {
        if (!this.environmentGroup) return;
        
        // Hide all environment objects
        for (const obj of this.environmentGroup.getChildren()) {
            obj.setVisible(false);
            
            // Disable physics body if it exists
            if (obj.body) {
                obj.body.enable = false;
            }
        }
        
        logger.info(LogCategory.ENVIRONMENT, "Environment objects hidden");
    }
    
    /**
     * Show all environment objects (when environment is enabled)
     */
    showEnvironmentObjects() {
        if (!this.environmentGroup) return;
        
        // Show all environment objects
        for (const obj of this.environmentGroup.getChildren()) {
            obj.setVisible(true);
            
            // Re-enable physics body if it exists
            if (obj.body) {
                obj.body.enable = true;
            }
        }
        
        logger.info(LogCategory.ENVIRONMENT, "Environment objects shown");
    }
} 