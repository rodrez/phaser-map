import { CorePlayerManager } from './CorePlayerManager';
import { logger, LogCategory } from '../Logger';

/**
 * PlayerInteractionManager - Handles player interactions with the game world
 * Manages player hitarea, callbacks, and flag placement
 */
export class PlayerInteractionManager extends CorePlayerManager {
    /**
     * Constructor for the PlayerInteractionManager
     * @param {Phaser.Scene} scene - The Phaser scene this manager belongs to
     * @param {Object} mapManager - The MapManager instance
     * @param {boolean} createPlayerSprite - Whether to create a player sprite (default: true)
     */
    constructor(scene, mapManager, createPlayerSprite = true) {
        // Pass the createPlayerSprite flag to the parent constructor
        super(scene, mapManager, createPlayerSprite);
        
        this.playerHitarea = null;
        
        // Create player hitarea for DOM interaction
        this.createPlayerHitarea();
        
        // Set up player callbacks
        this.setupPlayerCallbacks();
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
        const gameContainer = document.getElementById("game-container");
        if (gameContainer) {
            gameContainer.appendChild(hitarea);
        } else {
            logger.warn(LogCategory.PLAYER, "Game container not found for player hitarea");
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
        if (this.mapManager && this.mapManager.getPlayerPixelPosition) {
            const pixelPos = this.mapManager.getPlayerPixelPosition();
            hitarea.style.left = `${pixelPos.x}px`;
            hitarea.style.top = `${pixelPos.y}px`;
        }

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
        // Check if mapManager exists and has the necessary methods
        if (!this.mapManager) {
            logger.warn(LogCategory.PLAYER, "Map manager not available for player callbacks");
            return;
        }
        
        // Set callback for player movement
        if (this.mapManager.setPlayerMoveCallback) {
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
        }

        // Set callback for when player reaches target
        if (this.mapManager.setPlayerReachTargetCallback) {
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
        }
        
        // Add callback for when target position is set (after double-click)
        if (this.mapManager.setTargetPositionCallback !== undefined) {
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
     * Update method to be called in the scene's update loop
     * @param {number} delta - Time delta in milliseconds
     */
    update(delta) {
        super.update(delta);
        
        // Update hitarea position
        if (this.player && this.playerHitarea) {
            this.playerHitarea.style.left = `${this.player.x}px`;
            this.playerHitarea.style.top = `${this.player.y}px`;
        }
    }

    /**
     * Clean up resources when destroying the manager
     */
    destroy() {
        // Remove the player hitarea from the DOM
        if (this.playerHitarea?.parentNode) {
            this.playerHitarea.parentNode.removeChild(this.playerHitarea);
            this.playerHitarea = null;
        }
        
        // Call parent destroy
        super.destroy();
    }
} 