import { LogCategory, logger } from "../utils/Logger";

/**
 * System to handle tree-related functionality
 */
export class TreeSystem {
    scene;
    environmentGroup;
    popupSystem;
    mapManager;
    environment;

    constructor(scene, environmentGroup) {
        this.scene = scene;
        this.environmentGroup = environmentGroup;
        this.mapManager = scene.mapManager;
        
        // The environment reference will be set by the Environment class after initialization
        this.environment = null;
        this.popupSystem = null;
        
        // Tree types and their properties
        this.treeTypes = {
            oak: {
                texture: 'tree',
                scale: 1.2,
                health: 150,
                woodYield: 3,
                description: 'A sturdy oak tree with strong branches.'
            },
            healingSpruce: {
                texture: 'spruce-tree',
                scale: 1.3,
                health: 130,
                woodYield: 2,
                description: 'A magical spruce tree with healing properties.',
                healingPower: 5
            }
        };
        
        // Create fallback textures if the tree textures don't exist
        this.createFallbackTextures();
        
        // Setup global tree interaction events
        this.setupTreeInteractions();
        
        // Debug log to confirm initialization
        logger.info(LogCategory.ENVIRONMENT, "TreeSystem initialized, tree interactions set up");
    }

    /**
     * Set the popup system reference
     */
    setPopupSystem(popupSystem) {
        this.popupSystem = popupSystem;
    }

    /**
     * Setup global tree interaction events
     */
    setupTreeInteractions() {
        this.scene.events.on('tree-interact', (tree) => {
            this.showTreeInteractionPopup(tree);
        });
    }

    /**
     * Setup interactions for a specific tree
     * @param {Phaser.GameObjects.Sprite} tree - The tree sprite to set up interactions for
     */
    setupTreeInteractionsForTree(tree) {
        if (!tree) return;
        
        // Set up hover effects
        tree.on('pointerover', () => {
            this.scene.tweens.add({
                targets: tree,
                scale: tree.scale * 1.1,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
        
        tree.on('pointerout', () => {
            this.scene.tweens.add({
                targets: tree,
                scale: tree.scale / 1.1,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
        
        // Set up click handler
        tree.on('pointerdown', () => {
            this.scene.events.emit('tree-interact', tree);
        });
    }

    /**
     * Show tree interaction popup
     */
    showTreeInteractionPopup(tree) {
        if (!this.popupSystem) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot show tree interaction popup: popupSystem is not set");
            return;
        }

        logger.info(LogCategory.ENVIRONMENT, "Showing tree interaction popup for tree:", tree);

        const treeName = tree.getData('treeName') || 'Tree';
        const isHealingSpruce = tree.getData('isHealingSpruce') || false;

        // Check if the tree has fruits
        const hasFruits = this.checkTreeHasFruits(tree);
        logger.info(LogCategory.ENVIRONMENT, "Tree has fruits:", hasFruits);

        // Create tree icon SVG based on tree type
        const treeIcon = isHealingSpruce 
            ? `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5a9d5a" stroke-width="2">
                    <path d="M12 2L5 12l3 1-2 6h12l-2-6 3-1z"/>
                    <path d="M12 22v2" stroke-opacity="0.5"/>
                    <circle cx="12" cy="8" r="2" stroke="#5a9d5a" fill="rgba(90, 157, 90, 0.3)"/>
                </svg>
            `
            : `
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c8a165" stroke-width="2">
                    <path d="M12 2L7 12h4v8h2v-8h4L12 2z"/>
                    <path d="M12 22v2M4 14h2M18 14h2" stroke-opacity="0.5"/>
                </svg>
            `;

        // Prepare description based on tree type
        const description = isHealingSpruce 
            ? 'A magical tree with healing properties. Its needles shimmer with a faint green glow, emanating a soothing aura that seems to rejuvenate those who stand near it.'
            : 'A sturdy tree with thick branches and lush foliage. Its roots dig deep into the earth, and its canopy provides shade to weary travelers. The bark is rough to the touch but holds many secrets of the forest.';

        // Prepare actions
        const actions = [
            {
                text: "Examine",
                onClick: () => {
                    // Close the popup immediately
                    if (this.popupSystem) {
                        this.popupSystem.closePopupsByClass('tree-popup');
                    }
                    this.examineTree(tree);
                },
                className: "popup-button-info"
            },
            {
                text: "Chop",
                onClick: () => {
                    // Close the popup immediately
                    if (this.popupSystem) {
                        this.popupSystem.closePopupsByClass('tree-popup');
                    }
                    this.chopTree(tree);
                },
                className: "popup-button-danger"
            }
        ];

        // Add gather fruits action if the tree has fruits
        if (hasFruits) {
            actions.push({
                text: "Gather Fruits",
                onClick: () => {
                    // Close the popup immediately
                    if (this.popupSystem) {
                        this.popupSystem.closePopupsByClass('tree-popup');
                    }
                    this.handleGatherFruits(tree);
                },
                className: "popup-button-success"
            });
        }

        // Create a centered standard popup
        this.popupSystem.createCenteredStandardPopup({
            title: tree.getData('treeName') || 'Tree',
            description: description,
            icon: treeIcon,
            actions: actions,
            className: 'tree-popup',
            closeButton: true,
            width: 400
        });
        
        logger.info(LogCategory.ENVIRONMENT, "Tree popup created");
    }

    /**
     * Check if a tree has fruits
     */
    checkTreeHasFruits(tree) {
        if (!tree) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot check fruits: tree is null");
            return false;
        }
        
        logger.info(LogCategory.ENVIRONMENT, "Checking for fruits on tree at position:", tree.x, tree.y);
        
        // Get all sprites at the tree's position
        const sprites = this.scene.children.list.filter(obj => {
            // Check if it's a sprite and has fruitType data
            const isFruit = obj instanceof Phaser.GameObjects.Sprite && 
                obj.getData('fruitType') !== undefined;
                
            // Check if it's close to the tree (within the tree's canopy)
            const distance = Phaser.Math.Distance.Between(obj.x, obj.y, tree.x, tree.y);
            const isNearTree = distance < tree.displayWidth * 0.6;
            
            if (isFruit && isNearTree) {
                logger.info(LogCategory.ENVIRONMENT, "Found fruit near tree:", obj.getData('fruitType'));
            }
            
            return isFruit && isNearTree;
        });

        logger.info(LogCategory.ENVIRONMENT, `Found ${sprites.length} fruits near tree`);
        return sprites.length > 0;
    }

    /**
     * Generate trees around a center point using lat/lng coordinates
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     * @param {number} count - Number of trees to generate (default: 12)
     */
    generateTrees(centerLat, centerLng, radiusMeters, count = 12) {
        // Log generation attempt
        logger.info(LogCategory.ENVIRONMENT, `Generating ${count} trees around ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)} with radius ${radiusMeters}m`);
        
        // Track successful tree creations
        let treesCreated = 0;
        
        // Generate random positions within the circle
        for (let i = 0; i < count; i++) {
            try {
                // Generate random angle and distance
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radiusMeters * 0.8; // 80% of radius to keep away from edges
                
                // Calculate position using MapManager's destinationPoint function
                const position = this.mapManager.destinationPoint(
                    { lat: centerLat, lng: centerLng }, 
                    angle, 
                    distance
                );
                
                // Create tree at this position
                const tree = this.createTree(position.lat, position.lng);
                
                if (tree) {
                    treesCreated++;
                }
            } catch (error) {
                logger.error(LogCategory.ENVIRONMENT, `Error generating tree ${i}: ${error}`);
            }
        }
        
        logger.info(LogCategory.ENVIRONMENT, `Successfully created ${treesCreated}/${count} trees`);
    }
    
    /**
     * Set the environment reference
     */
    setEnvironment(environment) {
        this.environment = environment;
    }
    
    /**
     * Create a tree at the specified lat/lng position
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Phaser.GameObjects.Sprite} - The created tree sprite
     */
    createTree(lat, lng) {
        // Select a random tree type
        const treeTypeKeys = Object.keys(this.treeTypes);
        const randomTreeType = treeTypeKeys[Math.floor(Math.random() * treeTypeKeys.length)];
        const treeData = this.treeTypes[randomTreeType];
        
        logger.info(LogCategory.ENVIRONMENT, `Creating tree of type: ${randomTreeType}`);
        
        if (!treeData || !treeData.texture) {
            logger.error(LogCategory.ENVIRONMENT, `Invalid tree type or missing texture: ${randomTreeType}`);
            return null;
        }
        
        // Check if texture exists, if not try to create it
        if (!this.scene.textures.exists(treeData.texture)) {
            logger.warn(LogCategory.ENVIRONMENT, `Texture ${treeData.texture} not found, creating emergency fallback`);
            
            try {
                // Create a simple fallback texture
                const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
                graphics.clear();
                graphics.fillStyle(0x8B4513); // Brown
                graphics.fillRect(15, 40, 10, 40); // Trunk
                graphics.fillStyle(0x228B22); // Forest green
                graphics.fillCircle(20, 25, 20); // Canopy
                graphics.generateTexture(treeData.texture, 40, 80);
                graphics.destroy();
            } catch (error) {
                logger.error(LogCategory.ENVIRONMENT, `Failed to create emergency texture: ${error}`);
                return null;
            }
        }
        
        // Convert lat/lng to pixel coordinates
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        
        // Create tree sprite
        let tree;
        try {
            tree = this.scene.add.sprite(pixelPos.x, pixelPos.y, treeData.texture);
            logger.info(LogCategory.ENVIRONMENT, `Tree sprite created at ${pixelPos.x}, ${pixelPos.y}`);
        } catch (error) {
            logger.error(LogCategory.ENVIRONMENT, `Failed to create tree sprite: ${error}`);
            return null;
        }
        
        tree.setOrigin(0.5, 1); // Set origin to bottom center for proper placement
        tree.setScale(treeData.scale || 1);
        tree.setDepth(pixelPos.y); // Use y position for depth sorting
        
        // Store tree data
        tree.setData('treeType', randomTreeType);
        tree.setData('isTree', true);
        tree.setData('health', treeData.health || 100);
        tree.setData('isHealingSpruce', randomTreeType === 'healingSpruce');
        
        // Store lat/lng position
        tree.setData('lat', lat);
        tree.setData('lng', lng);
        
        // Add to environment group
        this.environmentGroup.add(tree);
        
        // Register with coordinate cache if available
        if (this.environment && this.environment.registerEnvironmentObject) {
            this.environment.registerEnvironmentObject(tree, lat, lng);
        }
        
        // Make tree interactive
        tree.setInteractive({ useHandCursor: true, draggable: false });
        
        // Add event listeners
        this.setupTreeInteractionsForTree(tree);
        
        // Add fruits to the tree if fruit system is available
        if (this.environment && this.environment.fruitSystem && lat && lng) {
            // Add 1-3 fruits to the tree (using FruitSystem's random logic)
            this.environment.fruitSystem.generateFruitsOnTree(tree);
        }
        
        return tree;
    }
    
    /**
     * Update a tree's position based on its lat/lng
     * @param {Phaser.GameObjects.Sprite} tree - The tree sprite to update
     */
    updateTreePosition(tree) {
        // If the environment has the new coordinate system, use it
        if (this.environment && this.environment.updateEnvironmentObjectPosition) {
            const lat = tree.getData('lat');
            const lng = tree.getData('lng');
            if (lat && lng) {
                this.environment.updateEnvironmentObjectPosition(tree, lat, lng);
            }
            return;
        }
        
        // Legacy fallback
        const lat = tree.getData('lat');
        const lng = tree.getData('lng');
        if (lat && lng) {
            const pixelPos = this.mapManager.latLngToPixel(lat, lng);
            tree.x = pixelPos.x;
            tree.y = pixelPos.y;
            tree.setDepth(pixelPos.y); // Update depth based on new y position
        }
    }

    /**
     * Add trees within a circular area
     * @param {number} count Maximum number of trees to add
     * @param {number} centerX Center X coordinate in pixels
     * @param {number} centerY Center Y coordinate in pixels
     * @param {number} radius Radius in pixels
     * @param {Object} centerLatLng Center position in lat/lng coordinates
     * @returns {number} Number of trees placed
     */
    addTreesInCircle(count, centerX, centerY, radius, centerLatLng) {
        // Determine number of trees to add (between 3 and specified count, maximum 12)
        const treesToAdd = Phaser.Math.Between(3, Math.min(12, count));

        // Track positions to avoid overlap
        const treePositions = [];
        const minDistanceBetweenTrees = 30;

        let attempts = 0;
        const maxAttempts = 100;
        let treesPlaced = 0;

        while (treesPlaced < treesToAdd && attempts < maxAttempts) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * radius;

            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;

            if (!this.isPositionTooCloseToTrees(x, y, treePositions, minDistanceBetweenTrees)) {
                // Calculate lat/lng for this position
                const treeLatLng = this.mapManager.pixelToLatLng(x, y);
                
                // Use 'tree' or 'spruce' as the tree type
                const treeType = Math.random() > 0.5 ? 'tree' : 'spruce';
                const tree = this.addTreeWithVariation(x, y, treeType, treeLatLng);

                treePositions.push({
                    x,
                    y,
                    radius: minDistanceBetweenTrees / 2
                });

                treesPlaced++;
            }

            attempts++;
        }

        return treesPlaced;
    }

    /**
     * Check if a position is too close to existing trees
     */
    isPositionTooCloseToTrees(x, y, treePositions, minDistance) {
        return treePositions.some(pos => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < minDistance;
        });
    }

    /**
     * Add a tree with random variations
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @param {string} treeType Type of tree ('tree' or 'spruce')
     * @param {Object} latLng Latitude/longitude position
     * @returns {Phaser.GameObjects.Image} The created tree
     */
    addTreeWithVariation(x, y, treeType, latLng) {
        let tree;

        if (treeType === 'spruce') {
            tree = this.createSpruceTree(x, y);
        } else {
            tree = this.createRegularTree(x, y);
        }

        // Store lat/lng coordinates for map dragging
        if (latLng) {
            tree.setData('lat', latLng.lat);
            tree.setData('lng', latLng.lng);
        }

        // Add some randomness to scale
        const scale = 0.8 + Math.random() * 0.4;
        tree.setScale(scale);

        // Add slight rotation for visual variety
        const rotation = (Math.random() * 10 - 5) * (Math.PI / 180);
        tree.setRotation(rotation);

        // Make the tree interactive
        this.makeTreeInteractive(tree);

        // Add to environment group
        this.environmentGroup.add(tree);
        
        // Add fruits to the tree if fruit system is available
        if (this.environment && this.environment.fruitSystem && latLng) {
            // Add 1-3 fruits to the tree (using FruitSystem's random logic)
            this.environment.fruitSystem.generateFruitsOnTree(tree);
        }

        return tree;
    }

    /**
     * Create a spruce tree
     */
    createSpruceTree(x, y) {
        // Use the healing-spruce image instead of a sprite sheet
        const tree = this.scene.add.image(x, y, 'spruce-tree');

        // Set tree data
        tree.setData('woodAmount', { min: 1, max: 2 });
        tree.setData('treeName', 'Healing Spruce');
        tree.setData('isHealingSpruce', true);

        // Add healing aura
        this.addHealingAura(tree);

        return tree;
    }

    /**
     * Create a regular tree
     */
    createRegularTree(x, y) {
        // Use the tree image
        const tree = this.scene.add.image(x, y, 'tree');
        tree.setScale(0.7);
        
        // Set tree data
        tree.setData('woodAmount', { min: 3, max: 5 });
        tree.setData('treeName', 'Oak Tree');
        
        return tree;
    }

    /**
     * Add a healing aura to a tree
     */
    addHealingAura(tree) {
        const healingRadius = 15; // Much smaller radius
        const points = [];
        const sides = 3; // Triangle
        const angleStep = (Math.PI * 2) / sides;
        
        for (let i = 0; i < sides; i++) {
            const angle = i * angleStep;
            points.push({
                x: tree.x + healingRadius * Math.cos(angle),
                y: tree.y + healingRadius * Math.sin(angle)
            });
        }

        const healingAura = this.scene.add.polygon(tree.x, tree.y, points, 0x00ff00, 0.8);
        healingAura.setVisible(false);
        healingAura.setData('healingPower', 2); // Increased healing power to compensate for smaller radius
        healingAura.setData('parentTree', tree);
        tree.setData('healingAura', healingAura);

        this.environmentGroup.add(healingAura);
    }

    /**
     * Make a tree interactive
     */
    makeTreeInteractive(tree) {
        tree.setInteractive({ useHandCursor: true, draggable: false });

        const originalScale = tree.scale;

        // Hover effects
        tree.on('pointerover', () => {
            this.scene.tweens.add({
                targets: tree,
                scaleX: originalScale * 1.05,
                scaleY: originalScale * 1.05,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });

        tree.on('pointerout', () => {
            this.scene.tweens.add({
                targets: tree,
                scaleX: originalScale,
                scaleY: originalScale,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });

        // Add double click detection properties to the tree
        tree.setData('lastClickTime', 0);
        tree.setData('clickCount', 0);
        
        // Click effect
        tree.on('pointerdown', (pointer) => {
            // Stop event propagation to prevent map drag
            if (pointer.event) {
                pointer.event.stopPropagation();
                
                // Prevent default browser behavior - safely handle this to avoid passive listener warnings
                try {
                    if (pointer.event instanceof MouseEvent) {
                        pointer.event.preventDefault();
                    }
                } catch (e) {
                    // Silently catch the error if preventDefault is not allowed
                    logger.debug(LogCategory.ENVIRONMENT, "Could not preventDefault on tree click");
                }
            }
            
            // Make sure the map is not in a drag state
            if (this.scene.mapManager) {
                this.scene.mapManager.exitDragState();
            }
            
            const currentTime = this.scene.time.now;
            const lastClickTime = tree.getData('lastClickTime') || 0;
            const clickCount = tree.getData('clickCount') || 0;
            const doubleClickDelay = 300; // milliseconds
            
            // Update click count and time
            if (currentTime - lastClickTime < doubleClickDelay) {
                // This is a double click
                tree.setData('clickCount', 0);
                tree.setData('lastClickTime', 0);
                
                // Emit a double-click event that can be handled by the movement system
                this.scene.events.emit('double-click-move', {
                    x: tree.x,
                    y: tree.y,
                    targetObject: tree
                });
                
                // Don't trigger the single-click interaction
                return;
            }
            
            // This might be the first click of a double click
            tree.setData('clickCount', 1);
            tree.setData('lastClickTime', currentTime);
            
            // Set a timeout to handle single click after the double click window passes
            this.scene.time.delayedCall(doubleClickDelay, () => {
                // Only proceed if this wasn't part of a double click
                if (tree.getData('clickCount') === 1) {
                    // Reset click tracking
                    tree.setData('clickCount', 0);
                    
                    // Trigger the tree interaction animation and event
                    this.scene.tweens.add({
                        targets: tree,
                        x: tree.x + 2,
                        y: tree.y - 2,
                        duration: 50,
                        yoyo: true,
                        repeat: 3,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            logger.info(LogCategory.ENVIRONMENT, "Emitting tree-interact event");
                            this.scene.events.emit('tree-interact', tree);
                            this.createLeafParticles(tree.x, tree.y - tree.height * 0.6);
                        }
                    });
                }
            });
        });
        
        // Set tree name if not already set
        if (!tree.getData('treeName')) {
            const isHealingSpruce = tree.getData('isHealingSpruce') || false;
            const treeName = isHealingSpruce ? 'Healing Spruce' : 'Oak Tree';
            tree.setData('treeName', treeName);
            logger.info(LogCategory.ENVIRONMENT, `Set tree name to: ${treeName}`);
        }
    }

    /**
     * Create leaf particles effect
     */
    createLeafParticles(x, y) {
        const numParticles = 10;

        for (let i = 0; i < numParticles; i++) {
            const leaf = this.scene.add.rectangle(
                x,
                y - 40,
                4,
                4,
                Phaser.Display.Color.GetColor(
                    100 + Math.floor(Math.random() * 50),
                    150 + Math.floor(Math.random() * 50),
                    50 + Math.floor(Math.random() * 50)
                )
            );

            const vx = (Math.random() - 0.5) * 60;
            const vy = -30 - Math.random() * 50;

            this.scene.tweens.add({
                targets: leaf,
                x: leaf.x + vx * 2,
                y: leaf.y + 100,
                angle: Math.random() * 360,
                alpha: 0,
                duration: 1000 + Math.random() * 1000,
                ease: 'Sine.easeIn',
                onComplete: () => leaf.destroy()
            });
        }
    }

    /**
     * Chop down a tree
     */
    chopTree(tree) {
        logger.info(LogCategory.ENVIRONMENT, 'Chopping tree started');

        // Get player from the scene
        let player = this.scene.registry.get('player');
        
        // Fallback to get player from the scene if not in registry
        if (!player && this.scene.playerManager) {
            logger.info(LogCategory.ENVIRONMENT, 'Player not found in registry, getting from playerManager');
            player = this.scene.playerManager.getPlayer();
            // Update registry for future use
            this.scene.registry.set('player', player);
        }
        
        if (!player) {
            logger.error(LogCategory.ENVIRONMENT, 'Player not found in registry or playerManager');
            return;
        }

        // Store the tree reference for later use
        this.currentActionTree = tree;
        this.currentActionType = 'chop';

        // Move player closer to the tree if they're far away
        const distance = Phaser.Math.Distance.Between(player.x, player.y, tree.x, tree.y);
        logger.info(LogCategory.ENVIRONMENT, `Distance to tree: ${distance} pixels`);
        
        if (distance > 50) {
            logger.info(LogCategory.ENVIRONMENT, 'Player is too far from tree, moving closer');
            
            // Calculate target position near the tree
            const angle = Phaser.Math.Angle.Between(player.x, player.y, tree.x, tree.y);
            const targetX = tree.x - Math.cos(angle) * 40;
            const targetY = tree.y - Math.sin(angle) * 40;
            
            logger.info(LogCategory.ENVIRONMENT, `Moving player to: ${targetX}, ${targetY}`);

            // Convert target position to lat/lng
            const targetLatLng = this.mapManager.pixelToLatLng(targetX, targetY);
            
            if (!targetLatLng) {
                logger.error(LogCategory.ENVIRONMENT, 'Failed to convert target position to lat/lng');
                return;
            }
            
            logger.info(LogCategory.ENVIRONMENT, `Target lat/lng: ${targetLatLng.lat}, ${targetLatLng.lng}`);
            
            // Set up a one-time event listener for when the player reaches the target
            const reachTargetListener = (position) => {
                logger.info(LogCategory.ENVIRONMENT, 'Player reached tree position');
                // Perform the chopping action
                this.performChopAction(tree, player);
                
                // Remove this listener
                this.mapManager.onPlayerReachTarget = this.originalReachTargetCallback;
            };
            
            // Save the original callback
            this.originalReachTargetCallback = this.mapManager.onPlayerReachTarget;
            
            // Set our callback
            this.mapManager.onPlayerReachTarget = reachTargetListener;
            
            // Move the player using the mapManager
            const success = this.mapManager.setTargetPosition(targetLatLng.lat, targetLatLng.lng);
            
            if (!success) {
                logger.error(LogCategory.ENVIRONMENT, 'Failed to set target position');
                // Restore original callback
                this.mapManager.onPlayerReachTarget = this.originalReachTargetCallback;
                return;
            }
            
            // Face the player toward the tree
            if (tree.x > player.x) {
                player.setFlipX(false);
            } else {
                player.setFlipX(true);
            }
        } else {
            // Player is close enough, chop immediately
            logger.info(LogCategory.ENVIRONMENT, 'Player is close enough to tree, chopping immediately');
            this.performChopAction(tree, player);
        }
    }

    /**
     * Perform the actual tree chopping action and gather wood
     */
    performChopAction(tree, player) {
        // Face the player toward the tree
        if (tree.x > player.x) {
            player.setFlipX(false);
        } else {
            player.setFlipX(true);
        }

        logger.info(LogCategory.ENVIRONMENT, 'Performing chop action');

        // Play chopping animation (shake the tree)
        this.scene.tweens.add({
            targets: tree,
            x: tree.x + 3,
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Create wood particles effect
                this.createWoodChipParticles(tree.x, tree.y);

                // Get the tree's wood amount data or use default values
                const woodAmountData = tree.getData('woodAmount') || { min: 1, max: 3 };

                // Determine amount of wood to give based on tree type
                const woodAmount = Phaser.Math.Between(woodAmountData.min, woodAmountData.max);

                // Emit an event for the Game scene to add wood to inventory
                this.scene.events.emit('add-item-to-inventory', { itemId: 'wood', quantity: woodAmount });

                // Show success message
                const treeName = tree.getData('treeName') || 'tree';
                const message = `You gathered ${woodAmount} wood from the ${treeName}!`;

                // Display the message
                const woodMsg = this.scene.add.text(tree.x, tree.y - 50, message, {
                    fontSize: '16px',
                    fontFamily: 'Cinzel, Times New Roman, serif',
                    color: '#e8d4b9',
                    stroke: '#2a1a0a',
                    strokeThickness: 4,
                    align: 'center',
                    shadow: {
                        offsetX: 2,
                        offsetY: 2,
                        color: '#000',
                        blur: 4,
                        fill: true
                    }
                }).setOrigin(0.5);

                // Fade out and destroy
                this.scene.tweens.add({
                    targets: woodMsg,
                    alpha: 0,
                    y: woodMsg.y - 30,
                    duration: 2000,
                    onComplete: () => woodMsg.destroy()
                });

                // Create stump effect
                this.createTreeStump(tree);

                // Remove any fruits attached to this tree
                this.removeFruitsFromTree(tree);

                // Make the tree disappear with a falling animation
                this.scene.tweens.add({
                    targets: tree,
                    y: tree.y + 20,
                    alpha: 0,
                    angle: tree.angle + Phaser.Math.Between(-15, 15),
                    duration: 800,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        // Emit tree destroyed event
                        this.scene.events.emit('tree-destroyed', tree);
                        // Remove the tree from the game
                        tree.destroy();
                    }
                });

                // Add some XP for woodcutting
                this.scene.events.emit('add-skill-points', 1);
            }
        });
    }

    /**
     * Create a tree stump where the tree was chopped
     */
    createTreeStump(tree) {
        // Create a simple stump graphic
        const stump = this.scene.add.graphics();
        stump.fillStyle(0x8B4513, 1); // Brown color
        stump.fillCircle(tree.x, tree.y, 10);
        stump.fillStyle(0x654321, 1); // Darker brown for rings
        stump.fillCircle(tree.x, tree.y, 6);
        stump.fillStyle(0x8B4513, 1); // Brown again
        stump.fillCircle(tree.x, tree.y, 3);

        // Set depth to be below the tree but above the ground
        stump.setDepth(tree.depth - 1);
    }

    /**
     * Remove all fruits associated with a tree
     */
    removeFruitsFromTree(tree) {
        // Get all fruit sprites near the tree
        const fruitSprites = this.scene.children.list.filter(obj => {
            // Check if it's a sprite and has fruitType data
            return obj instanceof Phaser.GameObjects.Sprite &&
                obj.getData('fruitType') !== undefined &&
                // Check if it's close to the tree (within the tree's canopy)
                Phaser.Math.Distance.Between(obj.x, obj.y, tree.x, tree.y) < tree.displayWidth * 0.6;
        });

        // Make fruits fall to the ground and disappear
        for (const fruit of fruitSprites) {
            this.scene.tweens.add({
                targets: fruit,
                y: fruit.y + 100,
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: 600,
                ease: 'Quad.easeIn',
                onComplete: () => fruit.destroy()
            });
        }
    }

    /**
     * Examine a tree
     */
    examineTree(tree) {
        const treeName = tree.getData('treeName') || 'Tree';
        const isHealingSpruce = tree.getData('isHealingSpruce') || false;

        // Random messages for tree interaction
        const messages = [
            `You found a ${treeName}!`,
            `A majestic ${treeName} stands before you.`,
            `This ${treeName} looks healthy.`,
            `Birds are nesting in this ${treeName}.`
        ];

        // Add special messages for healing spruce
        if (isHealingSpruce) {
            messages.push(
                `The ${treeName} emits a soft, healing aura.`,
                `The needles of this ${treeName} shimmer with magical energy.`
            );
        }

        // Select a random message
        const message = messages[Math.floor(Math.random() * messages.length)];

        // Show notification
        const treeMessage = this.scene.add.text(tree.x, tree.y - 50, message, {
            fontSize: '16px',
            fontFamily: 'Cinzel, Times New Roman, serif',
            color: '#e8d4b9',
            stroke: '#2a1a0a',
            strokeThickness: 4,
            align: 'center',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        }).setOrigin(0.5);

        // Add a nice fade out effect
        this.scene.tweens.add({
            targets: treeMessage,
            y: treeMessage.y - 30,
            alpha: 0,
            duration: 2000,
            ease: 'Cubic.easeOut',
            onComplete: () => treeMessage.destroy()
        });
    }

    /**
     * Handle gathering fruits from a tree
     */
    handleGatherFruits(tree) {
        logger.info(LogCategory.ENVIRONMENT, 'Gathering fruits started');
        
        // Get player from the scene
        let player = this.scene.registry.get('player');
        
        // Fallback to get player from the scene if not in registry
        if (!player && this.scene.playerManager) {
            logger.info(LogCategory.ENVIRONMENT, 'Player not found in registry, getting from playerManager');
            player = this.scene.playerManager.getPlayer();
            // Update registry for future use
            this.scene.registry.set('player', player);
        }
        
        if (!player) {
            logger.error(LogCategory.ENVIRONMENT, 'Player not found in registry or playerManager');
            return;
        }

        // Get all fruit sprites near the tree
        const fruitSprites = this.scene.children.list.filter(obj => {
            // Check if it's a sprite and has fruitType data
            return obj instanceof Phaser.GameObjects.Sprite &&
                obj.getData('fruitType') !== undefined &&
                // Check if it's close to the tree (within the tree's canopy)
                Phaser.Math.Distance.Between(obj.x, obj.y, tree.x, tree.y) < tree.displayWidth * 0.6;
        });

        // Store the tree and fruit sprites for later use
        this.currentActionTree = tree;
        this.currentActionType = 'gather';
        this.currentFruitSprites = fruitSprites;

        if (fruitSprites.length === 0) {
            // No fruits found
            const noFruitsMsg = this.scene.add.text(tree.x, tree.y - 50, "No fruits to gather!", {
                fontSize: '16px',
                fontFamily: 'Cinzel, Times New Roman, serif',
                color: '#e8d4b9',
                stroke: '#2a1a0a',
                strokeThickness: 4,
                align: 'center',
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 4,
                    fill: true
                }
            }).setOrigin(0.5);

            // Add a nice fade out effect
            this.scene.tweens.add({
                targets: noFruitsMsg,
                y: noFruitsMsg.y - 30,
                alpha: 0,
                duration: 2000,
                ease: 'Cubic.easeOut',
                onComplete: () => noFruitsMsg.destroy()
            });

            return;
        }

        // Move player closer to the tree if they're far away
        const distance = Phaser.Math.Distance.Between(player.x, player.y, tree.x, tree.y);
        logger.info(LogCategory.ENVIRONMENT, `Distance to tree for fruit gathering: ${distance} pixels`);

        if (distance > 50) {
            logger.info(LogCategory.ENVIRONMENT, 'Player is too far from tree for fruit gathering, moving closer');
            
            // Calculate target position near the tree
            const angle = Phaser.Math.Angle.Between(player.x, player.y, tree.x, tree.y);
            const targetX = tree.x - Math.cos(angle) * 40;
            const targetY = tree.y - Math.sin(angle) * 40;
            
            logger.info(LogCategory.ENVIRONMENT, `Moving player to: ${targetX}, ${targetY} for fruit gathering`);

            // Convert target position to lat/lng
            const targetLatLng = this.mapManager.pixelToLatLng(targetX, targetY);
            
            if (!targetLatLng) {
                logger.error(LogCategory.ENVIRONMENT, 'Failed to convert target position to lat/lng');
                return;
            }
            
            logger.info(LogCategory.ENVIRONMENT, `Target lat/lng: ${targetLatLng.lat}, ${targetLatLng.lng}`);
            
            // Set up a one-time event listener for when the player reaches the target
            const reachTargetListener = (position) => {
                logger.info(LogCategory.ENVIRONMENT, 'Player reached tree position for fruit gathering');
                // Perform the gathering action
                this.performGatherFruits(tree, fruitSprites, player);
                
                // Remove this listener
                this.mapManager.onPlayerReachTarget = this.originalReachTargetCallback;
            };
            
            // Save the original callback
            this.originalReachTargetCallback = this.mapManager.onPlayerReachTarget;
            
            // Set our callback
            this.mapManager.onPlayerReachTarget = reachTargetListener;
            
            // Move the player using the mapManager
            const success = this.mapManager.setTargetPosition(targetLatLng.lat, targetLatLng.lng);
            
            if (!success) {
                logger.error(LogCategory.ENVIRONMENT, 'Failed to set target position for fruit gathering');
                // Restore original callback
                this.mapManager.onPlayerReachTarget = this.originalReachTargetCallback;
                return;
            }
            
            // Face the player toward the tree
            if (tree.x > player.x) {
                player.setFlipX(false);
            } else {
                player.setFlipX(true);
            }
        } else {
            // Player is close enough, gather immediately
            this.performGatherFruits(tree, fruitSprites, player);
        }
    }

    /**
     * Perform the actual fruit gathering action
     */
    performGatherFruits(
        tree,
        fruitSprites,
        player
    ) {
        // Face the player toward the tree
        if (tree.x > player.x) {
            player.setFlipX(false);
        } else {
            player.setFlipX(true);
        }

        // Track gathered fruits
        const gatheredFruits = {};
        let totalFruits = 0;
        let totalHealing = 0;
        let hasHealingFruits = false;

        // Process each fruit with a slight delay between them
        for (let index = 0; index < fruitSprites.length; index++) {
            const fruit = fruitSprites[index];

            // Get fruit data
            const fruitFrame = fruit.getData('fruitFrame');
            const healingPower = fruit.getData('healingPower') || 0;
            const isHealingFruit = fruit.getData('fromHealingSpruce') || false;

            if (isHealingFruit) {
                hasHealingFruits = true;
                totalHealing += healingPower;
            }

            // Determine which fruit item to add based on the frame
            let itemId = 'food_apple';
            let fruitName = 'Fruit';

            switch (fruitFrame) {
                case 0:
                    itemId = 'food_apple';
                    fruitName = isHealingFruit ? 'Healing Apple' : 'Apple';
                    break;
                case 1:
                    itemId = 'food_orange';
                    fruitName = isHealingFruit ? 'Healing Orange' : 'Orange';
                    break;
                case 3:
                    itemId = 'food_cherry';
                    fruitName = isHealingFruit ? 'Healing Cherry' : 'Cherry';
                    break;
                default:
                    itemId = 'food_apple'; // Default to apple
                    fruitName = isHealingFruit ? 'Healing Fruit' : 'Fruit';
            }

            // Add to gathered count
            if (!gatheredFruits[fruitName]) {
                gatheredFruits[fruitName] = 0;
            }
            gatheredFruits[fruitName]++;
            totalFruits++;

            // Add tween to animate fruit collection
            this.scene.tweens.add({
                targets: fruit,
                x: player.x,
                y: player.y,
                alpha: 0,
                scale: 0.5,
                duration: 500,
                ease: 'Quad.easeIn',
                delay: index * 200, // Stagger the collection
                onComplete: () => {
                    // Add the fruit to inventory
                    this.scene.events.emit('add-item-to-inventory', { itemId, quantity: 1 });

                    // If this is a healing fruit, create a healing effect
                    if (isHealingFruit && healingPower > 0) {
                        // Emit healing event
                        this.scene.events.emit('player-healed', healingPower);
                    }

                    // Remove the fruit sprite and its glow effect if it exists
                    const glowEffect = fruit.getData('glowEffect');
                    if (glowEffect) {
                        glowEffect.destroy();
                    }
                    fruit.destroy();

                    // If this is the last fruit, show the summary message and apply healing
                    if (index === fruitSprites.length - 1) {
                        // Apply healing if there were healing fruits
                        if (hasHealingFruits && totalHealing > 0) {
                            // Emit healing event
                            this.scene.events.emit('player-healed', totalHealing);
                        }

                        // Show success message after all fruits are gathered
                        let message = "You gathered:";
                        for (const [fruitName, count] of Object.entries(gatheredFruits)) {
                            message += `\n${count}x ${fruitName}`;
                        }

                        // Add healing message if applicable
                        if (hasHealingFruits && totalHealing > 0) {
                            message += `\n\nHealed for ${totalHealing} HP!`;
                        }

                        // Display the message
                        const gatherMsg = this.scene.add.text(tree.x, tree.y - 50, message, {
                            fontSize: '16px',
                            fontFamily: 'Cinzel, Times New Roman, serif',
                            color: '#e8d4b9',
                            stroke: '#2a1a0a',
                            strokeThickness: 4,
                            align: 'center',
                            shadow: {
                                offsetX: 2,
                                offsetY: 2,
                                color: '#000',
                                blur: 4,
                                fill: true
                            }
                        }).setOrigin(0.5);

                        // Fade out and destroy
                        this.scene.tweens.add({
                            targets: gatherMsg,
                            alpha: 0,
                            y: gatherMsg.y - 30,
                            duration: 2000,
                            onComplete: () => gatherMsg.destroy()
                        });

                        // Add some XP for gathering
                        this.scene.events.emit('add-skill-points', Math.ceil(totalFruits / 2));
                    }
                }
            });
        }
    }

    /**
     * Create wood chip particles
     */
    createWoodChipParticles(x, y) {
        if (!this.scene.textures.exists('wood-chip')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0x8B4513);
            graphics.fillRect(0, 0, 8, 4);
            graphics.generateTexture('wood-chip', 8, 4);
        }

        const particles = this.scene.add.particles(x, y, 'wood-chip', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            gravityY: 300,
            quantity: 10,
            emitting: false
        });

        particles.explode();

        this.scene.time.delayedCall(1100, () => particles.destroy());
    }

    /**
     * Get all healing auras in the environment
     */
    getHealingAuras() {
        return this.environmentGroup.getChildren().filter(obj => {
            return obj instanceof Phaser.GameObjects.Arc && obj.getData('healingPower') !== undefined;
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.scene.events.off('tree-interact');
    }

    /**
     * Show a visual effect for a healing aura around a tree
     * @param tree The tree with the healing aura
     */
    showHealingAuraEffect(tree) {
        // Get the tree as a sprite or image to access position properties
        const treeObj = tree;

        // Create a subtle green circle around the tree
        const auraCircle = this.scene.add.circle(treeObj.x, treeObj.y, 100, 0x00ff00, 0.05);
        auraCircle.setDepth(treeObj.depth - 1); // Behind the tree

        // Store the circle on the tree
        tree.setData('auraCircle', auraCircle);

        // Create a pulsing effect
        this.scene.tweens.add({
            targets: auraCircle,
            alpha: 0.15,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Auto-hide after 5 seconds if player leaves the area
        this.scene.time.delayedCall(5000, () => {
            if (!tree.getData('auraVisible') && auraCircle && auraCircle.active) {
                this.scene.tweens.add({
                    targets: auraCircle,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        auraCircle.destroy();
                    }
                });
            }
        });
    }

    /**
     * Create fallback textures for trees if they don't exist
     */
    createFallbackTextures() {
        const requiredTextures = ['tree_oak', 'tree_pine', 'tree_birch', 'tree_spruce'];
        
        logger.info(LogCategory.ENVIRONMENT, "Checking tree textures...");
        
        for (const textureName of requiredTextures) {
            if (!this.scene.textures.exists(textureName)) {
                logger.warn(LogCategory.ENVIRONMENT, `Texture ${textureName} not found, creating fallback`);
                
                try {
                    // Create a graphics object for the fallback texture
                    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
                    
                    // Draw a simple tree shape
                    graphics.clear();
                    
                    // Draw trunk
                    graphics.fillStyle(0x8B4513); // Brown
                    graphics.fillRect(15, 40, 10, 40); // Trunk
                    
                    // Draw canopy
                    graphics.fillStyle(0x228B22); // Forest green
                    graphics.fillCircle(20, 25, 20); // Canopy
                    
                    // Generate the texture
                    graphics.generateTexture(textureName, 40, 80);
                    
                    // Clean up the graphics object
                    graphics.destroy();
                    
                    // Verify the texture was created
                    if (this.scene.textures.exists(textureName)) {
                        logger.info(LogCategory.ENVIRONMENT, `Successfully created fallback texture for ${textureName}`);
                    } else {
                        logger.error(LogCategory.ENVIRONMENT, `Failed to create texture ${textureName} despite no errors`);
                    }
                } catch (error) {
                    logger.error(LogCategory.ENVIRONMENT, `Failed to create fallback texture for ${textureName}:`, error);
                }
            } else {
                logger.info(LogCategory.ENVIRONMENT, `Texture ${textureName} already exists`);
            }
        }
    }
} 