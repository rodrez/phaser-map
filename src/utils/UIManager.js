import { Scene } from 'phaser';

/**
 * UIManager class to handle all UI-related functionality
 * This class manages UI elements, buttons, and messages
 */
export class UIManager {
    /**
     * Constructor for the UIManager
     * @param {Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     */
    constructor(scene, mapManager) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.uiContainer = null;
        this.flagCounter = null;
        this.placeButton = null;
        this.infoText = null;
        
        // Create UI elements
        this.createUI();
        
        // Handle window resize
        this.scene.scale.on('resize', this.resizeUI, this);
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create UI container
        this.uiContainer = this.scene.add.container(0, 0);
        
        // Add info text
        this.infoText = this.scene.add.text(10, 10, 'Click on the map to move\nClick on the player to place a flag\nClick on flags to travel to them', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.uiContainer.add(this.infoText);
        
        // Add flag counter
        this.flagCounter = this.scene.add.text(10, 80, 'Flags: 0', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.uiContainer.add(this.flagCounter);
        
        // Add reset button
        const resetButton = this.scene.add.text(this.scene.cameras.main.width - 10, 10, 'Reset', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#FF5252',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.createDOMButton(resetButton, () => {
            console.log('Reset button clicked');
            this.scene.scene.restart();
        });
        
        this.uiContainer.add(resetButton);
        
        // Add place flag button
        this.placeButton = this.scene.add.text(this.scene.cameras.main.width - 10, 60, 'Place Flag', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: '#4285F4',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
        
        // Add DOM element for the button
        this.createDOMButton(this.placeButton, () => {
            console.log('Place flag button clicked');
            // We'll use an event to communicate with the Game scene
            this.scene.events.emit('placeFlag');
        });
        
        this.uiContainer.add(this.placeButton);
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
        button.style.fontSize = textObject.style.fontSize + 'px' || '16px';
        button.style.borderRadius = '4px';
        button.innerText = textObject.text;
        
        // Position the button
        button.style.right = '10px';
        button.style.top = textObject.y + 'px';
        
        // Add the button to the game container
        document.getElementById('game-container').appendChild(button);
        
        // Add a click event listener to the button
        button.addEventListener('click', (e) => {
            callback();
            e.stopPropagation();
        });
        
        // Store a reference to the button
        textObject.domElement = button;
    }
    
    /**
     * Resize UI elements
     */
    resizeUI() {
        // Update button positions
        if (this.uiContainer && this.uiContainer.list) {
            for (let i = 0; i < this.uiContainer.list.length; i++) {
                const item = this.uiContainer.list[i];
                if (item && item.domElement) {
                    item.domElement.style.top = item.y + 'px';
                }
            }
        }
    }
    
    /**
     * Update the flag counter
     */
    updateFlagCounter() {
        // Update flag counter text
        this.flagCounter.setText(`Flags: ${this.mapManager.flags.length}`);
    }
    
    /**
     * Show a message
     * @param {string} text - The message text
     * @param {string} backgroundColor - The background color of the message
     */
    showMessage(text, backgroundColor) {
        // Create message text
        const message = this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height - 50, text, {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            backgroundColor: backgroundColor,
            padding: { left: 15, right: 15, top: 10, bottom: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        
        // Fade out and destroy after 2 seconds
        this.scene.tweens.add({
            targets: message,
            alpha: 0,
            duration: 1000,
            delay: 1000,
            onComplete: () => {
                message.destroy();
            }
        });
    }
    
    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove DOM elements
        if (this.uiContainer && this.uiContainer.list) {
            for (let i = 0; i < this.uiContainer.list.length; i++) {
                const item = this.uiContainer.list[i];
                if (item && item.domElement && item.domElement.parentNode) {
                    item.domElement.parentNode.removeChild(item.domElement);
                }
            }
        }
        
        // Destroy the UI container
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
    }
} 