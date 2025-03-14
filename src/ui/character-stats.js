import { DOMUIHelper } from '../utils/DOMUIHelper';
import { logger, LogCategory } from '../utils/Logger';
import playerStatsService from '../utils/player/PlayerStatsService';

/**
 * CharacterStatsUI - A medieval-themed UI for displaying character stats
 * This class creates a DOM-based UI for displaying player statistics
 */
export class CharacterStatsUI {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.uiHelper = new DOMUIHelper(scene);
        
        // DOM Elements
        this.container = null;
        this.statsContent = null;
        this.closeButton = null;
        
        // State
        this.isVisible = false;
        
        // Bound methods for event listeners
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        
        // Set default options
        this.options = {
            width: options.width || '350px',
            height: options.height || '500px',
            position: options.position || 'center',
            title: options.title || 'Character Stats'
        };
        
        // Load the CSS files
        this.uiHelper.loadCSS('/styles/medieval-menu.css');
        this.uiHelper.loadCSS('/styles/popups.css');
        this.uiHelper.loadCSS('/styles/character-stats.css');
        
        // Create the main container
        this.createContainer();
        
        // Hide by default
        this.container.style.display = 'none';
        
        // Subscribe to player stats changes
        playerStatsService.on('stats-changed', this.updateStats.bind(this));
    }
    
    /**
     * Creates the main container for the character stats UI
     */
    createContainer() {
        this.container = this.uiHelper.createContainer('character-stats-ui custom-popup');
        
        // Apply styles
        const styles = {
            position: 'fixed',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.7)',
            zIndex: '1002', // Higher than menu
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: this.options.width,
            height: this.options.height,
            maxHeight: '80vh',
            boxSizing: 'border-box',
            overflowY: 'auto',
            border: '4px solid #8B4513',
            borderRadius: '8px'
        };
        
        Object.assign(this.container.style, styles);
        
        // Add parchment texture and decorative corners
        const parchmentTexture = this.uiHelper.createElement('div', 'parchment-texture');
        this.container.appendChild(parchmentTexture);
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.container.appendChild(cornerTopLeft);
        this.container.appendChild(cornerTopRight);
        this.container.appendChild(cornerBottomLeft);
        this.container.appendChild(cornerBottomRight);
        
        // Add decorative borders
        const borderTop = this.uiHelper.createElement('div', 'popup-border border-top');
        const borderRight = this.uiHelper.createElement('div', 'popup-border border-right');
        const borderBottom = this.uiHelper.createElement('div', 'popup-border border-bottom');
        const borderLeft = this.uiHelper.createElement('div', 'popup-border border-left');
        
        this.container.appendChild(borderTop);
        this.container.appendChild(borderRight);
        this.container.appendChild(borderBottom);
        this.container.appendChild(borderLeft);
        
        // Create a content wrapper
        const contentWrapper = this.uiHelper.createElement('div', 'stats-content-wrapper');
        contentWrapper.style.position = 'relative';
        contentWrapper.style.zIndex = '2';
        contentWrapper.style.width = '100%';
        contentWrapper.style.height = '100%';
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        
        // Create header
        const header = this.uiHelper.createElement('div', 'stats-header');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.style.borderBottom = '2px solid #8B4513';
        header.style.paddingBottom = '10px';
        
        // Add title
        const title = this.uiHelper.createElement('h2', 'stats-title');
        title.textContent = this.options.title;
        title.style.margin = '0';
        title.style.fontFamily = 'serif';
        title.style.fontSize = '24px';
        header.appendChild(title);
        
        // Add close button
        this.closeButton = this.uiHelper.createElement('button', 'stats-close-button');
        this.closeButton.textContent = '✕';
        this.closeButton.style.background = 'none';
        this.closeButton.style.border = 'none';
        this.closeButton.style.fontSize = '20px';
        this.closeButton.style.cursor = 'pointer';
        this.closeButton.style.padding = '5px';
        
        this.closeButton.addEventListener('click', () => {
            this.hide();
        });
        
        header.appendChild(this.closeButton);
        contentWrapper.appendChild(header);
        
        // Create stats content area
        this.statsContent = this.uiHelper.createElement('div', 'stats-content');
        this.statsContent.style.flex = '1';
        this.statsContent.style.overflowY = 'auto';
        contentWrapper.appendChild(this.statsContent);
        
        // Add content wrapper to container
        this.container.appendChild(contentWrapper);
        
        // Add to the DOM
        document.body.appendChild(this.container);
        
        // Add click event to the container to prevent clicks from closing
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Handle clicks outside the character stats UI
     * @param {Event} e - The click event
     */
    handleOutsideClick(e) {
        // If the click is outside the container, hide the UI
        if (this.isVisible && !this.container.contains(e.target)) {
            this.hide();
        }
    }
    
    /**
     * Creates a stat section with a title
     * @param {string} title - The title of the section
     * @returns {HTMLElement} - The section element
     */
    createStatSection(title) {
        const section = this.uiHelper.createElement('div', 'stat-section');
        section.style.marginBottom = '20px';
        
        const sectionTitle = this.uiHelper.createElement('h3', 'section-title');
        sectionTitle.textContent = title;
        sectionTitle.style.margin = '0 0 10px 0';
        sectionTitle.style.fontFamily = 'serif';
        sectionTitle.style.fontSize = '18px';
        sectionTitle.style.paddingBottom = '5px';
        
        section.appendChild(sectionTitle);
        return section;
    }
    
    /**
     * Creates a stat row with a label and value
     * @param {string} label - The label for the stat
     * @param {string|number} value - The value of the stat
     * @returns {HTMLElement} - The stat row element
     */
    createStatRow(label, value) {
        // Create the row container
        const row = this.uiHelper.createElement('div', 'stat-row');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '5px 0';
        
        // Create the label element
        const labelElement = this.uiHelper.createElement('div', 'stat-label');
        labelElement.textContent = label;
        labelElement.style.fontWeight = 'bold';
        
        // Create the value element
        const valueElement = this.uiHelper.createElement('div', 'stat-value');
        valueElement.textContent = value;
        
        // Add label and value to the row
        row.appendChild(labelElement);
        row.appendChild(valueElement);
        
        return row;
    }
    
    /**
     * Creates a progress bar for stats like health or XP
     * @param {string} type - The type of bar ('health' or 'xp')
     * @param {number} current - The current value
     * @param {number} max - The maximum value
     * @param {string} label - The label for the bar
     * @returns {HTMLElement} - The progress bar row element
     */
    createProgressBar(type, current, max, label) {
        const row = this.uiHelper.createElement('div', 'stat-row');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.marginBottom = '10px';
        
        const rowLabel = this.uiHelper.createElement('div', 'stat-label');
        rowLabel.textContent = label;
        row.appendChild(rowLabel);
        
        const barContainer = this.uiHelper.createElement('div', `${type}-bar-container`);
        barContainer.style.width = '100%';
        barContainer.style.height = '20px';
        barContainer.style.borderRadius = '4px';
        barContainer.style.overflow = 'hidden';
        barContainer.style.position = 'relative';
        
        const bar = this.uiHelper.createElement('div', `${type}-bar`);
        const percentage = max > 0 ? (current / max) * 100 : 0;
        bar.style.width = `${percentage}%`;
        bar.style.height = '100%';
        bar.style.transition = 'width 0.3s ease';
        
        const text = this.uiHelper.createElement('div', `${type}-text`);
        text.textContent = `${current}/${max}`;
        text.style.position = 'absolute';
        text.style.top = '0';
        text.style.left = '0';
        text.style.width = '100%';
        text.style.height = '100%';
        text.style.display = 'flex';
        text.style.alignItems = 'center';
        text.style.justifyContent = 'center';
        text.style.color = '#fff';
        text.style.textShadow = '1px 1px 1px rgba(0, 0, 0, 0.5)';
        text.style.fontSize = '12px';
        
        barContainer.appendChild(bar);
        barContainer.appendChild(text);
        row.appendChild(barContainer);
        
        return row;
    }
    
    /**
     * Updates the stats display
     */
    updateStats() {
        // Clear existing content
        this.statsContent.innerHTML = '';
        
        // Get current stats
        const stats = playerStatsService.getStats();
        
        // Create character info section
        const characterInfoSection = this.createStatSection('Character Info');
        
        // Add level info
        const levelRow = this.createStatRow('Level', stats.level || 1);
        characterInfoSection.appendChild(levelRow);
        
        // Add XP bar
        const xpBar = this.createProgressBar(
            'xp', 
            stats.xp || 0, 
            stats.xpToNextLevel || 100, 
            'Experience'
        );
        characterInfoSection.appendChild(xpBar);
        
        // Add gold
        const goldRow = this.createStatRow('Gold', stats.gold || 0);
        const goldValue = goldRow.querySelector('.stat-value');
        goldValue.classList.add('gold-value');
        characterInfoSection.appendChild(goldRow);
        
        this.statsContent.appendChild(characterInfoSection);
        
        // Create basic stats section
        const basicStatsSection = this.createStatSection('Basic Stats');
        
        // Add health bar
        const healthBar = this.createProgressBar(
            'health', 
            stats.health, 
            stats.maxHealth, 
            'Health'
        );
        basicStatsSection.appendChild(healthBar);
        
        // Add other basic stats
        basicStatsSection.appendChild(this.createStatRow('Attack', stats.attack));
        basicStatsSection.appendChild(this.createStatRow('Defense', stats.defense));
        basicStatsSection.appendChild(this.createStatRow('Speed', stats.speed));
        
        // Add god mode status
        const godModeRow = this.createStatRow('God Mode', stats.godMode ? 'Enabled' : 'Disabled');
        if (stats.godMode) {
            godModeRow.querySelector('.stat-value').style.color = '#e74c3c';
            godModeRow.querySelector('.stat-value').style.fontWeight = 'bold';
        }
        basicStatsSection.appendChild(godModeRow);
        
        this.statsContent.appendChild(basicStatsSection);
        
        // Create combat bonuses section
        const combatSection = this.createStatSection('Combat Bonuses');
        
        // Add critical hit chance
        combatSection.appendChild(this.createStatRow('Critical Hit Chance', `${stats.criticalHitChance || 0}%`));
        
        // Add dodge chance (moved from basic stats to combat section)
        combatSection.appendChild(this.createStatRow('Dodge Chance', `${stats.dodgeChance || 0}%`));
        
        // Add weapon bonuses if any exist
        if (stats.weaponAttackBonuses.size > 0) {
            const weaponBonusesTitle = this.uiHelper.createElement('div', 'subsection-title');
            weaponBonusesTitle.textContent = 'Weapon Attack Bonuses';
            weaponBonusesTitle.style.fontWeight = 'bold';
            weaponBonusesTitle.style.marginTop = '10px';
            combatSection.appendChild(weaponBonusesTitle);
            
            stats.weaponAttackBonuses.forEach((bonus, weaponType) => {
                combatSection.appendChild(this.createStatRow(weaponType, `+${bonus}`));
            });
        }
        
        // Add healing multiplier
        combatSection.appendChild(this.createStatRow('Healing Multiplier', `${stats.healingMultiplier}x`));
        
        this.statsContent.appendChild(combatSection);
        
        // Create abilities section if any are unlocked
        if (stats.unlockedAbilities.size > 0) {
            const abilitiesSection = this.createStatSection('Unlocked Abilities');
            
            stats.unlockedAbilities.forEach(ability => {
                const abilityRow = this.uiHelper.createElement('div', 'ability-row');
                abilityRow.textContent = ability;
                abilityRow.style.padding = '5px 0';
                abilitiesSection.appendChild(abilityRow);
            });
            
            this.statsContent.appendChild(abilitiesSection);
        }
        
        // Create crafting section
        const craftingSection = this.createStatSection('Crafting');
        craftingSection.appendChild(this.createStatRow('Crafting Time Reduction', `${stats.craftingTimeReduction}%`));
        
        // Add craftable items if any exist
        if (stats.craftableItems.size > 0) {
            const craftableItemsTitle = this.uiHelper.createElement('div', 'subsection-title');
            craftableItemsTitle.textContent = 'Craftable Items';
            craftableItemsTitle.style.fontWeight = 'bold';
            craftableItemsTitle.style.marginTop = '10px';
            craftingSection.appendChild(craftableItemsTitle);
            
            const itemsList = this.uiHelper.createElement('div', 'items-list');
            itemsList.style.display = 'flex';
            itemsList.style.flexWrap = 'wrap';
            itemsList.style.gap = '5px';
            
            stats.craftableItems.forEach(item => {
                const itemBadge = this.uiHelper.createElement('div', 'item-badge');
                itemBadge.textContent = item;
                itemsList.appendChild(itemBadge);
            });
            
            craftingSection.appendChild(itemsList);
        }
        
        this.statsContent.appendChild(craftingSection);
    }
    
    /**
     * Shows the character stats UI
     */
    show() {
        if (!this.isVisible) {
            // Update stats before showing
            this.updateStats();
            
            this.container.style.display = 'flex';
            this.isVisible = true;
            
            // Add entrance animation
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.95)';
            this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Trigger animation after a small delay
            setTimeout(() => {
                this.container.style.opacity = '1';
                this.container.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            // Add document click listener to close when clicking outside
            document.addEventListener('click', this.handleOutsideClick);
            
            logger.info(LogCategory.UI, 'Character stats UI is now visible');
        }
    }
    
    /**
     * Hides the character stats UI
     */
    hide() {
        if (this.isVisible) {
            // Add exit animation
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.95)';
            
            // Remove after animation completes
            setTimeout(() => {
                this.container.style.display = 'none';
                this.isVisible = false;
            }, 300); // Match the transition duration
            
            // Remove document click listener
            document.removeEventListener('click', this.handleOutsideClick);
            
            logger.info(LogCategory.UI, 'Character stats UI is now hidden');
        }
    }
    
    /**
     * Toggles the visibility of the character stats UI
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroys the character stats UI and removes it from the DOM
     */
    destroy() {
        // Remove event listeners
        playerStatsService.off('stats-changed', this.updateStats);
        document.removeEventListener('click', this.handleOutsideClick);
        
        // Remove from DOM
        if (this.container?.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 