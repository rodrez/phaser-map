import { logger, LogCategory } from '../../utils/Logger';
import { getTier1Skills } from '../../skills';
import { SkillTierComponent } from './SkillTierComponent';
import { SkillNodeComponent } from './SkillNodeComponent';
import { SkillIconHelper } from './SkillIconHelper';

/**
 * SkillsUIContainer - Handles the main container and layout for the skills UI
 */
export class SkillsUIContainer {
    constructor(skillsUI, uiHelper, options) {
        this.skillsUI = skillsUI;
        this.uiHelper = uiHelper;
        this.options = options;
        
        // DOM Elements
        this.container = null;
        this.skillTiersContainer = null;
        this.skillPointsValueElement = null;
        
        // State
        this.skillTiers = [];
        this.skillNodes = new Map();
        this._initialized = false;
        
        // Create the main container
        this.createContainer();
        
        // Hide the UI by default
        this.container.style.display = 'none';
    }
    
    /**
     * Creates the main container for the skills UI
     */
    createContainer() {
        this.container = this.uiHelper.createContainer('skills-ui custom-popup');
        
        // Apply styles
        const styles = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: this.options.width,
            height: this.options.height,
            maxWidth: this.options.maxWidth,
            maxHeight: this.options.maxHeight,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.7)',
            zIndex: '1002',
            boxSizing: 'border-box',
            overflow: 'hidden'
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
        
        // Create header
        const header = this.uiHelper.createElement('div', 'skills-header');
        header.innerHTML = '<h1>Character Skills</h1>';
        header.style.position = 'relative';
        header.style.zIndex = '2';
        header.style.textAlign = 'center';
        header.style.marginBottom = '10px';
        
        // Create skill points display
        const skillPointsDisplay = this.uiHelper.createElement('div', 'skill-points-display');
        skillPointsDisplay.style.textAlign = 'center';
        skillPointsDisplay.style.marginBottom = '20px';
        skillPointsDisplay.style.padding = '5px 10px';
        skillPointsDisplay.style.background = 'rgba(200, 161, 101, 0.2)';
        skillPointsDisplay.style.borderRadius = '5px';
        skillPointsDisplay.style.display = 'inline-block';
        skillPointsDisplay.style.position = 'relative';
        skillPointsDisplay.style.zIndex = '2';
        
        const skillPointsLabel = this.uiHelper.createElement('span', 'skill-points-label');
        skillPointsLabel.textContent = 'Available Skill Points: ';
        skillPointsLabel.style.fontWeight = 'bold';
        skillPointsLabel.style.color = '#e8d4b9';
        
        const skillPointsValue = this.uiHelper.createElement('span', 'skill-points-value');
        skillPointsValue.textContent = '0';
        skillPointsValue.style.color = '#eda21f';
        skillPointsValue.style.fontWeight = 'bold';
        
        skillPointsDisplay.appendChild(skillPointsLabel);
        skillPointsDisplay.appendChild(skillPointsValue);
        
        // Store reference to skill points value for updates
        this.skillPointsValueElement = skillPointsValue;
        
        // Create close button
        const closeButton = this.uiHelper.createElement('button', 'skills-close-btn close-button');
        closeButton.innerHTML = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.zIndex = '3';
        
        closeButton.addEventListener('click', () => {
            this.skillsUI.hide();
        });
        
        // Create content wrapper
        const content = this.uiHelper.createElement('div', 'skills-content');
        content.style.position = 'relative';
        content.style.zIndex = '2';
        content.style.flex = '1';
        content.style.overflow = 'auto';
        content.style.padding = '10px';
        
        // Create skill tiers container
        const skillTiersContainer = this.uiHelper.createElement('div', 'skill-tiers-container');
        skillTiersContainer.style.display = 'flex';
        skillTiersContainer.style.flexDirection = 'column';
        skillTiersContainer.style.gap = '30px';
        
        // Add to the DOM
        this.container.appendChild(header);
        header.appendChild(skillPointsDisplay);
        this.container.appendChild(closeButton);
        this.container.appendChild(content);
        content.appendChild(skillTiersContainer);
        
        // Store reference to the skill tiers container
        this.skillTiersContainer = skillTiersContainer;
        
        // Add to the DOM
        document.body.appendChild(this.container);
    }
    
    /**
     * Initializes the container with skill data
     */
    initialize() {
        logger.info(LogCategory.UI, '[SkillsUIContainer] Initializing container');
        
        // Get skills from the skill manager
        const tier1Skills = getTier1Skills();
        
        // Create skill tiers
        const tierComponent1 = new SkillTierComponent(this.uiHelper, 1, false);
        const tierComponent2 = new SkillTierComponent(this.uiHelper, 2, true);
        const tierComponent3 = new SkillTierComponent(this.uiHelper, 3, true);
        const tierComponent4 = new SkillTierComponent(this.uiHelper, 4, true);
        
        // Get tier containers
        const tier1Container = tierComponent1.getContainer();
        const tier2Container = tierComponent2.getContainer();
        const tier3Container = tierComponent3.getContainer();
        const tier4Container = tierComponent4.getContainer();
        
        // Add tiers to the container
        this.skillTiersContainer.appendChild(tier1Container);
        this.skillTiersContainer.appendChild(tier2Container);
        this.skillTiersContainer.appendChild(tier3Container);
        this.skillTiersContainer.appendChild(tier4Container);
        
        // Store references
        this.skillTiers.push({
            tier: 1,
            component: tierComponent1,
            skills: tier1Skills
        });
        
        this.skillTiers.push({
            tier: 2,
            component: tierComponent2,
            isPlaceholder: true
        });
        
        this.skillTiers.push({
            tier: 3,
            component: tierComponent3,
            isPlaceholder: true
        });
        
        this.skillTiers.push({
            tier: 4,
            component: tierComponent4,
            isPlaceholder: true
        });
        
        // Add skills to tier 1
        const skillsGrid = tierComponent1.getSkillsGrid();
        if (skillsGrid) {
            tier1Skills.forEach(skill => {
                const skillNodeComponent = new SkillNodeComponent(this.uiHelper, skill, 1);
                const skillNode = skillNodeComponent.getNode();
                
                // Add click handler
                skillNode.addEventListener('click', () => {
                    this.skillsUI.showSkillDetails(skill);
                });
                
                skillsGrid.appendChild(skillNode);
                
                // Store reference to skill node
                this.skillNodes.set(skill.id, {
                    node: skillNode,
                    component: skillNodeComponent
                });
            });
        }
        
        this._initialized = true;
        logger.info(LogCategory.UI, '[SkillsUIContainer] Container initialized');
    }
    
    /**
     * Updates the skill points display
     */
    updateSkillPointsDisplay(points) {
        if (this.skillPointsValueElement) {
            this.skillPointsValueElement.textContent = points.toString();
        }
    }
    
    /**
     * Updates all skill nodes based on player skills
     */
    updateAllSkillNodes(playerSkills) {
        // Update all skill nodes, not just the ones in playerSkills
        // This ensures nodes are updated even if they're not yet learned
        for (const [skillId, nodeData] of this.skillNodes) {
            const currentLevel = playerSkills.get(skillId) || 0;
            nodeData.component.updateLevel(currentLevel);
        }
        
        // Force a reflow on the entire container to ensure all DOM updates are applied
        if (this.container) {
            void this.container.offsetWidth;
        }
    }
    
    /**
     * Checks if the container has been initialized
     */
    isInitialized() {
        return this._initialized;
    }
    
    /**
     * Shows the container
     */
    show() {
        // Show container
        this.container.style.display = 'flex';
        
        // Add entrance animation
        this.container.style.opacity = '0';
        this.container.style.transform = 'translate(-50%, -50%) scale(0.95)';
        this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Trigger animation after a small delay
        setTimeout(() => {
            this.container.style.opacity = '1';
            this.container.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }
    
    /**
     * Hides the container
     */
    hide() {
        // Add exit animation
        this.container.style.opacity = '0';
        this.container.style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        // Hide after animation completes
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);
    }
    
    /**
     * Destroys the container and removes it from the DOM
     */
    destroy() {
        try {
            // Force immediate hide
            if (this.container) {
                this.container.style.display = 'none';
            }
            
            // Remove event listeners from all skill nodes
            if (this.skillNodes) {
                this.skillNodes.forEach(({ node }) => {
                    if (node) {
                        const clone = node.cloneNode(false);
                        if (node.parentNode) {
                            node.parentNode.replaceChild(clone, node);
                        }
                    }
                });
            }
            
            // Remove the container from the DOM
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            
            // Clear references
            this.container = null;
            this.skillTiersContainer = null;
            this.skillPointsValueElement = null;
            this.skillTiers = [];
            this.skillNodes.clear();
            this._initialized = false;
            
            logger.info(LogCategory.UI, '[SkillsUIContainer] Container destroyed');
        } catch (error) {
            logger.error(LogCategory.UI, '[SkillsUIContainer] Error during container destruction:', error);
        }
    }
} 