import { CoreUIManager } from './CoreUIManager';
import { logger, LogCategory } from '../Logger';

/**
 * NotificationManager - Handles all message/notification functionality
 * Shows different types of messages (info, success, warning, error)
 * Manages message styling and animations
 * Provides methods for different notification types
 */
export class NotificationManager extends CoreUIManager {
    /**
     * Constructor for the NotificationManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     */
    constructor(scene) {
        super(scene);
        
        // Message styling
        this.messageStyles = {
            info: {
                backgroundColor: '#3498db',
                prefix: 'Behold! '
            },
            success: {
                backgroundColor: '#27ae60',
                prefix: 'Huzzah! '
            },
            warning: {
                backgroundColor: '#f39c12',
                prefix: 'Hearken! '
            },
            error: {
                backgroundColor: '#c0392b',
                prefix: 'Alas! '
            }
        };
    }

    /**
     * Show a message
     * @param {string} text - The message text
     * @param {string} type - The message type (info, success, warning, error)
     * @param {number} duration - The duration to show the message in milliseconds
     */
    showMessage(text, type = 'info', duration = 3000) {
        const style = this.messageStyles[type] || this.messageStyles.info;
        
        // Add prefix if needed
        const messageText = text.startsWith(style.prefix) ? text : style.prefix + text;
        
        // Create a DOM-based medieval styled message
        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.bottom = '20px';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translateX(-50%)';
        messageContainer.style.padding = '15px 25px';
        messageContainer.style.zIndex = '1001';
        messageContainer.style.textAlign = 'center';
        messageContainer.style.backgroundColor = '#2a1a0a'; // Dark brown background
        messageContainer.style.color = '#e8d4b9'; // Light parchment text color
        messageContainer.style.borderRadius = '8px';
        messageContainer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
        messageContainer.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        messageContainer.style.border = `3px solid ${style.backgroundColor}`;
        messageContainer.style.minWidth = '280px';
        messageContainer.style.maxWidth = '80%';
        
        // Add decorative corners
        const cornerTopLeft = document.createElement('div');
        cornerTopLeft.style.position = 'absolute';
        cornerTopLeft.style.top = '0';
        cornerTopLeft.style.left = '0';
        cornerTopLeft.style.width = '12px';
        cornerTopLeft.style.height = '12px';
        cornerTopLeft.style.borderTop = `2px solid ${style.backgroundColor}`;
        cornerTopLeft.style.borderLeft = `2px solid ${style.backgroundColor}`;
        
        const cornerTopRight = document.createElement('div');
        cornerTopRight.style.position = 'absolute';
        cornerTopRight.style.top = '0';
        cornerTopRight.style.right = '0';
        cornerTopRight.style.width = '12px';
        cornerTopRight.style.height = '12px';
        cornerTopRight.style.borderTop = `2px solid ${style.backgroundColor}`;
        cornerTopRight.style.borderRight = `2px solid ${style.backgroundColor}`;
        
        const cornerBottomLeft = document.createElement('div');
        cornerBottomLeft.style.position = 'absolute';
        cornerBottomLeft.style.bottom = '0';
        cornerBottomLeft.style.left = '0';
        cornerBottomLeft.style.width = '12px';
        cornerBottomLeft.style.height = '12px';
        cornerBottomLeft.style.borderBottom = `2px solid ${style.backgroundColor}`;
        cornerBottomLeft.style.borderLeft = `2px solid ${style.backgroundColor}`;
        
        const cornerBottomRight = document.createElement('div');
        cornerBottomRight.style.position = 'absolute';
        cornerBottomRight.style.bottom = '0';
        cornerBottomRight.style.right = '0';
        cornerBottomRight.style.width = '12px';
        cornerBottomRight.style.height = '12px';
        cornerBottomRight.style.borderBottom = `2px solid ${style.backgroundColor}`;
        cornerBottomRight.style.borderRight = `2px solid ${style.backgroundColor}`;
        
        messageContainer.appendChild(cornerTopLeft);
        messageContainer.appendChild(cornerTopRight);
        messageContainer.appendChild(cornerBottomLeft);
        messageContainer.appendChild(cornerBottomRight);
        
        // Create content wrapper for the message text
        const contentWrapper = document.createElement('div');
        contentWrapper.style.position = 'relative';
        contentWrapper.style.zIndex = '2';
        
        // Set message text
        contentWrapper.textContent = messageText;
        messageContainer.appendChild(contentWrapper);
        
        // Add to DOM
        document.getElementById('game-container')?.appendChild(messageContainer) || 
            document.body.appendChild(messageContainer);
        
        // Log the message
        logger.info(LogCategory.UI, `Showing ${type} message: ${text}`);
        
        // Add fade-in animation
        messageContainer.style.opacity = '0';
        messageContainer.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => {
            messageContainer.style.opacity = '1';
        }, 10);
        
        // Remove after duration with fade-out
        setTimeout(() => {
            messageContainer.style.opacity = '0';
            setTimeout(() => {
                if (messageContainer.parentNode) {
                    messageContainer.parentNode.removeChild(messageContainer);
                }
            }, 300);
        }, duration);
    }

    /**
     * Show an info message
     * @param {string} text - The message text
     * @param {number} duration - The duration to show the message
     */
    showInfo(text, duration = 3000) {
        this.showMessage(text, 'info', duration);
    }

    /**
     * Show a success message
     * @param {string} text - The message text
     * @param {number} duration - The duration to show the message
     */
    showSuccess(text, duration = 3000) {
        this.showMessage(text, 'success', duration);
    }

    /**
     * Show a warning message
     * @param {string} text - The message text
     * @param {number} duration - The duration to show the message
     */
    showWarning(text, duration = 3000) {
        this.showMessage(text, 'warning', duration);
    }

    /**
     * Show an error message
     * @param {string} text - The message text
     * @param {number} duration - The duration to show the message
     */
    showError(text, duration = 3000) {
        this.showMessage(text, 'error', duration);
    }

    /**
     * Show a level up notification
     * @param {number} level - The new level
     */
    showLevelUp(level) {
        const medievalLevelMessage = `Thy prowess grows! Thou hast attained level ${level}!`;
        this.showMessage(medievalLevelMessage, 'success', 5000);
    }
} 