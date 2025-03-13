import { logger, LogCategory } from '../Logger';

/**
 * UIComponentRegistry - Manages registration and access to UI components
 * Provides a central registry for all UI components
 * Handles component lifecycle (init, update, destroy)
 */
export class UIComponentRegistry {
    /**
     * Constructor for the UIComponentRegistry
     */
    constructor() {
        this.components = new Map();
    }

    /**
     * Register a UI component
     * @param {string} id - The unique identifier for the component
     * @param {Object} component - The component instance
     * @returns {boolean} Whether the registration was successful
     */
    register(id, component) {
        if (this.components.has(id)) {
            logger.warn(LogCategory.UI, `Component with id '${id}' already exists in the registry.`);
            return false;
        }
        
        this.components.set(id, component);
        logger.info(LogCategory.UI, `Registered UI component: ${id}`);
        return true;
    }

    /**
     * Get a UI component by ID
     * @param {string} id - The unique identifier for the component
     * @returns {Object|null} The component instance or null if not found
     */
    get(id) {
        if (!this.components.has(id)) {
            logger.warn(LogCategory.UI, `Component with id '${id}' not found in the registry.`);
            return null;
        }
        
        return this.components.get(id);
    }

    /**
     * Check if a component exists in the registry
     * @param {string} id - The unique identifier for the component
     * @returns {boolean} Whether the component exists
     */
    has(id) {
        return this.components.has(id);
    }

    /**
     * Unregister a UI component
     * @param {string} id - The unique identifier for the component
     * @param {boolean} destroy - Whether to destroy the component
     * @returns {boolean} Whether the unregistration was successful
     */
    unregister(id, destroy = false) {
        if (!this.components.has(id)) {
            logger.warn(LogCategory.UI, `Cannot unregister component with id '${id}': not found in the registry.`);
            return false;
        }
        
        const component = this.components.get(id);
        
        // Destroy the component if requested
        if (destroy && component && typeof component.destroy === 'function') {
            component.destroy();
        }
        
        this.components.delete(id);
        logger.info(LogCategory.UI, `Unregistered UI component: ${id}`);
        return true;
    }

    /**
     * Update all registered components
     * @param {number} time - The current time
     * @param {number} delta - The time delta
     */
    update(time, delta) {
        for (const [id, component] of this.components.entries()) {
            if (component && typeof component.update === 'function') {
                try {
                    component.update(time, delta);
                } catch (error) {
                    logger.error(LogCategory.UI, `Error updating component ${id}:`, error);
                }
            }
        }
    }

    /**
     * Destroy all registered components
     */
    destroyAll() {
        for (const [id, component] of this.components.entries()) {
            if (component && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    logger.error(LogCategory.UI, `Error destroying component ${id}:`, error);
                }
            }
        }
        
        this.components.clear();
        logger.info(LogCategory.UI, 'All UI components destroyed and registry cleared.');
    }
}

// Export a singleton instance
export const uiRegistry = new UIComponentRegistry(); 