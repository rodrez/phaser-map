import { Scene } from 'phaser';
import { DOMUIHelper } from '../DOMUIHelper';
import { logger, LogCategory } from '../Logger';

/**
 * CoreUIManager - Base class with essential UI functionality
 * Manages the scene reference, UI container, and basic UI elements
 * Handles resize events and cleanup
 * Provides core UI utility methods
 */
export class CoreUIManager {
    /**
     * Constructor for the CoreUIManager
     * @param {Scene} scene - The Phaser scene this manager belongs to
     */
    constructor(scene) {
        this.scene = scene;
        this.uiContainer = null;
        
        // DOM UI Helper
        this.domUIHelper = new DOMUIHelper(scene);
        
        // Create UI container
        this.createUIContainer();
        
        // Handle window resize
        this.scene.scale.on('resize', this.resizeUI, this);
    }

    /**
     * Create the UI container
     */
    createUIContainer() {
        // Create UI container
        this.uiContainer = this.scene.add.container(0, 0);
    }

    /**
     * Resize UI elements - to be overridden by subclasses
     */
    resizeUI() {
        logger.debug(LogCategory.UI, 'Resizing UI');
        // Base implementation does nothing
    }

    /**
     * Create a DOM button
     * @param {Phaser.GameObjects.Text} textObject - The text object to use as a button
     * @param {Function} callback - The callback function to call when the button is clicked
     */
    createDOMButton(textObject, callback) {
        // Create a div for the button
        const button = document.createElement('div');
        button.className = 'phaser-button';
        button.style.position = 'absolute';
        button.style.padding = '5px 10px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '40';
        button.style.backgroundColor = textObject.style.backgroundColor || '#4285F4';
        button.style.color = textObject.style.color || '#ffffff';
        button.style.fontFamily = textObject.style.fontFamily || 'Arial';
        button.style.fontSize = `${textObject.style.fontSize}px` || '16px';
        button.style.borderRadius = '4px';
        button.innerText = textObject.text;
        
        // Position the button
        button.style.right = '10px';
        button.style.top = `${textObject.y}px`;
        
        // Add the button to the game container
        document.getElementById('game-container')?.appendChild(button) || 
            document.body.appendChild(button);
        
        // Add a click event listener to the button
        button.addEventListener('click', (e) => {
            callback();
            e.stopPropagation();
        });
        
        // Store a reference to the button
        textObject.domElement = button;
    }

    /**
     * Add a UI element to the container
     * @param {Phaser.GameObjects.GameObject} element - The UI element to add
     */
    addUIElement(element) {
        this.uiContainer.add(element);
    }

    /**
     * Remove a UI element from the container
     * @param {Phaser.GameObjects.GameObject} element - The UI element to remove
     * @param {boolean} destroy - Whether to destroy the element
     */
    removeUIElement(element, destroy = false) {
        this.uiContainer.remove(element, destroy);
    }

    /**
     * Create a text element
     * @param {number} x - The x position
     * @param {number} y - The y position
     * @param {string} text - The text content
     * @param {Object} style - The text style
     * @returns {Phaser.GameObjects.Text} The created text element
     */
    createText(x, y, text, style) {
        const textElement = this.scene.add.text(x, y, text, style);
        this.addUIElement(textElement);
        return textElement;
    }

    /**
     * Update method to be called in the scene's update loop
     * To be overridden by subclasses
     */
    update() {
        // Base implementation does nothing
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove event listeners
        this.scene.scale.off('resize', this.resizeUI, this);
        
        // Remove DOM elements
        if (this.uiContainer?.list) {
            for (let i = 0; i < this.uiContainer.list.length; i++) {
                const item = this.uiContainer.list[i];
                if (item?.domElement?.parentNode) {
                    item.domElement.parentNode.removeChild(item.domElement);
                }
            }
        }
        
        // Clean up DOM UI Helper
        if (this.domUIHelper) {
            this.domUIHelper.cleanupCSS();
        }
        
        // Destroy the UI container
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
    }
} 