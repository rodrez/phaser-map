import { logger, LogCategory } from '../utils/Logger';
import { StatusEffectType } from '../utils/StatusEffectSystem';

/**
 * UI component for displaying active status effects
 */
export class StatusEffectsUI {
    /**
     * Create a new status effects UI
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} playerManager - The player manager
     */
    constructor(scene, playerManager) {
        this.scene = scene;
        this.playerManager = playerManager;
        
        // Container for status effect icons
        this.container = null;
        
        // Map of effect type to icon
        this.effectIcons = new Map();
        
        // Initialize the UI
        this.initialize();
        
        // Listen for status effect events
        this.setupEventListeners();
        
        logger.info(LogCategory.UI, 'StatusEffectsUI initialized');
    }
    
    /**
     * Initialize the UI
     */
    initialize() {
        // Create container for status effect icons
        // Position will be updated in updatePosition method
        this.container = this.scene.add.container(0, 0);
        
        // Set container to stay fixed to camera
        this.container.setScrollFactor(0);
        
        // Set depth to ensure it's above other UI elements
        this.container.setDepth(1000);
        
        // Initial position update
        this.updatePosition();
    }
    
    /**
     * Update the position of the status effects container to be below the player's health bar
     */
    updatePosition() {
        if (!this.container) return;
        
        // Get player position and health bar position
        const player = this.playerManager?.getPlayer();
        if (!player) return;
        
        // Position for floating health bar (if using PlayerStatsManager)
        if (this.playerManager.statsManager?.healthBar) {
            // Position below the floating health bar
            const barY = player.y - player.height / 2 - 15; // This is where the health bar is positioned
            const barHeight = 5; // Height of the health bar
            const padding = 5; // Space between health bar and status effects
            
            // Position the container below the health bar
            this.container.x = player.x - 20; // Center horizontally with the health bar
            this.container.y = barY + barHeight + padding;
            
            // Make the container follow the player
            this.container.setScrollFactor(1);
        } 
        // Position for UI health bar (if using VitalsManager)
        else {
            // Default position in the top-left corner if we can't find the health bar
            this.container.x = 10;
            this.container.y = 50;
            
            // Keep fixed to camera
            this.container.setScrollFactor(0);
        }
    }
    
    /**
     * Set up event listeners for status effects
     */
    setupEventListeners() {
        if (!this.playerManager || !this.playerManager.statusEffectSystem) {
            logger.error(LogCategory.UI, 'Cannot set up status effect listeners: playerManager or statusEffectSystem not found');
            return;
        }
        
        // Listen for effect applied
        this.playerManager.statusEffectSystem.on('effect-applied', this.onEffectApplied.bind(this));
        
        // Listen for effect removed
        this.playerManager.statusEffectSystem.on('effect-removed', this.onEffectRemoved.bind(this));
        
        // Listen for effect tick
        this.playerManager.statusEffectSystem.on('effect-tick', this.onEffectTick.bind(this));
    }
    
    /**
     * Handle effect applied event
     * @param {Object} data - Event data
     */
    onEffectApplied(data) {
        const { type, effect } = data;
        
        // Create icon for the effect if it doesn't exist
        if (!this.effectIcons.has(type)) {
            this.createEffectIcon(type, effect);
        } else {
            // Update existing icon
            this.updateEffectIcon(type, effect);
        }
    }
    
    /**
     * Handle effect removed event
     * @param {Object} data - Event data
     */
    onEffectRemoved(data) {
        const { type } = data;
        
        // Remove icon for the effect
        if (this.effectIcons.has(type)) {
            const icon = this.effectIcons.get(type);
            
            // Remove from container
            this.container.remove(icon.background);
            this.container.remove(icon.icon);
            this.container.remove(icon.text);
            
            // Destroy game objects
            icon.background.destroy();
            icon.icon.destroy();
            icon.text.destroy();
            
            // Remove from map
            this.effectIcons.delete(type);
            
            // Reposition remaining icons
            this.repositionIcons();
        }
    }
    
    /**
     * Handle effect tick event
     * @param {Object} data - Event data
     */
    onEffectTick(data) {
        const { type, damage } = data;
        
        // Flash the icon to indicate damage
        if (this.effectIcons.has(type)) {
            const icon = this.effectIcons.get(type);
            
            // Flash the icon
            this.scene.tweens.add({
                targets: icon.icon,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 1
            });
            
            // Update the effect icon
            const effect = this.playerManager.statusEffectSystem.getEffect(type);
            if (effect) {
                this.updateEffectIcon(type, effect);
            }
        }
    }
    
    /**
     * Create an icon for a status effect
     * @param {string} type - The type of status effect
     * @param {Object} effect - The status effect
     */
    createEffectIcon(type, effect) {
        // Calculate position based on number of existing icons
        const index = this.effectIcons.size;
        const x = 0;
        const y = index * 40;
        
        // Create background - 16x16 size with semi-transparent black background
        const background = this.scene.add.rectangle(x, y, 16, 16, 0x000000, 0.7);
        background.setOrigin(0, 0);
        background.setStrokeStyle(1, 0x444444); // Lighter border
        
        // Create icon - smaller scale and centered in the background
        const icon = this.scene.add.sprite(x + 8, y + 8, this.getIconTextureForEffect(type));
        icon.setScale(0.4); // Smaller icon to fit 16x16 background
        
        // Create text for duration - smaller and positioned closer to icon
        const text = this.scene.add.text(x + 8, y + 18, '', {
            fontSize: '8px',
            color: '#ffffff',
            align: 'center'
        });
        text.setOrigin(0.5, 0);
        
        // Add to container
        this.container.add(background);
        this.container.add(icon);
        this.container.add(text);
        
        // Store reference
        this.effectIcons.set(type, { background, icon, text });
        
        // Update text
        this.updateEffectIcon(type, effect);
        
        // Reposition icons to be in a horizontal row
        this.repositionIcons();
    }
    
    /**
     * Update an existing effect icon
     * @param {string} type - The type of status effect
     * @param {Object} effect - The status effect
     */
    updateEffectIcon(type, effect) {
        if (!this.effectIcons.has(type)) return;
        
        const icon = this.effectIcons.get(type);
        
        // Update duration text
        const secondsRemaining = Math.ceil(effect.remainingDuration / 1000);
        icon.text.setText(`${secondsRemaining}s`);
        
        // Always use semi-transparent black background regardless of effect type
        icon.background.setFillStyle(0x000000, 0.7);
    }
    
    /**
     * Reposition icons to be in a horizontal row
     */
    repositionIcons() {
        let index = 0;
        for (const [type, icon] of this.effectIcons.entries()) {
            // Position icons horizontally with less spacing
            const x = index * 20; // Reduced spacing between icons for 16x16 backgrounds
            const y = 0;
            
            // Update positions
            icon.background.setPosition(x, y);
            icon.icon.setPosition(x + 8, y + 8); // Centered in background (8 is half of 16)
            icon.text.setPosition(x + 8, y + 18); // Positioned below the icon
            
            index++;
        }
    }
    
    /**
     * Get the texture key for an effect type
     * @param {string} type - The type of status effect
     * @returns {string} - The texture key
     */
    getIconTextureForEffect(type) {
        // Use the ailment textures loaded in the Preloader
        switch (type) {
            case StatusEffectType.POISON:
                return 'ailment-poison';
            case StatusEffectType.BURN:
                return 'ailment-fire';
            case StatusEffectType.FROZEN:
                return 'ailment-frozen';
            case StatusEffectType.STUNNED:
                return 'ailment-stunned';
            case StatusEffectType.PINNED:
                return 'ailment-pinned';
            default:
                // Log the unknown effect type for debugging
                logger.warn(LogCategory.UI, `Unknown status effect type: ${type}, using default icon`);
                return 'default-item'; // Fallback to a default item texture
        }
    }
    
    /**
     * Update the UI
     */
    update() {
        // Update position to follow the player's health bar
        this.updatePosition();
        
        // Update each icon
        for (const [type, icon] of this.effectIcons.entries()) {
            const effect = this.playerManager.statusEffectSystem.getEffect(type);
            if (effect) {
                this.updateEffectIcon(type, effect);
            }
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        if (this.playerManager && this.playerManager.statusEffectSystem) {
            this.playerManager.statusEffectSystem.off('effect-applied', this.onEffectApplied);
            this.playerManager.statusEffectSystem.off('effect-removed', this.onEffectRemoved);
            this.playerManager.statusEffectSystem.off('effect-tick', this.onEffectTick);
        }
        
        // Destroy all icons
        for (const [type, icon] of this.effectIcons.entries()) {
            icon.background.destroy();
            icon.icon.destroy();
            icon.text.destroy();
        }
        
        // Clear map
        this.effectIcons.clear();
        
        // Destroy container
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
        logger.info(LogCategory.UI, 'StatusEffectsUI destroyed');
    }
} 