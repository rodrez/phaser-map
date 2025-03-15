import { LoginScreen } from './LoginScreen';

/**
 * Example of how to use the login screen in a Phaser scene
 */
export class LoginScreenExample {
    /**
     * Create a new login screen example
     * @param {Phaser.Scene} scene - The scene this example belongs to
     */
    constructor(scene) {
        this.scene = scene;
        
        // Create login screen
        this.loginScreen = new LoginScreen(scene, {
            // Custom options
            title: 'Alternate Earth',
            subtitle: 'Enter The Realm',
            gameVersion: '1.0.0',
            
            // Custom handlers
            onLogin: (username, password, rememberMe) => {
                console.log('Login attempt:', { username, password, rememberMe });
                
                // Simulate authentication
                if (username && password) {
                    // Show success message
                    this.showMessage('Welcome back, ' + username + '!');
                    
                    // Store username in localStorage if remember me is checked
                    if (rememberMe) {
                        localStorage.setItem('ae_username', username);
                    }
                    
                    return true; // Return true to close the login screen
                } else {
                    // Show error message
                    this.showMessage('Invalid username or password!', 'error');
                    return false; // Return false to keep the login screen open
                }
            },
            
            onCreateAccount: () => {
                console.log('Create account clicked');
                // Here you would typically show a registration form
                this.showMessage('Registration is coming soon!', 'info');
            },
            
            onForgotPassword: () => {
                console.log('Forgot password clicked');
                // Here you would typically show a password reset form
                this.showMessage('Password reset is coming soon!', 'info');
            }
        });
        
        // Show login screen
        this.loginScreen.show();
        
        // Check if we have a stored username
        const storedUsername = localStorage.getItem('ae_username');
        if (storedUsername) {
            // Pre-fill the username field
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.value = storedUsername;
                
                // Check the remember me checkbox
                const rememberMeCheckbox = document.getElementById('remember-me');
                if (rememberMeCheckbox) {
                    rememberMeCheckbox.checked = true;
                }
            }
        }
    }
    
    /**
     * Show a message to the user
     * @param {string} message - The message to show
     * @param {string} type - The type of message (success, error, info, warning)
     */
    showMessage(message, type = 'success') {
        // Create message element if it doesn't exist
        if (!this.messageElement) {
            this.messageElement = document.createElement('div');
            this.messageElement.className = 'message-popup custom-popup';
            this.messageElement.style.position = 'fixed';
            this.messageElement.style.zIndex = '3000';
            this.messageElement.style.display = 'none';
            document.body.appendChild(this.messageElement);
        }
        
        // Set message type class
        this.messageElement.className = 'message-popup custom-popup';
        
        // Add type-specific class
        switch (type) {
            case 'error':
                this.messageElement.classList.add('popup-alert-danger');
                break;
            case 'warning':
                this.messageElement.classList.add('popup-alert-warning');
                break;
            case 'info':
                this.messageElement.classList.add('popup-alert-info');
                break;
            default:
                this.messageElement.classList.add('popup-alert-success');
                break;
        }
        
        // Set message content
        this.messageElement.textContent = message;
        
        // Show message
        this.messageElement.style.display = 'block';
        
        // Hide after 3 seconds
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            if (this.messageElement) {
                this.messageElement.style.display = 'none';
            }
        }, 3000);
    }
    
    /**
     * Destroy the login screen example
     */
    destroy() {
        // Destroy login screen
        if (this.loginScreen) {
            this.loginScreen.destroy();
            this.loginScreen = null;
        }
        
        // Remove message element
        if (this.messageElement && this.messageElement.parentNode) {
            this.messageElement.parentNode.removeChild(this.messageElement);
            this.messageElement = null;
        }
        
        // Clear timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
    }
}

export default LoginScreenExample; 