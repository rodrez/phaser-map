import { ItemType } from '../../items/item';

/**
 * Handles search and filtering functionality for the inventory UI
 */
export class InventoryUISearch {
    /**
     * Create a new search handler
     * @param {InventoryUI} inventoryUI - The parent inventory UI
     */
    constructor(inventoryUI) {
        this.inventoryUI = inventoryUI;
        this.panel = inventoryUI.panel;
        this.options = inventoryUI.options;
        this.currentFilter = null;
        this.filterButtons = {};
    }
    
    /**
     * Initialize search and filter components
     */
    initialize() {
        // Create the top section container
        this.createTopSection();
        
        // Add search bar if enabled
        if (this.options.searchEnabled) {
            this.createSearchBar();
        }
        
        // Add filter buttons
        this.createFilterButtons();
    }
    
    /**
     * Create the top section container for search and filters
     */
    createTopSection() {
        this.topSection = document.createElement('div');
        this.topSection.className = 'inventory-top-section';
        this.topSection.style.borderBottom = '1px solid #8b5a2b';
        this.topSection.style.marginBottom = '10px';
        this.topSection.style.padding = '0 0 10px 0';
        
        this.panel.content.appendChild(this.topSection);
    }
    
    /**
     * Create search bar for inventory items
     */
    createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'inventory-search-container';
        searchContainer.style.padding = '10px 15px';
        searchContainer.style.display = 'flex';
        searchContainer.style.alignItems = 'center';
        
        // Prevent event propagation for the container
        this.inventoryUI.preventEventPropagation(searchContainer);
        
        // Create search icon
        const searchIcon = document.createElement('div');
        searchIcon.className = 'search-icon';
        searchIcon.innerHTML = '🔍';
        searchIcon.style.marginRight = '10px';
        searchIcon.style.fontSize = '1.2rem';
        searchContainer.appendChild(searchIcon);
        
        // Create search input
        this.searchInput = document.createElement('input');
        this.searchInput.className = 'inventory-search-input';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search items...';
        this.searchInput.style.flex = '1';
        this.searchInput.style.padding = '8px 12px';
        this.searchInput.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        this.searchInput.style.border = '1px solid #8b5a2b';
        this.searchInput.style.borderRadius = '4px';
        this.searchInput.style.color = '#e8d4b9';
        this.searchInput.style.fontFamily = "'Cinzel', serif";
        this.searchInput.style.fontSize = '1rem';
        
        // Prevent event propagation
        this.inventoryUI.preventEventPropagation(this.searchInput);
        
        // Add specific event listeners for input functionality
        this.searchInput.addEventListener('keydown', (e) => {
            // Refresh inventory on input
            if (e.key !== 'Tab' && e.key !== 'Escape') {
                setTimeout(() => this.inventoryUI.refreshInventory(), 100);
            }
        });
        
        searchContainer.appendChild(this.searchInput);
        
        // Create clear button
        const clearButton = document.createElement('button');
        clearButton.className = 'search-clear-button';
        clearButton.innerHTML = '✕';
        clearButton.style.marginLeft = '10px';
        clearButton.style.padding = '5px 10px';
        clearButton.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        clearButton.style.border = '1px solid #8b5a2b';
        clearButton.style.borderRadius = '4px';
        clearButton.style.color = '#e8d4b9';
        clearButton.style.cursor = 'pointer';
        clearButton.style.display = 'none'; // Hide initially
        
        // Prevent event propagation
        this.inventoryUI.preventEventPropagation(clearButton);
        
        clearButton.addEventListener('click', (e) => {
            this.searchInput.value = '';
            clearButton.style.display = 'none';
            this.inventoryUI.refreshInventory();
        });
        
        // Show clear button when search has content
        this.searchInput.addEventListener('input', () => {
            clearButton.style.display = this.searchInput.value ? 'block' : 'none';
        });
        
        searchContainer.appendChild(clearButton);
        
        // Add to top section instead of directly to panel content
        this.topSection.appendChild(searchContainer);
    }
    
    /**
     * Create filter buttons for different item types
     */
    createFilterButtons() {
        this.filterButtons = {};
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'inventory-filter-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.flexWrap = 'wrap'; // Allow wrapping on smaller screens
        buttonContainer.style.gap = '10px';
        buttonContainer.style.padding = '5px 15px 0 15px';
        
        // Add "All" filter button
        const allButton = this.createFilterButton('All', null);
        buttonContainer.appendChild(allButton);
        this.filterButtons['all'] = allButton;
        
        // Add buttons for each item type
        const itemTypes = Object.values(ItemType);
        itemTypes.forEach(type => {
            const button = this.createFilterButton(this.formatItemType(type), type);
            buttonContainer.appendChild(button);
            this.filterButtons[type] = button;
        });
        
        // Add to top section instead of directly to panel
        this.topSection.appendChild(buttonContainer);
        
        // Set "All" as active by default
        this.setActiveFilter(null);
    }
    
    /**
     * Create a filter button
     * @param {string} label - Button label
     * @param {string|null} filter - Filter value (null for "All")
     * @returns {HTMLElement} The created button
     */
    createFilterButton(label, filter) {
        const button = document.createElement('button');
        button.className = 'inventory-filter-btn';
        button.textContent = label;
        button.style.padding = '5px 10px';
        button.style.border = '1px solid #8b5a2b';
        button.style.borderRadius = '4px';
        button.style.background = '#2a1a0a';
        button.style.color = '#e8d4b9';
        button.style.cursor = 'pointer';
        button.style.fontFamily = "'Cinzel', serif";
        button.style.transition = 'all 0.2s ease';
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setActiveFilter(filter);
            this.inventoryUI.refreshInventory();
        });
        
        // Prevent event propagation for all events
        this.inventoryUI.preventEventPropagation(button);
        
        return button;
    }
    
    /**
     * Set the active filter
     * @param {string|null} filter - The filter to set active
     */
    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update button styles
        Object.keys(this.filterButtons).forEach(key => {
            const button = this.filterButtons[key];
            if ((key === 'all' && filter === null) || key === filter) {
                button.classList.add('active');
                button.style.backgroundColor = '#8b5a2b';
                button.style.color = '#fff';
            } else {
                button.classList.remove('active');
                button.style.backgroundColor = '#2a1a0a';
                button.style.color = '#e8d4b9';
            }
        });
    }
    
    /**
     * Format an item type for display
     * @param {string} type - The item type
     * @returns {string} Formatted item type
     */
    formatItemType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
    
    /**
     * Cycle through available filters
     * @param {boolean} reverse - Whether to cycle in reverse order
     */
    cycleFilters(reverse = false) {
        const itemTypes = ['all', ...Object.values(ItemType)];
        const currentIndex = this.currentFilter === null ? 0 : itemTypes.indexOf(this.currentFilter) + 1;
        
        let nextIndex;
        if (reverse) {
            nextIndex = (currentIndex - 1 + itemTypes.length) % itemTypes.length;
        } else {
            nextIndex = (currentIndex + 1) % itemTypes.length;
        }
        
        const nextFilter = itemTypes[nextIndex] === 'all' ? null : itemTypes[nextIndex];
        this.setActiveFilter(nextFilter);
        this.inventoryUI.refreshInventory();
    }
    
    /**
     * Get filtered items based on current filter and search
     * @returns {Array} Filtered items
     */
    getFilteredItems() {
        if (!this.inventoryUI.inventory) {
            return [];
        }
        
        // Get items based on current filter
        let items;
        if (this.currentFilter === null) {
            items = this.inventoryUI.inventory.getAllItems();
        } else {
            items = this.inventoryUI.inventory.getItemsByType(this.currentFilter);
        }
        
        // Apply search filter if search is enabled and has a value
        if (this.options.searchEnabled && this.searchInput && this.searchInput.value.trim()) {
            const searchTerm = this.searchInput.value.trim().toLowerCase();
            items = items.filter(itemStack => {
                const item = itemStack.item;
                return (
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.description.toLowerCase().includes(searchTerm) ||
                    (item.type && item.type.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        return items;
    }
} 