import { logger, LogCategory } from '../../utils/Logger';
/**
 * Handles the rendering and interaction of inventory items
 */
export class InventoryUIItems {
    /**
     * Create a new items handler
     * @param {InventoryUI} inventoryUI - The parent inventory UI
     */
    constructor(inventoryUI) {
        this.inventoryUI = inventoryUI;
        this.options = inventoryUI.options;
        this.itemsContainer = null;
    }
    
    /**
     * Initialize items functionality
     */
    initialize() {
        this.itemsContainer = this.inventoryUI.itemsContainer;
        
        // Ensure the items container has proper styling for the new layout
        if (this.itemsContainer) {
            // Add a small top margin to separate from search/filters
            this.itemsContainer.style.marginTop = '5px';
        }
    }
    
    /**
     * Refresh the inventory display
     */
    refreshInventory() {
        // Clear existing items
        this.itemsContainer.innerHTML = '';
        
        if (!this.inventoryUI.inventory) {
            this.showEmptyMessage('No inventory available');
            return;
        }
        
        // Get filtered items
        let items = [];
        if (this.inventoryUI.search) {
            items = this.inventoryUI.search.getFilteredItems();
        } else {
            items = this.inventoryUI.inventory.getAllItems();
        }
        
        if (items.length === 0) {
            const searchTerm = this.inventoryUI.search && this.inventoryUI.search.searchInput ? 
                this.inventoryUI.search.searchInput.value.trim() : '';
            const currentFilter = this.inventoryUI.search ? this.inventoryUI.search.currentFilter : null;
            
            const message = searchTerm 
                ? `No items found matching "${searchTerm}"`
                : (currentFilter ? `No ${this.formatItemType(currentFilter)} items` : 'Inventory is empty');
            
            this.showEmptyMessage(message);
            return;
        }
        
        // Create item elements directly in the items container
        items.forEach((itemStack, index) => {
            const itemElement = this.createItemElement(itemStack, index);
            this.itemsContainer.appendChild(itemElement);
        });
        
        // Update info section
        if (this.inventoryUI.elements) {
            this.inventoryUI.elements.updateInfoSection();
        }
    }
    
    /**
     * Show an empty inventory message
     * @param {string} message - The message to display
     */
    showEmptyMessage(message) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'inventory-empty';
        emptyMessage.textContent = message;
        emptyMessage.style.width = '100%';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '40px 20px';
        emptyMessage.style.color = '#8b5a2b';
        emptyMessage.style.fontSize = '1.2rem';
        emptyMessage.style.fontStyle = 'italic';
        
        this.itemsContainer.appendChild(emptyMessage);
    }
    
    /**
     * Create an item element for display
     * @param {ItemStack} itemStack - The item stack to display
     * @param {number} index - The index of the item in the inventory
     * @returns {HTMLElement} - The created item element
     */
    createItemElement(itemStack, index) {
        const item = itemStack.item;
        const quantity = itemStack.quantity;
        
        // Create item container
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.dataset.index = index;
        itemElement.dataset.itemId = item.id;
        
        // Set styles for consistent sizing in grid layout
        itemElement.style.width = `${this.options.itemSize}px`;
        itemElement.style.height = `${this.options.itemSize}px`;
        itemElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        itemElement.style.border = '1px solid #8b5a2b';
        itemElement.style.borderRadius = '4px';
        itemElement.style.position = 'relative';
        itemElement.style.display = 'flex';
        itemElement.style.justifyContent = 'center';
        itemElement.style.alignItems = 'center';
        itemElement.style.cursor = 'pointer';
        
        // Add hover effect
        itemElement.style.transition = 'all 0.2s ease';
        itemElement.addEventListener('mouseenter', () => {
            itemElement.style.backgroundColor = 'rgba(139, 90, 43, 0.3)';
            itemElement.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
            itemElement.style.transform = 'scale(1.05)';
            itemElement.style.zIndex = '10';
            
            // Show tooltip
            if (this.inventoryUI.tooltip) {
                this.inventoryUI.tooltip.showTooltip(item, itemElement);
            }
        });
        
        itemElement.addEventListener('mouseleave', () => {
            itemElement.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            itemElement.style.boxShadow = 'none';
            itemElement.style.transform = 'scale(1)';
            itemElement.style.zIndex = '1';
            
            // Hide tooltip
            if (this.inventoryUI.tooltip) {
                this.inventoryUI.tooltip.hideTooltip();
            }
        });
        
        // Add click event
        itemElement.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Handle item click
            if (this.options.onItemClick) {
                this.options.onItemClick(itemStack, index);
            }
        });
        
        // Add right-click event
        itemElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Handle item right-click
            if (this.options.onItemRightClick) {
                this.options.onItemRightClick(itemStack, index);
            }
        });
        
        // Get the item image URL
        let imageUrl = '';
        
        // Try to get the image URL from the asset manager first
        if (this.inventoryUI.itemSystem && this.inventoryUI.itemSystem.getAssetManager) {
            const assetManager = this.inventoryUI.itemSystem.getAssetManager();
            
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
        
        // Create item image
        const itemImage = document.createElement('img');
        itemImage.src = imageUrl;
        itemImage.alt = item.name;
        itemImage.style.maxWidth = '80%';
        itemImage.style.maxHeight = '80%';
        itemImage.style.objectFit = 'contain';
        
        // Handle image load error
        itemImage.onerror = () => {
            console.warn(`Failed to load image for item: ${item.id}`);
            itemImage.src = 'assets/items/default.png';
            itemImage.alt = 'Item image not found';
        };
        
        itemElement.appendChild(itemImage);
        
        // Add quantity badge if more than 1
        if (quantity > 1) {
            const quantityBadge = document.createElement('div');
            quantityBadge.className = 'item-quantity';
            quantityBadge.textContent = quantity;
            
            // Style the quantity badge
            quantityBadge.style.position = 'absolute';
            quantityBadge.style.bottom = '2px';
            quantityBadge.style.right = '2px';
            quantityBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            quantityBadge.style.color = 'white';
            quantityBadge.style.padding = '2px 5px';
            quantityBadge.style.borderRadius = '10px';
            quantityBadge.style.fontSize = '0.8rem';
            quantityBadge.style.fontWeight = 'bold';
            
            itemElement.appendChild(quantityBadge);
        }
        
        // Add level badge if item has a level and showLevel option is enabled
        if (item.level && this.options.showLevel) {
            const levelBadge = document.createElement('div');
            levelBadge.className = 'item-level';
            levelBadge.textContent = `Lvl ${item.level}`;
            
            // Style the level badge
            levelBadge.style.position = 'absolute';
            levelBadge.style.top = '2px';
            levelBadge.style.left = '2px';
            levelBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            levelBadge.style.color = '#ffcc00'; // Gold color for levels
            levelBadge.style.padding = '2px 5px';
            levelBadge.style.borderRadius = '10px';
            levelBadge.style.fontSize = '0.8rem';
            levelBadge.style.fontWeight = 'bold';
            
            itemElement.appendChild(levelBadge);
        }
        
        // Add rarity border
        const rarityColor = this.getRarityColor(item.rarity);
        if (rarityColor) {
            itemElement.style.borderColor = rarityColor;
            itemElement.style.boxShadow = `0 0 5px ${rarityColor}`;
        }
        
        // Add durability bar if applicable
        if (item.durability !== undefined && item.maxDurability !== undefined) {
            const durabilityPercentage = (item.durability / item.maxDurability) * 100;
            
            const durabilityBar = document.createElement('div');
            durabilityBar.className = 'item-durability';
            
            // Style the durability bar container
            durabilityBar.style.position = 'absolute';
            durabilityBar.style.bottom = '0';
            durabilityBar.style.left = '0';
            durabilityBar.style.width = '100%';
            durabilityBar.style.height = '3px';
            durabilityBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            
            // Create the durability fill
            const durabilityFill = document.createElement('div');
            durabilityFill.style.height = '100%';
            durabilityFill.style.width = `${durabilityPercentage}%`;
            durabilityFill.style.backgroundColor = this.getDurabilityColor(durabilityPercentage);
            
            durabilityBar.appendChild(durabilityFill);
            itemElement.appendChild(durabilityBar);
        }
        
        return itemElement;
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
            // Fallback to default rarity values
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
     * Format an item type for display
     * @param {string} type - The item type
     * @returns {string} Formatted item type
     */
    formatItemType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
    
    /**
     * Get the asset key for an item
     * @param {Object} item - The item
     * @returns {string} The asset key
     */
    getItemAssetKey(item) {
        // Try to get the asset key from the item system if available
        if (this.inventoryUI.itemSystem && this.inventoryUI.itemSystem.getAssetManager) {
            const assetManager = this.inventoryUI.itemSystem.getAssetManager();
            if (assetManager && assetManager.getAssetKey) {
                return assetManager.getAssetKey(item.id);
            }
        }
        
        // Fallback: try to extract key from iconUrl
        if (item.iconUrl) {
            // If it's a path like 'assets/items/apple.png', extract 'item-apple'
            if (item.iconUrl.includes('/items/')) {
                const filename = item.iconUrl.split('/').pop().split('.')[0];
                return `item-${filename}`;
            }
            
            // If it already looks like a key (no path separators), use it directly
            if (!item.iconUrl.includes('/')) {
                return item.iconUrl;
            }
        }
        
        // Last resort fallback
        return 'default-item';
    }
    
    /**
     * Render an item texture to a canvas
     * @param {HTMLCanvasElement} canvas - The canvas to render to
     * @param {string} assetKey - The asset key
     * @param {Object} item - The item
     */
    renderItemTexture(canvas, assetKey, item) {
        const scene = this.inventoryUI.scene;
        
        logger.info(LogCategory.INVENTORY, `Attempting to render texture for ${item.name} with key: ${assetKey}`);
        
        // Check if the texture exists in Phaser
        if (scene && scene.textures && scene.textures.exists(assetKey)) {
            try {
                // Get the texture
                const texture = scene.textures.get(assetKey);
                logger.info(LogCategory.INVENTORY, `Found texture for ${item.name}:`, texture);
                
                // Get the canvas context
                const ctx = canvas.getContext('2d');
                
                // Clear the canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Check if the texture has valid source data
                if (texture.source && texture.source[0] && texture.source[0].image) {
                    // Calculate scaling to fit the canvas while maintaining aspect ratio
                    const textureWidth = texture.source[0].width;
                    const textureHeight = texture.source[0].height;
                    const scale = Math.min(
                        canvas.width / textureWidth,
                        canvas.height / textureHeight
                    ) * 0.8; // Scale down slightly to add some padding
                    
                    // Calculate centered position
                    const x = (canvas.width - textureWidth * scale) / 2;
                    const y = (canvas.height - textureHeight * scale) / 2;
                    
                    // Draw the texture to the canvas
                    ctx.drawImage(
                        texture.source[0].image,
                        0, 0, textureWidth, textureHeight,
                        x, y, textureWidth * scale, textureHeight * scale
                    );
                    
                    // Add a drop shadow effect
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 5;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 3;
                    
                    logger.info(LogCategory.INVENTORY, `Successfully rendered texture ${assetKey} for item ${item.name}`);
                    return true;
                } else {
                    logger.warn(LogCategory.INVENTORY, `Texture ${assetKey} has invalid source data for item ${item.name}`);
                }
            } catch (error) {
                logger.error(LogCategory.INVENTORY, `Error rendering texture for ${item.name}:`, error);
            }
        } else {
            logger.warn(LogCategory.INVENTORY, `Texture ${assetKey} not found for item ${item.name}`);
            
            // List available textures for debugging
            if (scene && scene.textures) {
                logger.info(LogCategory.INVENTORY, 'Available textures:', Object.keys(scene.textures.list));
            }
        }
        
        // Fallback: render a colored rectangle
        this.renderFallbackTexture(canvas, item);
        return false;
    }
    
    /**
     * Render a fallback texture when the item texture is not available
     * @param {HTMLCanvasElement} canvas - The canvas to render to
     * @param {Object} item - The item
     */
    renderFallbackTexture(canvas, item) {
        try {
            const ctx = canvas.getContext('2d');
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw a colored rectangle based on item rarity
            const color = this.getRarityColor(item.rarity || 'common');
            ctx.fillStyle = color;
            ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // Add a border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // Add item initial as text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                item.name.charAt(0).toUpperCase(),
                canvas.width / 2,
                canvas.height / 2
            );
            
            logger.info(LogCategory.INVENTORY, `Rendered fallback for item ${item.name}`);
        } catch (error) {
            logger.error(LogCategory.INVENTORY, `Error rendering fallback for ${item.name}:`, error);
        }
    }
} 