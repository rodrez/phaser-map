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
    
    // Double-click handling
    this.lastClickTime = 0;
    this.doubleClickDelay = 300; // ms between clicks to count as double-click
    this.isDoubleClickPending = false;
    this.pendingClickTimer = null;
    
    logger.info(LogCategory.PLAYER, 'Geo player manager initialized');
  }
  
  /**
   * Handle player click event
   * @param {Function} onPlaceFlag - Callback when a flag is placed
   * @returns {boolean} - Whether a flag was placed
   */
  handleClick(onPlaceFlag) {
    // If a double-click is pending, don't process this click yet
    if (this.isDoubleClickPending) {
      return false;
    }
    
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - this.lastClickTime;
    
    // Update last click time
    this.lastClickTime = currentTime;
    
    // If this could be part of a double-click, wait before processing it as a single click
    if (timeSinceLastClick < this.doubleClickDelay) {
      // This is a double-click, cancel any pending single click
      if (this.pendingClickTimer) {
        clearTimeout(this.pendingClickTimer);
        this.pendingClickTimer = null;
      }
      this.isDoubleClickPending = false;
      logger.info(LogCategory.PLAYER, 'Double-click detected on player');
      return false;
    }
    
    // Set a timer to handle this as a single click after the double-click delay
    this.isDoubleClickPending = true;
    this.pendingClickTimer = setTimeout(() => {
      this.isDoubleClickPending = false;
      this.pendingClickTimer = null;
      
      // Now process it as an actual single click - place a flag
      const flag = this.interactionManager.handleClick(onPlaceFlag);
      logger.info(LogCategory.PLAYER, `Single click processed: ${flag ? 'Flag placed' : 'No flag placed'}`);
      
      // If we have a UI manager, update the flag counter
      if (flag && this.scene.uiManager) {
        this.scene.uiManager.updateFlagCounter();
        this.scene.uiManager.showMedievalMessage("Flag placed successfully!", "success");
      }
      
      return flag;
    }, this.doubleClickDelay);
    
    return false;
  }
  
  /**
   * Handle double-click movement to a target position
   * @param {Object} data - Data containing target position {x, y}
   * @returns {boolean} - Whether movement was successful
   */
  handleDoubleClickMove(data) {
    if (!data || !this.mapManager) return false;
    
    // Get the target position in lat/lng
    const targetLatLng = this.mapManager.pixelToLatLng(data.x, data.y);
    
    // Check if the position is valid (within boundaries)
    const success = this.mapManager.isPositionValid(targetLatLng.lat, targetLatLng.lng);
    
    if (success) {
      try {
        // Set the target position for player movement
        this.mapManager.setTargetPosition(targetLatLng.lat, targetLatLng.lng);
        
        // Get pixel coordinates for the target position
        const pixelPos = this.mapManager.latLngToPixel(targetLatLng.lat, targetLatLng.lng);
        
        // Move the player to the position
        this.movePlayerToPosition(pixelPos.x, pixelPos.y, 500);
        
        // Set the double-click-handled state in case any objects need to know
        this.scene.registry.set('doubleClickHandled', true);
        
        // Clear the double-click state after a short delay to prevent race conditions
        this.scene.time.delayedCall(350, () => {
          this.scene.registry.set('doubleClickHandled', false);
        });
        
        logger.info(LogCategory.PLAYER, "Moving player to double-clicked position:", targetLatLng);
        return true;
      } catch (error) {
        logger.error(LogCategory.PLAYER, "Error during player movement:", error);
        if (this.scene.uiManager) {
          this.scene.uiManager.showMedievalMessage("Movement error occurred!", "error");
        }
      }
    } else {
      if (this.scene.uiManager) {
        this.scene.uiManager.showMedievalMessage("Cannot move to that location!", "error");
      }
    }
    
    return false;
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
    
    // Setup double-click on game canvas for movement
    this.setupDoubleClickListener();
    
    return player;
  }
  
  /**
   * Set up double-click listener on the game canvas
   */
  setupDoubleClickListener() {
    // Get the canvas element
    const canvas = this.scene.sys.game.canvas;
    
    // Remove any existing listener to prevent duplicates
    if (this.doubleClickListener) {
      canvas.removeEventListener("dblclick", this.doubleClickListener);
    }
    
    // Add a double-click event listener to the canvas for movement
    this.doubleClickListener = (e) => {
      // Get the click position
      const clickX = e.offsetX;
      const clickY = e.offsetY;
      
      logger.info(LogCategory.PLAYER, "Double-click detected at:", clickX, clickY);
      
      // Handle double-click movement
      this.handleDoubleClickMove({
        x: clickX,
        y: clickY,
        source: 'canvas'
      });
      
      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
    };
    
    canvas.addEventListener("dblclick", this.doubleClickListener);
    logger.info(LogCategory.PLAYER, "Double-click listener set up on canvas");
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
    
    // Remove double-click listener
    if (this.doubleClickListener) {
      const canvas = this.scene.sys.game.canvas;
      if (canvas) {
        canvas.removeEventListener("dblclick", this.doubleClickListener);
      }
      this.doubleClickListener = null;
    }
    
    // Clear any pending click timers
    if (this.pendingClickTimer) {
      clearTimeout(this.pendingClickTimer);
      this.pendingClickTimer = null;
    }
    
    // Call parent destroy method
    super.destroy();
  }
} 