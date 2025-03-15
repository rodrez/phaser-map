import { logger, LogCategory } from '../utils/Logger';

/**
 * EquipmentVisualManager - Manages visual representation of equipped items on the player
 */
export class EquipmentVisualManager {
    /**
     * Create a new equipment visual manager
     * @param {Object} scene - The scene this manager belongs to
     * @param {Object} playerManager - The player manager instance
     * @param {Object} equipmentManager - The equipment manager instance
     */
    constructor(scene, playerManager, equipmentManager) {
        this.scene = scene;
        this.playerManager = playerManager;
        this.equipmentManager = equipmentManager;
        
        // Visual elements for each equipment slot
        this.visuals = {
            weapon: null,
            helmet: null,
            chest: null,
            boots: null,
            shield: null
        };
        
        // Initialize visuals
        this.initialize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.info(LogCategory.INVENTORY, 'EquipmentVisualManager initialized');
    }
    
    /**
     * Initialize the visual elements
     */
    initialize() {
        // Get player sprite
        this.player = this.playerManager.getPlayer();
        
        if (!this.player) {
            logger.warn(LogCategory.INVENTORY, 'Cannot initialize equipment visuals: Player not found');
            return;
        }
        
        // Create container for equipment visuals
        this.container = this.scene.add.container(this.player.x, this.player.y);
        this.container.setDepth(this.player.depth - 1); // Behind player
        
        // Create visual elements for each equipment slot
        this.createVisualElements();
        
        // Update visuals based on current equipment
        this.updateVisuals();
    }
    
    /**
     * Create visual elements for each equipment slot
     */
    createVisualElements() {
        // Weapon visual
        this.visuals.weapon = this.scene.add.sprite(0, 0, 'default-item');
        this.visuals.weapon.setVisible(false);
        this.visuals.weapon.setScale(0.5);
        this.container.add(this.visuals.weapon);
        
        // Helmet visual
        this.visuals.helmet = this.scene.add.sprite(0, -20, 'default-item');
        this.visuals.helmet.setVisible(false);
        this.visuals.helmet.setScale(0.3);
        this.container.add(this.visuals.helmet);
        
        // Chest visual
        this.visuals.chest = this.scene.add.sprite(0, 0, 'default-item');
        this.visuals.chest.setVisible(false);
        this.visuals.chest.setScale(0.5);
        this.container.add(this.visuals.chest);
        
        // Boots visual
        this.visuals.boots = this.scene.add.sprite(0, 20, 'default-item');
        this.visuals.boots.setVisible(false);
        this.visuals.boots.setScale(0.3);
        this.container.add(this.visuals.boots);
        
        // Shield visual
        this.visuals.shield = this.scene.add.sprite(-15, 0, 'default-item');
        this.visuals.shield.setVisible(false);
        this.visuals.shield.setScale(0.4);
        this.container.add(this.visuals.shield);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for equipment changes
        this.equipmentManager.events.on('equipment-changed', this.updateVisuals, this);
        
        // Listen for player movement
        if (this.player) {
            this.player.on('animationupdate', this.updatePosition, this);
        }
    }
    
    /**
     * Update the visual elements based on equipped items
     */
    updateVisuals() {
        // Get all equipped items
        const equipment = this.equipmentManager.getAllEquippedItems();
        
        // Update each visual element
        for (const [slot, item] of Object.entries(equipment)) {
            const visual = this.visuals[slot];
            
            if (!visual) continue;
            
            if (item) {
                // Update texture
                visual.setTexture(item.iconUrl || 'default-item');
                visual.setVisible(true);
                
                // Apply special visual effects based on item rarity
                this.applyRarityEffects(visual, item.rarity);
            } else {
                // Hide visual for empty slot
                visual.setVisible(false);
            }
        }
        
        // Update position
        this.updatePosition();
    }
    
    /**
     * Apply visual effects based on item rarity
     * @param {Object} visual - The visual element
     * @param {string} rarity - The item rarity
     */
    applyRarityEffects(visual, rarity) {
        // Reset effects
        visual.setTint(0xffffff);
        
        // Apply effects based on rarity
        switch (rarity) {
            case 'uncommon':
                visual.setTint(0x1eff00);
                break;
            case 'rare':
                visual.setTint(0x0070dd);
                break;
            case 'epic':
                visual.setTint(0xa335ee);
                break;
            case 'legendary':
                visual.setTint(0xff8000);
                // Add glow effect for legendary items
                if (!visual.postFX) {
                    visual.postFX = this.scene.add.postFX(visual, 'glow', { distance: 8, outerStrength: 1, innerStrength: 1, color: 0xff8000 });
                }
                break;
            case 'mythic':
                visual.setTint(0xe6cc80);
                // Add glow effect for mythic items
                if (!visual.postFX) {
                    visual.postFX = this.scene.add.postFX(visual, 'glow', { distance: 10, outerStrength: 2, innerStrength: 1, color: 0xe6cc80 });
                }
                break;
            default:
                // No special effects for common items
                break;
        }
    }
    
    /**
     * Update the position of the visual elements to follow the player
     */
    updatePosition() {
        if (!this.player || !this.container) return;
        
        // Update container position to match player
        this.container.setPosition(this.player.x, this.player.y);
        
        // Get player animation and frame
        const anim = this.player.anims.currentAnim;
        const frame = this.player.anims.currentFrame;
        
        if (!anim || !frame) return;
        
        // Adjust equipment positions based on player animation
        const animKey = anim.key;
        
        // Determine player direction
        let direction = 'down';
        if (animKey.includes('up')) direction = 'up';
        else if (animKey.includes('left')) direction = 'left';
        else if (animKey.includes('right')) direction = 'right';
        
        // Adjust weapon position based on direction
        if (this.visuals.weapon.visible) {
            switch (direction) {
                case 'up':
                    this.visuals.weapon.setPosition(15, -5);
                    this.visuals.weapon.setFlipX(false);
                    break;
                case 'down':
                    this.visuals.weapon.setPosition(15, 5);
                    this.visuals.weapon.setFlipX(false);
                    break;
                case 'left':
                    this.visuals.weapon.setPosition(-15, 0);
                    this.visuals.weapon.setFlipX(true);
                    break;
                case 'right':
                    this.visuals.weapon.setPosition(15, 0);
                    this.visuals.weapon.setFlipX(false);
                    break;
            }
        }
        
        // Adjust shield position based on direction
        if (this.visuals.shield.visible) {
            switch (direction) {
                case 'up':
                    this.visuals.shield.setPosition(-15, -5);
                    this.visuals.shield.setFlipX(true);
                    break;
                case 'down':
                    this.visuals.shield.setPosition(-15, 5);
                    this.visuals.shield.setFlipX(true);
                    break;
                case 'left':
                    this.visuals.shield.setPosition(-15, 0);
                    this.visuals.shield.setFlipX(false);
                    break;
                case 'right':
                    this.visuals.shield.setPosition(15, 0);
                    this.visuals.shield.setFlipX(true);
                    break;
            }
        }
    }
    
    /**
     * Update method to be called in the scene's update loop
     */
    update() {
        // Update position to follow the player
        this.updatePosition();
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.equipmentManager.events.off('equipment-changed', this.updateVisuals, this);
        
        if (this.player) {
            this.player.off('animationupdate', this.updatePosition, this);
        }
        
        // Destroy visual elements
        for (const visual of Object.values(this.visuals)) {
            if (visual) {
                visual.destroy();
            }
        }
        
        // Destroy container
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
        // Clear references
        this.visuals = {};
        this.player = null;
        
        logger.info(LogCategory.INVENTORY, 'EquipmentVisualManager destroyed');
    }
} 