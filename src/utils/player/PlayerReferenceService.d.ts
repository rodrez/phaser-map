/**
 * Type definitions for PlayerReferenceService
 */

interface PlayerReferenceService {
  /**
   * Initialize the service with a scene
   */
  initialize(scene: Phaser.Scene): void;
  
  /**
   * Set the player sprite reference
   */
  setPlayerSprite(playerSprite: Phaser.Physics.Arcade.Sprite): void;
  
  /**
   * Get the current player sprite reference
   */
  getPlayerSprite(): Phaser.Physics.Arcade.Sprite;
  
  /**
   * Subscribe to player sprite changes
   */
  subscribe(subscriber: any, callback: (playerSprite: Phaser.Physics.Arcade.Sprite) => void): void;
  
  /**
   * Unsubscribe from player sprite changes
   */
  unsubscribe(subscriber: any): void;
  
  /**
   * Reset the service
   */
  reset(): void;
}

declare const playerReferenceService: PlayerReferenceService;

export default playerReferenceService; 