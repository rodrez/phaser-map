import { MedievalPanel } from '../medieval-panel';
import { InventoryUIElements } from './InventoryUIElements';
import { InventoryUIItems } from './InventoryUIItems';
import { InventoryUITooltip } from './InventoryUITooltip';
import { InventoryUISearch } from './InventoryUISearch';
import { InventoryUIEvents } from './InventoryUIEvents';

/**
 * UI component for displaying and interacting with the player's inventory
 */
export class InventoryUI {
    /**
     * Create a new inventory UI
     * @param {Phaser.Scene} scene - The scene this UI belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.inventory = options.inventory || null;
        this.isVisible = false;
        
        // Try to get the item system from the scene
        this.itemSystem = options.itemSystem || (scene.itemSystem ? scene.itemSystem : null);
        
        // Default options with larger dimensions
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            padding: options.padding || 20,
            title: options.title || 'Inventory',
            itemSize: options.itemSize || 80,
            itemPadding: options.itemPadding || 10,
            columns: options.columns || 6,
            showWeight: options.showWeight !== undefined ? options.showWeight : true,
            showValue: options.showValue !== undefined ? options.showValue : true,
            showLevel: options.showLevel !== undefined ? options.showLevel : true,
            onItemClick: options.onItemClick || null,
            onItemRightClick: options.onItemRightClick || null,
            onClose: options.onClose || null,
            searchEnabled: options.searchEnabled !== undefined ? options.searchEnabled : true
        };
        
        // Make UI responsive based on screen size
        this.adjustSizeBasedOnScreen();
        
        // Initialize UI components
        this.initializeComponents();
        
        // Hide by default
        this.panel.setVisible(false);
        
        // Add window resize listener for responsiveness
        window.addEventListener('resize', () => this.handleResize());
    }
    
    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Create the panel
        this.panel = new MedievalPanel(this.scene, {
            title: this.options.title,
            width: this.options.width,
            height: this.options.height,
            draggable: true,
            closeButton: true,
            onClose: () => this.hide()
        });
        
        // Initialize UI elements - decorative elements only
        this.elements = new InventoryUIElements(this);
        this.elements.initializeDecorative();
        
        // Initialize tooltip
        this.tooltip = new InventoryUITooltip();
        
        // Initialize search and filters FIRST (to appear at the top)
        if (this.options.searchEnabled) {
            this.search = new InventoryUISearch(this);
            this.search.initialize();
        }
        
        // Initialize the inventory container SECOND (to appear below search)
        this.elements.initializeContainer();
        
        // Initialize item display THIRD (to populate the container)
        this.itemsUI = new InventoryUIItems(this);
        this.itemsUI.initialize();
        
        // Initialize the info section LAST (to appear at the bottom)
        this.elements.initializeInfoSection();
        
        // Initialize events
        this.events = new InventoryUIEvents(this);
        this.events.initialize();
    }
    
    /**
     * Adjust UI size based on screen dimensions
     */
    adjustSizeBasedOnScreen() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Adjust width based on screen width
        if (screenWidth < 1200) {
            this.options.width = Math.min(screenWidth * 0.9, this.options.width);
            this.options.columns = Math.max(4, Math.floor(this.options.width / (this.options.itemSize + this.options.itemPadding * 2)));
        }
        
        // Adjust height based on screen height
        if (screenHeight < 900) {
            this.options.height = Math.min(screenHeight * 0.8, this.options.height);
        }
        
        // Adjust item size for smaller screens
        if (screenWidth < 768) {
            this.options.itemSize = 70;
            this.options.columns = Math.max(3, Math.floor(this.options.width / (this.options.itemSize + this.options.itemPadding * 2)));
        }
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        // Store current filter and visibility state
        const currentFilter = this.search ? this.search.currentFilter : null;
        const wasVisible = this.isVisible;
        const searchValue = this.search && this.search.searchInput ? this.search.searchInput.value : '';
        
        // Hide panel temporarily
        if (wasVisible) {
            this.panel.setVisible(false);
        }
        
        // Adjust size based on new screen dimensions
        this.adjustSizeBasedOnScreen();
        
        // Recreate panel with new dimensions
        this.panel.destroy();
        
        // Reinitialize components
        this.initializeComponents();
        
        // Restore search value if applicable
        if (this.search && searchValue) {
            this.search.searchInput.value = searchValue;
        }
        
        // Restore filter if applicable
        if (this.search && currentFilter !== null) {
            this.search.setActiveFilter(currentFilter);
        }
        
        // Restore visibility if needed
        if (wasVisible) {
            this.panel.setVisible(true);
            this.refreshInventory();
        }
    }
    
    /**
     * Refresh the inventory display
     */
    refreshInventory() {
        if (this.itemsUI) {
            this.itemsUI.refreshInventory();
        }
    }
    
    /**
     * Set the inventory to display
     * @param {Inventory} inventory - The inventory to display
     */
    setInventory(inventory) {
        this.inventory = inventory;
        this.refreshInventory();
    }
    
    /**
     * Show the inventory UI
     */
    show() {
        console.log("Showing inventory UI");
        this.panel.setVisible(true);
        this.isVisible = true;
        
        // Ensure inventory has items when first opened
        this.ensureInventoryHasItems();
        
        console.log("Refreshing inventory");
        this.refreshInventory();
        console.log("Inventory refreshed");
    }
    
    /**
     * Ensure the inventory has items when first opened
     * This helps with testing and demonstration
     */
    ensureInventoryHasItems() {
        // Check if we have access to an inventory manager through the scene
        if (this.scene.inventoryManager && this.inventory) {
            // If the inventory is empty, add default items
            if (this.inventory.getAllItems().length === 0) {
                this.scene.inventoryManager.addDefaultItems();
            }
        }
    }
    
    /**
     * Hide the inventory UI
     */
    hide() {
        this.panel.setVisible(false);
        this.isVisible = false;
        
        if (this.tooltip) {
            this.tooltip.hideTooltip();
        }
        
        if (this.options.onClose) {
            this.options.onClose();
        }
    }
    
    /**
     * Toggle the inventory UI visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroy the inventory UI
     */
    destroy() {
        // Remove window resize listener
        window.removeEventListener('resize', this.handleResize);
        
        // Destroy components
        if (this.tooltip) {
            this.tooltip.destroy();
        }
        
        if (this.events) {
            this.events.destroy();
        }
        
        if (this.panel) {
            this.panel.destroy();
        }
    }
    
    /**
     * Prevent event propagation for an element
     * @param {HTMLElement} element - The element to prevent event propagation for
     */
    preventEventPropagation(element) {
        const events = [
            'click', 'mousedown', 'mouseup', 'mousemove', 
            'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 
            'contextmenu', 'wheel', 'touchstart', 'touchmove', 
            'touchend', 'touchcancel'
        ];
        
        events.forEach(eventType => {
            element.addEventListener(eventType, (e) => {
                e.stopPropagation();
            });
        });
    }
} 