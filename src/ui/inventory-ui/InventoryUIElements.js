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
        // Create a container for the inventory items
        const containerWrapper = document.createElement('div');
        containerWrapper.className = 'inventory-container-wrapper';
        containerWrapper.style.width = '100%';
        containerWrapper.style.height = `${this.options.height - 180}px`; // Adjust height to leave room for search and info
        containerWrapper.style.overflow = 'hidden';
        containerWrapper.style.position = 'relative';
        containerWrapper.style.marginTop = '10px';
        containerWrapper.style.marginBottom = '10px';
        containerWrapper.style.borderTop = '1px solid rgba(139, 90, 43, 0.5)';
        containerWrapper.style.borderBottom = '1px solid rgba(139, 90, 43, 0.5)';
        
        // Create the scrollable container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'inventory-scroll-container';
        scrollContainer.style.width = '100%';
        scrollContainer.style.height = '100%';
        scrollContainer.style.overflowY = 'auto';
        scrollContainer.style.overflowX = 'hidden';
        scrollContainer.style.paddingRight = '10px'; // Add padding for scrollbar
        scrollContainer.style.boxSizing = 'border-box';
        
        // Style the scrollbar
        scrollContainer.style.scrollbarWidth = 'thin'; // Firefox
        scrollContainer.style.scrollbarColor = '#8b5a2b #2a1a0a'; // Firefox
        
        // Webkit scrollbar styles
        const scrollbarStyles = document.createElement('style');
        scrollbarStyles.textContent = `
            .inventory-scroll-container::-webkit-scrollbar {
                width: 8px;
            }
            .inventory-scroll-container::-webkit-scrollbar-track {
                background: #2a1a0a;
                border-radius: 4px;
            }
            .inventory-scroll-container::-webkit-scrollbar-thumb {
                background-color: #8b5a2b;
                border-radius: 4px;
                border: 2px solid #2a1a0a;
            }
        `;
        document.head.appendChild(scrollbarStyles);
        
        // Create the items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'inventory-items';
        
        // Use CSS Grid instead of flexbox for more consistent spacing
        itemsContainer.style.display = 'grid';
        itemsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)'; // 4 items per row
        itemsContainer.style.gap = '15px'; // Consistent gap between all items
        itemsContainer.style.padding = '15px';
        itemsContainer.style.boxSizing = 'border-box';
        
        // Add responsive grid layout with CSS
        const gridStyles = document.createElement('style');
        gridStyles.textContent = `
            .inventory-items {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                padding: 15px;
                box-sizing: border-box;
            }
            
            /* Center items in their grid cells */
            .inventory-items > .inventory-item {
                justify-self: center;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .inventory-items {
                    grid-template-columns: repeat(3, 1fr);
                }
            }
            
            @media (max-width: 480px) {
                .inventory-items {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
        document.head.appendChild(gridStyles);
        
        // Add the items container to the scroll container
        scrollContainer.appendChild(itemsContainer);
        
        // Add the scroll container to the wrapper
        containerWrapper.appendChild(scrollContainer);
        
        // Add the container wrapper to the panel
        this.panel.container.appendChild(containerWrapper);
        
        // Store references
        this.inventoryUI.itemsContainer = itemsContainer;
        this.inventoryUI.scrollContainer = scrollContainer;
        this.inventoryUI.containerWrapper = containerWrapper;
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
        
        // We've removed weight, value, and slots info as requested
        
        this.panel.addDOMElement(this.infoContainer);
        
        // Store references in the parent InventoryUI
        this.inventoryUI.infoContainer = this.infoContainer;
        // Remove references to the removed elements
        this.inventoryUI.weightInfo = null;
        this.inventoryUI.valueInfo = null;
        this.inventoryUI.slotsInfo = null;
    }
    
    /**
     * Update the inventory info section
     */
    updateInfoSection() {
        // All info elements have been removed, so there's nothing to update
        // This method is kept for backward compatibility
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