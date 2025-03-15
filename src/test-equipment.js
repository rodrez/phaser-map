import { EquipmentSystemExtension } from './items/equipment-system-extension';
import { logger, LogCategory } from './utils/Logger';

/**
 * Test script for the equipment system
 * This demonstrates how to initialize and use the equipment system
 */
export function initializeEquipmentSystem(scene) {
    // Make sure the scene has a player manager and inventory manager
    if (!scene.playerManager) {
        logger.error(LogCategory.INVENTORY, 'Cannot initialize equipment system: Player manager not found');
        return null;
    }
    
    if (!scene.inventoryManager) {
        logger.error(LogCategory.INVENTORY, 'Cannot initialize equipment system: Inventory manager not found');
        return null;
    }
    
    // Initialize the equipment system
    const equipmentManager = EquipmentSystemExtension.initialize(
        scene,
        scene.playerManager,
        scene.inventoryManager
    );
    
    // Add a key to toggle the equipment UI
    const keyE = scene.input.keyboard.addKey('E');
    keyE.on('down', () => {
        if (scene.equipmentUI) {
            scene.equipmentUI.toggle();
            logger.info(LogCategory.UI, 'Equipment UI toggled with E key');
        }
    });
    
    // Log instructions
    logger.info(LogCategory.UI, 'Equipment system initialized. Press E to toggle equipment menu.');
    
    // Add update method to the scene
    const originalUpdate = scene.update;
    scene.update = function(time, delta) {
        // Call original update if it exists
        if (originalUpdate) {
            originalUpdate.call(scene, time, delta);
        }
        
        // Update equipment system
        EquipmentSystemExtension.update(scene, delta);
    };
    
    // Add shutdown method to clean up
    const originalShutdown = scene.shutdown;
    scene.shutdown = function() {
        // Call original shutdown if it exists
        if (originalShutdown) {
            originalShutdown.call(scene);
        }
        
        // Clean up equipment system
        EquipmentSystemExtension.cleanup(scene);
    };
    
    return equipmentManager;
}

/**
 * Add some test equipment to the inventory
 */
export function addTestEquipment(scene) {
    if (!scene.inventoryManager) {
        logger.error(LogCategory.INVENTORY, 'Cannot add test equipment: Inventory manager not found');
        return;
    }
    
    // Add a weapon
    scene.inventoryManager.addItem('sword', 1);
    
    // Add armor
    scene.inventoryManager.addItem('leather_armor', 1);
    
    // Add rings
    scene.inventoryManager.addItem('ring_of_strength', 1);
    scene.inventoryManager.addItem('ring_of_protection', 1);
    
    logger.info(LogCategory.INVENTORY, 'Test equipment added to inventory');
} 