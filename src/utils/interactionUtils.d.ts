/**
 * TypeScript definitions for interactionUtils.js
 */

interface InteractionOptions {
  getDoubleClickData?: () => any;
  objectType?: string;
  doubleClickThreshold?: number;
  hoverTint?: number;
  hitArea?: any;
  [key: string]: any;
}

/**
 * Set up an interactive object with both single-click and double-click handling
 */
export function setupInteractiveObject(
  scene: Phaser.Scene, 
  gameObject: Phaser.GameObjects.GameObject, 
  onSingleClick: (gameObject: Phaser.GameObjects.GameObject) => void, 
  options?: InteractionOptions
): () => void;

/**
 * Set up hover effects for an interactive object
 */
export function setupHoverEffects(
  gameObject: Phaser.GameObjects.GameObject, 
  options?: InteractionOptions
): () => void;

/**
 * Quick setup for common interactive objects with hover and click handling
 */
export function makeInteractive(
  scene: Phaser.Scene, 
  gameObject: Phaser.GameObjects.GameObject, 
  onSingleClick: (gameObject: Phaser.GameObjects.GameObject) => void, 
  options?: InteractionOptions
): { remove: () => void }; 