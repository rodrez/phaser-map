import { Scene } from "phaser";
import { LogCategory, logger } from "../utils/Logger";
import { PlayerManager } from "../utils/player";
import { MapManager } from "../utils/MapManager";

/**
 * System to handle player interactions with environment objects
 */
export class PlayerInteractions {
  scene;
  playerManager;
  mapManager;
  playerHitarea;

  /**
   * Constructor for PlayerInteractions
   * @param {Phaser.Scene} scene - The scene this system belongs to
   * @param {PlayerManager} playerManager - The player manager instance
   */
  constructor(
    scene: Scene & { mapManager: MapManager },
    playerManager: PlayerManager,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.mapManager = scene.mapManager;
    this.playerHitarea = null;

    // Set up event listeners for interactions
    this.setupEventListeners();

    // Set up DOM interaction if map manager exists
    if (this.mapManager) {
      this.createPlayerHitarea();
      this.setupMapCallbacks();
    }

    logger.info(LogCategory.PLAYER, "PlayerInteractions system initialized");
  }

  /**
   * Set up event listeners for player interactions with environment
   */
  setupEventListeners() {
    // Tree chopping
    this.scene.events.on("player-chop-tree", this.handleChopTree, this);

    // Fruit gathering
    this.scene.events.on("player-gather-fruits", this.handleGatherFruits, this);

    // Healing effects
    this.scene.events.on(
      "player-healing-effect",
      this.handleHealingEffect,
      this,
    );
  }

  /**
   * Create a DOM hitarea for the player for click interactions
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

    // Make hitarea visible in debug mode
    if (this.scene.physics?.world?.drawDebug) {
      hitarea.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      logger.debug(
        LogCategory.PLAYER,
        "Player hitarea made visible in debug mode",
      );
    }

    // Add the hitarea to the game container
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      gameContainer.appendChild(hitarea);
    } else {
      logger.warn(
        LogCategory.PLAYER,
        "Game container not found for player hitarea",
      );
      return;
    }

    // Store a reference to the hitarea
    this.playerHitarea = hitarea;

    // Add a double-click event listener to the hitarea (replacing the click event)
    hitarea.addEventListener("dblclick", (e) => {
      logger.info(LogCategory.PLAYER, "Player hitarea double-clicked");
      this.handleClick();
      e.stopPropagation();
    });

    // Initial positioning
    if (this.mapManager?.getPlayerPixelPosition) {
      const pixelPos = this.mapManager.getPlayerPixelPosition();
      hitarea.style.left = `${pixelPos.x}px`;
      hitarea.style.top = `${pixelPos.y}px`;
    }

    // Update hitarea position in the update loop
    this.scene.events.on("update", () => {
      const player = this.getPlayer();
      if (player && this.playerHitarea) {
        const x = player.x;
        const y = player.y;
        this.playerHitarea.style.left = `${x}px`;
        this.playerHitarea.style.top = `${y}px`;
      }
    });
  }

  /**
   * Set up callbacks for player interaction with the map
   */
  setupMapCallbacks() {
    // Check if mapManager exists and has the necessary methods
    if (!this.mapManager) {
      logger.warn(
        LogCategory.PLAYER,
        "Map manager not available for player callbacks",
      );
      return;
    }

    // Add callback for when target position is set (after double-click)
    if (this.mapManager.setTargetPositionCallback !== undefined) {
      this.mapManager.setTargetPositionCallback = (targetPosition) => {
        const player = this.getPlayer();
        if (player) {
          // Check if the player has animations before trying to play them
          if (player.anims && typeof player.play === "function") {
            // Play the movement animation when player starts moving
            player.play("player-move");
          }

          // Add a visual pulse effect to show the player is responding to the double-click
          const pulse = this.scene.add.circle(
            player.x,
            player.y,
            20,
            0x4a90e2,
            0.7,
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
            },
          });
        }
      };
    }
  }

  /**
   * Handle player click event for flag placement
   * @param {Function} onPlaceFlag - Callback when a flag is placed
   * @returns {boolean} - Whether a flag was placed
   */
  handleClick(onPlaceFlag) {
    if (!this.mapManager) return false;

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
    const player = this.getPlayer();
    if (!player) return;

    // Create a circle at the player's position
    const circle = this.scene.add.circle(player.x, player.y, 50, 0xff5252, 0.5);
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
   * Handle tree chopping interaction
   * @param {Object} data - Object containing tree and interaction parameters
   */
  handleChopTree(data) {
    const { tree, requiredDistance, chopDuration, onComplete } = data;

    // Get player from the scene
    const player = this.getPlayer();
    if (!player) {
      logger.error(LogCategory.PLAYER, "Cannot chop tree: player not found");
      return;
    }

    // Check if player is in range
    const distance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      tree.x,
      tree.y,
    );

    if (distance > requiredDistance) {
      // Player is too far away - show message and return
      this.showTooFarMessage(player, "Too far away to chop tree");
      return;
    }

    // Face player toward the tree
    this.facePlayerTowards(player, tree);

    // Create UI elements for chopping action
    const progressBarData = this.createProgressBar(player);
    const choppingText = this.createActionText(player, "Chopping...");

    // Tree shake animation for chopping
    const treeShakeConfig = {
      targets: tree,
      x: tree.x + 2,
      duration: 50,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    };

    // Starting time for animation
    const startTime = this.scene.time.now;

    // Create animation loop that updates progress bar
    const chopAnimationEvent = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        // Update animation based on elapsed time
        const elapsed = this.scene.time.now - startTime;
        const progress = Math.min(elapsed / chopDuration, 1);

        // Update progress bar
        progressBarData.progress.width = progress * progressBarData.width;

        // Shake tree at regular intervals
        if (elapsed % 600 < 100) {
          this.scene.tweens.add(treeShakeConfig);
        }

        // Check if chopping is complete
        if (progress >= 1) {
          // Clean up animation and UI elements
          chopAnimationEvent.remove();
          distanceCheckEvent.remove();
          choppingText.destroy();
          progressBarData.background.destroy();
          progressBarData.progress.destroy();

          // Call the completion callback
          if (onComplete) {
            onComplete(tree);
          }
        }
      },
      callbackScope: this,
      loop: true,
    });

    // Check if player moves away during chopping
    const distanceCheckEvent = this.scene.time.addEvent({
      delay: 200,
      callback: () => {
        const currentDistance = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          tree.x,
          tree.y,
        );
        if (currentDistance > requiredDistance) {
          // Player moved away - cancel chopping
          chopAnimationEvent.remove();
          distanceCheckEvent.remove();

          // Clean up UI elements
          choppingText.destroy();
          progressBarData.background.destroy();
          progressBarData.progress.destroy();

          // Show cancelled message
          this.showActionCancelledMessage(player);
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Handle gathering fruits
   * @param {Object} data - Object containing tree and interaction parameters
   */
  handleGatherFruits(data) {
    const { tree, requiredDistance, healingPower } = data;

    // Check if this is a healing spruce
    if (!tree.getData("isHealingSpruce")) {
      logger.info(
        LogCategory.PLAYER,
        "Cannot gather fruits: not a spruce tree",
      );
      return;
    }

    // Get player from the scene
    const player = this.getPlayer();
    if (!player) {
      logger.error(
        LogCategory.PLAYER,
        "Cannot gather fruits: player not found",
      );
      return;
    }

    // Check if player is in range
    const distance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      tree.x,
      tree.y,
    );

    if (distance > requiredDistance) {
      // Player is too far away - show message and return
      this.showTooFarMessage(player, "Too far away to gather fruits");
      return;
    }

    // Face player toward the tree
    this.facePlayerTowards(player, tree);

    // Show gathering text
    const gatheringText = this.createActionText(player, "Gathering...");

    // Animate player reaching up (by scaling the tree slightly)
    this.scene.tweens.add({
      targets: tree,
      scaleX: tree.scaleX * 1.02,
      scaleY: tree.scaleY * 1.02,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Remove gathering text
        gatheringText.destroy();

        // Apply healing
        this.scene.events.emit("player-healed", healingPower);

        // Show success message
        const message = `You gathered healing fruits!\nHealed for ${healingPower} HP!`;
        const fruitMsg = this.scene.add
          .text(tree.x, tree.y - 50, message, {
            fontSize: "16px",
            fontFamily: "Arial",
            color: "#FFFFFF",
            stroke: "#000000",
            strokeThickness: 3,
            align: "center",
          })
          .setOrigin(0.5);

        // Fade out and destroy
        this.scene.tweens.add({
          targets: fruitMsg,
          alpha: 0,
          y: fruitMsg.y - 30,
          duration: 2000,
          onComplete: () => fruitMsg.destroy(),
        });

        // Add some XP for gathering
        this.scene.events.emit("add-skill-points", 1);
      },
    });
  }

  /**
   * Handle healing effect on player
   * @param {Object} data - Object containing healing effect parameters
   */
  handleHealingEffect(data) {
    const { x, y, healingPower } = data;

    // Create a healing particles effect
    const particles = this.scene.add.particles(x, y, "wood-chip", {
      speed: { min: 20, max: 50 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      tint: 0x00ff00, // Green for healing
      quantity: 5,
      emitting: false,
    });

    particles.explode();

    this.scene.time.delayedCall(1100, () => particles.destroy());
  }

  /**
   * Show a damage effect above the player
   * @param {number} damage - The amount of damage to display
   */
  showDamageEffect(damage) {
    const player = this.getPlayer();
    if (!player) return;

    // Create a damage text
    const damageText = this.scene.add
      .text(player.x, player.y - 20, `-${damage}`, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#FF0000",
        fontWeight: "bold",
      })
      .setOrigin(0.5);
    damageText.setDepth(2001);

    // Animate the damage text
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => damageText.destroy(),
    });
  }

  /**
   * Show a healing effect on the player
   * @param {number} amount - The amount of healing
   */
  showHealEffect(amount) {
    const player = this.getPlayer();
    if (!player) return;

    // Create a healing text
    const healText = this.scene.add
      .text(player.x, player.y - 20, `+${amount}`, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#00FF00",
        fontWeight: "bold",
      })
      .setOrigin(0.5);
    healText.setDepth(2001);

    // Animate the healing text
    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => healText.destroy(),
    });

    // Create a healing effect
    const healEffect = this.scene.add.sprite(player.x, player.y, "player");
    healEffect.setScale(1.2);
    healEffect.setAlpha(0.5);
    healEffect.setTint(0x00ff00);
    healEffect.setDepth(1998); // Below player

    // Animate the healing effect
    this.scene.tweens.add({
      targets: healEffect,
      scale: 1.8,
      alpha: 0,
      duration: 500,
      onComplete: () => healEffect.destroy(),
    });
  }

  /**
   * Show a god mode healing effect on the player
   * @param {number} amount - The amount of healing
   */
  showGodModeHealEffect(amount) {
    const player = this.getPlayer();
    if (!player) return;

    // Create a healing text with special formatting for god mode
    const healText = this.scene.add
      .text(player.x, player.y - 20, `+${amount}`, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#FFFF00",
        fontWeight: "bold",
      })
      .setOrigin(0.5);
    healText.setDepth(2001);

    // Animate the healing text
    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => healText.destroy(),
    });

    // Create a special god mode healing effect (yellow instead of green)
    const healEffect = this.scene.add.sprite(player.x, player.y, "player");
    healEffect.setScale(1.2);
    healEffect.setAlpha(0.5);
    healEffect.setTint(0xffff00); // Yellow for god mode
    healEffect.setDepth(1998); // Below player

    // Animate the healing effect
    this.scene.tweens.add({
      targets: healEffect,
      scale: 1.8,
      alpha: 0,
      duration: 500,
      onComplete: () => healEffect.destroy(),
    });
  }

  /**
   * Show a dodge effect above the player
   */
  showDodgeEffect() {
    const player = this.getPlayer();
    if (!player) return;

    // Create a dodge text
    const dodgeText = this.scene.add
      .text(player.x, player.y - 20, "DODGE!", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#29304e",
        fontWeight: "bold",
      })
      .setOrigin(0.5);
    dodgeText.setDepth(2001);

    // Animate the dodge text
    this.scene.tweens.add({
      targets: dodgeText,
      y: dodgeText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => dodgeText.destroy(),
    });
  }

  /**
   * Get the player object
   * @returns {Phaser.GameObjects.Sprite} The player sprite
   */
  getPlayer() {
    return (
      this.scene.registry.get("player") ||
      (this.playerManager ? this.playerManager.getPlayer() : null)
    );
  }

  /**
   * Face the player towards a target object
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {Phaser.GameObjects.Sprite} target - The target to face towards
   */
  facePlayerTowards(player, target) {
    if (target.x > player.x) {
      player.setFlipX(false);
    } else {
      player.setFlipX(true);
    }
  }

  /**
   * Create a progress bar for timed actions
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @returns {Object} Progress bar components
   */
  createProgressBar(player) {
    const width = 40;
    const height = 6;

    // Create background
    const background = this.scene.add
      .rectangle(player.x, player.y - 25, width, height, 0x000000, 0.7)
      .setOrigin(0.5);

    // Create progress indicator
    const progress = this.scene.add
      .rectangle(player.x - width / 2, player.y - 25, 0, height, 0xffffff, 1)
      .setOrigin(0, 0.5);

    return {
      background,
      progress,
      width,
    };
  }

  /**
   * Create a health bar for the player
   */
  createHealthBar() {
    const player = this.getPlayer();
    if (!player) return null;

    // Create a graphics object for the health bar
    const healthBar = this.scene.add.graphics();

    // Set a high depth to ensure it's visible above most objects but below UI
    healthBar.setDepth(1990); // Below player (2000) but above most objects

    return healthBar;
  }

  /**
   * Update the player's health bar
   * @param {Object} healthBar - The health bar graphics object
   * @param {number} health - Current health
   * @param {number} maxHealth - Maximum health
   * @param {boolean} forcedVisible - Whether to force visibility
   */
  updateHealthBar(healthBar, health, maxHealth, forcedVisible = false) {
    const player = this.getPlayer();
    if (!player || !healthBar) return;

    // Clear previous graphics
    healthBar.clear();

    // Get current health percentage
    const healthPercent = health / maxHealth;

    // Set bar dimensions
    const barWidth = 40;
    const barHeight = 5;

    // Position the bar above the player
    const barX = player.x - barWidth / 2;
    const barY = player.y - player.height / 2 - 15; // 15 pixels above player

    // Draw background (red)
    healthBar.fillStyle(0xff0000);
    healthBar.fillRect(barX, barY, barWidth, barHeight);

    // Draw health (green)
    healthBar.fillStyle(0x00ff00);
    healthBar.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Draw border (white)
    healthBar.lineStyle(1, 0xffffff, 0.8);
    healthBar.strokeRect(barX, barY, barWidth, barHeight);

    // Set visibility based on health and forced visibility
    healthBar.setVisible(healthPercent < 1 || forcedVisible);

    return healthBar;
  }

  /**
   * Create floating text for actions
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {string} text - The text to display
   * @returns {Phaser.GameObjects.Text} The text object
   */
  createActionText(player, text) {
    return this.scene.add
      .text(player.x, player.y - 40, text, {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
        align: "center",
      })
      .setOrigin(0.5);
  }

  /**
   * Show a "too far away" message above the player
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   * @param {string} message - The message to show
   */
  showTooFarMessage(player, message) {
    const tooFarMsg = this.scene.add
      .text(player.x, player.y - 40, message, {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: tooFarMsg,
      alpha: 0,
      y: tooFarMsg.y - 30,
      duration: 1500,
      onComplete: () => tooFarMsg.destroy(),
    });
  }

  /**
   * Show a "cancelled" message when player moves away from action
   * @param {Phaser.GameObjects.Sprite} player - The player sprite
   */
  showActionCancelledMessage(player) {
    const cancelledMsg = this.scene.add
      .text(player.x, player.y - 40, "Action cancelled", {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.scene.tweens.add({
      targets: cancelledMsg,
      alpha: 0,
      y: cancelledMsg.y - 20,
      duration: 1000,
      onComplete: () => cancelledMsg.destroy(),
    });
  }

  /**
   * Clean up resources when the system is destroyed
   */
  destroy() {
    // Remove event listeners
    this.scene.events.off("player-chop-tree", this.handleChopTree, this);
    this.scene.events.off(
      "player-gather-fruits",
      this.handleGatherFruits,
      this,
    );
    this.scene.events.off(
      "player-healing-effect",
      this.handleHealingEffect,
      this,
    );

    // Clean up DOM elements
    if (this.playerHitarea?.parentNode) {
      this.playerHitarea.parentNode.removeChild(this.playerHitarea);
      this.playerHitarea = null;
    }
  }
}

