import { MedievalMenu } from './ui/menu';
import { logger, LogCategory } from './utils/Logger';
import { getSkillInitializer } from './skills';
import playerStatsService from './utils/player/PlayerStatsService';

/**
 * Test function to demonstrate the skills UI
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function testSkillsUI(scene) {
    logger.info(LogCategory.SKILLS, '[TestSkillsUI] Initializing skills UI test');
    
    // Check if scene is valid
    if (!scene) {
        logger.warn(LogCategory.UI, '[TestSkillsUI] Scene is undefined, cannot initialize skills UI test');
        return null;
    }
    
    // Create the menu
    let menu = null;
    try {
        // Initialize the skill system if not already initialized
        const skillInitializer = getSkillInitializer();
        skillInitializer.initialize();
        
        // Get the skill manager
        const skillManager = skillInitializer.getSkillManager();
        
        // Add some skill points for testing
        skillManager.setSkillPoints(10);
        
        // Log initial dodge chance
        logger.info(LogCategory.SKILLS, '[TestSkillsUI] Initial dodge chance:', 
            playerStatsService.getStat('dodgeChance'));
        
        // Add event listener for skill learned events
        skillManager.on('skill-learned', (skillId, level) => {
            logger.info(LogCategory.SKILLS, `[TestSkillsUI] Skill learned: ${skillId} (Level ${level})`);
            
            // Log updated dodge chance
            logger.info(LogCategory.SKILLS, '[TestSkillsUI] Updated dodge chance:', 
                playerStatsService.getStat('dodgeChance'));
            
            // If it's the Martial Arts skill level 2, show a message about dodge chance
            if (skillId === 'martial_arts' && level === 2) {
                logger.info(LogCategory.SKILLS, 
                    '[TestSkillsUI] Martial Arts Level 2 learned! You now have a 15% dodge chance when unarmed or using Oiyoi Gear.');
            }
            
            // If it's the Martial Arts skill level 3, show a message about dodge chance
            if (skillId === 'martial_arts' && level === 3) {
                logger.info(LogCategory.SKILLS, 
                    '[TestSkillsUI] Martial Arts Level 3 learned! You now have a 30% dodge chance when unarmed or using Oiyoi Gear.');
            }
        });
        
        // Create the menu
        menu = new MedievalMenu(scene);
        logger.info(LogCategory.UI, '[TestSkillsUI] Medieval menu created');
    } catch (error) {
        logger.error(LogCategory.UI, '[TestSkillsUI] Error creating medieval menu:', error);
        return null;
    }
    
    logger.info(LogCategory.UI, '[TestSkillsUI] Test UI initialized');
    
    return {
        menu,
        destroy: () => {
            // Destroy the menu if it exists
            if (menu) {
                menu.destroy();
            }
            
            logger.info(LogCategory.UI, '[TestSkillsUI] Test UI destroyed');
        }
    };
} 