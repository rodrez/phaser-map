import { logger, LogCategory } from '../utils/Logger';
import { EquipmentManager } from './equipment-manager';
import { EquipmentUI } from '../ui/EquipmentUI';
import { EquipmentVisualManager } from './equipment-visual-manager';

/**
 * Extension to integrate the equipment system with the game
 */
export class EquipmentSystemExtension {
    /**
     * Initialize the equipment system
     * @param {Object} scene - The scene to initialize in
     * @param {Object} playerManager - The player manager
     * @param {Object} inventoryManager - The inventory manager
     * @returns {Object} - The initialized equipment manager
     */
    static initialize(scene, playerManager, inventoryManager) {
        logger.info(LogCategory.INVENTORY, 'Initializing equipment system');
        
        // Create equipment manager
        const equipmentManager = new EquipmentManager(scene, playerManager, inventoryManager);
        
        // Create equipment UI
        const equipmentUI = new EquipmentUI(scene, equipmentManager);
        
        // Create equipment visual manager
        const visualManager = new EquipmentVisualManager(scene, playerManager, equipmentManager);
        
        // Store references in the scene for easy access
        scene.equipmentManager = equipmentManager;
        scene.equipmentUI = equipmentUI;
        scene.equipmentVisualManager = visualManager;
        
        // Add equipment integration to inventory UI if it exists
        if (scene.inventoryUI) {
            this.integrateWithInventoryUI(scene.inventoryUI, equipmentManager);
        }
        
        // Load saved equipment if available
        equipmentManager.loadEquipment();
        
        return equipmentManager;
    }
    
    /**
     * Integrate equipment system with inventory UI
     * @param {Object} inventoryUI - The inventory UI
     * @param {Object} equipmentManager - The equipment manager
     */
    static integrateWithInventoryUI(inventoryUI, equipmentManager) {
        // Add equipment button to inventory UI
        inventoryUI.addEquipmentButton(() => {
            // Toggle equipment UI
            if (equipmentManager.equipmentUI) {
                equipmentManager.equipmentUI.toggle();
            }
        });
        
        // Add equip action to inventory UI context menu
        inventoryUI.addItemAction('Equip', (slotIndex) => {
            equipmentManager.equipFromInventory(slotIndex);
        }, (slotIndex, inventory) => {
            // Only show for equippable items
            const itemStack = inventory.getItemAt(slotIndex);
            if (!itemStack || itemStack.isEmpty()) return false;
            
            const item = itemStack.item;
            return item.type === 'weapon' || item.type === 'armor' || item.type === 'ring';
        });
    }
    
    /**
     * Update the equipment system
     * @param {Object} scene - The scene
     * @param {number} delta - Time delta in milliseconds
     */
    static update(scene, delta) {
        // Update equipment UI if it exists
        if (scene.equipmentUI) {
            scene.equipmentUI.update();
        }
        
        // Update equipment visual manager if it exists
        if (scene.equipmentVisualManager) {
            scene.equipmentVisualManager.update();
        }
    }
    
    /**
     * Clean up the equipment system
     * @param {Object} scene - The scene
     */
    static cleanup(scene) {
        // Save equipment before cleanup
        if (scene.equipmentManager) {
            scene.equipmentManager.saveEquipment();
        }
        
        // Destroy equipment visual manager
        if (scene.equipmentVisualManager) {
            scene.equipmentVisualManager.destroy();
            scene.equipmentVisualManager = null;
        }
        
        // Destroy equipment UI
        if (scene.equipmentUI) {
            scene.equipmentUI.destroy();
            scene.equipmentUI = null;
        }
        
        // Destroy equipment manager
        if (scene.equipmentManager) {
            scene.equipmentManager.destroy();
            scene.equipmentManager = null;
        }
        
        logger.info(LogCategory.INVENTORY, 'Equipment system cleaned up');
    }
} 