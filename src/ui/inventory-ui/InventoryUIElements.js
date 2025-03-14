/**
 * Handles the creation and management of UI elements for the inventory
 */
export class InventoryUIElements {
    /**
     * Create a new InventoryUIElements instance
     * @param {InventoryUI} inventoryUI - The parent inventory UI
     */
    constructor(inventoryUI) {
        this.inventoryUI = inventoryUI;
        this.scene = inventoryUI.scene;
        this.panel = inventoryUI.panel;
        this.options = inventoryUI.options;
    }
    
    /**
     * Initialize UI elements (legacy method for backward compatibility)
     */
    initialize() {
        this.initializeDecorative();
        this.initializeContainer();
        this.initializeInfoSection();
    }
    
    /**
     * Initialize decorative elements only
     */
    initializeDecorative() {
        // Add decorative corners to the panel
        this.addDecorativeElements();
        
        // Prevent event propagation for the panel container
        this.inventoryUI.preventEventPropagation(this.panel.container);
    }
    
    /**
     * Initialize the inventory container
     */
    initializeContainer() {
        this.createInventoryContainer();
    }
    
    /**
     * Initialize the info section
     */
    initializeInfoSection() {
        this.createInventoryInfo();
    }
    
    /**
     * Add decorative elements to the panel
     */
    addDecorativeElements() {
        // Add parchment texture background
        const parchmentTexture = document.createElement('div');
        parchmentTexture.className = 'parchment-texture';
        parchmentTexture.style.position = 'absolute';
        parchmentTexture.style.top = '0';
        parchmentTexture.style.left = '0';
        parchmentTexture.style.width = '100%';
        parchmentTexture.style.height = '100%';
        parchmentTexture.style.opacity = '0.7';
        parchmentTexture.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" result="noise"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0" in="noise" result="noiseOutput"/></filter><rect width="200" height="200" filter="url(%23noise)" opacity="0.05"/></svg>\')';
        parchmentTexture.style.pointerEvents = 'none';
        parchmentTexture.style.mixBlendMode = 'overlay';
        parchmentTexture.style.zIndex = '-1';
        this.panel.container.appendChild(parchmentTexture);
        
        // Add decorative corners
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(position => {
            const corner = document.createElement('div');
            corner.className = `popup-corner corner-${position}`;
            corner.style.position = 'absolute';
            corner.style.width = '30px';
            corner.style.height = '30px';
            corner.style.zIndex = '1001';
            
            // Position and style the corner based on its position
            if (position === 'top-left') {
                corner.style.top = '-5px';
                corner.style.left = '-5px';
                corner.style.borderTop = '3px solid #c8a165';
                corner.style.borderLeft = '3px solid #c8a165';
                corner.style.borderTopLeftRadius = '8px';
            } else if (position === 'top-right') {
                corner.style.top = '-5px';
                corner.style.right = '-5px';
                corner.style.borderTop = '3px solid #c8a165';
                corner.style.borderRight = '3px solid #c8a165';
                corner.style.borderTopRightRadius = '8px';
            } else if (position === 'bottom-left') {
                corner.style.bottom = '-5px';
                corner.style.left = '-5px';
                corner.style.borderBottom = '3px solid #8b5a2b';
                corner.style.borderLeft = '3px solid #8b5a2b';
                corner.style.borderBottomLeftRadius = '8px';
            } else if (position === 'bottom-right') {
                corner.style.bottom = '-5px';
                corner.style.right = '-5px';
                corner.style.borderBottom = '3px solid #8b5a2b';
                corner.style.borderRight = '3px solid #8b5a2b';
                corner.style.borderBottomRightRadius = '8px';
            }
            
            this.panel.container.appendChild(corner);
        });
        
        // Enhance the panel styling to match popup styles
        this.panel.container.style.border = '3px solid';
        this.panel.container.style.borderImage = 'linear-gradient(to bottom, #c8a165, #8b5a2b) 1';
        this.panel.container.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
    }
    
    /**
     * Create the inventory container
     */
    createInventoryContainer() {
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.className = 'inventory-items';
        this.itemsContainer.style.display = 'grid';
        this.itemsContainer.style.gridTemplateColumns = `repeat(${this.options.columns}, 1fr)`;
        this.itemsContainer.style.gap = `${this.options.itemPadding}px`;
        this.itemsContainer.style.padding = `${this.options.padding}px`;
        this.itemsContainer.style.overflowY = 'auto';
        this.itemsContainer.style.overflowX = 'hidden';
        
        // Adjust max height to account for search and filter buttons at the top
        // and info section at the bottom
        const topSectionHeight = this.options.searchEnabled ? 120 : 60; // Estimated height for search and filters
        const infoSectionHeight = 80; // Estimated height for info section
        const availableHeight = this.options.height - topSectionHeight - infoSectionHeight;
        
        this.itemsContainer.style.maxHeight = `${availableHeight}px`;
        this.itemsContainer.style.scrollbarWidth = 'thin'; // For Firefox
        this.itemsContainer.style.scrollbarColor = '#8b5a2b #2a1a0a'; // For Firefox
        
        // Custom scrollbar styles for WebKit browsers (Chrome, Safari, Edge)
        this.itemsContainer.style.cssText += `
            ::-webkit-scrollbar {
                width: 8px;
            }
            ::-webkit-scrollbar-track {
                background: #2a1a0a;
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb {
                background: #8b5a2b;
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #c8a165;
            }
        `;
        
        // Prevent event propagation for scroll events
        this.inventoryUI.preventEventPropagation(this.itemsContainer);
        
        this.panel.addDOMElement(this.itemsContainer);
        
        // Store reference in the parent InventoryUI
        this.inventoryUI.itemsContainer = this.itemsContainer;
    }
    
    /**
     * Create inventory info section
     */
    createInventoryInfo() {
        this.infoContainer = document.createElement('div');
        this.infoContainer.className = 'inventory-info';
        this.infoContainer.style.display = 'flex';
        this.infoContainer.style.flexWrap = 'wrap'; // Allow wrapping on smaller screens
        this.infoContainer.style.justifyContent = 'space-between';
        this.infoContainer.style.padding = '15px 20px'; // Increased padding
        this.infoContainer.style.borderTop = '1px solid #8b5a2b';
        this.infoContainer.style.marginTop = '10px';
        this.infoContainer.style.fontFamily = "'Cinzel', serif";
        this.infoContainer.style.fontSize = '1.1rem'; // Increased font size
        
        // Weight info
        if (this.options.showWeight) {
            this.weightInfo = document.createElement('div');
            this.weightInfo.className = 'inventory-weight';
            this.weightInfo.style.margin = '5px 0';
            this.infoContainer.appendChild(this.weightInfo);
        }
        
        // Value info
        if (this.options.showValue) {
            this.valueInfo = document.createElement('div');
            this.valueInfo.className = 'inventory-value';
            this.valueInfo.style.margin = '5px 0';
            this.infoContainer.appendChild(this.valueInfo);
        }
        
        // Slots info
        this.slotsInfo = document.createElement('div');
        this.slotsInfo.className = 'inventory-slots';
        this.slotsInfo.style.margin = '5px 0';
        this.infoContainer.appendChild(this.slotsInfo);
        
        this.panel.addDOMElement(this.infoContainer);
        
        // Store references in the parent InventoryUI
        this.inventoryUI.infoContainer = this.infoContainer;
        this.inventoryUI.weightInfo = this.weightInfo;
        this.inventoryUI.valueInfo = this.valueInfo;
        this.inventoryUI.slotsInfo = this.slotsInfo;
    }
    
    /**
     * Update the inventory info section
     */
    updateInfoSection() {
        const inventory = this.inventoryUI.inventory;
        if (!inventory) return;
        
        // Update weight info
        if (this.options.showWeight && this.weightInfo) {
            const currentWeight = inventory.getTotalWeight();
            const maxWeight = inventory.getMaxWeight();
            const weightPercentage = (currentWeight / maxWeight) * 100;
            
            this.weightInfo.innerHTML = `
                <span>Weight: ${currentWeight.toFixed(1)}/${maxWeight}</span>
                <div style="width: 120px; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 5px; overflow: hidden;">
                    <div style="height: 100%; width: ${weightPercentage}%; background: ${this.getWeightBarColor(weightPercentage)}"></div>
                </div>
            `;
        }
        
        // Update value info
        if (this.options.showValue && this.valueInfo) {
            const totalValue = inventory.getTotalValue();
            this.valueInfo.textContent = `Value: ${totalValue} gold`;
        }
        
        // Update slots info
        if (this.slotsInfo) {
            const usedSlots = inventory.getAllItems().length;
            const totalSlots = inventory.getAllSlots().length;
            this.slotsInfo.textContent = `Slots: ${usedSlots}/${totalSlots}`;
        }
    }
    
    /**
     * Get color for weight bar
     * @param {number} percentage - Weight percentage
     * @returns {string} Color code
     */
    getWeightBarColor(percentage) {
        if (percentage > 90) return '#F44336'; // Red
        if (percentage > 70) return '#FFC107'; // Yellow
        return '#4CAF50'; // Green
    }
} 