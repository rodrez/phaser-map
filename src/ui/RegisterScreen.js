/**
 * RegisterScreen - A medieval-themed registration screen for Alternate Earth
 */
export class RegisterScreen {
    /**
     * Create a new registration screen
     * @param {Phaser.Scene} scene - The scene this registration screen belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = Object.assign({
            onRegister: (username, password, email) => {
                console.log('Registration attempt:', { username, password, email });
                return true; // Return true to indicate successful registration
            },
            onCancel: () => {
                console.log('Registration cancelled');
            },
            title: 'Alternate Earth',
            subtitle: 'Create Thy Character',
            gameVersion: '1.0.0'
        }, options);

        this.isVisible = false;
        this.registerElement = null;
        
        // Create the registration screen
        this.createRegisterScreen();
    }

    /**
     * Create the registration screen HTML element
     */
    createRegisterScreen() {
        // Create container element
        this.registerElement = document.createElement('div');
        this.registerElement.className = 'login-screen-overlay';
        this.registerElement.style.display = 'none';
        
        // Create the registration screen content
        const content = this.generateRegisterScreenHTML();
        this.registerElement.innerHTML = content;
        
        // Add to document body
        document.body.appendChild(this.registerElement);
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Generate the HTML for the registration screen
     * @returns {string} The HTML content
     */
    generateRegisterScreenHTML() {
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
                    
                    <!-- Registration card -->
                    <div class="login-card custom-popup register-card">
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
                            
                            <form id="register-form" class="login-form">
                                <div class="login-form-group">
                                    <label for="register-username" class="login-label">Name of Thy Character</label>
                                    <input type="text" id="register-username" class="login-input" placeholder="Enter username" required>
                                </div>
                                
                                <div class="login-form-group">
                                    <label for="register-email" class="login-label">Thy Message Scroll (Email)</label>
                                    <input type="email" id="register-email" class="login-input" placeholder="Enter email" required>
                                </div>
                                
                                <div class="login-form-group">
                                    <label for="register-password" class="login-label">Secret Password</label>
                                    <input type="password" id="register-password" class="login-input" placeholder="Enter password" required>
                                </div>
                                
                                <div class="login-form-group">
                                    <label for="register-confirm-password" class="login-label">Confirm Secret Password</label>
                                    <input type="password" id="register-confirm-password" class="login-input" placeholder="Confirm password" required>
                                </div>
                                
                                <div class="register-button-group">
                                    <button type="button" id="register-cancel" class="popup-button register-cancel-button">
                                        Return
                                    </button>
                                    <button type="submit" id="register-button" class="popup-button login-button">
                                        Create Character
                                    </button>
                                </div>
                                
                                <div class="login-signup">
                                    Already have an account? 
                                    <a href="#" id="back-to-login" class="login-link login-signup-link">
                                        Return to login
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
     * Set up event listeners for the registration form
     */
    setupEventListeners() {
        // Get form elements
        const registerForm = this.registerElement.querySelector('#register-form');
        const usernameInput = this.registerElement.querySelector('#register-username');
        const emailInput = this.registerElement.querySelector('#register-email');
        const passwordInput = this.registerElement.querySelector('#register-password');
        const confirmPasswordInput = this.registerElement.querySelector('#register-confirm-password');
        const cancelButton = this.registerElement.querySelector('#register-cancel');
        const backToLoginLink = this.registerElement.querySelector('#back-to-login');
        
        // Form submission
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validate passwords match
            if (password !== confirmPassword) {
                this.showError('Thy passwords do not match!');
                return;
            }
            
            // Call the onRegister callback
            const registerSuccess = this.options.onRegister(username, password, email);
            
            // If registration is successful, hide the registration screen
            if (registerSuccess) {
                this.hide();
            }
        });
        
        // Cancel button
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.options.onCancel();
            this.hide();
        });
        
        // Back to login link
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.options.onCancel();
            this.hide();
        });
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message to show
     */
    showError(message) {
        // Check if error element already exists
        let errorElement = this.registerElement.querySelector('.register-error');
        
        // Create error element if it doesn't exist
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'register-error popup-alert popup-alert-danger';
            
            // Insert after the form header
            const formHeader = this.registerElement.querySelector('.login-card-header');
            formHeader.insertAdjacentElement('afterend', errorElement);
        }
        
        // Set error message
        errorElement.textContent = message;
        
        // Show error
        errorElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, 5000);
    }
    
    /**
     * Show the registration screen
     */
    show() {
        if (this.registerElement) {
            this.registerElement.style.display = 'flex';
            this.isVisible = true;
            
            // Focus on username input
            setTimeout(() => {
                const usernameInput = this.registerElement.querySelector('#register-username');
                if (usernameInput) {
                    usernameInput.focus();
                }
            }, 100);
        }
    }
    
    /**
     * Hide the registration screen
     */
    hide() {
        if (this.registerElement) {
            this.registerElement.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    /**
     * Toggle the registration screen visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroy the registration screen
     */
    destroy() {
        if (this.registerElement && this.registerElement.parentNode) {
            this.registerElement.parentNode.removeChild(this.registerElement);
            this.registerElement = null;
        }
    }
}

export default RegisterScreen; 