import { logger, LogCategory } from "./Logger"; 
import { CoordinateCache } from "./CoordinateCache";

/**
 * MapManager class to handle Leaflet map integration
 * This class manages the map, player position, boundary circle, and flags
 */
export class MapManager {
  /**
   * Constructor for the MapManager
   * @param {Object} config - Configuration object
   * @param {number} config.lat - Initial latitude
   * @param {number} config.lng - Initial longitude
   * @param {number} config.zoom - Initial zoom level
   * @param {number} config.boundaryRadius - Radius of the boundary circle in meters
   * @param {number} config.territoryRadius - Radius of the territory circle in meters
   */
  constructor(config) {
    this.config = {
      lat: config.lat || 51.505,
      lng: config.lng || -0.09,
      zoom: config.zoom || 15,
      boundaryRadius: config.boundaryRadius || 600,
      territoryRadius: config.territoryRadius || 500,
    };

    this.map = null;
    this.playerMarker = null; // Leaflet marker (invisible)
    this.playerPosition = { lat: this.config.lat, lng: this.config.lng }; // Current player position
    this.targetPosition = null; // Target position for movement
    this.boundaryCircle = null;
    this.flags = [];
    this.territories = [];
    this.isPlayerMoving = false;
    this.onPlayerClick = null;
    this.onPlayerMove = null;
    this.onPlayerReachTarget = null;
    this.setTargetPositionCallback = null; // Callback for when target position is set

    // Store the center position of the map
    this.mapCenter = { lat: this.config.lat, lng: this.config.lng };

    // Debug flag
    this.debug = false;
    
    // Coordinate cache for optimized position calculations
    this.coordinateCache = null;
  }

  /**
   * Initialize the map
   * @param {string} containerId - ID of the container element
   * @returns {L.Map} - The Leaflet map instance
   */
  initMap(containerId) {
    try {
      // Create map container if it doesn't exist
      let mapDiv = document.getElementById("map");
      if (!mapDiv) {
        mapDiv = document.createElement("div");
        mapDiv.id = "map";
        const container = document.getElementById(containerId);
        if (container) {
          container.appendChild(mapDiv);
        } else {
          logger.error(LogCategory.MAP, `Container with ID '${containerId}' not found`);
          return null;
        }
      }

      // Initialize the map with all controls enabled
      this.map = L.map("map", {
        center: [this.config.lat, this.config.lng],
        zoom: this.config.zoom,
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: false,
        scrollWheelZoom: true,
        boxZoom: false,
        keyboard: false,
        // Set higher drag threshold to prevent accidental drags
        draggingInertia: false,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        // Increase click tolerance to make it easier to click on objects
        tapTolerance: 15,
        // Increase touch tolerance
        touchZoomInertia: false
      });

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.map);

      // Initialize player marker (invisible)
      this.initPlayerMarker();

      // Initialize boundary circle
      this.initBoundaryCircle();
      
      // Initialize coordinate cache
      this.coordinateCache = new CoordinateCache(this);
      
      // Add double-click handler for map to move player
      this.map.on("dblclick", (e) => {
        if (this.debug) {
          logger.info(LogCategory.MAP, "Map double-clicked at:", e.latlng);
          logger.info(LogCategory.MAP, "Current map center:", this.map.getCenter());
          logger.info(LogCategory.MAP, "Current player position:", this.playerPosition);
          logger.info(LogCategory.MAP, "Current boundary center:", this.config);
        }

        // Get the double-click coordinates
        const clickLat = e.latlng.lat;
        const clickLng = e.latlng.lng;

        // Calculate the distance from the boundary center (not the map center)
        const distance = this.map.distance(
          [clickLat, clickLng],
          [this.config.lat, this.config.lng],
        );

        // Only proceed if the double-click is within the boundary circle
        if (distance <= this.config.boundaryRadius) {
          // Set the target position directly to the double-clicked coordinates
          this.setTargetPosition(clickLat, clickLng);

          if (this.debug) {
            logger.info(LogCategory.MAP,
              "Double-click within boundary, setting target to:",
              clickLat,
              clickLng,
            );
            logger.info(LogCategory.MAP, "Distance from boundary center:", distance);
          }
        } else if (this.debug) {
          logger.info(LogCategory.MAP, "Double-click outside boundary, ignoring. Distance:", distance);
        }
      });

      // Add drag handler to keep player and boundary circle fixed
      this.map.on("drag", () => {
        this.updatePlayerPixelPosition();
      });

      this.map.on("dragend", () => {
        this.updatePlayerPixelPosition();
      });
      
      // Add a handler to exit drag state when clicking on game objects
      this.map.on('mousedown', (e) => {
        // Check if the click is directly on the map (not on a game object)
        if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.id === 'map') {
          // This is a direct map click, allow normal behavior
        } else if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.classList.contains('leaflet-container')) {
          // This is a direct map click, allow normal behavior
        } else {
          // This is likely a click on a game object, prevent map drag
          if (this.debug) {
            logger.debug(LogCategory.MAP, 'Preventing map drag for non-map element click');
          }
          // Stop propagation to prevent map drag
          e.originalEvent.stopPropagation();
          // Force exit any existing drag state
          this.exitDragState();
        }
      });

      // Force a resize to ensure proper rendering
      setTimeout(() => {
        this.map.invalidateSize();
        if (this.debug) {
          logger.info(LogCategory.MAP, "Map size invalidated");
        }
      }, 100);

      return this.map;
    } catch (error) {
      logger.error(LogCategory.MAP, `Error initializing map: ${error.message}`);
      return null;
    }
  }

  /**
   * Update the player's pixel position when the map is dragged
   */
  updatePlayerPixelPosition() {
    if (this.onPlayerMove) {
      this.onPlayerMove(this.playerPosition);
    }
  }

  /**
   * Initialize the player marker (invisible on the map)
   */
  initPlayerMarker() {
    try {
      // Create a minimal marker for tracking position on the map
      // This marker will be invisible as we'll use a Phaser sprite for visual representation
      this.playerMarker = L.marker([this.config.lat, this.config.lng], {
        opacity: 0, // Make it invisible
        zIndexOffset: 1000,
      }).addTo(this.map);

      // Store initial position
      this.playerPosition = {
        lat: this.config.lat,
        lng: this.config.lng,
      };

      if (this.debug) {
        logger.info(LogCategory.MAP, "Player marker initialized at:", this.playerPosition);
      }
    } catch (error) {
      logger.error(LogCategory.MAP, "Error initializing player marker:", error);
    }
  }

  /**
   * Set callback for player click
   * @param {Function} callback - Function to call when player is clicked
   */
  setPlayerClickCallback(callback) {
    this.onPlayerClick = callback;
  }

  /**
   * Set callback for player movement
   * @param {Function} callback - Function to call when player moves
   */
  setPlayerMoveCallback(callback) {
    this.onPlayerMove = callback;
  }

  /**
   * Set callback for when player reaches target
   * @param {Function} callback - Function to call when player reaches target
   */
  setPlayerReachTargetCallback(callback) {
    this.onPlayerReachTarget = callback;
  }

  /**
   * Check if a position is valid (within boundaries)
   * @param {number} lat - Target latitude
   * @param {number} lng - Target longitude
   * @returns {boolean} - Whether the position is valid
   */
  isPositionValid(lat, lng) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return false;
    }

    try {
      // Check if within boundary circle
      const distance = this.map.distance(
        [lat, lng],
        [this.config.lat, this.config.lng],
      );
      
      const isValid = distance <= this.config.boundaryRadius;
      
      if (!isValid && this.debug) {
        logger.info(LogCategory.MAP,
          "Position outside boundary:",
          distance,
          ">",
          this.config.boundaryRadius,
        );
      }
      
      return isValid;
    } catch (error) {
      logger.error(LogCategory.MAP, "Error checking position validity:", error);
      return false;
    }
  }

  /**
   * Set the target position for player movement
   * @param {number} lat - Target latitude
   * @param {number} lng - Target longitude
   * @returns {boolean} - Whether the target was set
   */
  setTargetPosition(lat, lng) {
    // Check if the position is valid
    if (!this.isPositionValid(lat, lng)) {
      return false;
    }

    // Set target position
    this.targetPosition = { lat, lng };

    // Call the target position callback if it exists and is a function
    if (this.setTargetPositionCallback && typeof this.setTargetPositionCallback === 'function') {
      try {
        this.setTargetPositionCallback(this.targetPosition);
      } catch (error) {
        // Log the error but don't let it break the movement
        if (this.debug) {
          console.error("Error in target position callback:", error);
        }
      }
    }

    if (this.debug) {
      logger.info(LogCategory.MAP, "Target position set:", this.targetPosition);
    }

    return true;
  }

  /**
   * Update player position (called from Phaser update loop)
   * @param {number} delta - Time delta in milliseconds
   * @returns {boolean} - Whether the player moved
   */
  updatePlayerPosition(delta) {
    if (!this.targetPosition || this.isPlayerMoving || !this.map) {
      return false;
    }

    try {
      // Start moving
      this.isPlayerMoving = true;

      // Calculate movement parameters
      const startPos = this.playerPosition;
      const endPos = this.targetPosition;

      if (this.debug) {
        logger.info(LogCategory.MAP, "Starting player movement from", startPos, "to", endPos);
      }

      const distance = this.map.distance(
        [startPos.lat, startPos.lng],
        [endPos.lat, endPos.lng],
      );

      // Calculate movement duration based on distance
      const moveDuration = Math.min(1000, distance * 2); // 2ms per meter, max 1 second

      if (this.debug) {
        logger.info(LogCategory.MAP, "Movement distance:", distance, "duration:", moveDuration);
      }

      // Animate player movement
      this.animatePlayerMovement(startPos, endPos, moveDuration, () => {
        this.isPlayerMoving = false;
        this.targetPosition = null;

        // Call reach target callback
        if (this.onPlayerReachTarget) {
          this.onPlayerReachTarget(this.playerPosition);
        }
      });

      return true;
    } catch (error) {
      logger.error(LogCategory.MAP, "Error updating player position:", error);
      this.isPlayerMoving = false;
      return false;
    }
  }

  /**
   * Animate player movement from start to end position
   * @param {Object} startPos - Start position {lat, lng}
   * @param {Object} endPos - End position {lat, lng}
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} onComplete - Callback when animation completes
   */
  animatePlayerMovement(startPos, endPos, duration, onComplete) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return;
    }

    try {
      // Calculate the direction of movement
      const direction = {
        lat: endPos.lat - startPos.lat,
        lng: endPos.lng - startPos.lng
      };

      // Determine the primary direction (up, down, left, right)
      let primaryDirection = "down";
      if (Math.abs(direction.lat) > Math.abs(direction.lng)) {
        // Movement is primarily north-south
        primaryDirection = direction.lat < 0 ? "up" : "down";
      } else {
        // Movement is primarily east-west
        primaryDirection = direction.lng < 0 ? "left" : "right";
      }

      // Store the start time
      const startTime = Date.now();

      // Create an animation frame
      const animate = () => {
        // Calculate progress (0 to 1)
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate current position using linear interpolation
        const currentPos = {
          lat: startPos.lat + (endPos.lat - startPos.lat) * progress,
          lng: startPos.lng + (endPos.lng - startPos.lng) * progress,
        };

        // Update player position
        this.playerPosition = currentPos;

        // Update marker position (invisible)
        if (this.playerMarker) {
          this.playerMarker.setLatLng([currentPos.lat, currentPos.lng]);
        }

        // Call player move callback
        if (this.onPlayerMove) {
          this.onPlayerMove(currentPos);
        }

        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete
          if (onComplete) {
            onComplete();
          }
        }
      };

      // Start animation
      animate();
    } catch (error) {
      logger.error(LogCategory.MAP, "Error animating player movement:", error);
      if (onComplete) {
        onComplete();
      }
    }
  }

  /**
   * Initialize the boundary circle
   */
  initBoundaryCircle() {
    try {
      // Add boundary circle to map
      this.boundaryCircle = L.circle([this.config.lat, this.config.lng], {
        radius: this.config.boundaryRadius,
        color: "black",
        fillColor: "rgba(0, 0, 0, 0.05)",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "10, 5",
        interactive: false, // Make sure it doesn't interfere with clicks
      }).addTo(this.map);

      if (this.debug) {
        logger.info(LogCategory.MAP,
          "Boundary circle initialized with radius:",
          this.config.boundaryRadius,
        );
      }
    } catch (error) {
      logger.error(LogCategory.MAP, "Error initializing boundary circle:", error);
    }
  }

  /**
   * Add a flag to the map at the player's current position
   * @returns {Object} - The flag object
   */
  addFlagAtPlayerPosition() {
    return this.addFlag(this.playerPosition.lat, this.playerPosition.lng);
  }

  /**
   * Add a flag to the map
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} - The flag object
   */
  addFlag(lat, lng) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return null;
    }

    try {
      // Check if flag can be placed (not within territory of another flag)
      if (!this.canPlaceFlag(lat, lng)) {
        if (this.debug) {
          logger.info(LogCategory.MAP, "Cannot place flag at:", lat, lng);
        }
        return null;
      }

      // Create a marker for the flag
      const flagMarker = L.divIcon({
        className: 'flag-marker',
        html: '<div style="width: 40px; height: 50px; background-image: url(/svg/flag.svg); background-size: contain; cursor: pointer;"></div>',
        iconSize: [40, 50],
        iconAnchor: [20, 50]
      });

      // Add flag marker to map
      const flagMarkerObj = L.marker([lat, lng], {
        icon: flagMarker,
        zIndexOffset: 500,
        interactive: true, // Make sure it's clickable
        riseOnHover: true, // Rise above other markers on hover
      }).addTo(this.map);

      // Add territory circle
      const territoryCircle = L.circle([lat, lng], {
        radius: this.config.territoryRadius,
        color: "#FF5252",
        fillColor: "#FF5252",
        fillOpacity: 0.1,
        weight: 1,
        dashArray: "5, 5",
        interactive: false, // Make sure it doesn't interfere with clicks
      }).addTo(this.map);

      // Add click handler to flag
      flagMarkerObj.on("click", (e) => {
        if (this.debug) {
          logger.info(LogCategory.MAP, "Flag clicked at:", lat, lng);
        }

        // Jump to flag
        this.jumpToFlag(lat, lng);

        // Stop propagation to prevent map click
        L.DomEvent.stopPropagation(e);
      });

      // Store flag and territory
      const flag = {
        marker: flagMarkerObj,
        territory: territoryCircle,
        lat: lat,
        lng: lng,
      };

      this.flags.push(flag);
      this.territories.push(territoryCircle);

      if (this.debug) {
        logger.info(LogCategory.MAP, "Flag added at:", lat, lng);
        logger.info(LogCategory.MAP, "Total flags:", this.flags.length);
      }

      return flag;
    } catch (error) {
      logger.error(LogCategory.MAP, "Error adding flag:", error);
      return null;
    }
  }

  /**
   * Check if a flag can be placed at the given coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} - Whether the flag can be placed
   */
  canPlaceFlag(lat, lng) {
    if (!this.map) {
      return false;
    }

    try {
      // Check if within boundary circle
      const distance = this.map.distance(
        [lat, lng],
        [this.config.lat, this.config.lng],
      );
      if (distance > this.config.boundaryRadius) {
        return false;
      }

      // Check if within territory of another flag
      for (const flag of this.flags) {
        const flagDistance = this.map.distance(
          [lat, lng],
          [flag.lat, flag.lng],
        );
        if (flagDistance < this.config.territoryRadius) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(LogCategory.MAP, "Error checking if flag can be placed:", error);
      return false;
    }
  }

  /**
   * Jump to a flag's location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  jumpToFlag(lat, lng) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return;
    }

    try {
      if (this.debug) {
        logger.info(LogCategory.MAP, "Starting jump to flag at:", lat, lng);
        logger.info(LogCategory.MAP,
          "Current player position before jump:",
          this.playerPosition,
        );
      }

      // Clear any existing target position to stop any ongoing movement
      this.targetPosition = null;
      this.isPlayerMoving = false;

      // Update config center position
      this.config.lat = lat;
      this.config.lng = lng;

      // Update player position immediately
      this.playerPosition = { lat, lng };

      // Update marker position (invisible)
      if (this.playerMarker) {
        this.playerMarker.setLatLng([lat, lng]);
      }

      // Update boundary circle
      if (this.boundaryCircle) {
        this.boundaryCircle.setLatLng([lat, lng]);
      }

      // Center map on new location with animation
      this.map.flyTo([lat, lng], this.map.getZoom(), {
        duration: 0.5, // Animation duration in seconds
        easeLinearity: 0.5
      });

      // Force an immediate update of the player's visual position
      if (this.onPlayerMove) {
        this.onPlayerMove(this.playerPosition);
      }

      if (this.debug) {
        logger.info(LogCategory.MAP, "Completed jump to flag at:", lat, lng);
        logger.info(LogCategory.MAP, "Player position after jump:", this.playerPosition);
        logger.info(LogCategory.MAP,
          "Player pixel position after jump:",
          this.latLngToPixel(lat, lng),
        );
      }
    } catch (error) {
      logger.error(LogCategory.MAP, "Error jumping to flag:", error);
    }
  }

  /**
   * Get available flag positions within the boundary circle
   * @param {number} count - Number of positions to generate
   * @returns {Array} - Array of available positions
   */
  getAvailableFlagPositions(count = 5) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return [];
    }

    try {
      const positions = [];
      const attempts = count * 10; // Try more times than needed to ensure we get enough positions

      for (let i = 0; i < attempts && positions.length < count; i++) {
        // Generate random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.config.boundaryRadius * 0.8; // 80% of boundary radius

        // Calculate position
        const lat = this.config.lat + (distance / 111320) * Math.cos(angle);
        const lng =
          this.config.lng +
          (distance / (111320 * Math.cos(this.config.lat * (Math.PI / 180)))) *
            Math.sin(angle);

        // Check if position is valid
        if (this.canPlaceFlag(lat, lng)) {
          positions.push({ lat, lng });
        }
      }

      if (this.debug) {
        logger.info(LogCategory.MAP, "Generated flag positions:", positions.length);
      }

      return positions;
    } catch (error) {
      logger.error(LogCategory.MAP, "Error getting available flag positions:", error);
      return [];
    }
  }

  /**
   * Convert latitude/longitude to pixel coordinates
   * This method is optimized to use the coordinate cache when possible
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} - Pixel coordinates {x, y}
   */
  latLngToPixel(lat, lng) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return { x: 0, y: 0 };
    }

    try {
      const point = this.map.latLngToContainerPoint(L.latLng(lat, lng));
      return {
        x: point.x,
        y: point.y,
      };
    } catch (error) {
      logger.error(LogCategory.MAP, "Error converting lat/lng to pixel:", error);
      return { x: 0, y: 0 };
    }
  }

  /**
   * Convert pixel coordinates to latitude/longitude
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - Latitude/longitude {lat, lng}
   */
  pixelToLatLng(x, y) {
    if (!this.map) {
      logger.warn(LogCategory.MAP, "Map not initialized");
      return { lat: this.config.lat, lng: this.config.lng };
    }

    try {
      const latLng = this.map.containerPointToLatLng(L.point(x, y));
      return {
        lat: latLng.lat,
        lng: latLng.lng,
      };
    } catch (error) {
      logger.error(LogCategory.MAP, "Error converting pixel to lat/lng:", error);
      return { lat: this.config.lat, lng: this.config.lng };
    }
  }

  /**
   * Get the current player position
   * @returns {Object} - The current player position {lat, lng}
   */
  getPlayerPosition() {
    return this.playerPosition;
  }

  /**
   * Get the current player pixel position
   * @returns {Object} - The current player pixel position {x, y}
   */
  getPlayerPixelPosition() {
    return this.latLngToPixel(this.playerPosition.lat, this.playerPosition.lng);
  }

  /**
   * Get the current map center
   * @returns {Object} - The current map center
   */
  getCenter() {
    return {
      lat: this.config.lat,
      lng: this.config.lng,
    };
  }

  /**
   * Get the current map instance
   * @returns {L.Map} - The Leaflet map instance
   */
  getMap() {
    return this.map;
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug mode should be enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
    if (enabled) {
      logger.info(LogCategory.MAP, "Debug mode enabled");
    }
  }

  /**
   * Get the coordinate cache instance
   * @returns {CoordinateCache} - The coordinate cache instance
   */
  getCoordinateCache() {
    return this.coordinateCache;
  }

  /**
   * Clean up resources when the map manager is destroyed
   */
  destroy() {
    // Clean up coordinate cache
    if (this.coordinateCache) {
      this.coordinateCache.destroy();
      this.coordinateCache = null;
    }
    
    // Clean up drag listeners
    this.cleanupDragListeners();
    
    // Remove map event listeners
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
    
    // Clear flags and territories
    this.flags = [];
    this.territories = [];
    
    logger.info(LogCategory.MAP, "Map manager destroyed");
  }

  /**
   * Calculate a destination point given a starting point, bearing and distance
   * @param {L.LatLng|Object} latlng - Starting point (either L.LatLng or {lat, lng})
   * @param {number} bearing - Bearing in radians (0 = north, Math.PI/2 = east, etc.)
   * @param {number} distance - Distance in meters
   * @returns {L.LatLng} - Destination point
   */
  destinationPoint(latlng, bearing, distance) {
    // Convert latlng to L.LatLng if it's not already
    const startLatLng = latlng instanceof L.LatLng ? latlng : L.latLng(latlng.lat, latlng.lng);
    
    // Earth's radius in meters
    const R = 6371000;
    
    // Angular distance in radians
    const angularDistance = distance / R;
    
    // Convert bearing to radians if needed
    const bearingRad = bearing;
    
    // Convert lat/lng to radians
    const lat1 = startLatLng.lat * Math.PI / 180;
    const lng1 = startLatLng.lng * Math.PI / 180;
    
    // Calculate destination point
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    // Convert back to degrees
    return L.latLng(
      lat2 * 180 / Math.PI,
      lng2 * 180 / Math.PI
    );
  }

  /**
   * Force exit the map drag state
   * This can be called when interactions with game objects cause the map to get stuck in a drag state
   */
  exitDragState() {
    if (!this.map) return;
    
    try {
      // Simulate a mouseup event to exit drag state
      const mapContainer = this.map.getContainer();
      if (mapContainer) {
        // Create and dispatch a mouseup event
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        mapContainer.dispatchEvent(mouseUpEvent);
        
        // Also dispatch a dragend event directly to the map
        if (this.map._dragState) {
          this.map.fire('dragend');
        }
        
        if (this.debug) {
          logger.debug(LogCategory.MAP, 'Forced exit of map drag state');
        }
      }
    } catch (error) {
      logger.error(LogCategory.MAP, `Error exiting drag state: ${error.message}`);
    }
  }

  /**
   * Setup map drag
   * This function sets up or refreshes the map drag functionality
   */
  setupMapDrag() {
    if (!this.map) {
      logger.error(LogCategory.MAP, "Cannot setup map drag: map not initialized");
      return;
    }
    
    try {
      // Step 1: First clean up any existing listeners to prevent duplicates
      this.cleanupDragListeners();
      
      // Step 2: Make sure dragging is enabled on the Leaflet map
      if (this.map.dragging && !this.map.dragging.enabled()) {
        this.map.dragging.enable();
        logger.debug(LogCategory.MAP, "Map dragging enabled");
      }
      
      // Step 3: Reset any internal state
      this.isDragging = false;
      
      // Step 4: Set up click handlers on the map div with a clean slate
      const mapDiv = document.getElementById("map");
      if (!mapDiv) {
        logger.error(LogCategory.MAP, "Map div not found");
        return;
      }
      
      // Store references to the bound event handlers so we can remove them later
      this.mapMouseDownHandler = (e) => {
        // Only consider it a drag if it's a left click on the basic map tile, not an object
        if (e.button === 0 && 
            (e.target.classList.contains('leaflet-tile') || 
             e.target.classList.contains('leaflet-container'))) {
          this.isDragging = true;
          if (this.debug) {
            logger.debug(LogCategory.MAP, "Map drag started");
          }
        } else {
          // Click on a game object, not the map itself
          if (this.debug) {
            logger.debug(LogCategory.MAP, "Click on non-map element - not starting drag");
          }
        }
      };
      
      this.mapMouseUpHandler = () => {
        if (this.isDragging) {
          this.isDragging = false;
          if (this.debug) {
            logger.debug(LogCategory.MAP, "Map drag ended");
          }
        }
      };
      
      this.mapClickHandler = (e) => {
        // We should only handle the click if it's on the base map, not on a sprite
        if (!e.target.classList.contains('leaflet-tile')) {
          if (this.debug) {
            logger.debug(LogCategory.MAP, "Click was on an overlay element, not handling");
          }
        }
      };
      
      // Add the event listeners
      mapDiv.addEventListener("mousedown", this.mapMouseDownHandler);
      mapDiv.addEventListener("mouseup", this.mapMouseUpHandler);
      mapDiv.addEventListener("click", this.mapClickHandler);
      
      // Add touch event handlers for mobile
      mapDiv.addEventListener("touchstart", this.mapMouseDownHandler);
      mapDiv.addEventListener("touchend", this.mapMouseUpHandler);
      
      // Add a global mouseup handler to catch mouseup events outside the map
      // This prevents the map from getting stuck in a dragging state
      document.addEventListener("mouseup", this.mapMouseUpHandler);
      
      // Handle map container visibility changes (like when returning from dungeon)
      // This helps reset drag state when the map becomes visible again
      if (typeof MutationObserver !== 'undefined') {
        if (this.mapVisibilityObserver) {
          this.mapVisibilityObserver.disconnect();
        }
        
        this.mapVisibilityObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'style' && 
                !mutation.target.style.display) {
              // Map became visible again, reset drag state
              this.isDragging = false;
              this.exitDragState();
            }
          });
        });
        
        this.mapVisibilityObserver.observe(mapDiv, { 
          attributes: true, 
          attributeFilter: ['style'] 
        });
      }
      
      logger.info(LogCategory.MAP, "Map drag setup completed successfully");
    } catch (error) {
      logger.error(LogCategory.MAP, `Error setting up map drag: ${error.message}`);
    }
  }
  
  /**
   * Clean up map drag event listeners
   * This prevents duplicate listeners when re-initializing
   */
  cleanupDragListeners() {
    try {
      const mapDiv = document.getElementById("map");
      if (!mapDiv) return;
      
      // Remove existing event listeners if they exist
      if (this.mapMouseDownHandler) {
        mapDiv.removeEventListener("mousedown", this.mapMouseDownHandler);
        mapDiv.removeEventListener("touchstart", this.mapMouseDownHandler);
      }
      
      if (this.mapMouseUpHandler) {
        mapDiv.removeEventListener("mouseup", this.mapMouseUpHandler);
        mapDiv.removeEventListener("touchend", this.mapMouseUpHandler);
        document.removeEventListener("mouseup", this.mapMouseUpHandler);
      }
      
      if (this.mapClickHandler) {
        mapDiv.removeEventListener("click", this.mapClickHandler);
      }
      
      // Clear listener references
      this.mapMouseDownHandler = null;
      this.mapMouseUpHandler = null;
      this.mapClickHandler = null;
      
      // Stop observing map visibility changes
      if (this.mapVisibilityObserver) {
        this.mapVisibilityObserver.disconnect();
        this.mapVisibilityObserver = null;
      }
      
      logger.debug(LogCategory.MAP, "Map drag listeners cleaned up");
    } catch (error) {
      logger.error(LogCategory.MAP, `Error cleaning up map drag listeners: ${error.message}`);
    }
  }
}
