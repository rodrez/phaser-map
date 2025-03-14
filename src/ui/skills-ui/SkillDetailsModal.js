import { logger, LogCategory } from '../../utils/Logger';
import { SkillIconHelper } from './SkillIconHelper';

/**
 * SkillDetailsModal - Handles the skill details popup
 */
export class SkillDetailsModal {
    constructor(skillsUI, uiHelper) {
        this.skillsUI = skillsUI;
        this.uiHelper = uiHelper;
        
        // DOM Elements
        this.modal = null;
        this.content = null;
        
        // State
        this.lastLearnedLevel = 0;
        
        // Create the modal
        this.createModal();
    }
    
    /**
     * Creates the modal
     */
    createModal() {
        this.modal = this.uiHelper.createElement('div', 'skill-details-modal custom-popup');
        
        // Apply styles
        const styles = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90%',
            padding: '20px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.7)',
            zIndex: '1003',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            display: 'none'
        };
        
        Object.assign(this.modal.style, styles);
        
        // Add parchment texture and decorative corners
        const parchmentTexture = this.uiHelper.createElement('div', 'parchment-texture');
        this.modal.appendChild(parchmentTexture);
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.modal.appendChild(cornerTopLeft);
        this.modal.appendChild(cornerTopRight);
        this.modal.appendChild(cornerBottomLeft);
        this.modal.appendChild(cornerBottomRight);
        
        // Create close button
        const closeButton = this.uiHelper.createElement('button', 'details-close-btn close-button');
        closeButton.innerHTML = '×';
        
        closeButton.addEventListener('click', () => {
            this.skillsUI.hideSkillDetails();
        });
        
        // Create content wrapper
        const content = this.uiHelper.createElement('div', 'details-content');
        content.style.position = 'relative';
        content.style.zIndex = '2';
        content.style.flex = '1';
        content.style.overflow = 'auto';
        content.style.padding = '10px';
        
        // Add to the modal
        this.modal.appendChild(closeButton);
        this.modal.appendChild(content);
        
        // Store reference
        this.content = content;
        
        // Add to the DOM
        document.body.appendChild(this.modal);
    }
    
    /**
     * Updates the modal with new skill details without closing and reopening it
     */
    update(skill, currentLevel, skillPoints) {
        logger.info(LogCategory.UI, `[SkillDetailsModal] Updating details for skill: ${skill.id}, level: ${currentLevel}`);
        
        // Check if this is a level up
        const previousLevel = this.lastLearnedLevel;
        if (currentLevel > previousLevel) {
            // Store the current level as the most recently learned
            this.lastLearnedLevel = currentLevel;
            logger.info(LogCategory.UI, `[SkillDetailsModal] Level up detected: ${previousLevel} -> ${currentLevel}`);
        }
        
        // Update content without closing the modal
        this.updateContent(skill, currentLevel, skillPoints);
    }
    
    /**
     * Shows the modal with skill details
     */
    show(skill, currentLevel, skillPoints) {
        logger.info(LogCategory.UI, `[SkillDetailsModal] Showing details for skill: ${skill.id}, level: ${currentLevel}`);
        
        // Reset the last learned level when showing a new skill
        this.lastLearnedLevel = 0;
        
        // Update content
        this.updateContent(skill, currentLevel, skillPoints);
        
        // Show the modal
        this.modal.style.display = 'flex';
    }
    
    /**
     * Updates the content of the modal
     * This is a helper method used by both show() and update()
     */
    updateContent(skill, currentLevel, skillPoints) {
        // Clear existing content
        this.content.innerHTML = '';
        
        const nextLevel = currentLevel + 1;
        const canLearn = nextLevel <= skill.levels.length && skillPoints >= skill.levels[nextLevel - 1].cost;
        
        // Create header
        const header = this.uiHelper.createElement('div', 'details-header');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        
        // Create skill icon
        const skillIcon = this.uiHelper.createElement('div', 'details-icon');
        skillIcon.innerHTML = SkillIconHelper.getSkillIcon(skill);
        skillIcon.style.width = '48px';
        skillIcon.style.height = '48px';
        skillIcon.style.display = 'flex';
        skillIcon.style.alignItems = 'center';
        skillIcon.style.justifyContent = 'center';
        skillIcon.style.marginRight = '15px';
        skillIcon.style.fontSize = '30px';
        
        // Create skill title
        const title = this.uiHelper.createElement('h2', 'details-title');
        title.textContent = skill.name;
        title.style.margin = '0';
        
        // Create skill level display
        const levelDisplay = this.uiHelper.createElement('div', 'skill-level-display');
        levelDisplay.textContent = currentLevel > 0 ? `Level ${currentLevel}` : 'Not Learned';
        levelDisplay.style.marginLeft = 'auto';
        levelDisplay.style.padding = '5px 10px';
        levelDisplay.style.background = currentLevel > 0 ? 'rgba(200, 161, 101, 0.2)' : 'rgba(139, 69, 19, 0.2)';
        levelDisplay.style.borderRadius = '4px';
        levelDisplay.style.fontSize = '0.9em';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.color = currentLevel > 0 ? '#c8a165' : '#8B4513';
        
        // Add to header
        header.appendChild(skillIcon);
        header.appendChild(title);
        header.appendChild(levelDisplay);
        
        // Create description
        const description = this.uiHelper.createElement('div', 'details-description');
        description.textContent = skill.description;
        
        // Create levels section
        const levelsSection = this.uiHelper.createElement('div', 'details-levels');
        levelsSection.style.display = 'flex';
        levelsSection.style.flexDirection = 'column';
        levelsSection.style.gap = '15px';
        
        // Add level details
        skill.levels.forEach((level, index) => {
            const levelNum = index + 1;
            const isLearned = currentLevel >= levelNum;
            const isNext = currentLevel + 1 === levelNum;
            
            // Check if this is the most recently learned level
            const isJustLearned = levelNum === currentLevel && currentLevel === this.lastLearnedLevel;
            
            const levelNode = this.createLevelDetailNode(skill, level, levelNum, isLearned, isNext, isJustLearned);
            levelsSection.appendChild(levelNode);
        });
        
        // Create buttons section
        const buttonsSection = this.uiHelper.createElement('div', 'details-buttons');
        buttonsSection.style.display = 'flex';
        buttonsSection.style.justifyContent = 'center';
        buttonsSection.style.gap = '10px';
        buttonsSection.style.marginTop = '20px';
        
        // Create learn/upgrade button if applicable
        if (nextLevel <= skill.levels.length) {
            const buttonText = currentLevel === 0 ? 'Learn Skill' : 'Upgrade Skill';
            const buttonClass = currentLevel === 0 ? 'learn-button' : 'upgrade-button';
            const actionButton = this.uiHelper.createElement('button', buttonClass + (canLearn ? '' : ' button-disabled'));
            actionButton.textContent = buttonText;
            
            // Add cost display
            const costText = ` (${skill.levels[nextLevel - 1].cost} point${skill.levels[nextLevel - 1].cost > 1 ? 's' : ''})`;
            actionButton.textContent += costText;
            
            // Add click handler if can learn
            if (canLearn) {
                actionButton.addEventListener('click', () => {
                    this.skillsUI.learnSkill(skill);
                });
            } else {
                actionButton.title = 'Not enough skill points';
            }
            
            // Add to buttons section
            buttonsSection.appendChild(actionButton);
        }
        
        // Add all sections to content
        this.content.appendChild(header);
        this.content.appendChild(description);
        this.content.appendChild(levelsSection);
        this.content.appendChild(buttonsSection);
    }
    
    /**
     * Creates a level detail node
     */
    createLevelDetailNode(skill, level, levelNum, isLearned, isNext, isJustLearned) {
        const levelNode = this.uiHelper.createElement('div', `level-detail${isLearned ? ' learned' : ''}${isNext ? ' next' : ''}`);
        levelNode.dataset.level = levelNum;
        
        // Add animation class if this is the most recently learned level
        if (isJustLearned) {
            levelNode.classList.add('just-learned');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                if (levelNode) {
                    levelNode.classList.remove('just-learned');
                }
            }, 1000);
            
            logger.info(LogCategory.UI, `[SkillDetailsModal] Adding animation to level ${levelNum} detail node`);
        }
        
        // Create level header
        const levelHeader = this.uiHelper.createElement('div', 'level-header');
        
        // Create level title
        const levelTitle = this.uiHelper.createElement('h3', 'level-title');
        levelTitle.textContent = `Level ${levelNum}`;
        levelTitle.style.margin = '0';
        
        // Create level status
        const levelStatus = this.uiHelper.createElement('div', 'level-status');
        if (isLearned) {
            levelStatus.textContent = '✓ Learned';
            levelStatus.dataset.status = 'learned';
        } else if (isNext) {
            levelStatus.textContent = '◯ Available';
            levelStatus.dataset.status = 'available';
        } else {
            levelStatus.textContent = '◯ Locked';
            levelStatus.dataset.status = 'locked';
        }
        
        // Create level cost
        const levelCost = this.uiHelper.createElement('div', 'level-cost');
        levelCost.textContent = `Cost: ${level.cost} point${level.cost > 1 ? 's' : ''}`;
        
        // Add to header
        levelHeader.appendChild(levelTitle);
        levelHeader.appendChild(document.createTextNode(' '));
        levelHeader.appendChild(levelStatus);
        levelHeader.appendChild(levelCost);
        
        // Create effects list
        const effectsList = this.uiHelper.createElement('ul', 'effects-list');
        
        // Add effects
        level.effects.forEach(effect => {
            const effectItem = this.uiHelper.createElement('li', 'effect-item');
            effectItem.textContent = effect.description;
            effectsList.appendChild(effectItem);
        });
        
        // Add unlocks if available
        if (level.unlocksSkills && level.unlocksSkills.length > 0) {
            const unlocksItem = this.uiHelper.createElement('li', 'unlocks-item');
            unlocksItem.textContent = `Unlocks: ${level.unlocksSkills.join(', ')}`;
            effectsList.appendChild(unlocksItem);
        }
        
        // Add to level node
        levelNode.appendChild(levelHeader);
        levelNode.appendChild(effectsList);
        
        return levelNode;
    }
    
    /**
     * Hides the modal
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
    
    /**
     * Destroys the modal and removes it from the DOM
     */
    destroy() {
        try {
            // Hide modal
            if (this.modal) {
                this.modal.style.display = 'none';
            }
            
            // Remove event listeners from buttons in the modal
            const closeButton = this.modal.querySelector('.details-close-btn');
            if (closeButton) {
                const clone = closeButton.cloneNode(true);
                closeButton.parentNode.replaceChild(clone, closeButton);
            }
            
            // Remove from DOM
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            
            // Clear references
            this.modal = null;
            this.content = null;
            
            logger.info(LogCategory.UI, '[SkillDetailsModal] Modal destroyed');
        } catch (error) {
            logger.error(LogCategory.UI, '[SkillDetailsModal] Error during modal destruction:', error);
        }
    }
} 