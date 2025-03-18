import { InteractiveSprite } from '../utils/InteractiveGameObject';
import { logger, LogCategory } from "../utils/Logger";

/**
 * Custom interactive tree that extends InteractiveSprite
 * This shows how simple it is to create interactive objects using inheritance
 */
export class InteractiveTree extends InteractiveSprite {
    /**
     * Create a new interactive tree
     * @param {Phaser.Scene} scene - The scene to add this tree to
     * @param {number} x - The x position
     * @param {number} y - The y position
     * @param {string} treeType - The type of tree ('oak' or 'spruce')
     */
    constructor(scene, x, y, treeType = 'oak') {
        // Choose texture based on tree type
        const texture = treeType === 'spruce' ? 'spruce-tree' : 'tree';
        
        // Call parent constructor with the appropriate texture
        super(scene, x, y, texture, {
            objectType: `${treeType}-tree`,
            hitArea: { useHandCursor: true, pixelPerfect: false }
        });
        
        // Store tree-specific properties
        this.treeType = treeType;
        this.health = treeType === 'spruce' ? 130 : 150;
        this.woodYield = treeType === 'spruce' ? 2 : 3;
        this.isHealingSpruce = treeType === 'spruce';
        
        // Set scale based on tree type
        this.setScale(treeType === 'spruce' ? 1.3 : 1.2);
        
        // Set origin to bottom center for proper placement
        this.setOrigin(0.5, 1);
        
        // Add healing aura for spruce trees
        if (this.isHealingSpruce) {
            this.createHealingAura();
        }
        
        // Store properties as data for compatibility with existing code
        this.setData('isTree', true);
        this.setData('type', 'tree');
        this.setData('health', this.health);
        this.setData('isHealingSpruce', this.isHealingSpruce);
        this.setData('treeName', this.isHealingSpruce ? 'Healing Spruce' : 'Oak Tree');
        this.setData('woodYield', this.woodYield);
        this.setData('treeType', treeType);
    }
    
    /**
     * Override the single click handler to emit the tree-interact event
     */
    onSingleClick() {
        logger.info(LogCategory.ENVIRONMENT, `Tree clicked: ${this.x}, ${this.y}`);
        this.scene.events.emit('tree-interact', this);
    }
    
    /**
     * Override getDoubleClickData to include tree-specific information
     */
    getDoubleClickData() {
        return {
            x: this.x,
            y: this.y,
            source: 'tree',
            type: this.treeType
        };
    }
    
    /**
     * Create a healing aura around a spruce tree
     */
    createHealingAura() {
        const healingAura = this.scene.add.circle(
            this.x, 
            this.y - this.height * 0.5, 
            50, 
            0x00ff00, 
            0.1
        );
        healingAura.setDepth(this.depth - 1);
        healingAura.setData('healingPower', 5);
        healingAura.setData('parentTree', this);
        this.healingAura = healingAura;
        this.setData('healingAura', healingAura);
        
        // Add pulsing effect to the aura
        this.scene.tweens.add({
            targets: healingAura,
            alpha: 0.2,
            scale: 1.1,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }
    
    /**
     * Update the position of the healing aura (if any)
     */
    updateHealingAuraPosition() {
        if (this.healingAura) {
            this.healingAura.x = this.x;
            this.healingAura.y = this.y - this.height * 0.5;
            this.healingAura.setDepth(this.depth - 1);
        }
    }
    
    /**
     * Override setPosition to update healing aura position
     */
    setPosition(x, y) {
        super.setPosition(x, y);
        this.updateHealingAuraPosition();
        return this;
    }
    
    /**
     * Destroy this tree and its healing aura
     */
    destroy(fromScene) {
        // Destroy healing aura if it exists
        if (this.healingAura) {
            this.healingAura.destroy();
            this.healingAura = null;
        }
        
        // Emit tree destroyed event
        this.scene.events.emit('tree-destroyed', this);
        
        // Call parent destroy
        super.destroy(fromScene);
    }
}

/**
 * Example of how to use the InteractiveTree class in a scene
 */
export class TreeSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Setup global tree interaction events
        this.setupTreeInteractions();
    }
    
    /**
     * Set up global tree interaction events
     */
    setupTreeInteractions() {
        this.scene.events.on('tree-interact', (tree) => {
            this.showTreeInteractionPopup(tree);
        });
    }
    
    /**
     * Create a tree at the specified position
     * 
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} treeType - Type of tree ('oak' or 'spruce')
     * @returns {InteractiveTree} - The created tree
     */
    createTree(x, y, treeType = 'oak') {
        // Create a tree
        const tree = new InteractiveTree(this.scene, x, y, treeType);
        
        // Set depth for proper sorting
        tree.setDepth(y);
        
        return tree;
    }
    
    /**
     * Show a tree interaction popup
     * This would be the same as in your original code
     */
    showTreeInteractionPopup(tree) {
        logger.info(LogCategory.ENVIRONMENT, "Would show tree interaction popup here");
        
        // The rest of your popup code would go here
        // ...
    }
} 