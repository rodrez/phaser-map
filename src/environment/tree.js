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
        this.mapManager = scene?.mapManager;
        
        logger.info(LogCategory.ENVIRONMENT, "TreeSystem initialized");
        
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
        
        // Make tree interactive with proper hitbox
        tree.setInteractive({ useHandCursor: true, pixelPerfect: false });

        // Set up hover effects
        tree.on('pointerover', () => {
            tree.setTint(0xDDDDDD);
        });
        
        tree.on('pointerout', () => {
            tree.clearTint();
        });
        
        // Set up click handler
        tree.on('pointerdown', () => {
            logger.info(LogCategory.ENVIRONMENT, "Tree clicked:", tree.x, tree.y);
            
            // Prevent event propagation to avoid map interaction
            if (this.scene?.input?.activePointer) {
                this.scene.input.activePointer.event?.stopPropagation();
            }
            
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

        logger.info(LogCategory.ENVIRONMENT, "Showing tree interaction popup");

        const isHealingSpruce = tree.getData('isHealingSpruce') || false;
        const treeName = isHealingSpruce ? 'Healing Spruce' : 'Oak Tree';

        // Create tree icon SVG based on tree type
        const treeIcon = isHealingSpruce 
            ? `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5a9d5a" stroke-width="2">
                <path d="M12 2L5 12l3 1-2 6h12l-2-6 3-1z"/>
                <circle cx="12" cy="8" r="2" stroke="#5a9d5a" fill="rgba(90, 157, 90, 0.3)"/>
               </svg>`
            : `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c8a165" stroke-width="2">
                <path d="M12 2L7 12h4v8h2v-8h4L12 2z"/>
               </svg>`;

        // Prepare description based on tree type
        const description = isHealingSpruce 
            ? 'A magical tree with healing properties. Its needles shimmer with a faint green glow.'
            : 'A sturdy tree with thick branches and lush foliage.';

        // Prepare actions
        const actions = [
            {
                text: "Examine",
                onClick: () => {
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
                    if (this.popupSystem) {
                        this.popupSystem.closePopupsByClass('tree-popup');
                    }
                    this.chopTree(tree);
                },
                className: "popup-button-danger"
            }
        ];

        // Add gather fruits action if it's a spruce tree
        if (isHealingSpruce) {
            actions.push({
                text: "Gather Fruits",
                onClick: () => {
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
            title: treeName,
            description: description,
            icon: treeIcon,
            actions: actions,
            className: 'tree-popup',
            closeButton: true,
            width: 400
        });
    }

    /**
     * Create a tree at the specified lat/lng position
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Phaser.GameObjects.Sprite} - The created tree sprite
     */
    createTree(lat, lng) {
        if (!this.mapManager || !this.mapManager.latLngToPixel) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot create tree: mapManager is missing");
            return null;
        }
        
        // Convert lat/lng to pixel coordinates
        const pixelPos = this.mapManager.latLngToPixel(lat, lng);
        if (!pixelPos) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot create tree: invalid pixel coordinates");
            return null;
        }
        
        // Randomly choose between oak and spruce with 30% chance for spruce
        const isHealingSpruce = Math.random() < 0.3;
        const treeData = isHealingSpruce ? this.treeTypes.healingSpruce : this.treeTypes.oak;
        const textureKey = treeData.texture;
        
        // Create tree sprite
        const tree = this.scene.add.sprite(pixelPos.x, pixelPos.y, textureKey);
        tree.setOrigin(0.5, 1); // Set origin to bottom center for proper placement
        tree.setScale(treeData.scale || 1);
        tree.setDepth(pixelPos.y); // Use y position for depth sorting
        
        // Store tree data
        tree.setData('isTree', true);
        tree.setData('type', 'tree');
        tree.setData('health', treeData.health || 100);
        tree.setData('isHealingSpruce', isHealingSpruce);
        tree.setData('treeName', isHealingSpruce ? 'Healing Spruce' : 'Oak Tree');
        tree.setData('woodYield', treeData.woodYield || 1);
        tree.setData('lat', lat);
        tree.setData('lng', lng);
        
        // Add to environment group
        this.environmentGroup.add(tree);
        
        // Make tree interactive
        this.setupTreeInteractionsForTree(tree);
        
        // Add healing aura if this is a spruce
        if (isHealingSpruce) {
            this.createHealingAura(tree);
        }
        
        return tree;
    }

    /**
     * Create a healing aura around a spruce tree
     */
    createHealingAura(tree) {
        const healingAura = this.scene.add.circle(
            tree.x, 
            tree.y - tree.height * 0.5, 
            50, 
            0x00ff00, 
            0.1
        );
        healingAura.setDepth(tree.depth - 1);
        healingAura.setData('healingPower', 5);
        healingAura.setData('parentTree', tree);
        tree.setData('healingAura', healingAura);
        
        // Add pulsing effect to the aura
        this.scene.tweens.add({
            targets: healingAura,
            alpha: 0.2,
            scale: 1.1,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
        
        this.environmentGroup.add(healingAura);
    }

    /**
     * Examine a tree
     */
    examineTree(tree) {
        const treeName = tree.getData('treeName') || 'Tree';
        const isHealingSpruce = tree.getData('isHealingSpruce') || false;

        // Message based on tree type
        const message = isHealingSpruce
            ? `The ${treeName} emits a soft, healing aura.`
            : `A sturdy ${treeName} that could provide good wood.`;

        // Show notification
        const treeMessage = this.scene.add.text(tree.x, tree.y - 50, message, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Add a fade out effect
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
     * Chop down a tree
     */
    chopTree(tree) {
        // Get player from the scene
        const player = this.scene.registry.get('player') || 
                      (this.scene.playerManager ? this.scene.playerManager.getPlayer() : null);
        
        if (!player) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot chop tree: player not found");
            return;
        }

        // Determine wood amount based on tree type
        const woodYield = tree.getData('woodYield') || 1;
        const treeName = tree.getData('treeName') || 'Tree';
        
        // Create wood chip particles
        this.createWoodChipParticles(tree.x, tree.y);
        
        // Add wood to inventory
        this.scene.events.emit('add-item-to-inventory', { itemId: 'wood', quantity: woodYield });
        
        // Show success message
        const message = `You gathered ${woodYield} wood from the ${treeName}!`;
        const woodMsg = this.scene.add.text(tree.x, tree.y - 50, message, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Fade out and destroy
        this.scene.tweens.add({
            targets: woodMsg,
            alpha: 0,
            y: woodMsg.y - 30,
            duration: 2000,
            onComplete: () => woodMsg.destroy()
        });

        // Make the tree disappear with a falling animation
        this.scene.tweens.add({
            targets: tree,
            y: tree.y + 20,
            alpha: 0,
            angle: tree.angle + Phaser.Math.Between(-15, 15),
            duration: 800,
            ease: 'Quad.easeIn',
            onComplete: () => {
                // Remove any healing aura
                const healingAura = tree.getData('healingAura');
                if (healingAura) {
                    healingAura.destroy();
                }
                
                // Remove the tree
                tree.destroy();
                
                // Emit tree destroyed event
                this.scene.events.emit('tree-destroyed', tree);
            }
        });

        // Add some XP for woodcutting
        this.scene.events.emit('add-skill-points', 1);
    }

    /**
     * Handle gathering fruits from a tree (only for spruce trees)
     */
    handleGatherFruits(tree) {
        if (!tree.getData('isHealingSpruce')) {
            logger.info(LogCategory.ENVIRONMENT, "Cannot gather fruits: not a spruce tree");
            return;
        }
        
        // Get healing power from the tree
        const healingPower = this.treeTypes.healingSpruce.healingPower || 5;
        
        // Apply healing
        this.scene.events.emit('player-healed', healingPower);
        
        // Show success message
        const message = `You gathered healing fruits!\nHealed for ${healingPower} HP!`;
        const fruitMsg = this.scene.add.text(tree.x, tree.y - 50, message, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Fade out and destroy
        this.scene.tweens.add({
            targets: fruitMsg,
            alpha: 0,
            y: fruitMsg.y - 30,
            duration: 2000,
            onComplete: () => fruitMsg.destroy()
        });

        // Add some XP for gathering
        this.scene.events.emit('add-skill-points', 1);
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
     * Create fallback textures for trees if they don't exist
     */
    createFallbackTextures() {
        const requiredTextures = ['tree', 'spruce-tree'];
        
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
                    
                    // Draw canopy (different shape for spruce)
                    if (textureName === 'spruce-tree') {
                        // Draw a triangle for spruce
                        graphics.fillStyle(0x2E8B57); // Sea green for spruce
                        graphics.beginPath();
                        graphics.moveTo(20, 0);  // top point
                        graphics.lineTo(0, 40);  // bottom left
                        graphics.lineTo(40, 40); // bottom right
                        graphics.closePath();
                        graphics.fill();
                    } else {
                        // Draw a circle for regular tree
                        graphics.fillStyle(0x228B22); // Forest green
                        graphics.fillCircle(20, 25, 20); // Canopy
                    }
                    
                    // Generate the texture
                    graphics.generateTexture(textureName, 40, 80);
                    graphics.destroy();
                } catch (error) {
                    logger.error(LogCategory.ENVIRONMENT, `Failed to create fallback texture: ${error}`);
                }
            }
        }
    }

    /**
     * Set the environment reference
     */
    setEnvironment(environment) {
        this.environment = environment;
    }
    
    /**
     * Set the map manager reference
     */
    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }
    
    /**
     * Update tree positions after map changes
     */
    updateTreePositions() {
        if (!this.mapManager) return;
        
        // Get all trees from the environment group
        const trees = this.environmentGroup?.getChildren().filter(obj => 
            obj.getData('isTree') === true
        );
        
        // Update each tree's position
        for (const tree of trees) {
            const lat = tree.getData('lat');
            const lng = tree.getData('lng');
            
            if (lat && lng) {
                const pixelPos = this.mapManager.latLngToPixel(lat, lng);
                tree.x = pixelPos.x;
                tree.y = pixelPos.y;
                tree.setDepth(pixelPos.y); // Update depth based on new y position
                
                // Update healing aura position if it exists
                const healingAura = tree.getData('healingAura');
                if (healingAura) {
                    healingAura.x = pixelPos.x;
                    healingAura.y = pixelPos.y - tree.height * 0.5;
                    healingAura.setDepth(pixelPos.y - 1);
                }
            }
        }
    }

    /**
     * Apply healing to player when inside a healing aura
     * This should be called periodically from the game update loop
     */
    checkHealingAuras() {
        const player = this.scene.registry.get('player') || 
                     (this.scene.playerManager ? this.scene.playerManager.getPlayer() : null);
        
        if (!player) return;
        
        // Get all healing auras
        const healingAuras = this.environmentGroup?.getChildren().filter(obj => 
            obj.getData('healingPower') !== undefined
        );
        
        // Check if player is inside any healing aura
        for (const aura of healingAuras) {
            const distance = Phaser.Math.Distance.Between(
                player.x, player.y, 
                aura.x, aura.y
            );
            
            // If player is inside the aura radius
            if (distance <= aura.width / 2) {
                const healingPower = aura.getData('healingPower');
                
                // Only apply healing every 3 seconds to avoid constant healing
                if (!aura.lastHealTime || (this.scene.time.now - aura.lastHealTime > 3000)) {
                    // Apply healing
                    this.scene.events.emit('player-healed', healingPower);
                    aura.lastHealTime = this.scene.time.now;
                    
                    // Show healing effect
                    this.showHealingEffect(player);
                }
            }
        }
    }
    
    /**
     * Show a visual healing effect on the player
     */
    showHealingEffect(player) {
        // Create a healing particles effect
        const particles = this.scene.add.particles(player.x, player.y, 'wood-chip', {
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            tint: 0x00FF00, // Green for healing
            quantity: 5,
            emitting: false
        });

        particles.explode();

        this.scene.time.delayedCall(1100, () => particles.destroy());
    }
    
    /**
     * Generate trees around a center point using lat/lng coordinates
     * @param {number} centerLat - Center latitude
     * @param {number} centerLng - Center longitude
     * @param {number} radiusMeters - Radius in meters
     * @param {number} count - Number of trees to generate (default: 6)
     */
    generateTrees(centerLat, centerLng, radiusMeters, count = 6) {
        if (!this.mapManager || !this.mapManager.destinationPoint) {
            logger.error(LogCategory.ENVIRONMENT, "Cannot generate trees: mapManager is missing");
            return;
        }
        
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
                
                if (position) {
                    // Create tree at this position
                    this.createTree(position.lat, position.lng);
                }
            } catch (error) {
                logger.error(LogCategory.ENVIRONMENT, `Error generating tree: ${error}`);
            }
        }
    }
    
    /**
     * Clean up resources when destroying the system
     */
    destroy() {
        this.scene.events.off('tree-interact');
    }

    /**
     * Get all healing auras in the environment
     * @returns {Array} Array of healing aura game objects
     */
    getHealingAuras() {
        if (!this.environmentGroup) return [];
        
        return this.environmentGroup.getChildren().filter(obj => 
            obj.getData('healingPower') !== undefined
        );
    }
    
    /**
     * Show a visual effect for a healing aura around a tree
     * @param {object} tree The tree with the healing aura
     */
    showHealingAuraEffect(tree) {
        if (!tree) return;
        
        // Get the existing healing aura
        const healingAura = tree.getData('healingAura');
        
        if (healingAura) {
            // Make it more visible temporarily
            this.scene.tweens.add({
                targets: healingAura,
                alpha: 0.3,
                duration: 500,
                yoyo: true,
                repeat: 3
            });
        }
    }
} 