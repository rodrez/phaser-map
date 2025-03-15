import { Scene } from 'phaser';
import { LoginScreen } from '../ui/LoginScreen';
import { RegisterScreen } from '../ui/RegisterScreen';
import { logger, LogCategory } from '../utils/Logger';

/**
 * LoginScene - The initial scene of the game that shows the login screen
 */
export class LoginScene extends Scene {
    constructor() {
        super('LoginScene');
    }

    /**
     * Preload any assets needed for the login screen
     */
    preload() {
        // Load the Cinzel font for the medieval theme
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
        
        // Load CSS for the login screen
        this.loadCSS('styles/login-screen.css');
    }

    /**
     * Create the login screen
     */
    create() {
        // Load the Cinzel font
        this.loadFonts();
        
        // Create the login screen
        this.loginScreen = new LoginScreen(this, {
            title: 'Alternate Earth',
            subtitle: 'Enter The Realm',
            gameVersion: '1.0.0',
            
            // Handle login
            onLogin: (username, password, rememberMe) => {
                logger.info(LogCategory.AUTH, `Login attempt for user: ${username}`);
                
                // Here you would typically validate the credentials with a server
                // For this example, we'll just check if both fields are filled
                if (username && password) {
                    // Store the username for use in the game
                    this.storeUserData(username, rememberMe);
                    
                    // Show success message
                    this.showLoginMessage('Welcome, brave adventurer!');
                    
                    // Transition to the main game after a short delay
                    this.time.delayedCall(1500, () => {
                        this.startGame();
                    });
                    
                    return true; // Return true to close the login screen
                } else {
                    // Show error message
                    this.showLoginMessage('Please enter both username and password!', 'error');
                    return false; // Return false to keep the login screen open
                }
            },
            
            // Handle create account
            onCreateAccount: () => {
                logger.info(LogCategory.AUTH, 'Create account requested');
                
                // Hide login screen and show registration screen
                this.loginScreen.hide();
                this.showRegistrationScreen();
            },
            
            // Handle forgot password
            onForgotPassword: () => {
                logger.info(LogCategory.AUTH, 'Forgot password requested');
                this.showLoginMessage('Password recovery is coming soon!', 'info');
            }
        });
        
        // Create the registration screen (but don't show it yet)
        this.registerScreen = new RegisterScreen(this, {
            title: 'Alternate Earth',
            subtitle: 'Create Thy Character',
            gameVersion: '1.0.0',
            
            // Handle registration
            onRegister: (username, password, email) => {
                logger.info(LogCategory.AUTH, `Registration attempt for user: ${username}`);
                
                // Here you would typically send the registration data to a server
                // For this example, we'll just check if all fields are filled
                if (username && password && email) {
                    // Store the username for use in the game
                    this.storeUserData(username, true);
                    
                    // Show success message
                    this.showLoginMessage('Account created successfully!', 'success');
                    
                    // Transition to the main game after a short delay
                    this.time.delayedCall(1500, () => {
                        this.startGame();
                    });
                    
                    return true; // Return true to close the registration screen
                } else {
                    // Show error message
                    this.showLoginMessage('Please fill in all fields!', 'error');
                    return false; // Return false to keep the registration screen open
                }
            },
            
            // Handle cancel
            onCancel: () => {
                logger.info(LogCategory.AUTH, 'Registration cancelled');
                
                // Hide registration screen and show login screen
                this.registerScreen.hide();
                this.loginScreen.show();
            }
        });
        
        // Show the login screen
        this.loginScreen.show();
        
        // Check if we have stored credentials
        this.checkStoredCredentials();
    }
    
    /**
     * Show the registration screen
     */
    showRegistrationScreen() {
        if (this.registerScreen) {
            this.registerScreen.show();
        }
    }
    
    /**
     * Load the CSS file for the login screen
     * @param {string} path - The path to the CSS file
     */
    loadCSS(path) {
        // Check if the CSS is already loaded
        const existingLink = document.querySelector(`link[href="${path}"]`);
        if (existingLink) return;
        
        // Create a link element for the CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = path;
        
        // Add the link to the document head
        document.head.appendChild(link);
        
        logger.info(LogCategory.ASSETS, `CSS loaded: ${path}`);
    }
    
    /**
     * Load the Cinzel font for the medieval theme
     */
    loadFonts() {
        // Use WebFont to load the Cinzel font
        if (window.WebFont) {
            window.WebFont.load({
                google: {
                    families: ['Cinzel:400,700']
                },
                active: () => {
                    logger.info(LogCategory.ASSETS, 'Cinzel font loaded');
                },
                inactive: () => {
                    logger.warn(LogCategory.ASSETS, 'Cinzel font failed to load');
                }
            });
        } else {
            // Fallback if WebFont is not available
            logger.warn(LogCategory.ASSETS, 'WebFont not available, using fallback fonts');
        }
    }
    
    /**
     * Check if we have stored credentials and pre-fill the login form
     */
    checkStoredCredentials() {
        const username = localStorage.getItem('ae_username');
        
        if (username) {
            logger.info(LogCategory.AUTH, `Found stored username: ${username}`);
            
            // Pre-fill the username field
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.value = username;
                
                // Check the remember me checkbox
                const rememberMeCheckbox = document.getElementById('remember-me');
                if (rememberMeCheckbox) {
                    rememberMeCheckbox.checked = true;
                }
                
                // Focus on the password field
                const passwordInput = document.getElementById('password');
                if (passwordInput) {
                    passwordInput.focus();
                }
            }
        }
    }
    
    /**
     * Store user data for use in the game
     * @param {string} username - The username
     * @param {boolean} rememberMe - Whether to remember the user
     */
    storeUserData(username, rememberMe) {
        // Store the username in the game registry for use in other scenes
        this.registry.set('username', username);
        
        // Store the username in localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('ae_username', username);
            logger.info(LogCategory.AUTH, `Username stored in localStorage: ${username}`);
        } else {
            // Remove any stored username if remember me is not checked
            localStorage.removeItem('ae_username');
            logger.info(LogCategory.AUTH, 'Username removed from localStorage');
        }
    }
    
    /**
     * Show a message to the user
     * @param {string} message - The message to show
     * @param {string} type - The type of message (success, error, info, warning)
     */
    showLoginMessage(message, type = 'success') {
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
     * Start the game by transitioning to the main game scene
     */
    startGame() {
        logger.info(LogCategory.GAME, 'Starting game...');
        
        // Destroy the login screen
        if (this.loginScreen) {
            this.loginScreen.destroy();
            this.loginScreen = null;
        }
        
        // Destroy the registration screen
        if (this.registerScreen) {
            this.registerScreen.destroy();
            this.registerScreen = null;
        }
        
        // Remove message element
        if (this.messageElement && this.messageElement.parentNode) {
            this.messageElement.parentNode.removeChild(this.messageElement);
            this.messageElement = null;
        }
        
        // Start the Boot scene to begin the normal game flow
        this.scene.start('Boot');
    }
    
    /**
     * Shutdown the login scene
     */
    shutdown() {
        // Clean up any resources
        if (this.loginScreen) {
            this.loginScreen.destroy();
            this.loginScreen = null;
        }
        
        if (this.registerScreen) {
            this.registerScreen.destroy();
            this.registerScreen = null;
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