import { logger, LogCategory } from '../Logger';
import { PlayerManager } from './PlayerManager';
import { PlayerInteractionManager } from './PlayerInteractionManager';

/**
 * GeoPlayerManager - Handles player movement based on geolocation
 * Extends the base PlayerManager with geo-specific features
 */
export class GeoPlayerManager extends PlayerManager {
  /**
   * Constructor for the GeoPlayerManager
   * @param {Object} scene - The game scene
   * @param {Object} mapManager - The map manager for geolocation
   */
  constructor(scene, mapManager) {
    // Call the parent constructor
    super(scene);
    
    // Store map manager reference
    this.mapManager = mapManager;
    
    // Create interaction manager but pass false to prevent auto-creating a player
    // This fixes the duplicate player issue
    this.interactionManager = new PlayerInteractionManager(scene, mapManager, false);
    
    // Geo-specific properties
    this.lastGeoPosition = null;
    this.isFollowingGeo = true;
    this.geoUpdateInterval = 1000; // ms between geo updates
    this.lastGeoUpdateTime = 0;
    
    logger.info(LogCategory.PLAYER, 'Geo player manager initialized');
  }
  
  /**
   * Handle player click event
   * @param {Function} onPlaceFlag - Callback when a flag is placed
   */
  handleClick(onPlaceFlag) {
    return this.interactionManager.handleClick(onPlaceFlag);
  }
  
  /**
   * Setup the player with geo-specific properties
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {string} spriteKey - The key for the player sprite
   * @returns {Object} - The player sprite
   */
  setupPlayer(x = 400, y = 300, spriteKey = 'player') {
    // Call the parent setupPlayer method
    const player = super.setupPlayer(x, y, spriteKey);
    
    // Connect the player to the interaction manager
    if (this.interactionManager) {
      this.interactionManager.player = player;
      logger.info(LogCategory.PLAYER, "Connected player to interaction manager");
    }
    
    // Set up geo-specific features
    this.setupGeoLocationTracking();
    
    return player;
  }
  
  /**
   * Setup geolocation tracking
   */
  setupGeoLocationTracking() {
    // Subscribe to map manager's location updates
    if (this.mapManager && this.mapManager.onLocationUpdate) {
      this.mapManager.onLocationUpdate((position) => {
        this.handleGeoLocationUpdate(position);
      });
      
      logger.info(LogCategory.PLAYER, 'Subscribed to geolocation updates');
    } else {
      logger.warn(LogCategory.PLAYER, 'Map manager not available for geolocation tracking');
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
    if (this.isFollowingGeo && this.player) {
      // Convert geo coordinates to game coordinates
      const gameCoords = this.mapManager.geoToGameCoordinates(
        position.latitude,
        position.longitude
      );
      
      // Move the player to the new position
      this.movePlayerToPosition(gameCoords.x, gameCoords.y, 500);
      
      logger.info(LogCategory.PLAYER, `Player moved to geo position: (${gameCoords.x}, ${gameCoords.y})`);
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
    if (follow && this.lastGeoPosition && this.player) {
      const gameCoords = this.mapManager.geoToGameCoordinates(
        this.lastGeoPosition.latitude,
        this.lastGeoPosition.longitude
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
   * Update method called every frame
   * @param {number} time - Current time
   * @param {number} delta - Time since last update
   */
  update(time, delta) {
    // Call parent update for status effects
    super.update(time, delta);
    
    // Update interaction manager
    if (this.interactionManager) {
      this.interactionManager.update(delta);
    }
    
    // Only handle keyboard movement if we're not following geo
    if (!this.isFollowingGeo) {
      this.handleKeyboardMovement(delta);
    }
    
    // Periodically check for geo updates (for systems that don't push updates)
    if (time > this.lastGeoUpdateTime + this.geoUpdateInterval) {
      this.lastGeoUpdateTime = time;
      
      // Request current location from map manager if available
      if (this.mapManager && this.mapManager.getCurrentLocation) {
        const position = this.mapManager.getCurrentLocation();
        if (position) {
          this.handleGeoLocationUpdate(position);
        }
      }
    }
  }
  
  /**
   * Clean up resources when the manager is destroyed
   */
  destroy() {
    // Unsubscribe from map manager's location updates
    if (this.mapManager && this.mapManager.offLocationUpdate) {
      this.mapManager.offLocationUpdate();
    }
    
    // Destroy interaction manager
    if (this.interactionManager) {
      this.interactionManager.destroy();
    }
    
    // Call parent destroy method
    super.destroy();
  }
} 