import { Scene } from "phaser";
import { logger, LogCategory } from './Logger';

/**
 * FlagManager class to handle all flag-related functionality
 * This class manages flag generation, placement, and interactions
 */
export class FlagManager {
  /**
   * Constructor for the FlagManager
   * @param {Scene} scene - The Phaser scene this manager belongs to
   * @param {Object} mapManager - The MapManager instance
   */
  constructor(scene, mapManager) {
    this.scene = scene;
    this.mapManager = mapManager;
    
    // Array to store Phaser flag sprites
    this.flagSprites = [];
    
    // Array to store flag hitareas for DOM interaction
    this.flagHitareas = [];
    
    // Set up callbacks for flag interaction
    this.setupFlagCallbacks();

    // Generate initial flag positions
    this.generateFlags();
  }

  /**
   * Set up callbacks for flag interaction with the map
   */
  setupFlagCallbacks() {
    // Override the MapManager's addFlag method to use our Phaser sprites
    this.mapManager.addFlag.bind(this.mapManager);
    
    this.mapManager.addFlag = (lat, lng) => {
      // First check if we can place a flag here using the original logic
      if (!this.mapManager.canPlaceFlag(lat, lng)) {
        return null;
      }
      
      // Add territory circle to the map (keep this part from the original)
      const territoryCircle = L.circle([lat, lng], {
        radius: this.mapManager.config.territoryRadius,
        color: "#FF5252",
        fillColor: "#FF5252",
        fillOpacity: 0.1,
        weight: 1,
        dashArray: "5, 5",
        interactive: false, // Make sure it doesn't interfere with clicks
      }).addTo(this.mapManager.map);
      
      // Create an invisible marker for tracking position (similar to player)
      const flagMarker = L.marker([lat, lng], {
        opacity: 0, // Make it invisible
        zIndexOffset: 500,
      }).addTo(this.mapManager.map);
      
      // Create the flag object to store
      const flag = {
        marker: flagMarker,
        territory: territoryCircle,
        lat: lat,
        lng: lng,
      };
      
      // Store flag in MapManager's arrays
      this.mapManager.flags.push(flag);
      this.mapManager.territories.push(territoryCircle);
      
      // Create the Phaser sprite for this flag
      this.createFlagSprite(flag);
      
      if (this.mapManager.debug) {
        logger.info(LogCategory.FLAG, `Flag added at: ${lat}, ${lng}`);
        logger.info(LogCategory.FLAG, `Total flags: ${this.mapManager.flags.length}`);
      }
      
      return flag;
    };
  }

  /**
   * Create a Phaser sprite for a flag
   * @param {Object} flag - The flag object
   */
  createFlagSprite(flag) {
    // Convert lat/lng to pixel coordinates
    const pixelPos = this.mapManager.latLngToPixel(flag.lat, flag.lng);
    
    let flagSprite;
    
    // Load flag image if it exists in the cache, otherwise create a shape
    if (this.scene.textures.exists('flag_texture')) {
      // Create sprite using the flag texture
      flagSprite = this.scene.add.image(pixelPos.x, pixelPos.y, 'flag_texture');
      flagSprite.setOrigin(0.5, 1); // Set origin to bottom center for flag
      flagSprite.setScale(0.8); // Adjust scale as needed
      
      // Set a high depth to ensure it's above the map but below the player
      flagSprite.setDepth(1500);
      
      // Store reference to the flag object
      flagSprite.flagData = flag;
      
      // Make the sprite interactive
      flagSprite.setInteractive({ useHandCursor: true, draggable: false });
      
      // Add click handler
      flagSprite.on('pointerdown', (pointer) => {
        // Stop event propagation to prevent map drag
        if (pointer.event) {
          pointer.event.stopPropagation();
        }
        
        // Make sure the map is not in a drag state
        if (this.scene.mapManager) {
          this.scene.mapManager.exitDragState();
        }
        
        logger.info(LogCategory.FLAG, `Flag sprite clicked at: ${flag.lat}, ${flag.lng}`);
        this.handleFlagClick(flag);
      });
      
      // Add to our array
      this.flagSprites.push(flagSprite);
      
    } else {
      // Fallback: Create a colored triangle as the flag
      const flagTriangle = this.scene.add.triangle(
        pixelPos.x, 
        pixelPos.y,
        0, 0,      // top point
        -15, 30,   // bottom left
        15, 30,    // bottom right
        0xFF5252,  // color
        1          // alpha
      );
      flagTriangle.setStrokeStyle(2, 0xDD2222);
      
      // Add a pole
      const pole = this.scene.add.rectangle(
        pixelPos.x,
        pixelPos.y + 15,
        3,
        40,
        0x333333
      );
      pole.setDepth(1490);
      
      // Group them together
      const container = this.scene.add.container(pixelPos.x, pixelPos.y);
      container.add([pole, flagTriangle]);
      container.setDepth(1500);
      
      // Set origin to bottom center
      container.setSize(30, 70);
      container.setOrigin(0.5, 1);
      
      // Store reference to the flag object
      container.flagData = flag;
      
      // Make the container interactive
      container.setInteractive(new Phaser.Geom.Rectangle(-15, -40, 30, 70), Phaser.Geom.Rectangle.Contains);
      
      // Add click handler
      container.on('pointerdown', (pointer) => {
        // Stop event propagation to prevent map drag
        if (pointer.event) {
          pointer.event.stopPropagation();
        }
        
        // Make sure the map is not in a drag state
        if (this.scene.mapManager) {
          this.scene.mapManager.exitDragState();
        }
        
        logger.info(LogCategory.FLAG, `Flag container clicked at: ${flag.lat}, ${flag.lng}`);
        this.handleFlagClick(flag);
      });
      
      // Add to our array
      this.flagSprites.push(container);
      
      // Set flagSprite for DOM hitarea creation
      flagSprite = container;
    }
    
    // Create a DOM hitarea for the flag (as a backup interaction method)
    this.createFlagHitarea(flag, flagSprite);
  }
  
  /**
   * Create a DOM hitarea for a flag
   * @param {Object} flag - The flag object
   * @param {Phaser.GameObjects.GameObject} sprite - The flag sprite
   */
  createFlagHitarea(flag, sprite) {
    // Create a div for the flag hitarea
    const hitarea = document.createElement("div");
    hitarea.className = "flag-hitarea";
    hitarea.style.position = "absolute";
    hitarea.style.width = "40px";
    hitarea.style.height = "60px"; // Make hitarea taller to be easier to click
    hitarea.style.transform = "translate(-50%, -100%)"; // Position at the bottom center of the flag
    hitarea.style.cursor = "pointer";
    hitarea.style.zIndex = "30";
    
    // For debugging, uncomment to see the hitarea
    // hitarea.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    
    // Add the hitarea to the game container
    document.getElementById("game-container").appendChild(hitarea);
    
    // Store a reference to the flag and sprite
    hitarea.flagData = flag;
    hitarea.flagSprite = sprite;
    
    // Add a click event listener to the hitarea
    hitarea.addEventListener("click", (e) => {
      logger.info(LogCategory.FLAG, `Flag hitarea clicked at: ${flag.lat}, ${flag.lng}`);
      this.handleFlagClick(flag);
      e.stopPropagation();
    });
    
    // Initial positioning
    const pixelPos = this.mapManager.latLngToPixel(flag.lat, flag.lng);
    hitarea.style.left = `${pixelPos.x}px`;
    hitarea.style.top = `${pixelPos.y}px`;
    
    // Store the hitarea
    this.flagHitareas.push(hitarea);
    
    // Update hitarea position in the update loop
    this.scene.events.on("update", () => {
      if (flag && this.mapManager.map) {
        const updatedPixelPos = this.mapManager.latLngToPixel(flag.lat, flag.lng);
        hitarea.style.left = `${updatedPixelPos.x}px`;
        hitarea.style.top = `${updatedPixelPos.y}px`;
      }
    });
  }
  
  
  /**
   * Handle flag click event
   * @param {Object} flag - The flag object that was clicked
   */
  handleFlagClick(flag) {
    // Validate flag object
    if (!flag || !flag.lat || !flag.lng) {
      logger.error(LogCategory.FLAG, 'Invalid flag object in handleFlagClick');
      return;
    }
    
    logger.info(LogCategory.FLAG, `Handling flag click, jumping to: ${flag.lat}, ${flag.lng}`);
    
    // Jump to the flag using the MapManager's method after a short delay
    // This delay helps the user see the visual feedback
    setTimeout(() => {
      if (this.mapManager && typeof this.mapManager.jumpToFlag === 'function') {
        this.mapManager.jumpToFlag(flag.lat, flag.lng);
      } else {
        logger.error(LogCategory.FLAG, 'MapManager or jumpToFlag method not available');
      }
    }, 100);
    
    // Emit an event that can be listened to by other systems
    if (this.scene && this.scene.events) {
      this.scene.events.emit('flagClicked', flag);
    }
  }
  

  /**
   * Generate flags at random positions
   * @param {number} count - Number of flags to generate
   */
  generateFlags(count = 5) {
    // Get available flag positions
    const positions = this.mapManager.getAvailableFlagPositions(count);

    // Add flags
    for (const position of positions) {
      this.mapManager.addFlag(position.lat, position.lng);
    }
  }

  /**
   * Place a flag at the player's current position
   * @returns {Object|null} - The flag object if successful, null otherwise
   */
  placeFlag() {
    // Try to add a flag at the player's current position
    return this.mapManager.addFlagAtPlayerPosition();
  }

  /**
   * Get the current number of flags
   * @returns {number} - The number of flags
   */
  getFlagCount() {
    return this.mapManager.flags.length;
  }
  
  /**
   * Update flag positions based on map movement
   * This should be called in the scene's update method
   */
  update() {
    // Update all flag sprites to match their map positions
    for (let i = 0; i < this.flagSprites.length; i++) {
      const sprite = this.flagSprites[i];
      const flag = sprite.flagData;
      
      if (flag && this.mapManager.map) {
        const pixelPos = this.mapManager.latLngToPixel(flag.lat, flag.lng);
        
        // Update sprite position
        sprite.x = pixelPos.x;
        sprite.y = pixelPos.y;
        
        // Update shadow if it exists
        if (sprite.shadow) {
          sprite.shadow.x = pixelPos.x;
          sprite.shadow.y = pixelPos.y + 2;
        }
      }
    }
  }
  
  /**
   * Clean up resources when destroying the manager
   */
  destroy() {
    // Remove all flag sprites
    for (const sprite of this.flagSprites) {
      if (sprite.shadow) {
        sprite.shadow.destroy();
      }
      sprite.destroy();
    }
    
    // Remove all hitareas
    for (const hitarea of this.flagHitareas) {
      hitarea.remove();
    }
    
    // Clear arrays
    this.flagSprites = [];
    this.flagHitareas = [];
  }
}

