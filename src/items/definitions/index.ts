import { logger, LogCategory } from '../../utils/Logger';
import { ItemRegistry } from './item-registry';

// Import all item definition files
import { weaponDefinitions } from './weapons';
import { armorDefinitions } from './armor';
import { consumableDefinitions } from './consumables';
import { resourceDefinitions } from './resources';

// Initialize and load all item definitions
export function initializeItemDefinitions(): void {
    const registry = ItemRegistry.getInstance();
    
    logger.info(LogCategory.ITEMS, 'Initializing item definitions...');
    
    // Register all definitions
    registry.registerDefinitions(weaponDefinitions);
    registry.registerDefinitions(armorDefinitions);
    registry.registerDefinitions(consumableDefinitions);
    registry.registerDefinitions(resourceDefinitions);
    
    logger.info(
        LogCategory.ITEMS, 
        `Item definitions initialized: ${registry.getAllDefinitions().length} items registered`
    );
}

// Export the registry for direct access
export { ItemRegistry }; 