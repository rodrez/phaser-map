import { logger, LogCategory } from "../utils/Logger";
import { DOMUIHelper } from "../utils/DOMUIHelper";

/**
 * MedievalPanel - A medieval-themed panel component for displaying content
 */
export class MedievalPanel {
    /**
     * Create a new medieval panel
     * @param {Phaser.Scene} scene - The scene this panel belongs to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.isVisible = false;
        
        // Default options
        this.options = {
            title: options.title || 'Panel',
            width: options.width || 500,
            height: options.height || 400,
            draggable: options.draggable !== undefined ? options.draggable : true,
            closeButton: options.closeButton !== undefined ? options.closeButton : true,
            position: options.position || { x: 'center', y: 'center' },
            onClose: options.onClose || null
        };
        
        // Create UI helper
        this.uiHelper = new DOMUIHelper(scene);
        
        // Create the panel container
        this.createPanel();
        
        // Hide by default
        this.setVisible(false);
    }
    
    /**
     * Create the panel container and elements
     */
    createPanel() {
        // Create the main container
        this.container = this.uiHelper.createContainer('medieval-panel custom-popup');
        this.container.style.width = `${this.options.width}px`;
        this.container.style.maxHeight = `${this.options.height}px`;
        this.container.style.backgroundColor = '#2a1a0a';
        this.container.style.border = '3px solid'; // Changed from 2px to 3px for consistency with popup style
        this.container.style.borderImage = 'linear-gradient(to bottom, #c8a165, #8b5a2b) 1';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(200, 161, 101, 0.2)';
        this.container.style.color = '#e8d4b9';
        this.container.style.fontFamily = "'Cinzel', serif";
        this.container.style.position = 'absolute';
        this.container.style.zIndex = '1000';
        this.container.style.overflow = 'hidden';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        
        // Add decorative corners
        const cornerTopLeft = this.uiHelper.createElement('div', 'popup-corner corner-top-left');
        const cornerTopRight = this.uiHelper.createElement('div', 'popup-corner corner-top-right');
        const cornerBottomLeft = this.uiHelper.createElement('div', 'popup-corner corner-bottom-left');
        const cornerBottomRight = this.uiHelper.createElement('div', 'popup-corner corner-bottom-right');
        
        this.container.appendChild(cornerTopLeft);
        this.container.appendChild(cornerTopRight);
        this.container.appendChild(cornerBottomLeft);
        this.container.appendChild(cornerBottomRight);
        
        // Position the panel
        this.positionPanel();
        
        // Create the header
        this.header = this.uiHelper.createElement('div', 'medieval-panel-header');
        this.header.style.padding = '10px 15px';
        this.header.style.borderBottom = '1px solid #8b5a2b';
        this.header.style.display = 'flex';
        this.header.style.justifyContent = 'space-between';
        this.header.style.alignItems = 'center';
        this.header.style.cursor = this.options.draggable ? 'move' : 'default';
        this.header.style.position = 'relative';
        this.header.style.zIndex = '2'; // Ensure header is above decorative elements
        
        // Create the title
        this.title = this.uiHelper.createElement('div', 'medieval-panel-title');
        this.title.textContent = this.options.title;
        this.title.style.fontSize = '1.2rem';
        this.title.style.fontWeight = 'bold';
        
        this.header.appendChild(this.title);
        
        // Create close button if enabled
        if (this.options.closeButton) {
            this.closeButton = this.uiHelper.createElement('div', 'medieval-panel-close');
            this.closeButton.innerHTML = '&times;';
            this.closeButton.style.cursor = 'pointer';
            this.closeButton.style.fontSize = '1.5rem';
            this.closeButton.style.lineHeight = '1';
            this.closeButton.style.padding = '0 5px';
            
            this.closeButton.addEventListener('click', () => {
                this.hide();
                if (this.options.onClose) {
                    this.options.onClose();
                }
            });
            
            this.header.appendChild(this.closeButton);
        }
        
        this.container.appendChild(this.header);
        
        // Create the content container
        this.content = this.uiHelper.createElement('div', 'medieval-panel-content');
        this.content.style.padding = '15px';
        this.content.style.overflowY = 'auto';
        this.content.style.flex = '1';
        this.content.style.maxHeight = `${this.options.height - 100}px`;
        this.content.style.position = 'relative';
        this.content.style.zIndex = '2'; // Ensure content is above decorative elements
        
        this.container.appendChild(this.content);
        
        // Add the container to the document
        document.body.appendChild(this.container);
        
        // Set up dragging if enabled
        if (this.options.draggable) {
            this.setupDragging();
        }
    }
    
    /**
     * Position the panel according to options
     */
    positionPanel() {
        const { x, y } = this.options.position;
        
        if (x === 'center') {
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
        } else if (typeof x === 'number') {
            this.container.style.left = `${x}px`;
        }
        
        if (y === 'center') {
            this.container.style.top = '50%';
            this.container.style.transform = this.container.style.transform 
                ? 'translate(-50%, -50%)' 
                : 'translateY(-50%)';
        } else if (typeof y === 'number') {
            this.container.style.top = `${y}px`;
        }
    }
    
    /**
     * Set up dragging functionality
     */
    setupDragging() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        this.header.addEventListener('mousedown', (e) => {
            isDragging = true;
            
            // Get the current position
            const rect = this.container.getBoundingClientRect();
            
            // Calculate the offset
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // Add a dragging class
            this.container.classList.add('dragging');
            
            // Prevent text selection during drag
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate the new position
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            
            // Update the position
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
            
            // Remove any transform that might have been applied
            this.container.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.classList.remove('dragging');
            }
        });
    }
    
    /**
     * Add a DOM element to the panel content
     * @param {HTMLElement} element - The element to add
     */
    addDOMElement(element) {
        this.content.appendChild(element);
    }
    
    /**
     * Set the panel title
     * @param {string} title - The new title
     */
    setTitle(title) {
        this.options.title = title;
        this.title.textContent = title;
    }
    
    /**
     * Set the visibility of the panel
     * @param {boolean} visible - Whether the panel should be visible
     */
    setVisible(visible) {
        console.log(`Setting panel visibility to ${visible}`);
        this.isVisible = visible;
        this.container.style.display = visible ? 'flex' : 'none';
    }
    
    /**
     * Show the panel
     */
    show() {
        // Center the panel before showing it
        this.centerPanel();
        this.setVisible(true);
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.setVisible(false);
    }
    
    /**
     * Toggle the panel visibility
     */
    toggle() {
        this.setVisible(!this.isVisible);
    }
    
    /**
     * Destroy the panel
     */
    destroy() {
        if (this.container && document.body.contains(this.container)) {
            document.body.removeChild(this.container);
        }
    }
    
    /**
     * Center the panel on the screen
     */
    centerPanel() {
        // Set position to center
        this.container.style.left = '50%';
        this.container.style.top = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        
        // Make sure the panel is visible within the viewport
        const rect = this.container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust if panel is too wide for the viewport
        if (rect.width > viewportWidth * 0.9) {
            this.container.style.width = `${viewportWidth * 0.9}px`;
        }
        
        // Adjust if panel is too tall for the viewport
        if (rect.height > viewportHeight * 0.9) {
            this.container.style.maxHeight = `${viewportHeight * 0.9}px`;
        }
    }
} 