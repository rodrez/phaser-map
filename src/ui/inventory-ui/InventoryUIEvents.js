/**
 * Handles event management for the inventory UI
 */
export class InventoryUIEvents {
    /**
     * Create a new events handler
     * @param {InventoryUI} inventoryUI - The parent inventory UI
     */
    constructor(inventoryUI) {
        this.inventoryUI = inventoryUI;
        this.keyHandler = null;
    }
    
    /**
     * Initialize event handlers
     */
    initialize() {
        this.setupKeyboardShortcuts();
    }
    
    /**
     * Setup keyboard shortcuts for inventory navigation
     */
    setupKeyboardShortcuts() {
        // Create a keyboard event handler
        this.keyHandler = (event) => {
            // Only process keyboard events when inventory is visible
            if (!this.inventoryUI.isVisible) return;
            
            switch (event.key) {
                case 'Escape':
                    this.inventoryUI.hide();
                    break;
                case 'Tab':
                    // Cycle through filters when Tab is pressed
                    event.preventDefault();
                    if (this.inventoryUI.search) {
                        this.inventoryUI.search.cycleFilters(event.shiftKey);
                    }
                    break;
                case 'f':
                    // Focus search input when F is pressed
                    if (this.inventoryUI.search && this.inventoryUI.search.searchInput) {
                        event.preventDefault();
                        this.inventoryUI.search.searchInput.focus();
                    }
                    break;
                case 'c':
                    // Clear search when C is pressed
                    if (this.inventoryUI.search && this.inventoryUI.search.searchInput) {
                        event.preventDefault();
                        this.inventoryUI.search.searchInput.value = '';
                        this.inventoryUI.refreshInventory();
                    }
                    break;
            }
        };
        
        // Add the keyboard event listener
        window.addEventListener('keydown', this.keyHandler);
    }
    
    /**
     * Destroy event handlers
     */
    destroy() {
        // Remove keyboard event listener
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
    }
} 