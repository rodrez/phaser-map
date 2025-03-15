import { logger, LogCategory } from '../utils/Logger';
import { ItemType, WeaponType, ArmorType } from './item-types';

/**
 * EquipmentManager - Manages the player's equipped items
 */
export class EquipmentManager {
    /**
     * Create a new equipment manager
     * @param {Object} scene - The scene this manager belongs to
     * @param {Object} playerManager - The player manager instance
     * @param {Object} inventoryManager - The inventory manager instance
     */
    constructor(scene, playerManager, inventoryManager) {
        this.scene = scene;
        this.playerManager = playerManager;
        this.inventoryManager = inventoryManager;
        
        // Equipment slots - simplified to weapon, armor, and rings
        this.equipment = {
            weapon: null,
            armor: null,
            shield: null,
            ringLeft: null,
            ringRight: null
        };
        
        // UI component for equipment
        this.equipmentUI = null;
        
        // Event emitter for equipment changes
        this.events = new Phaser.Events.EventEmitter();
        
        logger.info(LogCategory.INVENTORY, 'EquipmentManager initialized with simplified slots');
    }
    
    /**
     * Set the equipment UI component
     * @param {Object} equipmentUI - The equipment UI component
     */
    setEquipmentUI(equipmentUI) {
        this.equipmentUI = equipmentUI;
    }
    
    /**
     * Equip an item from the inventory
     * @param {number} slotIndex - The inventory slot index
     * @returns {boolean} - Whether the item was successfully equipped
     */
    equipFromInventory(slotIndex) {
        const inventory = this.inventoryManager.getInventory();
        const itemStack = inventory.getSlot(slotIndex);
        
        if (!itemStack || itemStack.isEmpty()) {
            logger.warn(LogCategory.INVENTORY, `Cannot equip: No item in slot ${slotIndex}`);
            return false;
        }
        
        const item = itemStack.item;
        
        // Check if the item is equippable
        if (item.type !== ItemType.WEAPON && item.type !== ItemType.ARMOR && item.type !== ItemType.RING) {
            logger.warn(LogCategory.INVENTORY, `Cannot equip: Item ${item.name} is not equippable`);
            return false;
        }
        
        // Determine the equipment slot
        let slot = null;
        
        if (item.type === ItemType.WEAPON) {
            slot = 'weapon';
        } else if (item.type === ItemType.ARMOR) {
            slot = 'armor';
        } else if (item.type === ItemType.RING) {
            // For rings, check if left or right is available
            if (!this.equipment.ringLeft) {
                slot = 'ringLeft';
            } else if (!this.equipment.ringRight) {
                slot = 'ringRight';
            } else {
                // Both ring slots are filled, replace the left one
                slot = 'ringLeft';
            }
        }
        
        if (!slot) {
            logger.warn(LogCategory.INVENTORY, `Cannot determine equipment slot for item ${item.name}`);
            return false;
        }
        
        // Unequip current item in that slot if any
        const currentItem = this.equipment[slot];
        if (currentItem) {
            // Add the current item back to inventory
            this.inventoryManager.addItem(currentItem.id, 1);
        }
        
        // Remove the item from inventory
        this.inventoryManager.removeItemFromSlot(slotIndex, 1);
        
        // Equip the new item
        this.equipment[slot] = item;
        
        // Emit equipment changed event
        this.events.emit('equipment-changed', { slot, item });
        
        // Update player stats based on equipment
        this.updatePlayerStats();
        
        // Refresh UI if available
        this.refreshUI();
        
        logger.info(LogCategory.INVENTORY, `Equipped ${item.name} in ${slot} slot`);
        
        return true;
    }
    
    /**
     * Unequip an item from a slot
     * @param {string} slot - The equipment slot to unequip
     * @returns {boolean} - Whether the item was successfully unequipped
     */
    unequip(slot) {
        if (!this.equipment[slot]) {
            logger.warn(LogCategory.INVENTORY, `Cannot unequip: No item in ${slot} slot`);
            return false;
        }
        
        const item = this.equipment[slot];
        
        // Add the item back to inventory
        const added = this.inventoryManager.addItem(item.id, 1);
        
        if (!added) {
            logger.warn(LogCategory.INVENTORY, `Cannot unequip: Inventory is full`);
            return false;
        }
        
        // Remove from equipment
        this.equipment[slot] = null;
        
        // Emit equipment changed event
        this.events.emit('equipment-changed', { slot, item: null });
        
        // Update player stats based on equipment
        this.updatePlayerStats();
        
        // Refresh UI if available
        this.refreshUI();
        
        logger.info(LogCategory.INVENTORY, `Unequipped ${item.name} from ${slot} slot`);
        
        return true;
    }
    
    /**
     * Get the currently equipped item in a slot
     * @param {string} slot - The equipment slot
     * @returns {Object|null} - The equipped item or null if none
     */
    getEquippedItem(slot) {
        return this.equipment[slot] || null;
    }
    
    /**
     * Get all equipped items
     * @returns {Object} - Object containing all equipped items by slot
     */
    getAllEquippedItems() {
        return { ...this.equipment };
    }
    
    /**
     * Update player stats based on equipped items
     */
    updatePlayerStats() {
        // Get player stats service
        const statsService = this.playerManager.statsService;
        if (!statsService) {
            logger.warn(LogCategory.INVENTORY, 'Cannot update player stats: Stats service not found');
            return;
        }
        
        // Calculate total stats from equipment
        let totalDamage = 0;
        let totalDefense = 0;
        
        // Add weapon damage
        if (this.equipment.weapon) {
            totalDamage += this.equipment.weapon.getAttackDamage();
        }
        
        // Add armor defense
        if (this.equipment.armor) {
            totalDefense += this.equipment.armor.getDefenseValue();
        }
        
        // Add ring bonuses
        if (this.equipment.ringLeft) {
            if (this.equipment.ringLeft.attributes) {
                if (this.equipment.ringLeft.attributes.damage) {
                    totalDamage += this.equipment.ringLeft.attributes.damage;
                }
                if (this.equipment.ringLeft.attributes.defense) {
                    totalDefense += this.equipment.ringLeft.attributes.defense;
                }
            }
        }
        
        if (this.equipment.ringRight) {
            if (this.equipment.ringRight.attributes) {
                if (this.equipment.ringRight.attributes.damage) {
                    totalDamage += this.equipment.ringRight.attributes.damage;
                }
                if (this.equipment.ringRight.attributes.defense) {
                    totalDefense += this.equipment.ringRight.attributes.defense;
                }
            }
        }
        
        // Update player stats
        statsService.updateEquipmentStats({
            damage: totalDamage,
            defense: totalDefense
        });
        
        // Update equipped items in stats service
        statsService.updateEquippedItems({
            weapon: this.equipment.weapon ? this.equipment.weapon.name : null,
            armor: this.equipment.armor ? this.equipment.armor.name : null,
            ringLeft: this.equipment.ringLeft ? this.equipment.ringLeft.name : null,
            ringRight: this.equipment.ringRight ? this.equipment.ringRight.name : null
        });
        
        logger.info(LogCategory.INVENTORY, `Updated player stats: damage=${totalDamage}, defense=${totalDefense}`);
    }
    
    /**
     * Refresh the equipment UI
     */
    refreshUI() {
        if (this.equipmentUI) {
            this.equipmentUI.refresh();
        }
    }
    
    /**
     * Save equipment to local storage
     * @param {string} key - The storage key
     */
    saveEquipment(key = 'player_equipment') {
        try {
            // Convert equipment to a serializable format
            const serializedEquipment = {};
            
            for (const [slot, item] of Object.entries(this.equipment)) {
                serializedEquipment[slot] = item ? item.id : null;
            }
            
            // Save to local storage
            localStorage.setItem(key, JSON.stringify(serializedEquipment));
            
            logger.info(LogCategory.INVENTORY, `Equipment saved to ${key}`);
        } catch (e) {
            logger.error(LogCategory.INVENTORY, `Failed to save equipment: ${e.message}`);
        }
    }
    
    /**
     * Load equipment from local storage
     * @param {string} key - The storage key
     * @returns {boolean} - Whether the equipment was successfully loaded
     */
    loadEquipment(key = 'player_equipment') {
        try {
            // Get from local storage
            const serializedEquipment = localStorage.getItem(key);
            
            if (!serializedEquipment) {
                logger.info(LogCategory.INVENTORY, `No saved equipment found at ${key}`);
                return false;
            }
            
            // Parse the serialized equipment
            const equipmentData = JSON.parse(serializedEquipment);
            
            // Clear current equipment
            for (const slot in this.equipment) {
                this.equipment[slot] = null;
            }
            
            // Load each item
            for (const [slot, itemId] of Object.entries(equipmentData)) {
                if (itemId) {
                    // Create the item
                    const item = this.inventoryManager.itemSystem.createItem(itemId);
                    
                    if (item) {
                        this.equipment[slot] = item;
                    } else {
                        logger.warn(LogCategory.INVENTORY, `Failed to load item ${itemId} for slot ${slot}`);
                    }
                }
            }
            
            // Update player stats based on equipment
            this.updatePlayerStats();
            
            // Refresh UI if available
            this.refreshUI();
            
            logger.info(LogCategory.INVENTORY, `Equipment loaded from ${key}`);
            
            return true;
        } catch (e) {
            logger.error(LogCategory.INVENTORY, `Failed to load equipment: ${e.message}`);
            return false;
        }
    }
    
    /**
     * Clear all equipment
     */
    clear() {
        for (const slot in this.equipment) {
            this.equipment[slot] = null;
        }
        
        // Update player stats based on equipment
        this.updatePlayerStats();
        
        // Refresh UI if available
        this.refreshUI();
        
        logger.info(LogCategory.INVENTORY, 'Equipment cleared');
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clear event listeners
        this.events.removeAllListeners();
        
        // Clear equipment
        this.clear();
        
        // Clear references
        this.equipmentUI = null;
        this.playerManager = null;
        this.inventoryManager = null;
        
        logger.info(LogCategory.INVENTORY, 'EquipmentManager destroyed');
    }
    
    /**
     * Get total stats from all equipped items
     * @returns {Object} - Object containing total stats
     */
    getTotalStats() {
        const stats = {
            attack: 0,
            defense: 0,
            speed: 0,
            maxHealth: 0,
            criticalHitChance: 0,
            dodgeChance: 0
        };
        
        // Calculate total stats from all equipped items
        for (const item of Object.values(this.equipment)) {
            if (!item || !item.stats) continue;
            
            // Add each stat from the item
            for (const [stat, value] of Object.entries(item.stats)) {
                // Convert stat name to lowercase for consistency
                const statKey = stat.toLowerCase();
                
                // Initialize stat if it doesn't exist
                if (stats[statKey] === undefined) {
                    stats[statKey] = 0;
                }
                
                // Add the value to the stat
                stats[statKey] += value;
            }
        }
        
        // Get base player stats if available
        if (this.scene && this.scene.playerStats) {
            const playerStats = this.scene.playerStats;
            
            // Add base stats to equipment stats
            stats.attack += playerStats.baseAttack || 0;
            stats.defense += playerStats.baseDefense || 0;
            stats.speed += playerStats.baseSpeed || 0;
            stats.maxHealth += playerStats.baseMaxHealth || 0;
            stats.criticalHitChance += playerStats.criticalHitChance || 0;
            stats.dodgeChance += playerStats.dodgeChance || 0;
        }
        
        return stats;
    }
} 