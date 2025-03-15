import { ChatUI } from './index';
import { chatService } from '../../utils/ChatService';

/**
 * Example of how to use the chat UI in a Phaser scene
 */
export class ChatExample {
    /**
     * Create a new chat example
     * @param {Phaser.Scene} scene - The scene this example belongs to
     */
    constructor(scene) {
        this.scene = scene;
        
        // Create chat UI
        this.chatUI = new ChatUI(scene, {
            position: { x: 'right', y: 'center' },
            width: 500,
            height: 600,
            title: 'Game Chat',
            defaultRoom: 'lobby',
            serverUrl: '/' // Use relative URL with Vite proxy
        });
        
        // Create chat toggle button
        this.createChatToggleButton();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for connection errors
        chatService.onDisconnection((reason) => {
            // Show error notification if the chat is not visible
            if (!this.chatUI.isVisible) {
                this.showErrorNotification(reason);
            }
        });
        
        // Listen for successful connections
        chatService.onConnection(() => {
            // Clear any error notifications
            this.clearErrorNotification();
        });
        
        // Listen for room errors
        chatService.onRoomError((message) => {
            this.showErrorNotification(`Room Error: ${message}`);
        });
    }
    
    /**
     * Show error notification
     * @param {string} message - The error message
     */
    showErrorNotification(message) {
        // Create notification if it doesn't exist
        if (!this.errorNotification) {
            this.errorNotification = document.createElement('div');
            this.errorNotification.style.position = 'fixed';
            this.errorNotification.style.bottom = '80px';
            this.errorNotification.style.right = '20px';
            this.errorNotification.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
            this.errorNotification.style.color = 'white';
            this.errorNotification.style.padding = '10px';
            this.errorNotification.style.borderRadius = '4px';
            this.errorNotification.style.zIndex = '1000';
            this.errorNotification.style.maxWidth = '300px';
            this.errorNotification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            this.errorNotification.style.display = 'none';
            
            document.body.appendChild(this.errorNotification);
        }
        
        // Set error message
        this.errorNotification.textContent = `Chat Error: ${message || 'Could not connect to chat server'}`;
        
        // Show notification
        this.errorNotification.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            this.clearErrorNotification();
        }, 5000);
    }
    
    /**
     * Clear error notification
     */
    clearErrorNotification() {
        if (this.errorNotification) {
            this.errorNotification.style.display = 'none';
        }
    }
    
    /**
     * Create a button to toggle the chat UI
     */
    createChatToggleButton() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.bottom = '20px';
        buttonContainer.style.right = '20px';
        buttonContainer.style.zIndex = '100';
        
        // Create button
        const button = document.createElement('button');
        button.textContent = '💬';
        button.style.width = '50px';
        button.style.height = '50px';
        button.style.borderRadius = '50%';
        button.style.backgroundColor = '#2a1a0a';
        button.style.color = '#c8a165';
        button.style.border = '2px solid #8b5a2b';
        button.style.fontSize = '24px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        
        // Add hover effect
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#3a2a1a';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#2a1a0a';
        });
        
        // Add click event
        button.addEventListener('click', () => {
            this.chatUI.toggle();
        });
        
        // Add button to container
        buttonContainer.appendChild(button);
        
        // Add container to body
        document.body.appendChild(buttonContainer);
        
        // Store reference
        this.chatToggleButton = buttonContainer;
    }
    
    /**
     * Show the chat UI
     */
    show() {
        this.chatUI.show();
    }
    
    /**
     * Hide the chat UI
     */
    hide() {
        this.chatUI.hide();
    }
    
    /**
     * Toggle the chat UI
     */
    toggle() {
        this.chatUI.toggle();
    }
    
    /**
     * Destroy the chat example
     */
    destroy() {
        // Destroy chat UI
        this.chatUI.destroy();
        
        // Remove chat toggle button
        if (this.chatToggleButton && this.chatToggleButton.parentNode) {
            this.chatToggleButton.parentNode.removeChild(this.chatToggleButton);
        }
        
        // Remove error notification
        if (this.errorNotification && this.errorNotification.parentNode) {
            this.errorNotification.parentNode.removeChild(this.errorNotification);
            this.errorNotification = null;
        }
    }
}

export default ChatExample; 