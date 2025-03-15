import { logger, LogCategory } from '../../utils/Logger';
import { DOMUIHelper } from '../../utils/DOMUIHelper';
import './equipment-ui.css';

/**
 * MedievalEquipmentUI - A medieval-themed equipment UI using DOM elements
 * This provides a stylized and user-friendly interface for managing equipment
 * that matches the existing popup system styling
 */
export class MedievalEquipmentUI {
    /**
     * Create a new medieval equipment UI
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.equipmentManager = options.equipmentManager;
        this.uiHelper = new DOMUIHelper(scene);
        
        // Register this UI with the equipment manager
        if (this.equipmentManager) {
            this.equipmentManager.setEquipmentUI(this);
        } else {
            logger.error(LogCategory.UI, 'Equipment manager not provided to MedievalEquipmentUI');
        }
        
        // DOM Elements
        this.container = null;
        this.overlay = null;
        this.slots = {};
        this.tooltipElement = null;
        this.notificationElement = null;
        
        // UI state
        this.visible = false;
        this.activeSlot = null;
        this.selectingForSlot = null; // Track which slot we're selecting for
        
        // Options
        this.options = {
            title: options.title || 'Equipment',
            slotSize: options.slotSize || '80px',
            ...options
        };
        
        // Bind methods to this instance
        this.handleItemEquipped = this.handleItemEquipped.bind(this);
        this.handleInventoryClosed = this.handleInventoryClosed.bind(this);
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.refresh = this.refresh.bind(this);
        
        // Initialize the UI
        this.initialize();
        
        // Set up event listeners
        this.setupEventListeners();
        
        logger.info(LogCategory.UI, 'MedievalEquipmentUI initialized');
    }
    
    /**
     * Initialize the UI
     */
    initialize() {
        // Create overlay for blocking clicks to game canvas
        this.overlay = this.uiHelper.createElement('div', 'popup-overlay');
        this.overlay.style.display = 'none';
        this.overlay.style.pointerEvents = 'auto'; // Ensure clicks are captured
        
        // Prevent clicks from propagating to elements behind the overlay
        this.overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent default behavior
        });
        
        // Create main container
        this.container = this.uiHelper.createElement('div', 'custom-popup');
        
        // Prevent clicks from propagating to elements behind the container
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Add preventDefault to ensure clicks don't pass through
        });
        
        // Apply styles
        const styles = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            zIndex: '1001',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto' // Ensure pointer events are captured
        };
        
        Object.assign(this.container.style, styles);
        
        // Add parchment texture
        const parchmentTexture = this.uiHelper.createElement('div', 'parchment-texture');
        this.container.appendChild(parchmentTexture);
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.container.appendChild(cornerTopLeft);
        this.container.appendChild(cornerTopRight);
        this.container.appendChild(cornerBottomLeft);
        this.container.appendChild(cornerBottomRight);
        
        // Create title
        const title = this.uiHelper.createElement('div', 'popup-title');
        title.textContent = this.options.title;
        this.container.appendChild(title);
        
        // Create close button
        const closeButton = this.uiHelper.createElement('div', 'close-button');
        closeButton.textContent = '×';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });
        this.container.appendChild(closeButton);
        
        // Create content wrapper
        const content = this.uiHelper.createElement('div', 'popup-content equipment-content');
        content.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks from reaching the game
        });
        
        // Create equipment slots container
        const slotsContainer = this.uiHelper.createElement('div', 'equipment-slots');
        slotsContainer.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks from reaching the game
        });
        
        // Define equipment slots
        const slotDefinitions = [
            { id: 'shield', name: 'Shield', icon: '🛡️', row: 'top', position: 'left' },
            { id: 'armor', name: 'Armor', icon: '🛡️', row: 'top', position: 'center' },
            { id: 'weapon', name: 'Weapon', icon: '🗡️', row: 'top', position: 'right' },
            { id: 'ringLeft', name: 'Left Ring', icon: '💍', row: 'bottom', position: 'left' },
            { id: 'ringRight', name: 'Right Ring', icon: '💍', row: 'bottom', position: 'right' }
        ];
        
        // Create row containers
        const topRow = this.uiHelper.createElement('div', 'slot-row');
        const bottomRow = this.uiHelper.createElement('div', 'slot-bottom-row');
        
        // Create each equipment slot and add to appropriate row
        for (const slotDef of slotDefinitions) {
            const slot = this.createEquipmentSlot(slotDef);
            
            // Add to appropriate row
            if (slotDef.row === 'top') {
                topRow.appendChild(slot);
            } else {
                bottomRow.appendChild(slot);
            }
            
            this.slots[slotDef.id] = slot;
        }
        
        // Add rows to slots container
        slotsContainer.appendChild(topRow);
        slotsContainer.appendChild(bottomRow);
        
        // Add slots container to content
        content.appendChild(slotsContainer);
        
        // Create stats section
        const statsSection = this.uiHelper.createElement('div', 'equipment-stats');
        statsSection.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks from reaching the game
        });
        
        const statsTitle = this.uiHelper.createElement('h3', 'stats-title');
        statsTitle.textContent = 'Equipment Stats';
        statsSection.appendChild(statsTitle);
        
        // Create stats list
        const statsList = this.uiHelper.createElement('ul', 'stats-list');
        
        // Add actual game stats
        const stats = [
            { name: 'Attack', value: '0', key: 'attack' },
            { name: 'Defense', value: '0', key: 'defense' },
            { name: 'Health', value: '0', key: 'maxHealth' },
            { name: 'Speed', value: '0', key: 'speed' },
            { name: 'Crit Chance', value: '0%', key: 'criticalHitChance' },
            { name: 'Dodge Chance', value: '0%', key: 'dodgeChance' }
        ];
        
        for (const stat of stats) {
            const statItem = this.uiHelper.createElement('li', 'stat-item');
            const statName = this.uiHelper.createElement('span', 'stat-name');
            statName.textContent = stat.name + ':';
            const statValue = this.uiHelper.createElement('span', 'stat-value');
            statValue.textContent = stat.value;
            statValue.dataset.stat = stat.key.toLowerCase();
            
            statItem.appendChild(statName);
            statItem.appendChild(statValue);
            statsList.appendChild(statItem);
        }
        
        statsSection.appendChild(statsList);
        content.appendChild(statsSection);
        
        // Add content to container
        this.container.appendChild(content);
        
        // Add help text about equipment usage
        const helpText = this.uiHelper.createElement('div', 'equipment-help-text');
        helpText.innerHTML = `
            <p>Click on an empty slot to open your inventory and equip an item.</p>
            <p>Click the × button to unequip an item.</p>
        `;
        this.container.appendChild(helpText);
        
        // Create tooltip element
        this.tooltipElement = this.uiHelper.createElement('div', 'equipment-tooltip');
        this.tooltipElement.style.display = 'none';
        
        // Add container to overlay
        this.overlay.appendChild(this.container);
        
        // Add overlay to DOM
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.tooltipElement);
    }
    
    /**
     * Create an equipment slot
     * @param {Object} slotDef - The slot definition
     * @returns {HTMLElement} - The slot element
     */
    createEquipmentSlot(slotDef) {
        const slot = this.uiHelper.createElement('div', `equipment-slot`);
        slot.dataset.slotId = slotDef.id;
        slot.dataset.slotType = slotDef.id; // Used for inventory filtering
        
        // Set slot size
        slot.style.width = this.options.slotSize;
        slot.style.height = this.options.slotSize;
        
        // Create slot label
        const slotLabel = this.uiHelper.createElement('div', 'slot-label');
        slotLabel.textContent = slotDef.name;
        
        // Create slot icon (empty state)
        const slotIcon = this.uiHelper.createElement('div', 'slot-icon empty');
        slotIcon.innerHTML = slotDef.icon;
        
        // Create item element (hidden initially)
        const itemElement = this.uiHelper.createElement('div', 'equipped-item');
        itemElement.style.display = 'none';
        
        // Create unequip button (hidden initially)
        const unequipButton = this.uiHelper.createElement('div', 'unequip-button');
        unequipButton.innerHTML = '×';
        unequipButton.style.display = 'none';
        unequipButton.style.position = 'absolute';
        unequipButton.style.top = '0';
        unequipButton.style.right = '0';
        unequipButton.style.width = '20px';
        unequipButton.style.height = '20px';
        unequipButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        unequipButton.style.color = '#e8d4b9';
        unequipButton.style.borderRadius = '50%';
        unequipButton.style.fontSize = '16px';
        unequipButton.style.fontWeight = 'bold';
        unequipButton.style.cursor = 'pointer';
        unequipButton.style.display = 'flex';
        unequipButton.style.alignItems = 'center';
        unequipButton.style.justifyContent = 'center';
        unequipButton.style.transition = 'all 0.2s ease';
        
        // Add hover effects
        unequipButton.addEventListener('mouseover', () => {
            unequipButton.style.backgroundColor = 'rgba(139, 90, 43, 0.9)';
            unequipButton.style.color = '#ffffff';
            unequipButton.style.transform = 'scale(1.1)';
        });
        
        unequipButton.addEventListener('mouseout', () => {
            unequipButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            unequipButton.style.color = '#e8d4b9';
            unequipButton.style.transform = 'scale(1)';
        });
        
        unequipButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent slot click
            this.handleUnequip(slotDef.id);
        });
        
        // Add elements to slot
        slot.appendChild(slotIcon);
        slot.appendChild(itemElement);
        slot.appendChild(unequipButton);
        slot.appendChild(slotLabel);
        
        // Add event listeners
        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleSlotClick(slotDef.id);
        });
        slot.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            this.handleSlotHover(e, slotDef.id);
        });
        slot.addEventListener('mouseleave', (e) => {
            e.stopPropagation();
            this.hideTooltip();
        });
        
        return slot;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for equipment changes
        if (this.equipmentManager) {
            this.equipmentManager.events.on('equipment-changed', this.refresh, this);
        }
        
        // Listen for item equipped events
        this.scene.events.on('itemEquipped', this.handleItemEquipped, this);
        
        // Listen for inventory closed events
        this.scene.events.on('inventoryClosed', this.handleInventoryClosed, this);
        
        logger.info(LogCategory.UI, 'MedievalEquipmentUI event listeners set up');
    }
    
    /**
     * Handle slot click
     * @param {string} slotId - The slot ID
     */
    handleSlotClick(slotId) {
        logger.info(LogCategory.UI, `Equipment slot clicked: ${slotId}`);
        
        if (!this.equipmentManager) return;
        
        const item = this.equipmentManager.getEquippedItem(slotId);
        
        if (!item) {
            // Open inventory with filter for this slot type
            this.openInventoryForSlot(slotId);
        }
        // If item is equipped, do nothing on slot click (unequip is handled by the unequip button)
    }
    
    /**
     * Handle unequip button click
     * @param {string} slotId - The slot ID
     */
    handleUnequip(slotId) {
        if (!this.equipmentManager) return;
        
        const item = this.equipmentManager.getEquippedItem(slotId);
        
        if (item) {
            // Unequip the item - this will return it to the player's inventory
            this.equipmentManager.unequip(slotId);
            logger.info(LogCategory.UI, `Unequipped item from ${slotId}: ${item.name}`);
            
            // Show a brief message to the player
            this.showNotification(`Unequipped ${item.name}`);
        }
    }
    
    /**
     * Open inventory with filter for specific slot type
     * @param {string} slotId - The slot ID to filter for
     */
    openInventoryForSlot(slotId) {
        // Map slot IDs to item types for filtering
        const slotToItemTypeMap = {
            'weapon': 'weapon',
            'shield': 'shield',
            'armor': 'armor',
            'ringLeft': 'ring',
            'ringRight': 'ring'
        };
        
        const itemType = slotToItemTypeMap[slotId] || slotId;
        
        // Set the selecting slot
        this.selectingForSlot = slotId;
        
        // Highlight the selected slot
        this.highlightSlot(slotId);
        
        // Open inventory with filter and target slot
        this.scene.events.emit('openInventory', { 
            equipToSlot: slotId,
            filterType: itemType,
            keepEquipmentOpen: true // Signal to keep equipment UI open
        });
        
        // Update help text
        this.updateHelpText(`Select a ${itemType} to equip`);
        
        logger.info(LogCategory.UI, `Opening inventory for ${slotId} with filter: ${itemType}`);
    }
    
    /**
     * Highlight a slot to indicate it's being selected for
     * @param {string} slotId - The slot ID to highlight
     */
    highlightSlot(slotId) {
        // Remove highlight from all slots
        for (const id in this.slots) {
            this.slots[id].classList.remove('selecting');
        }
        
        // Add highlight to the selected slot
        if (slotId && this.slots[slotId]) {
            this.slots[slotId].classList.add('selecting');
        }
    }
    
    /**
     * Update the help text
     * @param {string} message - The message to display
     */
    updateHelpText(message) {
        const helpText = this.container.querySelector('.equipment-help-text');
        if (helpText) {
            // Store the default help text if not already stored
            if (!this._defaultHelpText) {
                this._defaultHelpText = helpText.innerHTML;
            }
            
            // Update the help text
            if (message) {
                helpText.innerHTML = `<p>${message}</p>`;
            } else {
                // Restore default help text
                helpText.innerHTML = this._defaultHelpText;
            }
        }
    }
    
    /**
     * Handle when an item is equipped from inventory
     * @param {Object} data - The equip data
     */
    handleItemEquipped(data) {
        // Only handle if we're in selecting mode
        if (!this.selectingForSlot) return;
        
        // Check if the equipped slot matches what we're selecting for
        if (data && data.slotId === this.selectingForSlot) {
            // Reset the selecting state
            this.selectingForSlot = null;
            this.highlightSlot(null);
            
            // Restore default help text
            this.updateHelpText(null);
            
            // Show notification
            if (data.item) {
                this.showNotification(`Equipped ${data.item.name}`);
            }
            
            // Refresh the UI
            this.refresh();
        }
    }
    
    /**
     * Handle when inventory is closed
     */
    handleInventoryClosed() {
        // Reset selecting state if we were in selecting mode
        if (this.selectingForSlot) {
            this.selectingForSlot = null;
            this.highlightSlot(null);
            this.updateHelpText(null);
        }
    }
    
    /**
     * Handle slot hover
     * @param {Event} event - The mouse event
     * @param {string} slotId - The slot ID
     */
    handleSlotHover(event, slotId) {
        if (!this.equipmentManager) return;
        
        const item = this.equipmentManager.getEquippedItem(slotId);
        
        if (item) {
            this.showTooltip(event, item);
        }
    }
    
    /**
     * Show tooltip for an item
     * @param {Event} event - The mouse event
     * @param {Object} item - The item to show tooltip for
     */
    showTooltip(event, item) {
        if (!this.tooltipElement) return;
        
        // Create tooltip content
        let tooltipContent = `
            <div class="tooltip-header">
                <span class="tooltip-name ${item.rarity || 'common'}">${item.name}</span>
            </div>
            <div class="tooltip-type">${item.type}</div>
            <div class="tooltip-stats">
        `;
        
        // Add stats if available
        if (item.stats) {
            for (const [stat, value] of Object.entries(item.stats)) {
                const sign = value >= 0 ? '+' : '';
                tooltipContent += `<div class="tooltip-stat">${stat}: ${sign}${value}</div>`;
            }
        }
        
        tooltipContent += `
            </div>
            <div class="tooltip-description">${item.description || ''}</div>
            <div class="tooltip-footer">Click to unequip</div>
        `;
        
        // Set tooltip content
        this.tooltipElement.innerHTML = tooltipContent;
        
        // Position tooltip
        const rect = event.target.getBoundingClientRect();
        this.tooltipElement.style.left = `${rect.right + 10}px`;
        this.tooltipElement.style.top = `${rect.top}px`;
        
        // Show tooltip
        this.tooltipElement.style.display = 'block';
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
    }
    
    /**
     * Refresh the UI to reflect current equipment
     */
    refresh() {
        if (!this.equipmentManager) return;
        
        // Get all equipped items
        const equipment = this.equipmentManager.getAllEquippedItems();
        
        // Update each slot
        for (const [slotId, item] of Object.entries(equipment)) {
            const slot = this.slots[slotId];
            if (!slot) continue;
            
            const slotIcon = slot.querySelector('.slot-icon');
            const itemElement = slot.querySelector('.equipped-item');
            const unequipButton = slot.querySelector('.unequip-button');
            
            if (item) {
                // Hide the empty slot icon
                if (slotIcon) slotIcon.style.display = 'none';
                
                // Update item element
                if (itemElement) {
                    // Get the item image URL using the same approach as inventory UI
                    let imageUrl = '';
                    
                    // Try to get the image URL from the asset manager first
                    if (this.scene.itemSystem && this.scene.itemSystem.getAssetManager) {
                        const assetManager = this.scene.itemSystem.getAssetManager();
                        
                        if (assetManager) {
                            // Check if the asset manager has a method to get texture URLs
                            if (typeof assetManager.getTextureUrl === 'function') {
                                imageUrl = assetManager.getTextureUrl(item.id);
                            } else if (typeof assetManager.getAssetKey === 'function') {
                                // If we only have the asset key, construct a URL based on the item's iconUrl
                                imageUrl = item.iconUrl ? `assets${item.iconUrl}` : '';
                            }
                        }
                    }
                    
                    // Fallback to the item's iconUrl if no image URL was found
                    if (!imageUrl && item.iconUrl) {
                        imageUrl = `assets${item.iconUrl}`;
                    }
                    
                    // Set item image or fallback to icon
                    if (imageUrl) {
                        itemElement.innerHTML = `<img src="${imageUrl}" alt="${item.name}" style="max-width: 80%; max-height: 80%; object-fit: contain;" />`;
                    } else {
                        itemElement.innerHTML = item.icon || '?';
                    }
                    
                    // Add rarity class
                    itemElement.className = `equipped-item ${item.rarity || 'common'}`;
                    
                    // Show the item
                    itemElement.style.display = 'flex';
                }
                
                // Show unequip button
                if (unequipButton) {
                    unequipButton.style.display = 'flex';
                    unequipButton.style.zIndex = '10'; // Ensure it's above the item
                }
                
                // Add equipped class to slot
                slot.classList.add('equipped');
            } else {
                // Show the empty slot icon
                if (slotIcon) slotIcon.style.display = 'flex';
                
                // Hide the item element
                if (itemElement) itemElement.style.display = 'none';
                
                // Hide unequip button
                if (unequipButton) unequipButton.style.display = 'none';
                
                // Remove equipped class from slot
                slot.classList.remove('equipped');
            }
        }
        
        // Update stats
        this.updateStats();
    }
    
    /**
     * Update equipment stats display
     */
    updateStats() {
        if (!this.equipmentManager) return;
        
        // Get total stats from equipment manager
        const stats = this.equipmentManager.getTotalStats();
        
        // Update stat values in the UI
        for (const [stat, value] of Object.entries(stats)) {
            const statElement = this.container.querySelector(`.stat-value[data-stat="${stat.toLowerCase()}"]`);
            if (statElement) {
                // Format the value based on the stat type
                let displayValue = value;
                
                // Add percentage sign for chance-based stats
                if (stat.toLowerCase().includes('chance')) {
                    displayValue = `${value}%`;
                }
                
                // Add plus sign for positive values
                else if (value > 0) {
                    displayValue = `+${value}`;
                }
                
                statElement.textContent = displayValue;
            }
        }
    }
    
    /**
     * Prevent event propagation for an element and all its children
     * @param {HTMLElement} element - The element to prevent event propagation for
     */
    preventEventPropagation(element) {
        if (!element) return;
        
        const events = [
            'click', 'mousedown', 'mouseup', 'mousemove', 
            'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 
            'contextmenu', 'wheel', 'touchstart', 'touchmove', 
            'touchend', 'touchcancel'
        ];
        
        // Set pointer-events to auto to ensure events are captured
        element.style.pointerEvents = 'auto';
        
        // Add event listeners to stop propagation and prevent default
        events.forEach(eventType => {
            element.addEventListener(eventType, (e) => {
                e.stopPropagation();
                if (eventType === 'click' || eventType.startsWith('mouse') || eventType.startsWith('touch')) {
                    e.preventDefault();
                }
            });
        });
        
        // Apply to all child elements recursively
        Array.from(element.children).forEach(child => {
            this.preventEventPropagation(child);
        });
    }
    
    /**
     * Show the equipment UI
     */
    show() {
        if (this.visible) return;
        
        // Show the overlay and container
        this.overlay.style.display = 'flex';
        
        // Ensure the overlay blocks all clicks to the game canvas
        this.overlay.style.pointerEvents = 'auto';
        
        // Apply event propagation prevention to all elements
        this.preventEventPropagation(this.overlay);
        this.preventEventPropagation(this.container);
        
        this.visible = true;
        
        // Refresh to show current equipment
        this.refresh();
        
        // Add a global click handler to prevent clicks from propagating to the game
        document.addEventListener('click', this.handleGlobalClick);
        
        logger.info(LogCategory.UI, 'MedievalEquipmentUI shown');
    }
    
    /**
     * Hide the equipment UI
     */
    hide() {
        if (!this.visible) return;
        
        // Hide the overlay and container
        this.overlay.style.display = 'none';
        
        this.visible = false;
        
        // Remove global click handler
        document.removeEventListener('click', this.handleGlobalClick);
        
        logger.info(LogCategory.UI, 'MedievalEquipmentUI hidden');
    }
    
    /**
     * Global click handler to prevent clicks from propagating to the game
     * @param {Event} e - The click event
     */
    handleGlobalClick(e) {
        // If the UI is visible, prevent all clicks from reaching the game
        if (this.visible) {
            e.stopPropagation();
            e.preventDefault();
            
            // If the click is outside the container but the UI is visible,
            // we still want to block it from reaching the game
            if (!this.container.contains(e.target) && !this.overlay.contains(e.target)) {
                // Optional: hide the UI when clicking outside
                // this.hide();
            }
        }
    }
    
    /**
     * Toggle the equipment UI visibility
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Show a brief notification message
     * @param {string} message - The message to show
     */
    showNotification(message) {
        // Create notification element if it doesn't exist
        if (!this.notificationElement) {
            this.notificationElement = this.uiHelper.createElement('div', 'equipment-notification');
            document.body.appendChild(this.notificationElement);
        }
        
        // Set message
        this.notificationElement.textContent = message;
        this.notificationElement.style.display = 'block';
        
        // Hide after a delay
        setTimeout(() => {
            this.notificationElement.style.display = 'none';
        }, 2000);
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        if (this.equipmentManager) {
            this.equipmentManager.events.off('equipment-changed', this.refresh, this);
        }
        
        // Remove scene event listeners
        this.scene.events.off('itemEquipped', this.handleItemEquipped, this);
        this.scene.events.off('inventoryClosed', this.handleInventoryClosed, this);
        
        // Remove global click handler
        document.removeEventListener('click', this.handleGlobalClick);
        
        // Remove DOM elements
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
        
        if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
        }
        
        // Clear references
        this.container = null;
        this.overlay = null;
        this.tooltipElement = null;
        this.notificationElement = null;
        this.slots = {};
        
        logger.info(LogCategory.UI, 'MedievalEquipmentUI destroyed');
    }
} 