import { logger, LogCategory } from '../../utils/Logger';

/**
 * DungeonEventSystem - Handles all dungeon-related events
 * Provides a centralized event system for dungeon components to communicate
 */
export class DungeonEventSystem {
  /**
   * Constructor for the DungeonEventSystem
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    this.scene = scene;
    this.eventEmitter = scene.events;
    this.eventHandlers = new Map();
    
    logger.info(LogCategory.DUNGEON, 'Dungeon event system initialized');
  }
  
  /**
   * Register an event handler
   * @param {string} event - The event name
   * @param {Function} handler - The event handler function
   * @param {Object} context - The context to bind the handler to
   */
  on(event, handler, context) {
    this.eventEmitter.on(event, handler, context);
    
    // Store the handler for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event).push({ handler, context });
    
    logger.debug(LogCategory.DUNGEON, `Event handler registered for: ${event}`);
  }
  
  /**
   * Emit an event
   * @param {string} event - The event name
   * @param {...any} args - The event arguments
   */
  emit(event, ...args) {
    this.eventEmitter.emit(event, ...args);
    logger.debug(LogCategory.DUNGEON, `Event emitted: ${event}`);
  }
  
  /**
   * Remove an event handler
   * @param {string} event - The event name
   * @param {Function} handler - The event handler function
   * @param {Object} context - The context the handler was bound to
   */
  off(event, handler, context) {
    this.eventEmitter.off(event, handler, context);
    
    // Remove the handler from our tracking
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.findIndex(h => h.handler === handler && h.context === context);
      
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      
      if (handlers.length === 0) {
        this.eventHandlers.delete(event);
      }
    }
    
    logger.debug(LogCategory.DUNGEON, `Event handler removed for: ${event}`);
  }
  
  /**
   * Register standard dungeon events
   */
  registerStandardEvents() {
    // Register standard event handlers for the dungeon
    this.on('monsterDefeated', this.scene.handleMonsterDefeated, this.scene);
    this.on('levelCompleted', this.scene.handleLevelCompleted, this.scene);
    this.on('dungeonCompleted', this.scene.handleDungeonCompleted, this.scene);
    
    logger.info(LogCategory.DUNGEON, 'Standard dungeon events registered');
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // This method is a hook for future expansion
    // Currently, the event system doesn't need per-frame updates
  }
  
  /**
   * Clean up resources when the system is destroyed
   */
  destroy() {
    logger.info(LogCategory.DUNGEON, 'Destroying dungeon event system');
    
    // Remove all event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(({ handler, context }) => {
        this.eventEmitter.off(event, handler, context);
      });
    });
    
    this.eventHandlers.clear();
  }
} 