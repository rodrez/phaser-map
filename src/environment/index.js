import { TreeSystem } from './tree';
import { FruitSystem } from './fruit';
import { logger, LogCategory } from '../utils/Logger';

/**
 * Main environment system that coordinates all environment-related subsystems
 */
export class Environment {
    scene;
    environmentGroup;
    treeSystem;
    fruitSystem;
    popupSystem;
    mapManager;
    coordinateCache;
    
    constructor(scene) {
        this.scene = scene;
        this.environmentGroup = this.scene.add.group();
        this.mapManager = scene.mapManager;
        
        // Get coordinate cache from map manager
        if (this.mapManager) {
            this.coordinateCache = this.mapManager.getCoordinateCache();
        }
        
        // Initialize subsystems after environment is set up
        this.initializeSubsystems();
        
        // Setup interactions between systems
        this.setupSystemInteractions();
    }
    
    /**
     * Initialize subsystems after environment is set up
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
            
            // Set environment reference in subsystems
            if (this.treeSystem) {
                this.treeSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in tree system");
            }
            
            if (this.fruitSystem) {
                this.fruitSystem.setEnvironment(this);
                logger.info(LogCategory.ENVIRONMENT, "Environment reference set in fruit system");
            }
            
            // Log successful initialization
            console.log("Environment subsystems initialized successfully");
        } catch (error) {
            logger.error(LogCategory.ENVIRONMENT, "Error initializing environment subsystems:", error);
            console.error("Failed to initialize environment subsystems:", error);
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
        
        console.log("Popup system set in environment and subsystems");
    }
    
    /**
     * Setup interactions between different environment systems
     */
    setupSystemInteractions() {
        console.log("Setting up environment system interactions");
        
        // Listen for tree destruction to handle attached fruits
        this.scene.events.on('tree-destroyed', (tree) => {
            console.log("Tree destroyed event received");
            if (this.fruitSystem) {
                this.fruitSystem.handleTreeDestruction(tree);
            }
        });
        
        // Listen for tree interaction events
        this.scene.events.on('tree-interact', (tree) => {
            console.log("Tree interact event received");
            if (this.treeSystem) {
                this.treeSystem.showTreeInteractionPopup(tree);
            }
        });
        
        // Listen for fruit collection events
        this.scene.events.on('fruit-collect', (fruit) => {
            console.log("Fruit collect event received");
            if (this.fruitSystem) {
                this.fruitSystem.createFruitCollectAnimation(fruit);
                // Remove the fruit after collection
                this.scene.time.delayedCall(100, () => {
                    fruit.destroy();
                });
            }
        });
        
        console.log("Environment system interactions set up successfully");
    }
    
    /**
     * Register an environment object with the coordinate cache
     * @param {Phaser.GameObjects.GameObject} obj - The game object to register
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} The object's ID in the cache
     */
    registerEnvironmentObject(obj, lat, lng) {
        // Store lat/lng on the object for reference
        obj.setData('lat', lat);
        obj.setData('lng', lng);
        
        // Register with coordinate cache if available
        if (this.coordinateCache) {
            const cacheId = this.coordinateCache.register(obj, lat, lng);
            obj.setData('cacheId', cacheId);
            return cacheId;
        }
        
        // Fall back to direct positioning if cache not available
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        obj.x = pixelPos.x;
        obj.y = pixelPos.y;
        
        return null;
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
     * Update positions of all environment elements based on their stored lat/lng
     * This is now a fallback method as the coordinate cache handles updates automatically
     */
    updateEnvironmentPositions() {
        // If coordinate cache is available, we don't need to do anything
        if (this.coordinateCache) {
            // Even with coordinate cache, we need to ensure fruits are updated
            this.updateAllFruitPositions();
            return;
        }
        
        // Legacy fallback for when coordinate cache is not available
        logger.warn(LogCategory.ENVIRONMENT, "Using legacy environment position update method");
        
        // Get all environment objects
        const environmentObjects = this.environmentGroup.getChildren();
        
        // Update each object's position
        for (const obj of environmentObjects) {
            // Skip objects that don't have lat/lng data
            if (!obj.getData('lat') || !obj.getData('lng')) {
                continue;
            }
            
            // Get the object's lat/lng
            const lat = obj.getData('lat');
            const lng = obj.getData('lng');
            
            // Convert to pixel coordinates
            const pixelPos = this.mapManager.latLngToPixel(lat, lng);
            
            // Update position
            obj.x = pixelPos.x;
            obj.y = pixelPos.y;
            
            // Apply sway offset for fruits
            if (obj.getData('fruitType') !== undefined && obj.getData('swayData') !== undefined) {
                const swayData = obj.getData('swayData');
                obj.x += swayData.offsetX;
                obj.y += swayData.offsetY;
            }
        }
    }
    
    /**
     * Update all fruit positions
     * This ensures fruits stay with their trees when the map is moved
     */
    updateAllFruitPositions() {
        if (!this.fruitSystem) {
            return;
        }
        
        // Get all fruits from the environment group
        const fruits = this.environmentGroup.getChildren().filter(obj => 
            obj instanceof Phaser.GameObjects.Sprite && obj.getData('isFruit') === true
        );
        
        // Update each fruit's position
        for (const fruit of fruits) {
            this.fruitSystem.updateFruitPosition(fruit);
        }
    }
    
    /**
     * Generate environment elements around a center point
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Radius to generate within
     */
    generateEnvironment(centerX, centerY, radius) {
        logger.info(LogCategory.ENVIRONMENT, `Starting environment generation at (${centerX}, ${centerY}) with radius ${radius}`);
        
        try {
            // Convert center pixel coordinates to lat/lng
            const centerLatLng = this.mapManager.pixelToLatLng(centerX, centerY);
            logger.info(LogCategory.ENVIRONMENT, `Center coordinates: ${centerLatLng.lat.toFixed(6)}, ${centerLatLng.lng.toFixed(6)}`);
            
            // Check if tree system is initialized
            if (!this.treeSystem) {
                logger.error(LogCategory.ENVIRONMENT, "Tree system not initialized, cannot generate trees");
            } else {
                // Generate trees
                logger.info(LogCategory.ENVIRONMENT, "Generating trees...");
                this.treeSystem.generateTrees(centerLatLng.lat, centerLatLng.lng, radius);
            }
            
            // Check if fruit system is initialized
            if (!this.fruitSystem) {
                logger.error(LogCategory.ENVIRONMENT, "Fruit system not initialized, cannot generate fruits");
            } else {
                // Generate fruits
                logger.info(LogCategory.ENVIRONMENT, "Generating fruits...");
                this.fruitSystem.generateFruits(centerLatLng.lat, centerLatLng.lng, radius);
            }
            
            // Log generation
            logger.info(LogCategory.ENVIRONMENT, 
                `Environment generation complete at ${centerLatLng.lat.toFixed(6)}, ${centerLatLng.lng.toFixed(6)} with radius ${radius}`
            );
        } catch (error) {
            logger.error(LogCategory.ENVIRONMENT, `Error generating environment: ${error}`);
        }
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
        // Clean up subsystems
        if (this.treeSystem) {
            this.treeSystem.destroy();
        }
        
        if (this.fruitSystem) {
            this.fruitSystem.destroy();
        }
        
        // Clean up environment group
        if (this.environmentGroup) {
            this.environmentGroup.destroy(true);
        }
        
        // Remove event listeners
        this.scene.events.off('tree-destroyed');
        
        // Clear references
        this.scene = null;
        this.mapManager = null;
        this.popupSystem = null;
        this.coordinateCache = null;
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
        if (!player || !playerStats) return false;
        
        // Get all healing auras
        const healingAuras = this.getHealingAuras();
        
        // Track if player is in any aura
        let isInAnyAura = false;
        
        // Check each aura
        for (const aura of healingAuras) {
            const auraCircle = aura;
            
            // Calculate distance between player and aura center
            const distance = Phaser.Math.Distance.Between(
                player.x, player.y,
                auraCircle.x, auraCircle.y
            );
            
            // Check if player is within the aura radius
            if (distance <= auraCircle.radius) {
                isInAnyAura = true;
                
                // Apply healing effect based on time (once per second)
                const currentTime = scene.time.now;
                const lastHealTime = aura.getData('lastHealTime') || 0;
                
                if (currentTime - lastHealTime >= 1000) { // 1 second interval
                    // Get healing power
                    const healingPower = aura.getData('healingPower') || 1;
                    
                    // Apply healing if player is not at max health
                    if (playerStats.health < playerStats.maxHealth) {
                        // Heal the player
                        playerStats.health = Math.min(
                            playerStats.health + healingPower,
                            playerStats.maxHealth
                        );
                        
                        // Update last heal time
                        aura.setData('lastHealTime', currentTime);
                        
                        // Update health display
                        scene.events.emit('player-stats-changed');
                        
                        // Show healing effects
                        this.createHealingEffects(player, healingPower, scene);
                    }
                }
                
                // Make the aura slightly visible when player is inside
                const parentTree = aura.getData('parentTree');
                if (parentTree && !parentTree.getData('auraVisible')) {
                    this.showHealingAuraEffect(parentTree);
                    parentTree.setData('auraVisible', true);
                }
            } else {
                // Player is outside this aura
                const parentTree = aura.getData('parentTree');
                if (parentTree) {
                    parentTree.setData('auraVisible', false);
                }
            }
        }
        
        // Return whether player is in any aura (can be used by the caller)
        return isInAnyAura;
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
} 