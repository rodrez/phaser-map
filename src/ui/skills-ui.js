import { DOMUIHelper } from '../utils/DOMUIHelper';
import { logger, LogCategory } from '../utils/Logger';
import { getSkillManager, getSkillInitializer } from '../skills';
import { SkillsUIContainer } from './skills-ui/SkillsUIContainer';
import { SkillDetailsModal } from './skills-ui/SkillDetailsModal';
import { NotificationComponent } from './skills-ui/NotificationComponent';

/**
 * SkillsUI - A medieval-themed HTML/CSS skills interface
 * This class creates a DOM-based skills UI with customizable options
 */
export class SkillsUI {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.uiHelper = new DOMUIHelper(scene);
        
        // State
        this.isVisible = false;
        this.activeSkill = null;
        this.playerSkills = new Map(); // Map of skill id to current level
        
        // Get the skill manager
        this.skillManager = getSkillManager();
        
        // Get the skill initializer
        try {
            this.skillInitializer = getSkillInitializer();
        } catch (error) {
            logger.warn(LogCategory.SKILLS, `[SkillsUI] Could not get skill initializer: ${error.message}`);
            this.skillInitializer = null;
        }
        
        // Get skill points from the skill manager
        this.skillPoints = this.skillManager.getSkillPoints();
        
        // Set default options
        this.options = {
            width: options.width || '80%',
            height: options.height || '80%',
            maxWidth: options.maxWidth || '1000px',
            maxHeight: options.maxHeight || '800px'
        };
        
        // Load the CSS files if not already loaded
        this.uiHelper.loadCSS('/styles/medieval-menu.css');
        this.uiHelper.loadCSS('/styles/popups.css');
        this.uiHelper.loadCSS('/styles/skills-ui.css');
        
        // Create components
        this.container = new SkillsUIContainer(this, this.uiHelper, this.options);
        this.detailsModal = new SkillDetailsModal(this, this.uiHelper);
        this.notification = new NotificationComponent(this.uiHelper);
    }
    
    /**
     * Initializes the skills UI with skill data
     */
    initialize() {
        logger.info(LogCategory.UI, '[SkillsUI] Initializing skills UI');
        
        // Initialize the container with skill data
        this.container.initialize();
        
        // Update player skills from the skill manager
        this.updatePlayerSkillsFromManager();
        
        logger.info(LogCategory.UI, '[SkillsUI] Skills UI initialized');
    }
    
    /**
     * Updates player skills from the skill manager
     */
    updatePlayerSkillsFromManager() {
        // Clear existing player skills
        this.playerSkills.clear();
        
        // Get all skills from the skill manager
        const playerSkills = this.skillManager.getPlayerSkills();
        
        logger.info(LogCategory.SKILLS, `[SkillsUI] Updating player skills from manager. Found ${playerSkills.length} skills.`);
        
        // Update player skills map
        for (const skill of playerSkills) {
            if (skill.level > 0) {
                this.playerSkills.set(skill.id, skill.level);
                logger.info(LogCategory.SKILLS, `[SkillsUI] Player has skill: ${skill.id} at level ${skill.level}`);
            }
        }
        
        // If no player skills were found, check all skills
        if (this.playerSkills.size === 0) {
            const allSkills = this.skillManager.getAllSkills();
            logger.info(LogCategory.SKILLS, `[SkillsUI] No player skills found, checking all ${allSkills.length} skills.`);
            
            for (const skill of allSkills) {
                if (skill.level > 0) {
                    this.playerSkills.set(skill.id, skill.level);
                    logger.info(LogCategory.SKILLS, `[SkillsUI] Found skill from all skills: ${skill.id} at level ${skill.level}`);
                }
            }
        }
        
        // Update skill points
        this.skillPoints = this.skillManager.getSkillPoints();
        logger.info(LogCategory.SKILLS, `[SkillsUI] Updated skill points: ${this.skillPoints}`);
        
        // Update skill points display
        this.container.updateSkillPointsDisplay(this.skillPoints);
        
        // Update skill nodes
        this.container.updateAllSkillNodes(this.playerSkills);
    }
    
    /**
     * Shows detailed information about a skill
     */
    showSkillDetails(skill) {
        logger.info(LogCategory.UI, `[SkillsUI] Showing details for skill: ${skill.id}`);
        
        // Set as active skill
        this.activeSkill = skill.id;
        
        // Get current skill level
        const currentLevel = this.playerSkills.get(skill.id) || 0;
        
        // Show the details modal
        this.detailsModal.show(skill, currentLevel, this.skillPoints);
    }
    
    /**
     * Hides the skill details modal
     */
    hideSkillDetails() {
        this.detailsModal.hide();
        this.activeSkill = null;
    }
    
    /**
     * Simulates learning a skill
     */
    learnSkill(skill) {
        logger.info(LogCategory.SKILLS, `[SkillsUI] Learning skill: ${skill.id}`);
        
        // Log when Learn Button is clicked with skill name
        logger.info(LogCategory.SKILLS, `[SkillsUI] Learn Button clicked for skill: ${skill.name}`);
        
        // Get current skill level
        const currentLevel = this.playerSkills.get(skill.id) || 0;
        const nextLevel = currentLevel + 1;
        
        // Check if we can learn this level
        if (nextLevel <= skill.levels.length) {
            const cost = skill.levels[nextLevel - 1].cost;
            
            // Check if we have enough skill points
            if (this.skillPoints >= cost) {
                // Learn the skill using the skill manager
                if (this.skillManager.learnSkill(skill.id)) {
                    // Manually apply skill effects to ensure they take effect
                    try {
                        if (this.skillInitializer && typeof this.skillInitializer.applyEffects === 'function') {
                            this.skillInitializer.applyEffects();
                            logger.info(LogCategory.SKILLS, `[SkillsUI] Manually applied skill effects after learning ${skill.id}`);
                        }
                    } catch (error) {
                        logger.warn(LogCategory.SKILLS, `[SkillsUI] Could not manually apply skill effects: ${error.message}`);
                    }
                    
                    // Update player skills from the skill manager
                    this.updatePlayerSkillsFromManager();
                    
                    // Update the skill details modal without closing it
                    const updatedLevel = this.playerSkills.get(skill.id) || 0;
                    this.detailsModal.update(skill, updatedLevel, this.skillPoints);
                    
                    // Show notification
                    const message = currentLevel === 0 
                        ? `You have learned the ${skill.name} skill!` 
                        : `You have upgraded ${skill.name} to level ${nextLevel}!`;
                    this.notification.show(message);
                    
                    // Log the successful skill learning
                    logger.info(LogCategory.SKILLS, `[SkillsUI] Successfully learned/upgraded skill: ${skill.id} to level ${nextLevel} (previous level: ${currentLevel})`);
                } else {
                    this.notification.show('Failed to learn skill!', 'error');
                }
            } else {
                this.notification.show('Not enough skill points!', 'warning');
            }
        }
    }
    
    /**
     * Shows the skills UI
     */
    show() {
        if (!this.isVisible) {
            // Initialize if needed
            if (!this.container.isInitialized()) {
                this.initialize();
            } else {
                // Update player skills from the skill manager
                this.updatePlayerSkillsFromManager();
            }
            
            // Show container
            this.container.show();
            this.isVisible = true;
        }
    }
    
    /**
     * Hides the skills UI
     */
    hide() {
        if (this.isVisible) {
            // Hide container
            this.container.hide();
            this.isVisible = false;
            
            // Hide details modal if open
            this.hideSkillDetails();
        }
    }
    
    /**
     * Toggles the skills UI visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroys the skills UI and removes it from the DOM
     */
    destroy() {
        logger.info(LogCategory.UI, '[SkillsUI] Destroying skills UI');
        
        try {
            // Hide UI first to prevent visual glitches
            if (this.isVisible) {
                this.isVisible = false;
            }
            
            // Destroy components
            this.container.destroy();
            this.detailsModal.destroy();
            this.notification.destroy();
            
            // Clear all references
            this.playerSkills.clear();
            this.activeSkill = null;
            
            logger.info(LogCategory.UI, '[SkillsUI] Skills UI destroyed successfully');
        } catch (error) {
            logger.error(LogCategory.UI, '[SkillsUI] Error during skills UI destruction:', error);
        }
    }
} 