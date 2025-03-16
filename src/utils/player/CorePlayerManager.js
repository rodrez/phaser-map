import { Scene } from 'phaser';
import { logger, LogCategory } from '../Logger';

/**
 * CorePlayerManager - Base class with essential player functionality
 * Manages the player sprite, basic movement, and core player properties
 */
export class CorePlayerManager {
    /**
     * Constructor for the CorePlayerManager
     * @param {Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     * @param {boolean} createPlayerSprite - Whether to create a player sprite (default: true)
     */
    constructor(scene, mapManager, createPlayerSprite = true) {
        this.scene = scene;
        this.mapManager = mapManager;
        this.player = null;
        
        // Only create player sprite if flag is true
        if (createPlayerSprite) {
            // Create player sprite
            this.createPlayer();
        }
        
        // Create player animations (even if we don't create a sprite)
        this.createPlayerAnimations();
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
     * Update player position based on map manager
     * @param {number} delta - Time delta in milliseconds
     */
    updatePlayerPosition(delta) {
        if (!this.mapManager || !this.player) return;
        
        this.mapManager.updatePlayerPosition(delta);

        // Ensure player sprite is at the correct position
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
        } else if (this.mapManager.isPlayerMoving === false && 
                  this.player.anims.isPlaying && 
                  this.player.anims.currentAnim.key.includes("player-move")) {
            // Player has stopped moving, switch to idle animation
            this.player.play("player-idle");
        }
    }

    /**
     * Add a visual effect when placing a flag
     */
    addFlagPlacementEffect() {
        if (!this.player) return;
        
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
     * Get the player sprite
     * @returns {Phaser.GameObjects.GameObject} - The player sprite
     */
    getPlayer() {
        return this.player;
    }

    /**
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        this.updatePlayerPosition(delta);
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Destroy the player sprite
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }
} 