import { logger, LogCategory } from './Logger';

/**
 * Utility module for handling interactions with game objects
 * This provides functional programming style utilities for handling clicks and double-clicks
 */

// Add the interaction category to logger if it doesn't exist
if (!LogCategory.INTERACTION) {
  LogCategory.INTERACTION = 'INTERACTION';
}

/**
 * Set up an interactive object with both single-click and double-click handling
 * 
 * @param {Phaser.Scene} scene - The scene containing the object
 * @param {Phaser.GameObjects.GameObject} gameObject - The interactive game object
 * @param {Function} onSingleClick - Function to call on single click
 * @param {Object} options - Additional options
 * @returns {Function} - Function to remove the interaction handlers
 */
export function setupInteractiveObject(scene, gameObject, onSingleClick, options = {}) {
  if (!scene || !gameObject) {
    logger.error(LogCategory.INTERACTION, "Cannot setup interactive object: Missing scene or gameObject");
    return () => {};
  }

  // Default options
  const settings = {
    getDoubleClickData: () => ({ 
      x: gameObject.x, 
      y: gameObject.y,
      source: options.objectType || 'object' 
    }),
    objectType: 'object',
    doubleClickThreshold: 150,
    ...options
  };

  // State variables (closure)
  let lastClickTime = 0;
  let doubleClickHandled = false;

  // Create the handler function
  const handleClick = (pointer) => {
    // Prevent event propagation
    if (scene?.input?.activePointer?.event) {
      scene.input.activePointer.event.stopPropagation();
    }
    
    // Exit map drag state if available
    if (scene.mapManager && typeof scene.mapManager.exitDragState === 'function') {
      scene.mapManager.exitDragState();
    }
    
    // Check for double-click
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime;
    
    if (timeSinceLastClick < settings.doubleClickThreshold) {
      // Handle double-click
      doubleClickHandled = true;
      logger.info(LogCategory.INTERACTION, `Double-click detected on ${settings.objectType}`);
      
      // Emit double-click-move event
      scene.events.emit('double-click-move', settings.getDoubleClickData());
      
      // Reset click time
      lastClickTime = 0;
    } else {
      // Handle potential single-click
      lastClickTime = currentTime;
      doubleClickHandled = false;
      
      // Delay single-click handling to allow for double-click detection
      setTimeout(() => {
        const globalDoubleClickHandled = scene.registry.get('doubleClickHandled') || false;
        if (!doubleClickHandled && !globalDoubleClickHandled && 
            Date.now() - lastClickTime >= settings.doubleClickThreshold) {
          // Execute single-click handler
          onSingleClick(gameObject);
        }
      }, settings.doubleClickThreshold);
    }
  };

  // Add the event listener
  gameObject.on('pointerdown', handleClick);

  // Return a cleanup function
  return () => {
    gameObject.off('pointerdown', handleClick);
  };
}

/**
 * Set up hover effects for an interactive object
 * 
 * @param {Phaser.GameObjects.GameObject} gameObject - The interactive game object
 * @param {Object} options - Hover effect options
 * @returns {Function} - Function to remove the hover effects
 */
export function setupHoverEffects(gameObject, options = {}) {
  if (!gameObject) return () => {};

  const settings = {
    hoverTint: 0xDDDDDD,
    ...options
  };

  // Handler functions
  const handleOver = () => {
    gameObject.setTint(settings.hoverTint);
  };
  
  const handleOut = () => {
    gameObject.clearTint();
  };

  // Add event listeners
  gameObject.on('pointerover', handleOver);
  gameObject.on('pointerout', handleOut);

  // Return cleanup function
  return () => {
    gameObject.off('pointerover', handleOver);
    gameObject.off('pointerout', handleOut);
  };
}

/**
 * Quick setup for common interactive objects with hover and click handling
 * 
 * @param {Phaser.Scene} scene - The scene containing the object
 * @param {Phaser.GameObjects.GameObject} gameObject - The interactive game object 
 * @param {Function} onSingleClick - Function to call on single click
 * @param {Object} options - Configuration options
 * @returns {Object} - Object with methods to remove handlers
 */
export function makeInteractive(scene, gameObject, onSingleClick, options = {}) {
  // Set interactive properties
  gameObject.setInteractive(options.hitArea || { useHandCursor: true, pixelPerfect: false });
  
  // Setup hover and click handlers
  const removeHover = setupHoverEffects(gameObject, options);
  const removeClick = setupInteractiveObject(scene, gameObject, onSingleClick, options);
  
  // Return cleanup function
  return {
    remove: () => {
      removeHover();
      removeClick();
      gameObject.disableInteractive();
    }
  };
} 