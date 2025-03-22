import { PlayerManager } from "../utils/player/PlayerManager";
import { PlayerInteractions } from "./PlayerInteractions";
import { logger, LogCategory } from "../utils/Logger";
import type { MapManager } from "../utils/MapManager";
import type { GeoPosition, TreeChopData, FruitGatherData } from "./types";

/**
 * PlayerSystem - Main coordinator for all player subsystems
 * Acts as the single entry point for other game systems to interact with the player
 */
export class PlayerSystem {
  // Class properties declaration to fix TypeScript errors
  scene: Phaser.Scene;
  mapManager: MapManager | null;
  playerManager: PlayerManager;
  interactions: PlayerInteractions;
  healthSystem: any; // TODO: Replace with proper type once defined
  statsService: any; // TODO: Replace with proper type once defined
  lastGeoPosition: GeoPosition | null;
  isFollowingGeo: boolean;
  geoUpdateInterval: number;
  lastGeoUpdateTime: number;

  /**
   * Constructor for the PlayerSystem
   * @param {Phaser.Scene} scene - The Phaser scene this system belongs to
   * @param {MapManager} mapManager - The map manager instance (optional)
   */
  constructor(scene: Phaser.Scene, mapManager?: MapManager) {
    this.scene = scene;
    this.mapManager = mapManager || null;

    // Initialize the base player manager first
    this.playerManager = new PlayerManager(scene);

    // Register in the scene for easy access by other systems
    this.scene.playerSystem = this;

    // Initialize the player interactions system
    this.interactions = new PlayerInteractions(scene, this.playerManager);

    // Optional references to commonly used player components for convenience
    this.healthSystem = this.playerManager.healthSystem;
    this.statsService = this.playerManager.statsService;

    // Geo-specific properties
    this.lastGeoPosition = null;
    this.isFollowingGeo = Boolean(this.mapManager);
    this.geoUpdateInterval = 1000; // ms between geo updates
    this.lastGeoUpdateTime = 0;

    // Set up global event listeners for player-related events
    this.setupEventListeners();

    logger.info(
      LogCategory.PLAYER,
      "PlayerSystem initialized - Main player coordinator ready",
    );
  }

  /**
   * Setup global event listeners for player-related events
   */
  setupEventListeners() {
    // Listen for player damage events and forward to interactions system for visual effects
    this.scene.events.on("player-damage-taken", (damage) => {
      // Forward to interactions system for visual effects
      if (this.interactions?.showDamageEffect) {
        this.interactions.showDamageEffect(damage);
      }
    });

    // Listen for player healing events and forward to interactions system for visual effects
    this.scene.events.on("player-healed", (amount) => {
      // Handle healing
      if (this.playerManager?.heal) {
        this.playerManager.heal(amount, "environment");
      }
    });
  }

  /**
   * Setup the player sprite and all subsystems
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {string} spriteKey - The key for the player sprite
   * @returns {Object} - The player sprite
   */
  setupPlayer(x = 400, y = 300, spriteKey = "player") {
    // Create the player through the manager
    const player = this.playerManager.setupPlayer(x, y, spriteKey);

    // Register it globally for other systems to access
    this.scene.registry.set("player", player);

    // Set up geo-specific features if map manager exists
    if (this.mapManager) {
      this.setupGeoLocationTracking();
    }

    return player;
  }

  /**
   * Setup geolocation tracking
   */
  setupGeoLocationTracking() {
    if (!this.mapManager) return;

    // Subscribe to map manager's location updates
    if (this.mapManager.onLocationUpdate) {
      this.mapManager.onLocationUpdate((position) => {
        this.handleGeoLocationUpdate(position);
      });

      logger.info(LogCategory.PLAYER, "Subscribed to geolocation updates");
    } else {
      logger.warn(
        LogCategory.PLAYER,
        "Map manager not available for geolocation tracking",
      );
    }
  }

  /**
   * Handle geolocation updates
   * @param {Object} position - The new geolocation position
   */
  handleGeoLocationUpdate(position) {
    // Store the last geo position
    this.lastGeoPosition = position;

    // If we're following geo, update the player position
    if (this.isFollowingGeo && this.playerManager.getPlayer()) {
      // Convert geo coordinates to game coordinates
      const gameCoords = this.mapManager.geoToGameCoordinates(
        position.latitude,
        position.longitude,
      );

      // Move the player to the new position
      this.movePlayerToPosition(gameCoords.x, gameCoords.y, 500);

      logger.info(
        LogCategory.PLAYER,
        `Player moved to geo position: (${gameCoords.x}, ${gameCoords.y})`,
      );
    }
  }

  /**
   * Toggle whether the player follows geolocation
   * @param {boolean} follow - Whether to follow geolocation
   */
  setFollowGeo(follow) {
    this.isFollowingGeo = follow;
    logger.info(LogCategory.PLAYER, `Geo following set to: ${follow}`);

    // If we're turning on following and we have a last position, update immediately
    if (follow && this.lastGeoPosition && this.playerManager.getPlayer()) {
      const gameCoords = this.mapManager.geoToGameCoordinates(
        this.lastGeoPosition.latitude,
        this.lastGeoPosition.longitude,
      );

      this.movePlayerToPosition(gameCoords.x, gameCoords.y, 500);
    }
  }

  /**
   * Get the player's current geolocation
   * @returns {Object} - The player's geolocation {latitude, longitude}
   */
  getPlayerGeoLocation() {
    return this.lastGeoPosition || { latitude: 0, longitude: 0 };
  }

  /**
   * Handle player click event (for flag placement)
   * @param {Function} onPlaceFlag - Callback when a flag is placed
   * @returns {boolean} - Whether a flag was placed
   */
  handleClick(onPlaceFlag) {
    if (this.interactions?.handleClick) {
      return this.interactions.handleClick(onPlaceFlag);
    }

    return false;
  }

  /**
   * Get the player sprite
   * @returns {Phaser.GameObjects.GameObject} - The player sprite
   */
  getPlayer() {
    return this.playerManager.getPlayer();
  }

  /**
   * Get the player's current position
   * @returns {Object} - The player's position {x, y}
   */
  getPlayerPosition() {
    return this.playerManager.getPlayerPosition();
  }

  /**
   * Set the player's name
   * @param {string} name - The player's name
   */
  setPlayerName(name) {
    return this.playerManager.setPlayerName(name);
  }

  /**
   * Get the player's name
   * @returns {string} - The player's name
   */
  getPlayerName() {
    return this.playerManager.getPlayerName();
  }

  /**
   * Show damage text above the player (compatibility method)
   * @param {number} amount - The amount of damage
   */
  showDamageText(amount) {
    if (this.interactions?.showDamageEffect) {
      this.interactions.showDamageEffect(amount);
    }
  }

  /**
   * Show heal effect on the player (compatibility method)
   * @param {number} amount - The amount healed
   */
  showHealEffect(amount) {
    if (this.interactions?.showHealEffect) {
      this.interactions.showHealEffect(amount);
    }
  }

  /**
   * Damage the player
   * @param {number} damage - Amount of damage to deal
   * @param {string} source - Source of the damage
   * @returns {number} - Actual damage dealt
   */
  takeDamage(damage, source = "unknown") {
    return this.playerManager.takeDamage(damage, source);
  }

  /**
   * Heal the player
   * @param {number} amount - Amount to heal
   * @param {string} source - Source of healing
   * @returns {number} - Actual amount healed
   */
  heal(amount, source = "potion") {
    return this.playerManager.heal(amount, source);
  }

  /**
   * Apply a status effect to the player
   * @param {string} type - Type of status effect
   * @param {Object} config - Effect configuration
   * @returns {boolean} - Whether effect was applied
   */
  applyStatusEffect(type, config) {
    return this.playerManager.applyStatusEffect(type, config);
  }

  /**
   * Move the player to a specific position
   * @param {number} x - Target x position
   * @param {number} y - Target y position
   * @param {number} duration - Duration of movement in ms
   * @param {Function} onComplete - Callback when movement completes
   */
  movePlayerToPosition(x, y, duration = 0, onComplete = null) {
    this.playerManager.movePlayerToPosition(x, y, duration, onComplete);
  }

  /**
   * Update method to be called in the scene's update loop
   * @param {number} time - Current time
   * @param {number} delta - Time since last update
   */
  update(time, delta) {
    // Update the player manager
    if (this.playerManager?.update) {
      this.playerManager.update(time, delta);
    }

    // Geo-specific updates
    if (this.mapManager) {
      // Only handle keyboard movement if we're not following geo
      if (!this.isFollowingGeo) {
        if (this.playerManager?.handleKeyboardMovement) {
          this.playerManager.handleKeyboardMovement(delta);
        }
      }

      // Periodically check for geo updates (for systems that don't push updates)
      if (time > this.lastGeoUpdateTime + this.geoUpdateInterval) {
        this.lastGeoUpdateTime = time;

        // Request current location from map manager if available
        if (this.mapManager?.getCurrentLocation) {
          const position = this.mapManager.getCurrentLocation();
          if (position) {
            this.handleGeoLocationUpdate(position);
          }
        }
      }
    }
  }

  /**
   * Clean up resources when destroying the system
   */
  destroy() {
    // Clean up event listeners
    this.scene.events.off("player-damage-taken");
    this.scene.events.off("player-healed");

    // Unsubscribe from map manager's location updates
    if (this.mapManager?.offLocationUpdate) {
      this.mapManager.offLocationUpdate();
    }

    // Destroy all subsystems
    if (this.interactions?.destroy) {
      this.interactions.destroy();
    }

    if (this.playerManager?.destroy) {
      this.playerManager.destroy();
    }

    logger.info(LogCategory.PLAYER, "PlayerSystem destroyed");
  }

  /**
   * Show god mode heal effect (compatibility method)
   * @param {number} amount - The amount healed
   */
  showGodModeHealEffect(amount) {
    if (this.interactions?.showGodModeHealEffect) {
      this.interactions.showGodModeHealEffect(amount);
    }
  }

  /**
   * Show dodge effect (compatibility method)
   */
  showDodgeEffect() {
    if (this.interactions?.showDodgeEffect) {
      this.interactions.showDodgeEffect();
    }
  }

  /**
   * Create a health bar (compatibility method)
   * @returns {Object} - Health bar object
   */
  createHealthBar() {
    if (this.interactions?.createHealthBar) {
      return this.interactions.createHealthBar();
    }
    return null;
  }

  /**
   * Update health bar (compatibility method)
   * @param {Object} healthBar - The health bar object
   * @param {number} health - Current health
   * @param {number} maxHealth - Maximum health
   * @param {boolean} forcedVisible - Whether to force visibility
   */
  updateHealthBar(healthBar, health, maxHealth, forcedVisible = false) {
    if (this.interactions?.updateHealthBar) {
      return this.interactions.updateHealthBar(
        healthBar,
        health,
        maxHealth,
        forcedVisible,
      );
    }
  }

  /**
   * Add flag placement effect (compatibility method)
   */
  addFlagPlacementEffect(): void {
    if (this.interactions?.addFlagPlacementEffect) {
      this.interactions.addFlagPlacementEffect();
    }
  }

  /**
   * Toggle god mode (compatibility method)
   * @returns {boolean} - Whether god mode is enabled
   */
  toggleGodMode(): boolean {
    if (this.playerManager?.toggleGodMode) {
      return this.playerManager.toggleGodMode();
    }
    return false;
  }

  /**
   * Handle tree chopping (compatibility method)
   * @param {TreeChopData} data - Tree chopping data
   */
  handleChopTree(data: TreeChopData): void {
    if (this.interactions?.handleChopTree) {
      this.interactions.handleChopTree(data);
    }
  }

  /**
   * Handle fruit gathering (compatibility method)
   * @param {FruitGatherData} data - Fruit gathering data
   */
  handleGatherFruits(data: FruitGatherData): void {
    if (this.interactions?.handleGatherFruits) {
      this.interactions.handleGatherFruits(data);
    }
  }
}

