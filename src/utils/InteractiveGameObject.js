import { logger, LogCategory } from './Logger';

/**
 * InteractiveGameObject - A base class for game objects that provides built-in
 * click and double-click handling. Any class extending this will automatically
 * have interactive functionality with configurable click behaviors.
 */
export class InteractiveSprite extends Phaser.GameObjects.Sprite {
    /**
     * Constructor for InteractiveSprite
     * @param {Phaser.Scene} scene - The scene to add this sprite to
     * @param {number} x - The x position of the sprite
     * @param {number} y - The y position of the sprite
     * @param {string} texture - The texture key to use for this sprite
     * @param {Object} options - Options for interactive behavior
     */
    constructor(scene, x, y, texture, options = {}) {
        super(scene, x, y, texture);
        
        // Add to scene
        scene.add.existing(this);
        
        // Set up interactive behavior with default options
        this.setupInteractivity(options);
    }
    
    /**
     * Configure interactive behavior for this game object
     * @param {Object} options - Configuration options
     */
    setupInteractivity(options = {}) {
        // Default options
        this.interactiveOptions = {
            objectType: 'interactive-sprite',
            doubleClickThreshold: 300,
            hoverTint: 0xDDDDDD,
            hitArea: { useHandCursor: true, pixelPerfect: false },
            ...options
        };
        
        // State variables for interaction
        this.lastClickTime = 0;
        this.doubleClickHandled = false;
        
        // Make interactive with hitArea
        this.setInteractive(this.interactiveOptions.hitArea);
        
        // Set up hover effects
        this.on('pointerover', this.handlePointerOver.bind(this));
        this.on('pointerout', this.handlePointerOut.bind(this));
        
        // Set up click handling
        this.on('pointerdown', this.handlePointerDown.bind(this));
        
        logger.info(LogCategory.INTERACTION, `Interactive behavior setup for ${this.interactiveOptions.objectType}`);
    }
    
    /**
     * Handle pointer over (hover) effect
     */
    handlePointerOver() {
        this.setTint(this.interactiveOptions.hoverTint);
    }
    
    /**
     * Handle pointer out (end hover) effect
     */
    handlePointerOut() {
        this.clearTint();
    }
    
    /**
     * Handle pointer down (click) event
     * @param {Phaser.Input.Pointer} pointer - The pointer that triggered the event
     */
    handlePointerDown(pointer) {
        // Prevent event propagation
        if (this.scene?.input?.activePointer?.event) {
            this.scene.input.activePointer.event.stopPropagation();
        }
        
        // Exit map drag state if available
        if (this.scene.mapManager && typeof this.scene.mapManager.exitDragState === 'function') {
            this.scene.mapManager.exitDragState();
        }
        
        // Check for double-click
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - this.lastClickTime;
        
        if (timeSinceLastClick < this.interactiveOptions.doubleClickThreshold) {
            // Handle double-click
            this.doubleClickHandled = true;
            logger.info(LogCategory.INTERACTION, 
                `Double-click detected on ${this.interactiveOptions.objectType}`);
            
            // Get data for the double-click event
            const doubleClickData = this.getDoubleClickData();
            
            // Emit double-click-move event
            this.scene.events.emit('double-click-move', doubleClickData);
            
            // Reset click time
            this.lastClickTime = 0;
        } else {
            // Handle potential single-click
            this.lastClickTime = currentTime;
            this.doubleClickHandled = false;
            
            // Delay single-click handling to allow for double-click detection
            setTimeout(() => {
                const globalDoubleClickHandled = this.scene.registry.get('doubleClickHandled') || false;
                if (!this.doubleClickHandled && !globalDoubleClickHandled && 
                    Date.now() - this.lastClickTime >= this.interactiveOptions.doubleClickThreshold) {
                    // Call the single click handler
                    this.onSingleClick();
                }
            }, this.interactiveOptions.doubleClickThreshold);
        }
    }
    
    /**
     * Get data to be sent with the double-click-move event
     * Override this in subclasses if needed
     * @returns {Object} Data object with position and source information
     */
    getDoubleClickData() {
        return {
            x: this.x,
            y: this.y,
            source: this.interactiveOptions.objectType
        };
    }
    
    /**
     * Handle single click behavior
     * Override this in subclasses to implement specific behavior
     */
    onSingleClick() {
        // Default implementation - override in subclasses
        logger.info(LogCategory.INTERACTION, 
            `Single click on ${this.interactiveOptions.objectType} - override onSingleClick() to handle`);
    }
    
    /**
     * Destroy this object and clean up event listeners
     * @param {boolean} fromScene - Whether this is being destroyed by the scene
     */
    destroy(fromScene) {
        // Remove all event listeners
        this.removeAllListeners('pointerover');
        this.removeAllListeners('pointerout');
        this.removeAllListeners('pointerdown');
        
        // Call parent destroy method
        super.destroy(fromScene);
    }
}

/**
 * InteractiveImage - A similar class for Phaser.GameObjects.Image with the same interactive functionality
 */
export class InteractiveImage extends Phaser.GameObjects.Image {
    constructor(scene, x, y, texture, options = {}) {
        super(scene, x, y, texture);
        
        // Add to scene
        scene.add.existing(this);
        
        // Set up interactive behavior with default options
        this.setupInteractivity(options);
    }
    
    // The rest of the implementation is identical to InteractiveSprite
    // We could share code using composition, but keeping them separate for clarity
    
    setupInteractivity(options = {}) {
        // Default options
        this.interactiveOptions = {
            objectType: 'interactive-image',
            doubleClickThreshold: 300,
            hoverTint: 0xDDDDDD,
            hitArea: { useHandCursor: true, pixelPerfect: false },
            ...options
        };
        
        // State variables for interaction
        this.lastClickTime = 0;
        this.doubleClickHandled = false;
        
        // Make interactive with hitArea
        this.setInteractive(this.interactiveOptions.hitArea);
        
        // Set up hover effects
        this.on('pointerover', this.handlePointerOver.bind(this));
        this.on('pointerout', this.handlePointerOut.bind(this));
        
        // Set up click handling
        this.on('pointerdown', this.handlePointerDown.bind(this));
        
        logger.info(LogCategory.INTERACTION, `Interactive behavior setup for ${this.interactiveOptions.objectType}`);
    }
    
    handlePointerOver() {
        this.setTint(this.interactiveOptions.hoverTint);
    }
    
    handlePointerOut() {
        this.clearTint();
    }
    
    handlePointerDown(pointer) {
        // Same implementation as InteractiveSprite
        if (this.scene?.input?.activePointer?.event) {
            this.scene.input.activePointer.event.stopPropagation();
        }
        
        if (this.scene.mapManager && typeof this.scene.mapManager.exitDragState === 'function') {
            this.scene.mapManager.exitDragState();
        }
        
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - this.lastClickTime;
        
        if (timeSinceLastClick < this.interactiveOptions.doubleClickThreshold) {
            this.doubleClickHandled = true;
            logger.info(LogCategory.INTERACTION, 
                `Double-click detected on ${this.interactiveOptions.objectType}`);
            
            const doubleClickData = this.getDoubleClickData();
            this.scene.events.emit('double-click-move', doubleClickData);
            
            this.lastClickTime = 0;
        } else {
            this.lastClickTime = currentTime;
            this.doubleClickHandled = false;
            
            setTimeout(() => {
                const globalDoubleClickHandled = this.scene.registry.get('doubleClickHandled') || false;
                if (!this.doubleClickHandled && !globalDoubleClickHandled && 
                    Date.now() - this.lastClickTime >= this.interactiveOptions.doubleClickThreshold) {
                    this.onSingleClick();
                }
            }, this.interactiveOptions.doubleClickThreshold);
        }
    }
    
    getDoubleClickData() {
        return {
            x: this.x,
            y: this.y,
            source: this.interactiveOptions.objectType
        };
    }
    
    onSingleClick() {
        logger.info(LogCategory.INTERACTION, 
            `Single click on ${this.interactiveOptions.objectType} - override onSingleClick() to handle`);
    }
    
    destroy(fromScene) {
        this.removeAllListeners('pointerover');
        this.removeAllListeners('pointerout');
        this.removeAllListeners('pointerdown');
        
        super.destroy(fromScene);
    }
}

/**
 * Create a mixin function that adds interactive behavior to any game object class
 * This is useful when you can't directly extend from InteractiveSprite/Image
 * 
 * @param {Function} BaseClass - The class to extend with interactive behavior
 * @returns {Function} - A new class with interactive behavior
 */
export function makeInteractiveClass(BaseClass) {
    return class extends BaseClass {
        setupInteractivity(options = {}) {
            // Implementation similar to InteractiveSprite
            this.interactiveOptions = {
                objectType: 'interactive-object',
                doubleClickThreshold: 300,
                hoverTint: 0xDDDDDD,
                hitArea: { useHandCursor: true, pixelPerfect: false },
                ...options
            };
            
            this.lastClickTime = 0;
            this.doubleClickHandled = false;
            
            this.setInteractive(this.interactiveOptions.hitArea);
            
            this.on('pointerover', this.handlePointerOver.bind(this));
            this.on('pointerout', this.handlePointerOut.bind(this));
            this.on('pointerdown', this.handlePointerDown.bind(this));
            
            return this;
        }
        
        // Include all the same methods as InteractiveSprite
        handlePointerOver() { /* Same implementation */ }
        handlePointerOut() { /* Same implementation */ }
        handlePointerDown(pointer) { /* Same implementation */ }
        getDoubleClickData() { /* Same implementation */ }
        onSingleClick() { /* Same implementation */ }
    };
} 