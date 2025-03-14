import { MedievalMenu } from './ui/menu';
import { logger, LogCategory } from './utils/Logger';
import { getSkillInitializer } from './skills';

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
        getSkillInitializer().initialize();
        
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