import { logger, LogCategory } from '../../utils/Logger';

/**
 * DungeonBackgroundManager - Handles the dungeon background and level image display
 * Ensures the black background covers the entire screen and level images are centered
 */
export class DungeonBackgroundManager {
  /**
   * Constructor for the DungeonBackgroundManager
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    this.scene = scene;
    this.currentDungeon = scene.currentDungeon;
    this.currentLevel = scene.currentLevel;
    
    // References to created elements
    this.blackBackground = null;
    this.levelImage = null;
    this.vignette = null;
    
    logger.info(LogCategory.DUNGEON, 'Dungeon background manager initialized');
  }
  
  /**
   * Create the black background that covers the entire screen
   */
  createBlackBackground() {
    // Set a completely black background color for the camera
    // This is all we need for a full black background
    this.scene.cameras.main.setBackgroundColor('#000000');
    
    logger.info(LogCategory.DUNGEON, 'Black background set');
  }
  
  /**
   * Create a vignette effect for more immersion
   */
  createVignetteEffect() {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Create a radial gradient for the vignette effect
    this.vignette = this.scene.add.graphics();
    
    // Draw the gradient
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
    this.vignette.fillRect(0, 0, width, height);
    
    // Set the blend mode to multiply
    this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
    
    // Make sure it follows the camera
    this.vignette.setScrollFactor(0);
    
    // Set a high depth so it's above the game world but below UI
    this.vignette.setDepth(5);
    
    logger.info(LogCategory.DUNGEON, 'Vignette effect created');
    
    return this.vignette;
  }
  
  /**
   * Load and display the level image centered on the screen
   * @param {number} level - The level number to display
   */
  displayLevelImage(level = null) {
    // Use provided level or current level
    const levelToDisplay = level || this.currentLevel;
    
    // Get the image key for this level
    const imageKey = `${this.currentDungeon.id}-level-${levelToDisplay}`;
    
    logger.info(LogCategory.DUNGEON, `Attempting to display level image with key: ${imageKey}`);
    
    // Check if the image is loaded
    if (!this.scene.textures.exists(imageKey)) {
      logger.error(LogCategory.DUNGEON, `Level image not found: ${imageKey}`);
      
      // List all available texture keys for debugging
      const textureKeys = this.scene.textures.getTextureKeys();
      logger.info(LogCategory.DUNGEON, `Available texture keys: ${textureKeys.join(', ')}`);
      
      // Try to use a fallback image
      if (this.scene.textures.exists('portal')) {
        logger.info(LogCategory.DUNGEON, 'Using portal image as fallback');
        this.levelImage = this.scene.add.image(
          this.scene.cameras.main.width / 2, 
          this.scene.cameras.main.height / 2, 
          'portal'
        );
        this.levelImage.setDepth(0);
        this.levelImage.setScrollFactor(0);
        return this.levelImage;
      }
      
      return null;
    }
    
    // Get the camera dimensions
    const cameraWidth = this.scene.cameras.main.width;
    const cameraHeight = this.scene.cameras.main.height;
    
    // Remove the old level image if it exists
    if (this.levelImage) {
      this.levelImage.destroy();
    }
    
    // Create the level image centered on the screen
    this.levelImage = this.scene.add.image(cameraWidth / 2, cameraHeight / 2, imageKey);
    
    // Get the image dimensions
    const imageWidth = this.levelImage.width;
    const imageHeight = this.levelImage.height;
    
    // Calculate the scale to fit the image within the camera view
    // while maintaining aspect ratio
    const scaleX = cameraWidth / imageWidth;
    const scaleY = cameraHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Apply the scale
    this.levelImage.setScale(scale);
    
    // Set the depth to be above the black background but below other elements
    this.levelImage.setDepth(0);
    
    // Make the image static (not affected by camera movement)
    this.levelImage.setScrollFactor(0);
    
    logger.info(LogCategory.DUNGEON, `Level image displayed: ${imageKey} with scale ${scale}`);
    
    return this.levelImage;
  }
  
  /**
   * Set up the entire background system
   */
  setupBackground() {
    // Create the black background (just sets camera background color)
    this.createBlackBackground();
    
    // Display the level image
    this.displayLevelImage();
    
    // Create the vignette effect
    this.createVignetteEffect();
    
    logger.info(LogCategory.DUNGEON, 'Dungeon background setup complete');
  }
  
  /**
   * Change the level image when moving to a new level
   * @param {number} newLevel - The new level number
   */
  changeLevel(newLevel) {
    // Update the current level
    this.currentLevel = newLevel;
    
    // Display the new level image (this will handle removing the old one)
    this.displayLevelImage(newLevel);
    
    logger.info(LogCategory.DUNGEON, `Background changed to level ${newLevel}`);
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // This method is a hook for future expansion
    // Currently, the background doesn't need per-frame updates
  }
  
  /**
   * Clean up resources when the manager is destroyed
   */
  destroy() {
    logger.info(LogCategory.DUNGEON, 'Destroying dungeon background manager');
    
    // Destroy the level image
    if (this.levelImage) {
      this.levelImage.destroy();
      this.levelImage = null;
    }
    
    // Destroy the vignette effect
    if (this.vignette) {
      this.vignette.destroy();
      this.vignette = null;
    }
  }
} 