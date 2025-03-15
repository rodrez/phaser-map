/**
 * LoginScreen - A medieval-themed login screen for Alternate Earth
 */
export class LoginScreen {
    /**
     * Create a new login screen
     * @param {Phaser.Scene} scene - The scene this login screen belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = Object.assign({
            onLogin: (username, password, rememberMe) => {
                console.log('Login attempt:', { username, password, rememberMe });
                return true; // Return true to indicate successful login
            },
            onCreateAccount: () => {
                console.log('Create account clicked');
            },
            onForgotPassword: () => {
                console.log('Forgot password clicked');
            },
            title: 'Alternate Earth',
            subtitle: 'Enter The Realm',
            gameVersion: '1.0.0'
        }, options);

        this.isVisible = false;
        this.loginElement = null;
        
        // Create the login screen
        this.createLoginScreen();
    }

    /**
     * Create the login screen HTML element
     */
    createLoginScreen() {
        // Create container element
        this.loginElement = document.createElement('div');
        this.loginElement.className = 'login-screen-overlay';
        this.loginElement.style.display = 'none';
        
        // Create the login screen content
        const content = this.generateLoginScreenHTML();
        this.loginElement.innerHTML = content;
        
        // Add to document body
        document.body.appendChild(this.loginElement);
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Generate the HTML for the login screen
     * @returns {string} The HTML content
     */
    generateLoginScreenHTML() {
        return `
            <div class="login-screen-container">
                <div class="login-screen-background"></div>
                
                <!-- Decorative elements -->
                <div class="login-light login-light-1"></div>
                <div class="login-light login-light-2"></div>
                
                <div class="login-content">
                    <!-- Game title -->
                    <div class="login-title-container">
                        <h1 class="login-title">${this.options.title}</h1>
                        <div class="login-title-decoration">
                            <div class="login-title-line"></div>
                            <div class="login-title-icon">⚔️</div>
                            <div class="login-title-line"></div>
                        </div>
                    </div>
                    
                    <!-- Login card -->
                    <div class="login-card custom-popup">
                        <div class="popup-corner corner-top-left"></div>
                        <div class="popup-corner corner-top-right"></div>
                        <div class="popup-corner corner-bottom-left"></div>
                        <div class="popup-corner corner-bottom-right"></div>
                        <div class="parchment-texture"></div>
                        
                        <div class="login-card-content">
                            <div class="login-card-header">
                                <div class="login-card-icon">🛡️</div>
                                <h2 class="login-card-title">${this.options.subtitle}</h2>
                                <div class="login-card-icon">🛡️</div>
                            </div>
                            
                            <form id="login-form" class="login-form">
                                <div class="login-form-group">
                                    <label for="username" class="login-label">Name of Thy Character</label>
                                    <input type="text" id="username" class="login-input" placeholder="Enter username" required>
                                </div>
                                
                                <div class="login-form-group">
                                    <label for="password" class="login-label">Secret Password</label>
                                    <input type="password" id="password" class="login-input" placeholder="Enter password" required>
                                </div>
                                
                                <div class="login-form-options">
                                    <div class="login-remember-me">
                                        <input type="checkbox" id="remember-me" class="login-checkbox">
                                        <label for="remember-me" class="login-checkbox-label">Remember Me</label>
                                    </div>
                                    
                                    <a href="#" id="forgot-password" class="login-link">Forgot Password?</a>
                                </div>
                                
                                <button type="submit" id="login-button" class="popup-button login-button">
                                    Enter Kingdom
                                </button>
                                
                                <div class="login-signup">
                                    New to the realm? 
                                    <a href="#" id="create-account" class="login-link login-signup-link">
                                        Create thy account
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="login-footer">
                        &copy; ${new Date().getFullYear()} Alternate Earth | All Rights Reserved
                        <div class="login-version">Version ${this.options.gameVersion}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Set up event listeners for the login form
     */
    setupEventListeners() {
        // Get form elements
        const loginForm = this.loginElement.querySelector('#login-form');
        const usernameInput = this.loginElement.querySelector('#username');
        const passwordInput = this.loginElement.querySelector('#password');
        const rememberMeCheckbox = this.loginElement.querySelector('#remember-me');
        const forgotPasswordLink = this.loginElement.querySelector('#forgot-password');
        const createAccountLink = this.loginElement.querySelector('#create-account');
        
        // Form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = rememberMeCheckbox.checked;
            
            // Call the onLogin callback
            const loginSuccess = this.options.onLogin(username, password, rememberMe);
            
            // If login is successful, hide the login screen
            if (loginSuccess) {
                this.hide();
            }
        });
        
        // Forgot password link
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.options.onForgotPassword();
        });
        
        // Create account link
        createAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.options.onCreateAccount();
        });
    }
    
    /**
     * Show the login screen
     */
    show() {
        if (this.loginElement) {
            this.loginElement.style.display = 'flex';
            this.isVisible = true;
            
            // Focus on username input
            setTimeout(() => {
                const usernameInput = this.loginElement.querySelector('#username');
                if (usernameInput) {
                    usernameInput.focus();
                }
            }, 100);
        }
    }
    
    /**
     * Hide the login screen
     */
    hide() {
        if (this.loginElement) {
            this.loginElement.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    /**
     * Toggle the login screen visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Set a custom login handler
     * @param {Function} handler - The login handler function
     */
    setLoginHandler(handler) {
        if (typeof handler === 'function') {
            this.options.onLogin = handler;
        }
    }
    
    /**
     * Destroy the login screen
     */
    destroy() {
        if (this.loginElement && this.loginElement.parentNode) {
            this.loginElement.parentNode.removeChild(this.loginElement);
            this.loginElement = null;
        }
    }
}

export default LoginScreen; 