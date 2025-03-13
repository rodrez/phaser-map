import { Scene } from 'phaser';
import { DOMUIHelper } from '../utils/DOMUIHelper';

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
    
    isAggressive = false;
    isGodMode = false;
    
    constructor(scene) {
        this.scene = scene;
        this.uiHelper = new DOMUIHelper(scene);
        
        // Load the CSS files
        this.uiHelper.loadCSS('/styles/popups.css');
        this.uiHelper.loadCSS('/styles/medieval-vitals.css');
        
        // Add pulse animation for low health
        this.addPulseAnimation();
        
        // Create the main container
        this.createContainer();
        
        // Create UI elements
        this.createHealthBar();
        this.createXPBar();
        this.createGoldDisplay();
        this.createGodModeIndicator();
        this.createAggressionIndicator();
        
        // Add the container to the DOM
        document.body.appendChild(this.container);
        
        // Initial update
        this.updateUI();
    }
    
    /**
     * Adds a pulse animation for low health
     */
    addPulseAnimation() {
        // Check if the animation already exists
        if (!document.getElementById('medieval-vitals-animations')) {
            // Create a style element
            const style = document.createElement('style');
            style.id = 'medieval-vitals-animations';
            
            // Add the keyframes animation
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { opacity: 0.7; }
                }
                
                @keyframes glow {
                    from { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                    to { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
                }
                
                @keyframes goldChange {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-20px); opacity: 0; }
                }
            `;
            
            // Add to document head
            document.head.appendChild(style);
        }
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
        progressFill.style.width = '70%'; // Start with 70% health
        progressFill.style.height = '100%';
        progressFill.style.backgroundColor = '#c0392b'; // Red color for health
        progressFill.style.boxShadow = 'inset 0 0 5px rgba(255, 255, 255, 0.3)';
        progressBar.appendChild(progressFill);
        
        // Create health text
        const healthText = document.createElement('div');
        healthText.style.color = '#e8d4b9';
        healthText.style.marginLeft = '10px';
        healthText.style.fontSize = '14px';
        healthText.style.fontWeight = 'bold';
        healthText.textContent = '70/100';
        statRow.appendChild(healthText);
        
        // Store references
        this.healthBar = progressBar;
        this.healthFill = progressFill;
        this.healthText = healthText;
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
        godModeIndicator.style.color = '#f0c070';
        godModeIndicator.style.borderRadius = '4px';
        godModeIndicator.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        godModeIndicator.style.fontWeight = 'bold';
        godModeIndicator.style.fontSize = '14px';
        godModeIndicator.style.border = '2px solid #f0c070';
        godModeIndicator.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.5)';
        godModeIndicator.style.display = 'none'; // Hidden by default
        godModeIndicator.style.animation = 'glow 2s infinite alternate';
        godModeIndicator.style.zIndex = '1000';
        godModeIndicator.textContent = 'GOD MODE';
        
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
        // Get player stats from the scene
        const playerStats = this.scene.playerStats;
        if (!playerStats) return;
        
        this.updateHealthBar(playerStats.health, playerStats.maxHealth);
        this.updateXPBar(playerStats.xp, playerStats.xpToNextLevel);
        this.updateGoldDisplay(playerStats.gold);
    }
    
    /**
     * Updates the health bar display
     */
    updateHealthBar(health, maxHealth) {
        const healthPercent = Math.max(0, health / maxHealth);
        
        // Update fill width
        this.healthFill.style.width = `${healthPercent * 100}%`;
        
        // Update text
        this.healthText.textContent = `${health}/${maxHealth}`;
        
        // Change color based on health percentage
        if (healthPercent <= 0.3) {
            this.healthFill.style.backgroundColor = '#c0392b'; // Red color
            // Add pulsing animation for low health
            this.healthFill.style.animation = 'pulse 1.5s infinite';
        } else {
            this.healthFill.style.backgroundColor = '#c0392b'; // Red color
            this.healthFill.style.animation = 'none';
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
        }
    }
    
    /**
     * Shows a message notification
     * @param message The message to display
     * @param type The type of message (info, success, warning, error)
     * @param duration How long to show the message in milliseconds
     */
    showMessage(message, type = 'info', duration = 3000) {
        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.style.position = 'fixed';
        messageContainer.style.bottom = '20px';
        messageContainer.style.left = '50%';
        messageContainer.style.transform = 'translateX(-50%)';
        messageContainer.style.padding = '10px 20px';
        messageContainer.style.zIndex = '1001';
        messageContainer.style.textAlign = 'center';
        messageContainer.style.backgroundColor = '#2a1a0a';
        messageContainer.style.color = '#e8d4b9';
        messageContainer.style.borderRadius = '8px';
        messageContainer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
        messageContainer.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        
        // Set color based on message type
        let borderColor = '#3498db'; // Default blue for info
        
        switch (type) {
            case 'success':
                borderColor = '#27ae60'; // Green
                break;
            case 'warning':
                borderColor = '#f39c12'; // Orange
                break;
            case 'error':
                borderColor = '#c0392b'; // Red
                break;
        }
        
        messageContainer.style.border = `3px solid ${borderColor}`;
        
        // Set message text
        messageContainer.textContent = message;
        
        // Add to DOM
        document.body.appendChild(messageContainer);
        
        // Remove after duration
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, duration);
    }
    
    /**
     * Shows a level up notification
     * @param level The new level
     */
    showLevelUpNotification(level) {
        // Create level up container
        const levelUpContainer = document.createElement('div');
        levelUpContainer.style.position = 'fixed';
        levelUpContainer.style.top = '50%';
        levelUpContainer.style.left = '50%';
        levelUpContainer.style.transform = 'translate(-50%, -50%)';
        levelUpContainer.style.padding = '20px';
        levelUpContainer.style.zIndex = '1002';
        levelUpContainer.style.textAlign = 'center';
        levelUpContainer.style.backgroundColor = '#2a1a0a';
        levelUpContainer.style.color = '#e8d4b9';
        levelUpContainer.style.borderRadius = '8px';
        levelUpContainer.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
        levelUpContainer.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        levelUpContainer.style.border = '3px solid #f0c070';
        levelUpContainer.style.minWidth = '300px';
        
        // Add title
        const title = document.createElement('h3');
        title.style.margin = '0 0 15px 0';
        title.style.color = '#f0c070';
        title.style.fontSize = '24px';
        title.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.7)';
        title.textContent = 'Level Up!';
        levelUpContainer.appendChild(title);
        
        // Add message
        const message = document.createElement('div');
        message.style.marginBottom = '15px';
        message.style.fontSize = '16px';
        message.textContent = `You have reached level ${level}!`;
        levelUpContainer.appendChild(message);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.style.backgroundColor = '#8b5a2b';
        closeButton.style.color = '#e8d4b9';
        closeButton.style.border = '2px solid #c8a165';
        closeButton.style.borderRadius = '4px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontFamily = 'Cinzel, "Times New Roman", serif';
        closeButton.style.fontSize = '14px';
        closeButton.style.fontWeight = 'bold';
        closeButton.textContent = 'Continue';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(levelUpContainer);
        });
        levelUpContainer.appendChild(closeButton);
        
        // Add to DOM
        document.body.appendChild(levelUpContainer);
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
} 