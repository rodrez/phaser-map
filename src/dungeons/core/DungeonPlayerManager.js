import { logger, LogCategory } from '../../utils/Logger';
import { PlayerManager } from '../../utils/player/PlayerManager';
import playerReferenceService from '../../utils/player/PlayerReferenceService';

/**
 * DungeonPlayerManager - Handles player-related functionality in dungeons
 * Extends the base PlayerManager with dungeon-specific features
 */
export class DungeonPlayerManager extends PlayerManager {
  /**
   * Constructor for the DungeonPlayerManager
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    // Call the parent constructor
    super(scene);
    
    // Initialize the PlayerReferenceService with the scene
    playerReferenceService.initialize(scene);
    
    // Movement tracking for click/tap
    this.lastClickPosition = null;
    this.lastTapTime = 0;
    this.doubleTapDelay = 300; // ms between taps to count as double-tap
    this.singleClickDelay = 250; // ms to wait before processing a single click
    this.singleClickTimer = null;
    
    // Track nearby passage ways for interaction
    this.nearbyPassageWay = null;
    
    // Add a debug key to test movement
    this.setupDebugKeys();
    
    logger.info(LogCategory.DUNGEON, 'Dungeon player manager initialized');
  }
  
  /**
   * Setup debug keys for testing
   */
  setupDebugKeys() {
    // Add a key to test movement (press 'M' to move to a random position)
    this.scene.input.keyboard.once('keydown-M', () => {
      if (!this.player) {
        logger.warn(LogCategory.DUNGEON, "Cannot test movement: Player is null");
        return;
      }
      
      // Get level bounds
      const bounds = this.scene.dungeonLevelManager?.getLevelBounds();
      if (!bounds) {
        logger.warn(LogCategory.DUNGEON, "Cannot test movement: No level bounds");
        return;
      }
      
      // Calculate a random position within the level bounds
      const padding = 50;
      const x = Phaser.Math.Between(bounds.left + padding, bounds.right - padding);
      const y = Phaser.Math.Between(bounds.top + padding, bounds.bottom - padding);
      
      logger.info(LogCategory.DUNGEON, `Testing movement to random position (${x}, ${y})`);
      
      // Move the player to the random position
      this.movePlayerToPosition(x, y, this.calculateMovementDuration(x, y));
      
      // Show visual feedback
      this.showTapFeedback(x, y);
      
      // Re-register the key for next test
      this.scene.time.delayedCall(500, () => {
        this.setupDebugKeys();
      });
    });
    
    // Add a key for passage way interaction (press 'E' to interact)
    this.scene.input.keyboard.on('keydown-E', () => {
      this.handleInteractionKeyPress();
    });
  }
  
  /**
   * Handle interaction key press (E key)
   */
  handleInteractionKeyPress() {
    // Check if there's a nearby passage way to interact with
    if (this.nearbyPassageWay) {
      logger.info(LogCategory.DUNGEON, `Interacting with passage way: ${this.nearbyPassageWay.direction}`);
      
      // Trigger the passage way interaction
      if (this.scene.dungeonLevelManager) {
        this.scene.dungeonLevelManager.handlePassageWayClick(this.nearbyPassageWay);
      }
    }
  }
  
  /**
   * Setup the player in the dungeon
   * @param {Object} startPosition - The starting position for the player
   */
  setupPlayer(startPosition = { x: 400, y: 300 }) {
    // Call the parent setupPlayer method
    const player = super.setupPlayer(startPosition.x, startPosition.y, 'player');
    
    // Register the player sprite with the PlayerReferenceService
    playerReferenceService.setPlayerSprite(player);
    
    // Setup click/tap handlers (dungeon-specific)
    this.setupClickHandlers();
    
    logger.info(LogCategory.DUNGEON, `Player created at position (${startPosition.x}, ${startPosition.y})`);
    
    return player;
  }
  
  /**
   * Setup click/tap handlers for player movement
   */
  setupClickHandlers() {
    // Remove any existing pointerdown listeners to prevent duplicates
    this.scene.input.off('pointerdown');
    
    // Configure input for double-click/tap
    this.scene.input.mouse.disableContextMenu();
    
    // Set up double-click detection using Phaser's built-in system
    this.scene.input.on('pointerdown', (pointer) => {
      // Check if the click is on a UI element
      if (this.scene.uiManager?.isClickOnUI(pointer)) {
        logger.debug(LogCategory.DUNGEON, "Click detected on UI element, ignoring for movement");
        return;
      }
      
      // Get the world position (accounting for camera scroll)
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      
      // Check if this is a double-click (pointer.downTime - pointer.previousDownTime < 350)
      if (pointer.downTime - pointer.previousDownTime < 350) {
        logger.info(LogCategory.DUNGEON, `Double-click detected at (${worldX}, ${worldY})`);
        
        // Clear any pending single click timer
        this.scene.time?.removeEvent(this.singleClickTimer);
        this.singleClickTimer = null;
        
        // Clear the last click position
        this.lastClickPosition = null;
        
        if (this.player) {
          // Move player to the clicked location
          this.movePlayerToPosition(worldX, worldY, this.calculateMovementDuration(worldX, worldY));
          
          // Visual feedback for tap location
          this.showTapFeedback(worldX, worldY);
          return;
        }
        
        logger.warn(LogCategory.DUNGEON, "Double-click detected but player is null");
        return;
      }
      
      // This is a single click - store the position and time
      this.lastClickPosition = {
        x: worldX,
        y: worldY,
        time: new Date().getTime()
      };
      
      // Clear any existing single click timer
      this.scene.time?.removeEvent(this.singleClickTimer);
      
      // Set a timer to process the single click after a delay
      // This delay gives time for a potential second click to be detected
      this.singleClickTimer = this.scene.time.delayedCall(
        this.doubleTapDelay + 50, // Slightly longer than double tap delay
        () => {
          this.processSingleClick();
          this.singleClickTimer = null;
        }
      );
    });
    
    logger.info(LogCategory.DUNGEON, "Click/tap handlers set up");
  }
  
  /**
   * Process a single click for movement
   */
  processSingleClick() {
    // If we have a stored click position and it's recent enough, move to it
    if (this.lastClickPosition) {
      const currentTime = new Date().getTime();
      const clickAge = currentTime - this.lastClickPosition.time;
      
      // Only process clicks that are recent but not too recent (to avoid processing during double-click)
      if (clickAge < 1000 && clickAge > this.doubleTapDelay) {
        const x = this.lastClickPosition.x;
        const y = this.lastClickPosition.y;
        
        logger.info(LogCategory.DUNGEON, `Single-click movement to (${x}, ${y})`);
        
        this.movePlayerToPosition(
          x, 
          y,
          this.calculateMovementDuration(x, y)
        );
        
        this.showTapFeedback(x, y);
      }
      
      // Clear the last click position
      this.lastClickPosition = null;
    }
  }
  
  /**
   * Calculate the duration for movement based on distance
   * @param {number} targetX - Target x position
   * @param {number} targetY - Target y position
   * @returns {number} - Duration in milliseconds
   */
  calculateMovementDuration(targetX, targetY) {
    if (!this.player) {
      logger.warn(LogCategory.DUNGEON, "Cannot calculate movement duration: Player is null");
      return 0;
    }
    
    // Calculate distance
    const distance = Phaser.Math.Distance.Between(
      this.player.x, 
      this.player.y, 
      targetX, 
      targetY
    );
    
    // 3ms per pixel is a good speed for movement
    const duration = distance * 3;
    
    logger.debug(LogCategory.DUNGEON, `Movement distance: ${distance.toFixed(2)} pixels, duration: ${duration.toFixed(2)}ms`);
    
    // Ensure the duration is reasonable (not too short or too long)
    const minDuration = 100; // Minimum 100ms
    const maxDuration = 3000; // Maximum 3 seconds
    
    if (duration < minDuration) {
      logger.debug(LogCategory.DUNGEON, `Duration too short (${duration.toFixed(2)}ms), using minimum: ${minDuration}ms`);
      return minDuration;
    } else if (duration > maxDuration) {
      logger.debug(LogCategory.DUNGEON, `Duration too long (${duration.toFixed(2)}ms), using maximum: ${maxDuration}ms`);
      return maxDuration;
    }
    
    return duration;
  }
  
  /**
   * Show visual feedback at tap location
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showTapFeedback(x, y) {
    // Create a circle at tap position
    const circle = this.scene.add.circle(x, y, 15, 0xffffff, 0.7);
    
    // Add a simple animation and then destroy it
    this.scene.tweens.add({
      targets: circle,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0.7, to: 0 },
      duration: 300,
      onComplete: () => {
        circle.destroy();
      }
    });
  }
  
  /**
   * Show visual feedback for invalid position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showInvalidPositionFeedback(x, y) {
    // Create a red X at the invalid position
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff0000, 0.8);
    
    // Draw an X
    const size = 10;
    graphics.moveTo(x - size, y - size);
    graphics.lineTo(x + size, y + size);
    graphics.moveTo(x + size, y - size);
    graphics.lineTo(x - size, y + size);
    
    // Add a simple animation and then destroy it
    this.scene.tweens.add({
      targets: graphics,
      alpha: { from: 0.8, to: 0 },
      duration: 500,
      onComplete: () => {
        graphics.destroy();
      }
    });
  }
  
  /**
   * Override the parent movePlayerToPosition to add bounds checking
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @param {number} duration - Duration of movement in ms
   * @param {Function} onComplete - Callback when movement completes
   */
  movePlayerToPosition(x, y, duration = 0, onComplete = null) {
    if (!this.player) {
      logger.warn(LogCategory.DUNGEON, "Cannot move player: Player is null");
      return;
    }
    
    logger.debug(LogCategory.DUNGEON, `Attempting to move player to (${x}, ${y}) with duration ${duration}ms`);
    
    // Check if the position is within the level bounds
    if (this.scene.dungeonLevelManager) {
      const bounds = this.scene.dungeonLevelManager.getLevelBounds();
      logger.debug(LogCategory.DUNGEON, `Level bounds: left=${bounds.left}, right=${bounds.right}, top=${bounds.top}, bottom=${bounds.bottom}`);
      
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
        logger.warn(LogCategory.DUNGEON, `Target position (${x}, ${y}) is outside level bounds`);
        // Show a visual indication that the position is invalid
        this.showInvalidPositionFeedback(x, y);
        return;
      }
      
      logger.debug(LogCategory.DUNGEON, `Position (${x}, ${y}) is within bounds, proceeding with movement`);
    } else {
      logger.warn(LogCategory.DUNGEON, "No dungeonLevelManager found for bounds checking");
    }
    
    // Call the parent method to handle the actual movement
    super.movePlayerToPosition(x, y, duration, onComplete);
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Handle keyboard movement if not being moved by a tween
    if (this.player) {
      const isTweening = this.scene.tweens.isTweening(this.player);
      
      // Log movement status periodically (every 60 frames to avoid console spam)
      if (time % 60 === 0) {
        logger.debug(LogCategory.PLAYER, `Player update: isTweening=${isTweening}`);
      }
      
      if (!isTweening) {
        this.handleKeyboardMovement(delta);
      }
      
      // Check for nearby passage ways
      this.checkNearbyPassageWays();
    } else {
      if (time % 60 === 0) {
        logger.warn(LogCategory.PLAYER, "Cannot update player movement: Player is null");
      }
    }
  }
  
  /**
   * Check for passage ways near the player
   */
  checkNearbyPassageWays() {
    if (!this.player || !this.scene.dungeonLevelManager || !this.scene.dungeonLevelManager.passageWays) {
      this.nearbyPassageWay = null;
      this.clearInteractionIndicator();
      return;
    }
    
    const interactionRadius = 100; // Distance in pixels for interaction
    let closestPassageWay = null;
    let closestDistance = interactionRadius;
    
    // Check each passage way
    for (const [direction, passageWay] of Object.entries(this.scene.dungeonLevelManager.passageWays)) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        passageWay.x,
        passageWay.y
      );
      
      // If this passage way is closer than the current closest, update
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPassageWay = passageWay;
      }
    }
    
    // Update the nearby passage way
    if (this.nearbyPassageWay !== closestPassageWay) {
      // Clear old indicator
      this.clearInteractionIndicator();
      
      // Set new nearby passage way
      this.nearbyPassageWay = closestPassageWay;
      
      // Show indicator if we found a passage way
      if (this.nearbyPassageWay) {
        this.showInteractionIndicator(this.nearbyPassageWay);
        logger.debug(LogCategory.DUNGEON, `Near passage way: ${this.nearbyPassageWay.direction}`);
      }
    }
  }
  
  /**
   * Show an interaction indicator above a passage way
   * @param {Object} passageWay - The passage way to show the indicator for
   */
  showInteractionIndicator(passageWay) {
    // Clear any existing indicator
    this.clearInteractionIndicator();
    
    // Create the indicator text
    this.interactionIndicator = this.scene.add.text(
      passageWay.x,
      passageWay.y - 50,
      'Press E to interact',
      {
        fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Add a pulsing animation
    this.scene.tweens.add({
      targets: this.interactionIndicator,
      alpha: { from: 0.5, to: 1 },
      y: { from: passageWay.y - 45, to: passageWay.y - 55 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  /**
   * Clear the interaction indicator
   */
  clearInteractionIndicator() {
    if (this.interactionIndicator) {
      this.interactionIndicator.destroy();
      this.interactionIndicator = null;
    }
  }
  
  /**
   * Override the destroy method to ensure proper cleanup
   */
  destroy() {
    // Reset the PlayerReferenceService when the player manager is destroyed
    playerReferenceService.reset();
    
    // Clear any pending timers
    if (this.singleClickTimer) {
      clearTimeout(this.singleClickTimer);
      this.singleClickTimer = null;
    }
    
    // Clear interaction indicator
    this.clearInteractionIndicator();
    
    // Remove event listeners
    this.scene.input.off('pointerdown');
    this.scene.input.keyboard.off('keydown-E');
    
    // Call parent destroy method
    super.destroy();
  }
} 