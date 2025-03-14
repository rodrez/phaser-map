import { logger, LogCategory } from '../../utils/Logger';
import { SkillIconHelper } from './SkillIconHelper';

/**
 * SkillNodeComponent - Handles individual skill nodes in the skills UI
 */
export class SkillNodeComponent {
    constructor(uiHelper, skill, tier) {
        this.uiHelper = uiHelper;
        this.skill = skill;
        this.tier = tier;
        
        // DOM Elements
        this.node = null;
        this.levelNodes = [];
        
        // Create the skill node
        this.createSkillNode();
    }
    
    /**
     * Creates a skill node
     */
    createSkillNode() {
        this.node = this.uiHelper.createElement('div', 'skill-node');
        this.node.dataset.id = this.skill.id;
        this.node.dataset.tier = this.tier;
        
        // Apply styles
        const styles = {
            position: 'relative',
            padding: '15px',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: 'rgba(200, 161, 101, 0.1)',
            border: '1px solid rgba(139, 69, 19, 0.3)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease'
        };
        
        Object.assign(this.node.style, styles);
        
        // Create skill header
        const skillHeader = this.uiHelper.createElement('div', 'skill-header');
        skillHeader.style.display = 'flex';
        skillHeader.style.alignItems = 'center';
        skillHeader.style.marginBottom = '8px';
        
        // Create skill icon (placeholder)
        const skillIcon = this.uiHelper.createElement('div', 'skill-icon');
        skillIcon.innerHTML = SkillIconHelper.getSkillIcon(this.skill);
        skillIcon.style.width = '32px';
        skillIcon.style.height = '32px';
        skillIcon.style.display = 'flex';
        skillIcon.style.alignItems = 'center';
        skillIcon.style.justifyContent = 'center';
        skillIcon.style.marginRight = '10px';
        skillIcon.style.fontSize = '20px';
        skillIcon.style.backgroundColor = 'rgba(200, 161, 101, 0.2)';
        skillIcon.style.borderRadius = '50%';
        
        // Create skill name
        const skillName = this.uiHelper.createElement('div', 'skill-name');
        skillName.textContent = this.skill.name;
        skillName.style.fontWeight = 'bold';
        skillName.style.fontSize = '1.1em';
        skillName.style.color = '#8B4513';
        
        // Create skill description
        const skillDesc = this.uiHelper.createElement('div', 'skill-description');
        skillDesc.textContent = this.skill.description;
        skillDesc.style.fontSize = '0.9em';
        skillDesc.style.color = '#e8d4b9';
        skillDesc.style.marginBottom = '8px';
        
        // Create skill levels
        const skillLevels = this.uiHelper.createElement('div', 'skill-levels');
        skillLevels.style.display = 'flex';
        skillLevels.style.alignItems = 'center';
        skillLevels.style.gap = '5px';
        skillLevels.style.marginTop = '10px';
        
        // Add level indicators
        const maxLevel = this.skill.levels.length;
        for (let i = 1; i <= maxLevel; i++) {
            const levelNode = this.uiHelper.createElement('div', 'skill-level');
            levelNode.dataset.level = i;
            
            // Apply base styles
            levelNode.style.width = '12px';
            levelNode.style.height = '12px';
            levelNode.style.borderRadius = '50%';
            levelNode.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
            levelNode.style.border = '1px solid #8B4513';
            levelNode.style.display = 'inline-block';
            levelNode.style.margin = '0 3px';
            levelNode.style.transition = 'all 0.3s ease';
            
            // Add tooltip with level info
            levelNode.title = `Level ${i}: ${this.getSkillLevelSummary(i)}`;
            
            // Add to levels container
            skillLevels.appendChild(levelNode);
            
            // Store reference
            this.levelNodes.push(levelNode);
        }
        
        // Add elements to the skill node
        skillHeader.appendChild(skillIcon);
        skillHeader.appendChild(skillName);
        this.node.appendChild(skillHeader);
        this.node.appendChild(skillDesc);
        this.node.appendChild(skillLevels);
        
        // Add hover effects
        this.node.addEventListener('mouseenter', () => {
            this.node.style.transform = 'translateY(-2px)';
            this.node.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        });
        
        this.node.addEventListener('mouseleave', () => {
            this.node.style.transform = 'translateY(0)';
            this.node.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });
    }
    
    /**
     * Gets a summary of a skill level
     */
    getSkillLevelSummary(level) {
        const skillLevel = this.skill.levels.find(l => l.level === level);
        if (!skillLevel) return 'Unknown';
        
        return `Cost: ${skillLevel.cost} point${skillLevel.cost > 1 ? 's' : ''}`;
    }
    
    /**
     * Gets the skill node element
     */
    getNode() {
        return this.node;
    }
    
    /**
     * Updates the skill node based on the current level
     */
    updateLevel(currentLevel) {
        if (!this.node) return;
        
        // Add or remove learned class based on level
        if (currentLevel > 0) {
            this.node.classList.add('learned');
            this.node.classList.add('just-learned');
            
            // Apply learned styles directly
            this.node.style.backgroundColor = 'rgba(200, 161, 101, 0.2)';
            this.node.style.borderColor = 'rgba(76, 120, 40, 0.5)';
            
            // Remove animation class after animation completes
            setTimeout(() => {
                if (this.node) {
                    this.node.classList.remove('just-learned');
                }
            }, 500);
        } else {
            // If skill is not learned, ensure the learned class is removed
            this.node.classList.remove('learned');
            
            // Reset styles
            this.node.style.backgroundColor = 'rgba(200, 161, 101, 0.1)';
            this.node.style.borderColor = 'rgba(139, 69, 19, 0.3)';
        }
        
        // Update level indicators
        this.levelNodes.forEach((node, index) => {
            const level = index + 1;
            if (level <= currentLevel) {
                // Apply learned styles
                node.classList.add('learned');
                
                // Apply styles directly to ensure they take effect
                node.style.backgroundColor = 'rgba(76, 120, 40, 0.7)'; // Brighter green
                node.style.borderColor = '#4c7828';
                node.style.boxShadow = '0 0 5px rgba(76, 120, 40, 0.5)'; // Add glow effect
                
                // Log that we're applying the style
                logger.info(LogCategory.UI, `[SkillNodeComponent] Setting level ${level} indicator to learned state for skill: ${this.skill.id}`);
            } else {
                // If level is not learned, ensure the learned class is removed
                node.classList.remove('learned');
                
                // Reset the style to default
                node.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
                node.style.borderColor = '#8B4513';
                node.style.boxShadow = 'none';
            }
        });
        
        // Force a reflow to ensure the DOM updates
        void this.node.offsetWidth;
        
        // Log the update for debugging
        logger.info(LogCategory.UI, `[SkillNodeComponent] Updated skill node: ${this.skill.id}, current level: ${currentLevel}`);
    }
    
    /**
     * Destroys the skill node component
     */
    destroy() {
        // Remove event listeners
        if (this.node) {
            const clone = this.node.cloneNode(false);
            if (this.node.parentNode) {
                this.node.parentNode.replaceChild(clone, this.node);
            }
        }
        
        // Clear references
        this.node = null;
        this.levelNodes = [];
    }
} 