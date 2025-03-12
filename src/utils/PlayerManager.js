import { Scene } from "phaser";
// Add J key for debugging key states
this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.J).on("down", () => {
  logger.info(LogCategory.GENERAL, "J key pressed - debugging key states");
  this.debugCheckKeyStates();
});

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
    console.log("Player pixel position:", pixelPos);

    // Create a simple colored circle as the player
    this.player = this.scene.add.circle(
      pixelPos.x,
      pixelPos.y,
      20,
      0x4285f4,
      1,
    );
    this.player.setStrokeStyle(2, 0x2a56c6);

    // Set a very high depth to ensure it's on top of everything
    this.player.setDepth(2000);

    // Add a shadow effect to make the player stand out against the map
    this.addShadowEffect(this.player);

    // Add a glow effect
    this.addGlowEffect(this.player);

    // Log player creation for debugging
    console.log("Player created at position:", pixelPos.x, pixelPos.y);
    console.log("Player dimensions:", this.player.width, this.player.height);
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

    // Add a click event listener to the hitarea
    hitarea.addEventListener("click", (e) => {
      console.log("Player hitarea clicked");
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
      console.log("Player moved to pixel position:", pixelPos);

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
      console.log("Player reached target:", position);

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
      }

      if (this.playerHitarea) {
        this.playerHitarea.style.left = `${pixelPos.x}px`;
        this.playerHitarea.style.top = `${pixelPos.y}px`;
      }
    });
  }

  /**
   * Add a shadow effect to the player
   * @param {Phaser.GameObjects.GameObject} target - The target object to add shadow to
   */
  addShadowEffect(target) {
    // Create a shadow beneath the player
    const shadow = this.scene.add.circle(
      target.x,
      target.y + 2,
      target.radius,
      0x000000,
      0.3,
    );
    shadow.setDepth(target.depth - 1);

    // Link the shadow to follow the player
    this.scene.tweens.add({
      targets: shadow,
      alpha: { from: 0.2, to: 0.4 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Store reference to shadow
    target.shadow = shadow;

    // Update shadow position when player moves
    this.scene.events.on("update", () => {
      if (target.active && shadow.active) {
        shadow.x = target.x;
        shadow.y = target.y + 2;
      }
    });
  }

  /**
   * Add a glow effect to the player
   * @param {Phaser.GameObjects.GameObject} target - The target object to add glow to
   */
  addGlowEffect(target) {
    // Create a post-pipeline glow effect if supported
    if (this.scene.renderer.type === Phaser.WEBGL) {
      try {
        // Add a slight pulsing animation to simulate a glow
        this.scene.tweens.add({
          targets: target,
          scaleX: { from: 1, to: 1.05 },
          scaleY: { from: 1, to: 1.05 },
          alpha: { from: 0.9, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } catch (error) {
        console.warn("Could not add glow effect:", error);
      }
    }
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
          this.player.x = pixelPos.x;
          this.player.y = pixelPos.y;

          if (this.player.shadow) {
            this.player.shadow.x = pixelPos.x;
            this.player.shadow.y = pixelPos.y + 2;
          }

          if (this.playerHitarea) {
            this.playerHitarea.style.left = `${pixelPos.x}px`;
            this.playerHitarea.style.top = `${pixelPos.y}px`;
          }
        }
      }
    }
  }

  /**
   * Clean up resources when destroying the manager
   */
  destroy() {
    // Remove the player hitarea from the DOM
    if (this.playerHitarea && this.playerHitarea.parentNode) {
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

