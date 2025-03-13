import { CoreUIManager } from './CoreUIManager';
import { logger, LogCategory } from '../Logger';

/**
 * EnvironmentUIManager - Handles environment-related UI
 * Displays environment info and effects
 * Manages environment-related events
 */
export class EnvironmentUIManager extends CoreUIManager {
    /**
     * Constructor for the EnvironmentUIManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     */
    constructor(scene) {
        super(scene);
        
        this.environmentInfo = null;
        
        // Create environment info text
        this.createEnvironmentInfo();
        
        // Set up event listeners
        this.setupEnvironmentEventListeners();
    }

    /**
     * Create environment info text
     */
    createEnvironmentInfo() {
        // Add environment info text
        this.environmentInfo = this.scene.add.text(10, 120, 'Environment: Normal', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setScrollFactor(0).setDepth(1000);
        
        this.addUIElement(this.environmentInfo);
    }

    /**
     * Set up event listeners for environment-related events
     */
    setupEnvironmentEventListeners() {
        // Listen for player entering healing aura
        this.scene.events.on('player-in-healing-aura', () => {
            this.setEnvironmentState('Healing Aura', 'rgba(160, 232, 160, 0.7)');
        });
        
        // Listen for player leaving healing aura
        this.scene.events.on('player-left-healing-aura', () => {
            this.setEnvironmentState('Normal', 'rgba(255, 255, 255, 0.7)');
        });
        
        // Listen for player entering danger zone
        this.scene.events.on('player-in-danger-zone', () => {
            this.setEnvironmentState('Danger Zone', 'rgba(232, 160, 160, 0.7)');
        });
        
        // Listen for player leaving danger zone
        this.scene.events.on('player-left-danger-zone', () => {
            this.setEnvironmentState('Normal', 'rgba(255, 255, 255, 0.7)');
        });
        
        // Listen for environment changes
        this.scene.events.on('environment-changed', (environmentType) => {
            switch (environmentType) {
                case 'forest':
                    this.setEnvironmentState('Forest', 'rgba(160, 232, 160, 0.7)');
                    break;
                case 'desert':
                    this.setEnvironmentState('Desert', 'rgba(232, 200, 160, 0.7)');
                    break;
                case 'mountain':
                    this.setEnvironmentState('Mountains', 'rgba(200, 200, 200, 0.7)');
                    break;
                case 'water':
                    this.setEnvironmentState('Water', 'rgba(160, 160, 232, 0.7)');
                    break;
                default:
                    this.setEnvironmentState('Normal', 'rgba(255, 255, 255, 0.7)');
                    break;
            }
        });
    }

    /**
     * Set the environment state
     * @param {string} state - The environment state
     * @param {string} backgroundColor - The background color
     */
    setEnvironmentState(state, backgroundColor) {
        if (!this.environmentInfo) return;
        
        this.environmentInfo.setText(`Environment: ${state}`);
        this.environmentInfo.setBackgroundColor(backgroundColor);
        
        logger.info(LogCategory.UI, `Environment state changed to: ${state}`);
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove event listeners
        this.scene.events.off('player-in-healing-aura');
        this.scene.events.off('player-left-healing-aura');
        this.scene.events.off('player-in-danger-zone');
        this.scene.events.off('player-left-danger-zone');
        this.scene.events.off('environment-changed');
        
        // Call parent destroy
        super.destroy();
    }
} 