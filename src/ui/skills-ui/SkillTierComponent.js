import { logger, LogCategory } from '../../utils/Logger';

/**
 * SkillTierComponent - Handles the display and organization of a skill tier
 */
export class SkillTierComponent {
    constructor(uiHelper, tier, isPlaceholder = false) {
        this.uiHelper = uiHelper;
        this.tier = tier;
        this.isPlaceholder = isPlaceholder;
        
        // DOM Elements
        this.container = null;
        this.skillsGrid = null;
        
        // Create the tier container
        this.createTierContainer();
    }
    
    /**
     * Creates the tier container
     */
    createTierContainer() {
        logger.info(LogCategory.UI, `[SkillTierComponent] Creating tier ${this.tier}`);
        
        // Create tier container
        this.container = this.uiHelper.createElement('div', `skill-tier tier-${this.tier}${this.isPlaceholder ? ' placeholder-tier' : ''}`);
        this.container.dataset.tier = this.tier;
        
        // Create tier header
        const tierHeader = this.uiHelper.createElement('div', 'tier-header');
        const tierTitle = this.uiHelper.createElement('h2', 'tier-title');
        tierTitle.textContent = `Tier ${this.tier}`;
        tierHeader.appendChild(tierTitle);
        
        // Add placeholder message if needed
        if (this.isPlaceholder) {
            const placeholderMsg = this.uiHelper.createElement('div', 'placeholder-message');
            placeholderMsg.innerHTML = `<span class="placeholder-icon">🔒</span><br>
                These ancient arts remain sealed until thou hast mastered the skills of lower tiers.<br>
                <span class="placeholder-note">Continue thy training to unlock these powerful abilities.</span>`;
            this.container.appendChild(tierHeader);
            this.container.appendChild(placeholderMsg);
            return;
        }
        
        // Create skills grid
        this.skillsGrid = this.uiHelper.createElement('div', 'skills-grid');
        this.skillsGrid.style.display = 'grid';
        this.skillsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        this.skillsGrid.style.gap = '20px';
        
        // Add to tier container
        this.container.appendChild(tierHeader);
        this.container.appendChild(this.skillsGrid);
    }
    
    /**
     * Gets the tier container
     */
    getContainer() {
        return this.container;
    }
    
    /**
     * Gets the skills grid
     */
    getSkillsGrid() {
        return this.skillsGrid;
    }
    
    /**
     * Adds a skill node to the tier
     */
    addSkillNode(skillNode) {
        if (this.skillsGrid && !this.isPlaceholder) {
            this.skillsGrid.appendChild(skillNode);
            return true;
        }
        return false;
    }
    
    /**
     * Clears all skill nodes from the tier
     */
    clearSkillNodes() {
        if (this.skillsGrid) {
            while (this.skillsGrid.firstChild) {
                this.skillsGrid.removeChild(this.skillsGrid.firstChild);
            }
        }
    }
    
    /**
     * Destroys the tier component
     */
    destroy() {
        // Clear any references
        this.container = null;
        this.skillsGrid = null;
    }
} 