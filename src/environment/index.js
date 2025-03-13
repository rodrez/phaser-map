import { TreeSystem } from './tree';
import { FruitSystem } from './fruit';

/**
 * Main environment system that coordinates all environment-related subsystems
 */
export class Environment {
    scene;
    environmentGroup;
    treeSystem;
    fruitSystem;
    popupSystem;
    
    constructor(scene) {
        this.scene = scene;
        this.environmentGroup = this.scene.add.group();
        
        // Initialize subsystems
        this.treeSystem = new TreeSystem(scene, this.environmentGroup);
        this.fruitSystem = new FruitSystem(scene, this.environmentGroup);
        
        // Setup interactions between systems
        this.setupSystemInteractions();
    }
    
    /**
     * Set the popup system reference
     */
    setPopupSystem(popupSystem) {
        this.popupSystem = popupSystem;
        
        // Pass popup system to subsystems
        this.treeSystem.setPopupSystem(popupSystem);
        this.fruitSystem.setPopupSystem(popupSystem);
    }
    
    /**
     * Setup interactions between different environment systems
     */
    setupSystemInteractions() {
        // Listen for tree destruction to handle attached fruits
        this.scene.events.on('tree-destroyed', (tree) => {
            this.fruitSystem.handleTreeDestruction(tree);
        });
    }
    
    /**
     * Generate environment elements within a circular area
     * @param centerX Center X of circle
     * @param centerY Center Y of circle
     * @param radius Radius of circle
     */
    generateEnvironment(centerX, centerY, radius) {
        // Clear any existing environment objects
        this.clearEnvironment();
        
        // Add trees within the navigation circle
        this.treeSystem.addTreesInCircle(12, centerX, centerY, radius * 0.8);
        
        // Add fruits to healing spruce trees
        const trees = this.environmentGroup.getChildren().filter(obj => 
            (obj instanceof Phaser.GameObjects.Sprite || obj instanceof Phaser.GameObjects.Image) && 
            obj.getData('isHealingSpruce') === true
        );
        
        // Add fruits to each healing spruce tree
        trees.forEach(tree => {
            this.fruitSystem.addFruitsToTree(tree);
        });
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
     * Clean up resources
     */
    destroy() {
        this.scene.events.off('tree-destroyed');
        this.clearEnvironment();
        this.treeSystem.destroy();
        this.fruitSystem.destroy();
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