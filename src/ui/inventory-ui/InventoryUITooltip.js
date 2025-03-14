/**
 * Handles the tooltip functionality for inventory items
 */
export class InventoryUITooltip {
    /**
     * Create a new tooltip handler
     */
    constructor() {
        this.createTooltip();
    }
    
    /**
     * Create the item tooltip
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'item-tooltip';
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.backgroundColor = '#2a1a0a';
        this.tooltip.style.border = '2px solid #8b5a2b';
        this.tooltip.style.borderRadius = '4px';
        this.tooltip.style.padding = '12px'; // Increased padding
        this.tooltip.style.width = '300px'; // Increased width
        this.tooltip.style.color = '#e8d4b9';
        this.tooltip.style.fontFamily = "'Cinzel', serif";
        this.tooltip.style.fontSize = '1rem'; // Increased font size
        this.tooltip.style.zIndex = '1100';
        this.tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.8)';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.opacity = '0';
        this.tooltip.style.transition = 'opacity 0.2s ease';
        
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * Show tooltip for an item
     * @param {BaseItem} item - The item to show tooltip for
     * @param {HTMLElement} itemElement - The item element
     */
    showTooltip(item, itemElement) {
        if (!item) return;
        
        // Create tooltip content
        const content = this.createTooltipContent(item);
        
        // Set tooltip content
        this.tooltip.innerHTML = content;
        
        // Show tooltip
        this.tooltip.style.opacity = '1';
        
        // Position tooltip
        this.positionTooltip(itemElement);
        
        // Store the current item element
        this.currentItemElement = itemElement;
        
        // Add mousemove event listener to update tooltip position
        document.addEventListener('mousemove', this.handleMouseMove);
    }
    
    /**
     * Create tooltip content for an item
     * @param {BaseItem} item - The item to create tooltip for
     * @returns {string} - The tooltip HTML content
     */
    createTooltipContent(item) {
        // Get rarity color
        const rarityColor = this.getRarityColor(item.rarity);
        
        // Start with item name and rarity
        let content = `
            <div class="tooltip-header" style="color: ${rarityColor}; font-weight: bold; font-size: 1.1rem; margin-bottom: 5px; border-bottom: 1px solid ${rarityColor};">
                ${item.name}
            </div>
        `;
        
        // Add item type
        content += `
            <div class="tooltip-type" style="color: #aaa; font-size: 0.9rem; margin-bottom: 8px;">
                ${this.getItemTypeText(item)}
            </div>
        `;
        
        // Add item stats based on type
        content += this.getItemStats(item);
        
        // Add item description
        if (item.description) {
            content += `
                <div class="tooltip-description" style="color: #ddd; font-style: italic; margin: 8px 0; padding-top: 5px; border-top: 1px solid #555;">
                    "${item.description}"
                </div>
            `;
        }
        
        // Add item metadata
        content += `
            <div class="tooltip-metadata" style="color: #aaa; font-size: 0.9rem; margin-top: 8px;">
        `;
        
        // Add weight if available
        if (item.weight !== undefined) {
            content += `<div>Weight: ${item.weight.toFixed(1)}</div>`;
        }
        
        // Add value if available
        if (item.value !== undefined) {
            content += `<div>Value: ${item.value} gold</div>`;
        }
        
        // Add level requirement if available
        if (item.level !== undefined) {
            content += `<div>Required Level: ${item.level}</div>`;
        }
        
        // Add durability if available
        if (item.durability !== undefined && item.maxDurability !== undefined) {
            const durabilityPercentage = (item.durability / item.maxDurability) * 100;
            const durabilityColor = this.getDurabilityColor(durabilityPercentage);
            
            content += `
                <div style="margin-top: 5px;">
                    Durability: <span style="color: ${durabilityColor};">${item.durability}/${item.maxDurability}</span>
                    <div style="width: 100%; height: 4px; background: #333; margin-top: 2px; border-radius: 2px;">
                        <div style="height: 100%; width: ${durabilityPercentage}%; background: ${durabilityColor}; border-radius: 2px;"></div>
                    </div>
                </div>
            `;
        }
        
        // Close metadata div
        content += `</div>`;
        
        // Add special attributes if available
        if (item.attributes && Object.keys(item.attributes).length > 0) {
            content += this.getItemAttributes(item);
        }
        
        return content;
    }
    
    /**
     * Get item type text
     * @param {BaseItem} item - The item
     * @returns {string} - The item type text
     */
    getItemTypeText(item) {
        // Import ItemType if available
        let ItemType, WeaponType, ArmorType;
        try {
            const itemModule = this.inventoryUI.itemSystem.ItemType;
            if (itemModule) {
                ItemType = itemModule;
                WeaponType = this.inventoryUI.itemSystem.WeaponType;
                ArmorType = this.inventoryUI.itemSystem.ArmorType;
            } else {
                // Fallback to default values
                ItemType = {
                    WEAPON: 0,
                    ARMOR: 1,
                    CONSUMABLE: 2,
                    RESOURCE: 3,
                    QUEST: 4,
                    MISC: 5
                };
                
                WeaponType = {
                    SWORD: 0,
                    AXE: 1,
                    MACE: 2,
                    DAGGER: 3,
                    BOW: 4,
                    CROSSBOW: 5,
                    STAFF: 6,
                    WAND: 7
                };
                
                ArmorType = {
                    HEAD: 0,
                    CHEST: 1,
                    LEGS: 2,
                    FEET: 3,
                    HANDS: 4,
                    SHIELD: 5
                };
            }
        } catch (e) {
            // Fallback to default values
            ItemType = {
                WEAPON: 0,
                ARMOR: 1,
                CONSUMABLE: 2,
                RESOURCE: 3,
                QUEST: 4,
                MISC: 5
            };
            
            WeaponType = {
                SWORD: 0,
                AXE: 1,
                MACE: 2,
                DAGGER: 3,
                BOW: 4,
                CROSSBOW: 5,
                STAFF: 6,
                WAND: 7
            };
            
            ArmorType = {
                HEAD: 0,
                CHEST: 1,
                LEGS: 2,
                FEET: 3,
                HANDS: 4,
                SHIELD: 5
            };
        }
        
        // Get item type text
        switch (item.type) {
            case ItemType.WEAPON:
                // Get weapon type text
                let weaponTypeText = 'Weapon';
                if (item.weaponType !== undefined) {
                    switch (item.weaponType) {
                        case WeaponType.SWORD:
                            weaponTypeText = 'Sword';
                            break;
                        case WeaponType.AXE:
                            weaponTypeText = 'Axe';
                            break;
                        case WeaponType.MACE:
                            weaponTypeText = 'Mace';
                            break;
                        case WeaponType.DAGGER:
                            weaponTypeText = 'Dagger';
                            break;
                        case WeaponType.BOW:
                            weaponTypeText = 'Bow';
                            break;
                        case WeaponType.CROSSBOW:
                            weaponTypeText = 'Crossbow';
                            break;
                        case WeaponType.STAFF:
                            weaponTypeText = 'Staff';
                            break;
                        case WeaponType.WAND:
                            weaponTypeText = 'Wand';
                            break;
                    }
                }
                return weaponTypeText;
                
            case ItemType.ARMOR:
                // Get armor type text
                let armorTypeText = 'Armor';
                if (item.armorType !== undefined) {
                    switch (item.armorType) {
                        case ArmorType.HEAD:
                            armorTypeText = 'Helmet';
                            break;
                        case ArmorType.CHEST:
                            armorTypeText = 'Chest';
                            break;
                        case ArmorType.LEGS:
                            armorTypeText = 'Legs';
                            break;
                        case ArmorType.FEET:
                            armorTypeText = 'Boots';
                            break;
                        case ArmorType.HANDS:
                            armorTypeText = 'Gloves';
                            break;
                        case ArmorType.SHIELD:
                            armorTypeText = 'Shield';
                            break;
                    }
                }
                return armorTypeText;
                
            case ItemType.CONSUMABLE:
                return 'Consumable';
                
            case ItemType.RESOURCE:
                return 'Resource';
                
            case ItemType.QUEST:
                return 'Quest Item';
                
            case ItemType.MISC:
                return 'Miscellaneous';
                
            default:
                return 'Item';
        }
    }
    
    /**
     * Get item stats based on type
     * @param {BaseItem} item - The item
     * @returns {string} - The item stats HTML
     */
    getItemStats(item) {
        // Import ItemType if available
        let ItemType;
        try {
            ItemType = this.inventoryUI.itemSystem.ItemType || {
                WEAPON: 0,
                ARMOR: 1,
                CONSUMABLE: 2,
                RESOURCE: 3,
                QUEST: 4,
                MISC: 5
            };
        } catch (e) {
            // Fallback to default values
            ItemType = {
                WEAPON: 0,
                ARMOR: 1,
                CONSUMABLE: 2,
                RESOURCE: 3,
                QUEST: 4,
                MISC: 5
            };
        }
        
        let statsHtml = '<div class="tooltip-stats" style="margin: 5px 0;">';
        
        // Add stats based on item type
        switch (item.type) {
            case ItemType.WEAPON:
                // Add damage
                if (item.attributes && item.attributes.damage !== undefined) {
                    statsHtml += `<div>Damage: <span style="color: #ff6b6b;">${item.attributes.damage}</span></div>`;
                }
                break;
                
            case ItemType.ARMOR:
                // Add defense
                if (item.attributes && item.attributes.defense !== undefined) {
                    statsHtml += `<div>Defense: <span style="color: #4dabf7;">${item.attributes.defense}</span></div>`;
                }
                break;
                
            case ItemType.CONSUMABLE:
                // Add health restore
                if (item.healthRestore) {
                    statsHtml += `<div>Restores <span style="color: #69db7c;">${item.healthRestore}</span> Health</div>`;
                }
                
                // Add mana restore
                if (item.manaRestore) {
                    statsHtml += `<div>Restores <span style="color: #4dabf7;">${item.manaRestore}</span> Mana</div>`;
                }
                
                // Add effect duration
                if (item.effectDuration) {
                    statsHtml += `<div>Effect lasts for ${item.effectDuration} seconds</div>`;
                }
                break;
        }
        
        statsHtml += '</div>';
        
        return statsHtml;
    }
    
    /**
     * Get item attributes HTML
     * @param {BaseItem} item - The item
     * @returns {string} - The item attributes HTML
     */
    getItemAttributes(item) {
        let attributesHtml = `
            <div class="tooltip-attributes" style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #555; color: #a9e34b;">
                <div style="font-weight: bold; margin-bottom: 3px;">Special Attributes:</div>
        `;
        
        // Add attributes
        const attributes = item.attributes;
        
        // Skip certain attributes that are displayed elsewhere
        const skipAttributes = ['damage', 'defense', 'normal'];
        
        // Process each attribute
        for (const [key, value] of Object.entries(attributes)) {
            // Skip certain attributes
            if (skipAttributes.includes(key)) continue;
            
            // Format the attribute key
            const formattedKey = key
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Format the attribute value based on type
            let formattedValue = value;
            
            // Format percentages
            if (typeof value === 'number' && key.includes('chance') || key.includes('percent') || key.includes('boost')) {
                formattedValue = `${(value * 100).toFixed(0)}%`;
            }
            
            // Format durations
            if (typeof value === 'number' && key.includes('duration')) {
                formattedValue = `${value} seconds`;
            }
            
            // Add the attribute
            attributesHtml += `<div>${formattedKey}: ${formattedValue}</div>`;
        }
        
        attributesHtml += '</div>';
        
        return attributesHtml;
    }
    
    /**
     * Get the color for a rarity level
     * @param {number} rarity - The rarity level
     * @returns {string} - The color for the rarity
     */
    getRarityColor(rarity) {
        // Import ItemRarity if available
        let ItemRarity;
        try {
            ItemRarity = this.inventoryUI.itemSystem.ItemRarity || {
                COMMON: 0,
                UNCOMMON: 1,
                RARE: 2,
                EPIC: 3,
                LEGENDARY: 4,
                MYTHIC: 5
            };
        } catch (e) {
            // Fallback to default values
            ItemRarity = {
                COMMON: 0,
                UNCOMMON: 1,
                RARE: 2,
                EPIC: 3,
                LEGENDARY: 4,
                MYTHIC: 5
            };
        }
        
        switch (rarity) {
            case ItemRarity.COMMON:
                return '#9d9d9d'; // Gray
            case ItemRarity.UNCOMMON:
                return '#1eff00'; // Green
            case ItemRarity.RARE:
                return '#0070dd'; // Blue
            case ItemRarity.EPIC:
                return '#a335ee'; // Purple
            case ItemRarity.LEGENDARY:
                return '#ff8000'; // Orange
            case ItemRarity.MYTHIC:
                return '#e6cc80'; // Gold
            default:
                return '#9d9d9d'; // Default to gray
        }
    }
    
    /**
     * Get the color for a durability percentage
     * @param {number} percentage - The durability percentage
     * @returns {string} - The color for the durability
     */
    getDurabilityColor(percentage) {
        if (percentage > 60) {
            return '#1eff00'; // Green
        } else if (percentage > 30) {
            return '#ffff00'; // Yellow
        } else {
            return '#ff0000'; // Red
        }
    }
    
    /**
     * Position the tooltip based on mouse position
     * @param {HTMLElement} itemElement - The item element
     */
    positionTooltip(itemElement) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = itemElement.offsetLeft + itemElement.offsetWidth / 2 - tooltipRect.width / 2;
        let top = itemElement.offsetTop + itemElement.offsetHeight + 10;
        
        // Adjust position if tooltip would go off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = itemElement.offsetLeft + itemElement.offsetWidth / 2 - tooltipRect.width / 2;
        }
        
        if (top + tooltipRect.height > window.innerHeight) {
            top = itemElement.offsetTop - tooltipRect.height - 10;
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
    
    /**
     * Hide the tooltip
     */
    hideTooltip() {
        this.tooltip.style.opacity = '0';
    }
    
    /**
     * Destroy the tooltip
     */
    destroy() {
        if (this.tooltip && document.body.contains(this.tooltip)) {
            document.body.removeChild(this.tooltip);
        }
    }
} 