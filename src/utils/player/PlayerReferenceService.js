/**
 * PlayerReferenceService - A singleton service that provides access to the player sprite
 * This service helps avoid null references by providing a centralized way to access
 * the player sprite, even if it changes during gameplay.
 */

import { logger, LogCategory } from '../Logger';

class PlayerReferenceService {
  constructor() {
    this.playerSprite = null;
    this.scene = null;
    this.subscribers = new Set();
    this.isInitialized = false;
    
    logger.info(LogCategory.PLAYER, 'PlayerReferenceService created');
  }
  
  /**
   * Initialize the service with a scene reference
   * @param {Object} scene - The Phaser scene
   */
  initialize(scene) {
    this.scene = scene;
    this.isInitialized = true;
    logger.info(LogCategory.PLAYER, 'PlayerReferenceService initialized with scene');
  }
  
  /**
   * Set the player sprite reference
   * @param {Object} playerSprite - The player sprite object
   */
  setPlayerSprite(playerSprite) {
    const oldSprite = this.playerSprite;
    this.playerSprite = playerSprite;
    
    // Log the change
    if (oldSprite !== playerSprite) {
      logger.info(LogCategory.PLAYER, 'Player sprite reference updated');
      
      // Notify subscribers of the change
      this.notifySubscribers();
    }
  }
  
  /**
   * Get the current player sprite
   * @returns {Object|null} The player sprite or null if not set
   */
  getPlayerSprite() {
    return this.playerSprite;
  }
  
  /**
   * Subscribe to player sprite changes
   * @param {Object} subscriber - The object subscribing to changes
   * @param {Function} callback - The callback function to call when the player sprite changes
   */
  subscribe(subscriber, callback) {
    this.subscribers.add({ subscriber, callback });
    logger.debug(LogCategory.PLAYER, 'New subscriber added to PlayerReferenceService');
    
    // Immediately call the callback with the current player sprite
    if (this.playerSprite && callback) {
      callback(this.playerSprite);
    }
  }
  
  /**
   * Unsubscribe from player sprite changes
   * @param {Object} subscriber - The object to unsubscribe
   */
  unsubscribe(subscriber) {
    // Find and remove the subscriber
    for (const sub of this.subscribers) {
      if (sub.subscriber === subscriber) {
        this.subscribers.delete(sub);
        logger.debug(LogCategory.PLAYER, 'Subscriber removed from PlayerReferenceService');
        break;
      }
    }
  }
  
  /**
   * Notify all subscribers of a player sprite change
   */
  notifySubscribers() {
    for (const { subscriber, callback } of this.subscribers) {
      if (callback) {
        try {
          callback(this.playerSprite);
        } catch (error) {
          logger.error(LogCategory.PLAYER, `Error in subscriber callback: ${error}`);
        }
      }
    }
  }
  
  /**
   * Reset the service (useful for scene transitions)
   */
  reset() {
    this.playerSprite = null;
    this.subscribers.clear();
    logger.info(LogCategory.PLAYER, 'PlayerReferenceService reset');
  }
}

// Create and export a singleton instance
const playerReferenceService = new PlayerReferenceService();
export default playerReferenceService; 