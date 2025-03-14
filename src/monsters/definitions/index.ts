import { logger, LogCategory } from '../../utils/Logger';
import { MonsterRegistry } from './monster-registry';

// Import all monster definition files
import { basicMonsterDefinitions } from './basic-monsters';
import { bossMonsterDefinitions } from './boss-monsters';

// Initialize and load all monster definitions
export function initializeMonsterDefinitions(): void {
    const registry = MonsterRegistry.getInstance();
    
    logger.info(LogCategory.MONSTER, 'Initializing monster definitions...');
    
    // Register all definitions
    registry.registerDefinitions(basicMonsterDefinitions);
    registry.registerDefinitions(bossMonsterDefinitions);
    
    logger.info(
        LogCategory.MONSTER, 
        `Monster definitions initialized: ${registry.getAllDefinitions().length} monsters registered`
    );
}

// Export the registry and initialization function
export { MonsterRegistry }; 