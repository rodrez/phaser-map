import { logger, LogCategory } from '../../utils/Logger';

/**
 * NotificationComponent - Handles notifications for the skills UI
 */
export class NotificationComponent {
    constructor(uiHelper) {
        this.uiHelper = uiHelper;
        
        // DOM Elements
        this.notification = null;
        
        // State
        this.notificationTimeout = null;
    }
    
    /**
     * Shows a notification
     */
    show(message, type = 'success') {
        // Create notification if it doesn't exist
        if (!this.notification) {
            this.notification = this.uiHelper.createElement('div', 'skills-notification');
            
            // Apply styles
            const styles = {
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: '1004',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            };
            
            Object.assign(this.notification.style, styles);
            
            // Add to the DOM
            document.body.appendChild(this.notification);
        }
        
        // Update message
        this.notification.textContent = message;
        
        // Update class based on type
        this.notification.className = 'skills-notification';
        if (type === 'warning' || type === 'error') {
            this.notification.classList.add(type);
        }
        
        // Show notification
        this.notification.style.opacity = '1';
        
        // Hide after a delay
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            if (this.notification) {
                this.notification.style.opacity = '0';
            }
        }, 3000);
        
        // Log the notification
        logger.info(LogCategory.UI, `[NotificationComponent] Showing notification: ${message} (${type})`);
    }
    
    /**
     * Destroys the notification component
     */
    destroy() {
        try {
            // Clear any pending timeouts
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
                this.notificationTimeout = null;
            }
            
            // Remove the notification from the DOM
            if (this.notification && this.notification.parentNode) {
                this.notification.parentNode.removeChild(this.notification);
            }
            
            // Clear references
            this.notification = null;
            
            logger.info(LogCategory.UI, '[NotificationComponent] Notification component destroyed');
        } catch (error) {
            logger.error(LogCategory.UI, '[NotificationComponent] Error during notification component destruction:', error);
        }
    }
} 