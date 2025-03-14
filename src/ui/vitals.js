import { DOMUIHelper } from '../utils/DOMUIHelper';
import { logger, LogCategory } from '../utils/Logger';

/**
 * MedievalVitals - A simplified medieval-themed HTML/CSS overlay for player vitals
 * This class creates DOM elements for health, XP, and gold
 * styled to match a medieval fantasy theme
 * 
 * @class MedievalVitals
 * @constructor
 * @param {Phaser.Scene} scene - The Phaser scene instance
 * @param {DOMUIHelper} uiHelper - The DOMUIHelper instance
 * @param {PlayerStats} playerStats - The player stats object
 * @param {number} health - The player's current health
 * @param {number} maxHealth - The player's maximum health
 * @param {number} xp - The player's current XP
 * @param {number} xpToNextLevel - The player's XP to next level
 * @param {number} gold - The player's current gold
 * @param {boolean} isAggressive - Whether the player is aggressive
 * @param {boolean} isGodMode - Whether the player is in god mode
 */
export class MedievalVitals {
    scene;
    uiHelper;
    container;
    healthBar;
    healthFill;
    healthText;
    xpBar;
    xpFill;
    xpText;
    goldDisplay;
    goldText;
    godModeIndicator;
    aggressionIndicator;
    weightDisplay;
    weightText;
    
    isAggressive = false;
    isGodMode = false;
    
    // Reference to the PlayerHealthSystem
    playerHealthSystem = null;
    
    constructor(scene) {
        this.scene = scene;
        this.uiHelper = new DOMUIHelper(scene);

        logger.info(LogCategory.UI, 'MedievalVitals constructor');

        logger.info(LogCategory.UI, 'MedievalVitals constructor - scene:', this.scene);

        // Get reference to PlayerHealthSystem if available
        this.playerHealthSystem = this.scene.playerHealthSystem;
        
        // log the player stats
        logger.info(LogCategory.UI, 'MedievalVitals constructor - player stats:', this.scene.playerStats);
        
        // Load the CSS files
        this.uiHelper.loadCSS('/styles/popups.css');
        this.uiHelper.loadCSS('/styles/medieval-vitals.css');
        
        // Create the main container
        this.createContainer();
        
        // Create UI elements
        this.createHealthBar();
        this.createXPBar();
        this.createGoldDisplay();
        this.createWeightDisplay();
        this.createGodModeIndicator();
        this.createAggressionIndicator();
        
        // Add the container to the DOM
        document.body.appendChild(this.container);
        
        // Connect to the PlayerHealthSystem if available
        this.connectToHealthSystem();
        
        // Initial update
        this.updateUI();
    }
    
    
    /**
     * Creates the main container for all vitals elements
     */
    createContainer() {
        this.container = this.uiHelper.createContainer(
            'custom-popup vitals-container',
            {
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                zIndex: '1000',
                backgroundColor: '#2a1a0a', // Dark brown background
                color: '#e8d4b9', // Light parchment text color
                borderRadius: '8px',
                border: '3px solid',
                borderImage: 'linear-gradient(to bottom, #c8a165, #8b5a2b) 1',
                padding: '10px',
                maxWidth: '300px',
                minWidth: '250px',
                fontFamily: 'Cinzel, "Times New Roman", serif', // Medieval-style font
                fontWeight: 'bold',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)'
            }
        );
    }
    
    /**
     * Creates the health bar element
     */
    createHealthBar() {
        // Create stat row with inline styles for better visibility
        const statRow = document.createElement('div');
        statRow.style.display = 'flex';
        statRow.style.alignItems = 'center';
        statRow.style.marginBottom = '12px';
        this.container.appendChild(statRow);
        
        // Create label with inline styles
        const label = document.createElement('div');
        label.style.fontWeight = 'bold';
        label.style.color = '#f0c070'; // Golden color
        label.style.width = '30px';
        label.style.textAlign = 'left';
        label.style.fontSize = '16px';
        label.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
        label.textContent = 'HP';
        statRow.appendChild(label);
        
        // Create progress bar container
        const progressBar = document.createElement('div');
        progressBar.style.height = '15px';
        progressBar.style.marginLeft = '10px';
        progressBar.style.flexGrow = '1';
        progressBar.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        progressBar.style.borderRadius = '6px';
        progressBar.style.overflow = 'hidden';
        progressBar.style.border = '1px solid rgba(200, 161, 101, 0.5)';
        statRow.appendChild(progressBar);
        
        // Create progress fill
        const progressFill = document.createElement('div');
        
        // Get initial health values from PlayerHealthSystem if available
        let initialHealth = 70;
        let initialMaxHealth = 100;
        
        if (this.playerHealthSystem) {
            initialHealth = this.playerHealthSystem.getHealth();
            initialMaxHealth = this.playerHealthSystem.getMaxHealth();
        } else if (this.scene.playerStats) {
            initialHealth = this.scene.playerStats.health || 70;
            initialMaxHealth = this.scene.playerStats.maxHealth || 100;
        }
        
        // Calculate initial health percentage
        const initialHealthPercent = Math.min(1, Math.max(0, initialHealth / initialMaxHealth));
        
        progressFill.style.width = `${initialHealthPercent * 100}%`;
        progressFill.style.height = '100%';
        
        // Set color based on health percentage
        if (initialHealthPercent <= 0.2) {
            progressFill.style.backgroundColor = '#e74c3c'; // Red for critical health
        } else if (initialHealthPercent <= 0.5) {
            progressFill.style.backgroundColor = '#f39c12'; // Orange for medium health
        } else {
            progressFill.style.backgroundColor = '#27ae60'; // Green for good health
        }
        
        progressFill.style.boxShadow = 'inset 0 0 5px rgba(255, 255, 255, 0.3)';
        progressBar.appendChild(progressFill);
        
        // Create health text
        const healthText = document.createElement('div');
        healthText.style.color = '#e8d4b9';
        healthText.style.marginLeft = '10px';
        healthText.style.fontSize = '14px';
        healthText.style.fontWeight = 'bold';
        healthText.textContent = `${Math.floor(initialHealth)}/${initialMaxHealth}`;
        statRow.appendChild(healthText);
        
        // Store references
        this.healthBar = progressBar;
        this.healthFill = progressFill;
        this.healthText = healthText;
        
        logger.info(LogCategory.UI, `Health bar created with initial values: ${Math.floor(initialHealth)}/${initialMaxHealth}`);
    }
    
    /**
     * Creates the XP bar element
     */
    createXPBar() {
        // Create stat row with inline styles for better visibility
        const statRow = document.createElement('div');
        statRow.style.display = 'flex';
        statRow.style.alignItems = 'center';
        statRow.style.marginBottom = '12px';
        this.container.appendChild(statRow);
        
        // Create label with inline styles
        const label = document.createElement('div');
        label.style.fontWeight = 'bold';
        label.style.color = '#f0c070'; // Golden color
        label.style.width = '30px';
        label.style.textAlign = 'left';
        label.style.fontSize = '16px';
        label.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
        label.textContent = 'XP';
        statRow.appendChild(label);
        
        // Create progress bar container
        const progressBar = document.createElement('div');
        progressBar.style.height = '15px';
        progressBar.style.marginLeft = '10px';
        progressBar.style.flexGrow = '1';
        progressBar.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        progressBar.style.borderRadius = '6px';
        progressBar.style.overflow = 'hidden';
        progressBar.style.border = '1px solid rgba(200, 161, 101, 0.5)';
        statRow.appendChild(progressBar);
        
        // Create progress fill
        const progressFill = document.createElement('div');
        progressFill.style.width = '50%'; // Start with 50% XP
        progressFill.style.height = '100%';
        progressFill.style.backgroundColor = '#3498db'; // Blue color for XP
        progressFill.style.boxShadow = 'inset 0 0 5px rgba(255, 255, 255, 0.3)';
        progressBar.appendChild(progressFill);
        
        // Create XP text
        const xpText = document.createElement('div');
        xpText.style.color = '#e8d4b9';
        xpText.style.marginLeft = '10px';
        xpText.style.fontSize = '14px';
        xpText.style.fontWeight = 'bold';
        xpText.textContent = '50/100';
        statRow.appendChild(xpText);
        
        // Store references
        this.xpBar = progressBar;
        this.xpFill = progressFill;
        this.xpText = xpText;
    }
    
    /**
     * Creates the gold display element
     */
    createGoldDisplay() {
        // Create gold display container
        const goldDisplay = document.createElement('div');
        goldDisplay.style.display = 'flex';
        goldDisplay.style.alignItems = 'center';
        goldDisplay.style.marginTop = '5px';
        goldDisplay.style.position = 'relative'; // For positioning gold change indicators
        this.container.appendChild(goldDisplay);
        
        // Create gold icon
        const goldIcon = document.createElement('div');
        goldIcon.style.display = 'inline-block';
        goldIcon.style.width = '20px';
        goldIcon.style.height = '20px';
        goldIcon.style.background = 'radial-gradient(circle at 30% 30%, #ffd700, #b8860b)';
        goldIcon.style.borderRadius = '50%';
        goldIcon.style.marginRight = '10px';
        goldIcon.style.border = '1px solid #8b5a2b';
        goldIcon.style.boxShadow = 'inset 0 0 3px rgba(255, 255, 255, 0.8), 0 0 5px rgba(255, 215, 0, 0.5)';
        goldDisplay.appendChild(goldIcon);
        
        // Create gold text
        const goldText = document.createElement('div');
        goldText.style.color = '#ffd700'; // Gold color
        goldText.style.fontSize = '16px';
        goldText.style.fontWeight = 'bold';
        goldText.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
        goldText.textContent = '1,250';
        goldDisplay.appendChild(goldText);
        
        // Store references
        this.goldDisplay = goldDisplay;
        this.goldText = goldText;
    }
    
    /**
     * Creates the weight display element
     */
    createWeightDisplay() {
        // Create weight display container
        const weightDisplay = document.createElement('div');
        weightDisplay.style.display = 'flex';
        weightDisplay.style.alignItems = 'center';
        weightDisplay.style.marginTop = '5px';
        weightDisplay.style.marginBottom = '5px';
        weightDisplay.style.position = 'relative';
        this.container.appendChild(weightDisplay);
        
        // Create weight icon
        const weightIcon = document.createElement('div');
        weightIcon.style.display = 'inline-block';
        weightIcon.style.width = '20px';
        weightIcon.style.height = '20px';
        weightIcon.style.background = 'radial-gradient(circle at 30% 30%, #a0a0a0, #505050)';
        weightIcon.style.borderRadius = '50%';
        weightIcon.style.marginRight = '10px';
        weightIcon.style.border = '1px solid #8b5a2b';
        weightIcon.style.boxShadow = 'inset 0 0 3px rgba(255, 255, 255, 0.8), 0 0 5px rgba(160, 160, 160, 0.5)';
        weightIcon.innerHTML = '<div style="font-size: 12px; text-align: center; line-height: 20px; color: #2a1a0a; font-weight: bold;">W</div>';
        weightDisplay.appendChild(weightIcon);
        
        // Create weight text
        const weightText = document.createElement('div');
        weightText.style.color = '#e8d4b9';
        weightText.style.fontSize = '16px';
        weightText.style.fontWeight = 'bold';
        weightText.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
        weightText.textContent = '0/0';
        weightDisplay.appendChild(weightText);
        
        // Store references
        this.weightDisplay = weightDisplay;
        this.weightText = weightText;
    }
    
    /**
     * Creates the god mode indicator
     */
    createGodModeIndicator() {
        // Create god mode indicator
        const godModeIndicator = document.createElement('div');
        godModeIndicator.style.position = 'fixed';
        godModeIndicator.style.top = '10px';
        godModeIndicator.style.right = '10px';
        godModeIndicator.style.padding = '5px 10px';
        godModeIndicator.style.backgroundColor = '#2a1a0a';
        godModeIndicator.style.color = '#ffcc00';
        godModeIndicator.style.borderRadius = '4px';
        godModeIndicator.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        godModeIndicator.style.fontWeight = 'bold';
        godModeIndicator.style.fontSize = '16px';
        godModeIndicator.style.border = '2px solid #ffcc00';
        godModeIndicator.style.boxShadow = '0 0 10px #ffcc00';
        godModeIndicator.style.display = 'none'; // Hidden by default
        godModeIndicator.style.animation = 'glow 1.5s infinite alternate';
        godModeIndicator.style.zIndex = '1000';
        godModeIndicator.innerHTML = '⚡ GOD MODE ⚡<br><span style="font-size: 12px; color: #e8d4b9;">Heals below 50% health</span>';
        
        // Add to document body
        document.body.appendChild(godModeIndicator);
        
        // Store reference
        this.godModeIndicator = godModeIndicator;
    }
    
    /**
     * Creates the aggression indicator
     */
    createAggressionIndicator() {
        // Create aggression indicator (just a circle)
        const circle = document.createElement('div');
        circle.style.width = '12px';
        circle.style.height = '12px';
        circle.style.borderRadius = '50%';
        circle.style.backgroundColor = '#27ae60'; // Green for passive
        circle.style.position = 'absolute';
        circle.style.bottom = '10px';
        circle.style.right = '10px';
        circle.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        this.container.appendChild(circle);
        
        // Store reference to the indicator
        this.aggressionIndicator = circle;
    }
    
    /**
     * Updates the UI with current player stats
     */
    updateUI() {
        // Try to get player stats from PlayerHealthSystem first, then fall back to scene.playerStats
        let playerStats = this.scene.playerStats;
        
        // If PlayerHealthSystem is available, use it to get the most up-to-date health values
        if (this.playerHealthSystem) {
            // Update the reference in case it was initialized after this class
            if (!playerStats) {
                playerStats = {};
            }
            
            // Get health values directly from PlayerHealthSystem
            playerStats.health = this.playerHealthSystem.getHealth();
            playerStats.maxHealth = this.playerHealthSystem.getMaxHealth();
            playerStats.godMode = this.playerHealthSystem.isGodModeEnabled();
            
            logger.info(LogCategory.UI, `MedievalVitals updateUI - Using PlayerHealthSystem values: health=${playerStats.health}/${playerStats.maxHealth}, godMode=${playerStats.godMode}`);
        } else if (!playerStats) {
            logger.warn(LogCategory.UI, 'MedievalVitals updateUI - playerStats not found and PlayerHealthSystem not available');
            return;
        }
        
        // Log the current health values for debugging
        logger.info(LogCategory.UI, `MedievalVitals updateUI - health: ${playerStats.health}/${playerStats.maxHealth}`);
        
        // Update health bar with current health values
        this.updateHealthBar(playerStats.health, playerStats.maxHealth);
        
        // Update XP and gold if available
        if (playerStats.xp !== undefined && playerStats.xpToNextLevel !== undefined) {
            this.updateXPBar(playerStats.xp, playerStats.xpToNextLevel);
        }
        
        if (playerStats.gold !== undefined) {
            this.updateGoldDisplay(playerStats.gold);
        }
        
        // Update weight if available
        if (playerStats.currentWeight !== undefined && playerStats.maxWeight !== undefined) {
            this.updateWeightDisplay(playerStats.currentWeight, playerStats.maxWeight);
        } else if (this.scene.inventoryManager && this.scene.inventoryManager.getInventory) {
            // Try to get weight from inventory if available
            const inventory = this.scene.inventoryManager.getInventory();
            if (inventory) {
                const currentWeight = inventory.getTotalWeight();
                const maxWeight = inventory.getMaxWeight();
                this.updateWeightDisplay(currentWeight, maxWeight);
            }
        }
        
        // Update god mode indicator
        if (playerStats.godMode !== undefined) {
            this.setGodMode(playerStats.godMode);
        }
    }
    
    /**
     * Updates the health bar
     * @param {number} health - Current health
     * @param {number} maxHealth - Maximum health
     */
    updateHealthBar(health, maxHealth) {
        if (!this.healthBar || !this.healthFill || !this.healthText) {
            logger.warn(LogCategory.UI, 'MedievalVitals updateHealthBar - UI elements not initialized');
            return;
        }
        
        // Ensure health and maxHealth are valid numbers
        if (typeof health !== 'number' || typeof maxHealth !== 'number' || Number.isNaN(health) || Number.isNaN(maxHealth)) {
            logger.warn(LogCategory.UI, `MedievalVitals updateHealthBar - Invalid health values: ${health}/${maxHealth}`);
            return;
        }
        
        // Calculate health percentage
        const healthPercent = Math.min(1, Math.max(0, health / maxHealth));
        
        // Log the health update
        logger.info(LogCategory.UI, `MedievalVitals updateHealthBar - Setting health bar to ${Math.floor(health)}/${maxHealth} (${Math.floor(healthPercent * 100)}%)`);
        
        // Update health bar width with a smooth transition
        this.healthFill.style.transition = 'width 0.3s ease-in-out';
        this.healthFill.style.width = `${healthPercent * 100}%`;
        
        // Update health text
        this.healthText.textContent = `${Math.floor(health)}/${maxHealth}`;
        
        // Update health bar color based on health percentage
        if (healthPercent <= 0.2) {
            this.healthFill.style.backgroundColor = '#e74c3c'; // Red for critical health
        } else if (healthPercent <= 0.5) {
            this.healthFill.style.backgroundColor = '#f39c12'; // Orange for medium health
        } else {
            this.healthFill.style.backgroundColor = '#27ae60'; // Green for good health
        }
        
        // Add pulse animation when health is low
        if (healthPercent <= 0.2) {
            this.healthFill.style.animation = 'pulse 1.5s infinite';
        } else {
            this.healthFill.style.animation = 'none';
        }
        
        // Update god mode indicator if it exists and god mode is enabled
        if (this.isGodMode && this.godModeIndicator && this.godModeIndicator.style.display !== 'none') {
            const healthPercentDisplay = Math.floor(healthPercent * 100);
            const healthThreshold = 50; // 50% threshold for god mode healing
            
            // Update the indicator text with health info
            this.godModeIndicator.innerHTML = `⚡ GOD MODE ⚡<br>
                <span style="font-size: 12px; color: #e8d4b9;">
                    Health: ${healthPercentDisplay}%<br>
                    Heals below ${healthThreshold}% health
                </span>`;
            
            // Change border color based on whether healing would trigger
            if (healthPercentDisplay < healthThreshold) {
                // Green border when healing will trigger
                this.godModeIndicator.style.borderColor = '#27ae60'; // Green when healing will trigger
                this.godModeIndicator.style.boxShadow = '0 0 10px #27ae60';
            } else {
                // Default yellow border
                this.godModeIndicator.style.borderColor = '#ffcc00'; // Default yellow
                this.godModeIndicator.style.boxShadow = '0 0 10px #ffcc00';
            }
        }
    }
    
    /**
     * Updates the XP bar display
     */
    updateXPBar(xp, xpToNextLevel) {
        const xpPercent = Math.min(1, xp / xpToNextLevel);
        
        // Update fill width
        this.xpFill.style.width = `${xpPercent * 100}%`;
        
        // Update text
        this.xpText.textContent = `${xp}/${xpToNextLevel}`;
        
        // Ensure XP bar stays blue
        this.xpFill.style.backgroundColor = '#3498db';
    }
    
    /**
     * Updates the gold display
     */
    updateGoldDisplay(gold) {
        // Format the gold with commas
        this.goldText.textContent = gold.toLocaleString();
    }
    
    /**
     * Updates the gold display with an animation effect
     * @param gold New gold amount
     * @param animate Whether to animate the change
     */
    updateGoldWithAnimation(gold, animate = true) {
        if (!animate) {
            // Simple update without animation
            this.updateGoldDisplay(gold);
            return;
        }
        
        // Get current gold amount
        const currentText = this.goldText.textContent || '0';
        const currentGold = Number.parseInt(currentText.replace(/,/g, ''), 10);
        
        // Calculate difference
        const diff = gold - currentGold;
        
        if (diff === 0) return;
        
        // Create a floating indicator for the gold change
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.right = '0';
        indicator.style.top = '0';
        indicator.style.color = diff > 0 ? '#27ae60' : '#c0392b';
        indicator.style.fontWeight = 'bold';
        indicator.style.animation = 'goldChange 1s forwards';
        indicator.textContent = diff > 0 ? `+${diff}` : `${diff}`;
        this.goldDisplay.appendChild(indicator);
        
        // Update gold value
        this.updateGoldDisplay(gold);
        
        // Remove the indicator after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1000);
    }
    
    /**
     * Toggles the aggression state
     */
    toggleAggression() {
        this.setAggression(!this.isAggressive);
    }
    
    /**
     * Sets the aggression state
     * @param isAggressive Whether the player is aggressive
     */
    setAggression(isAggressive) {
        this.isAggressive = isAggressive;
        this.updateAggressionIndicator();
    }
    
    /**
     * Updates the aggression indicator
     */
    updateAggressionIndicator() {
        if (!this.aggressionIndicator) return;
        
        if (this.isAggressive) {
            this.aggressionIndicator.style.backgroundColor = '#c0392b'; // Red for aggressive
        } else {
            this.aggressionIndicator.style.backgroundColor = '#27ae60'; // Green for passive
        }
    }
    
    /**
     * Sets the god mode state
     * @param enabled Whether god mode is enabled
     */
    setGodMode(enabled) {
        this.isGodMode = enabled;
        
        if (this.godModeIndicator) {
            this.godModeIndicator.style.display = enabled ? 'block' : 'none';
            
            // If enabled, make sure the indicator is more noticeable
            if (enabled) {
                // Update the indicator with current health info
                const playerStats = this.scene.playerStats;
                if (playerStats) {
                    const healthPercent = Math.floor((playerStats.health / playerStats.maxHealth) * 100);
                    const healthThreshold = 50; // 50% threshold for god mode healing
                    
                    this.godModeIndicator.innerHTML = `⚡ GOD MODE ⚡<br>
                        <span style="font-size: 12px; color: #e8d4b9;">
                            Health: ${healthPercent}%<br>
                            Heals below ${healthThreshold}% health
                        </span>`;
                    
                    // Change border color based on whether healing would trigger
                    if (healthPercent < healthThreshold) {
                        // Green border when healing will trigger
                        this.godModeIndicator.style.borderColor = '#27ae60'; // Green when healing will trigger
                        this.godModeIndicator.style.boxShadow = '0 0 10px #27ae60';
                    } else {
                        // Default yellow border
                        this.godModeIndicator.style.borderColor = '#ffcc00'; // Default yellow
                        this.godModeIndicator.style.boxShadow = '0 0 10px #ffcc00';
                    }
                }
            }
        }
    }
    
    /**
     * Updates the weight display
     * @param {number} currentWeight - Current weight
     * @param {number} maxWeight - Maximum weight
     */
    updateWeightDisplay(currentWeight, maxWeight) {
        if (!this.weightText) return;
        
        // Format the weight values
        const formattedCurrent = currentWeight.toFixed(1);
        const formattedMax = maxWeight.toFixed(1);
        
        // Update the text
        this.weightText.textContent = `${formattedCurrent}/${formattedMax}`;
        
        // Change color based on weight percentage
        const weightPercentage = (currentWeight / maxWeight) * 100;
        if (weightPercentage > 90) {
            this.weightText.style.color = '#e74c3c'; // Red for near capacity
        } else if (weightPercentage > 70) {
            this.weightText.style.color = '#f39c12'; // Orange for medium capacity
        } else {
            this.weightText.style.color = '#e8d4b9'; // Default color for low capacity
        }
    }
    
    /**
     * Destroys the UI elements
     */
    destroy() {
        if (this.container?.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        if (this.godModeIndicator?.parentNode) {
            this.godModeIndicator.parentNode.removeChild(this.godModeIndicator);
        }
        
        // Remove any animations we added
        const animationStyle = document.getElementById('medieval-vitals-animations');
        if (animationStyle?.parentNode) {
            animationStyle.parentNode.removeChild(animationStyle);
        }
    }
    
    /**
     * Connect to the PlayerHealthSystem to listen for health changes
     */
    connectToHealthSystem() {
        // Try to get the PlayerHealthSystem if not already available
        if (!this.playerHealthSystem) {
            this.playerHealthSystem = this.scene.playerHealthSystem;
        }
        
        // Check if the PlayerHealthSystem is available
        if (this.playerHealthSystem) {
            logger.info(LogCategory.UI, 'MedievalVitals connecting to PlayerHealthSystem');
            
            // Listen for player-stats-changed events
            if (this.scene.events) {
                // Remove any existing listeners to prevent duplicates
                this.scene.events.off('player-stats-changed', this.updateUI, this);
                this.scene.events.off('godModeChanged', this.setGodMode, this);
                
                // Add new listeners with proper context binding
                this.scene.events.on('player-stats-changed', this.updateUI, this);
                this.scene.events.on('godModeChanged', this.setGodMode, this);
                
                // Also listen for specific health-related events
                this.scene.events.off('player-damage-taken', this.onPlayerDamageTaken, this);
                this.scene.events.on('player-damage-taken', this.onPlayerDamageTaken, this);
                
                logger.info(LogCategory.UI, 'MedievalVitals event listeners registered');
            }
            
            // Update UI immediately after connecting
            this.updateUI();
            
            logger.info(LogCategory.UI, 'MedievalVitals connected to PlayerHealthSystem');
        } else {
            // If PlayerHealthSystem is not available yet, try again after a short delay
            logger.warn(LogCategory.UI, 'PlayerHealthSystem not available yet, will try to connect later');
            this.scene.time.delayedCall(500, () => {
                this.connectToHealthSystem();
            });
        }
    }
    
    /**
     * Handler for player-damage-taken events
     * @param {number} damage - The amount of damage taken
     */
    onPlayerDamageTaken(damage) {
        // Flash the health bar red when damage is taken
        if (this.healthFill) {
            // Store the original color
            const originalColor = this.healthFill.style.backgroundColor;
            
            // Flash red
            this.healthFill.style.backgroundColor = '#ff0000';
            this.healthFill.style.boxShadow = '0 0 10px #ff0000, inset 0 0 5px #ffffff';
            
            // Restore original color after a short delay
            this.scene.time.delayedCall(300, () => {
                if (this.healthFill) {
                    this.healthFill.style.backgroundColor = originalColor;
                    this.healthFill.style.boxShadow = 'inset 0 0 5px rgba(255, 255, 255, 0.3)';
                }
            });
        }
        
        // Update the UI to reflect the new health value
        this.updateUI();
    }
} 