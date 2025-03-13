import { Scene } from "phaser";
import { logger, LogCategory } from "./Logger";

/**
 * PlayerManager class to handle all player-related functionality
 * This class manages the player sprite, effects, and interactions
 */
export class PlayerManager {
  /**
   * Constructor for the PlayerManager
   * @param {Scene} scene - The Phaser scene this manager belongs to
   * @param {Object} mapManager - The MapManager instance
   */
  constructor(scene, mapManager) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.player = null;
    this.playerHitarea = null;

    // Initialize player
    this.createPlayer();

    // Create player animations
    this.createPlayerAnimations();

    // Set up player callbacks
    this.setupPlayerCallbacks();

    // Create player hitarea for DOM interaction
    this.createPlayerHitarea();
  }

  /**
   * Create the player sprite
   */
  createPlayer() {
    // Get initial player position in pixels
    const pixelPos = this.mapManager.getPlayerPixelPosition();
    logger.info(LogCategory.PLAYER, "Player pixel position:", pixelPos);

    // Create a simple colored circle as the player
    this.player = this.scene.add.sprite(pixelPos.x, pixelPos.y, 'player');

    // Set a very high depth to ensure it's on top of everything
    this.player.setDepth(2000);

    // Log player creation for debugging
    logger.info(LogCategory.PLAYER, "Player created at position:", pixelPos.x, pixelPos.y);
    logger.info(LogCategory.PLAYER, "Player dimensions:", this.player.width, this.player.height);
  }

   /**
   * Creates animations for the player character.
   */
  createPlayerAnimations() {
    const frameRate = 8;

    // Avoid recreating animations if they already exist
    if (this.scene.anims.exists("player-idle")) {
      return;
    }

    // Idle animation (frames 0-2)
    this.scene.anims.create({
      key: "player-idle",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 0,
        end: 2,
      }),
      frameRate: frameRate,
      repeat: -1,
    });

    // Movement animations (frames 3-5)
    this.scene.anims.create({
      key: "player-move",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 3,
        end: 5,
      }),
      frameRate: frameRate,
      repeat: -1,
    });

    // Directional movement animations
    this.scene.anims.create({
      key: "player-move-down",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 3,
        end: 5,
      }),
      frameRate: frameRate,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "player-move-up",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 3,
        end: 5,
      }),
      frameRate: frameRate,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "player-move-right",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 3,
        end: 5,
      }),
      frameRate: frameRate,
      repeat: -1,
    });
    this.scene.anims.create({
      key: "player-move-left",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 3,
        end: 5,
      }),
      frameRate: frameRate,
      repeat: -1,
    });

    // Attack animation (frames 6-8)
    this.scene.anims.create({
      key: "player-attack",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 6,
        end: 8,
      }),
      frameRate: frameRate,
      repeat: 0,
    });

    // Death animation (frame 9)
    this.scene.anims.create({
      key: "player-death",
      frames: this.scene.anims.generateFrameNumbers("player", {
        start: 9,
        end: 9,
      }),
      frameRate: frameRate,
      repeat: 0,
    });
  }
  /**
   * Create a DOM hitarea for the player
   */
  createPlayerHitarea() {
    // Create a div for the player hitarea
    const hitarea = document.createElement("div");
    hitarea.className = "player-hitarea";
    hitarea.style.position = "absolute";
    hitarea.style.width = "60px"; // Larger hitarea for easier clicking
    hitarea.style.height = "60px"; // Larger hitarea for easier clicking
    hitarea.style.borderRadius = "50%";
    hitarea.style.transform = "translate(-50%, -50%)";
    hitarea.style.cursor = "pointer";
    hitarea.style.zIndex = "40";

    // For debugging, uncomment to see the hitarea
    // hitarea.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';

    // Add the hitarea to the game container
    document.getElementById("game-container").appendChild(hitarea);

    // Store a reference to the hitarea
    this.playerHitarea = hitarea;

    // Add a double-click event listener to the hitarea (replacing the click event)
    hitarea.addEventListener("dblclick", (e) => {
      logger.info(LogCategory.PLAYER, "Player hitarea double-clicked");
      this.handleClick();
      e.stopPropagation();
    });

    // Initial positioning
    const pixelPos = this.mapManager.getPlayerPixelPosition();
    hitarea.style.left = `${pixelPos.x}px`;
    hitarea.style.top = `${pixelPos.y}px`;

    // Update hitarea position in the update loop
    this.scene.events.on("update", () => {
      if (this.player && this.playerHitarea) {
        const x = this.player.x;
        const y = this.player.y;
        this.playerHitarea.style.left = `${x}px`;
        this.playerHitarea.style.top = `${y}px`;
      }
    });
  }

  /**
   * Set up callbacks for player interaction with the map
   */
  setupPlayerCallbacks() {
    // Set callback for player movement
    this.mapManager.setPlayerMoveCallback((position) => {
      // Update player sprite position
      const pixelPos = this.mapManager.latLngToPixel(
        position.lat,
        position.lng,
      );
      logger.info(LogCategory.PLAYER, "Player moved to pixel position:", pixelPos);

      if (this.player) {
        // Update player position immediately
        this.player.x = pixelPos.x;
        this.player.y = pixelPos.y;

        // Update shadow position if it exists
        if (this.player.shadow) {
          this.player.shadow.x = pixelPos.x;
          this.player.shadow.y = pixelPos.y + 2;
        }
      }

      // Update DOM hitarea position immediately
      if (this.playerHitarea) {
        this.playerHitarea.style.left = `${pixelPos.x}px`;
        this.playerHitarea.style.top = `${pixelPos.y}px`;
      }
    });

    // Set callback for when player reaches target
    this.mapManager.setPlayerReachTargetCallback((position) => {
      // Player has reached the target position
      logger.info(LogCategory.PLAYER, "Player reached target:", position);

      // Force an update of the player position
      const pixelPos = this.mapManager.latLngToPixel(
        position.lat,
        position.lng,
      );
      if (this.player) {
        this.player.x = pixelPos.x;
        this.player.y = pixelPos.y;

        if (this.player.shadow) {
          this.player.shadow.x = pixelPos.x;
          this.player.shadow.y = pixelPos.y + 2;
        }
        
        // Play the idle animation when player stops moving
        this.player.play("player-idle");
      }

      if (this.playerHitarea) {
        this.playerHitarea.style.left = `${pixelPos.x}px`;
        this.playerHitarea.style.top = `${pixelPos.y}px`;
      }
    });
    
    // Add callback for when target position is set (after double-click)
    this.mapManager.setTargetPositionCallback = (targetPosition) => {
      if (this.player) {
        // Play the movement animation when player starts moving
        this.player.play("player-move");
        
        // Add a visual pulse effect to show the player is responding to the double-click
        const pulse = this.scene.add.circle(
          this.player.x,
          this.player.y,
          20,
          0x4a90e2,
          0.7
        );
        pulse.setDepth(1999); // Just below player depth
        
        // Animate the pulse
        this.scene.tweens.add({
          targets: pulse,
          radius: 40,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            pulse.destroy();
          }
        });
      }
    };
  }

  /**
   * Handle player click event
   * @param {Function} onPlaceFlag - Callback when a flag is placed
   */
  handleClick(onPlaceFlag) {
    // Try to add a flag at the player's current position
    const flag = this.mapManager.addFlagAtPlayerPosition();

    if (flag) {
      // Add a visual effect
      this.addFlagPlacementEffect();

      // Call the callback if provided
      if (onPlaceFlag) {
        onPlaceFlag(flag);
      }

      return true;
    }

    return false;
  }

  /**
   * Add a visual effect when placing a flag
   */
  addFlagPlacementEffect() {
    // Create a circle at the player's position
    const circle = this.scene.add.circle(
      this.player.x,
      this.player.y,
      50,
      0xff5252,
      0.5,
    );
    circle.setDepth(90);

    // Animate the circle
    this.scene.tweens.add({
      targets: circle,
      radius: 100,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        circle.destroy();
      },
    });
  }

  /**
   * Update player position based on map manager
   * @param {number} delta - Time delta in milliseconds
   */
  update(delta) {
    if (this.mapManager) {
      this.mapManager.updatePlayerPosition(delta);

      // Ensure player sprite is at the correct position
      if (this.player) {
        const position = this.mapManager.getPlayerPosition();
        const pixelPos = this.mapManager.latLngToPixel(
          position.lat,
          position.lng,
        );

        // Only update if there's a significant difference
        const dx = this.player.x - pixelPos.x;
        const dy = this.player.y - pixelPos.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > 1) {
          // Player is moving, update position
          this.player.x = pixelPos.x;
          this.player.y = pixelPos.y;

          // Update player animation based on movement direction
          if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key === "player-idle") {
            // Determine movement direction
            if (Math.abs(dx) > Math.abs(dy)) {
              // Moving horizontally
              if (dx > 0) {
                this.player.play("player-move-left");
              } else {
                this.player.play("player-move-right");
              }
            } else {
              // Moving vertically
              if (dy > 0) {
                this.player.play("player-move-up");
              } else {
                this.player.play("player-move-down");
              }
            }
          }

          if (this.player.shadow) {
            this.player.shadow.x = pixelPos.x;
            this.player.shadow.y = pixelPos.y + 2;
          }

          if (this.playerHitarea) {
            this.playerHitarea.style.left = `${pixelPos.x}px`;
            this.playerHitarea.style.top = `${pixelPos.y}px`;
          }
        } else if (this.mapManager.isPlayerMoving === false && 
                  this.player.anims.isPlaying && 
                  this.player.anims.currentAnim.key.includes("player-move")) {
          // Player has stopped moving, switch to idle animation
          this.player.play("player-idle");
        }
      }
    }
  }

  /**
   * Clean up resources when destroying the manager
   */
  destroy() {
    // Remove the player hitarea from the DOM
    if (this.playerHitarea?.parentNode) {
      this.playerHitarea.parentNode.removeChild(this.playerHitarea);
    }

    // Destroy the player sprite
    if (this.player) {
      if (this.player.shadow) {
        this.player.shadow.destroy();
      }
      this.player.destroy();
    }
  }

  /**
   * Get the player sprite
   * @returns {Phaser.GameObjects.GameObject} - The player sprite
   */
  getPlayer() {
    return this.player;
  }
}
