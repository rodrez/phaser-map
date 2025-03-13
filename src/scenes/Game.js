import { Scene } from "phaser";
import { MapManager } from "../utils/MapManager";
import { PlayerManager } from "../utils/PlayerManager";
import { UIManager } from "../utils/UIManager";
import { FlagManager } from "../utils/FlagManager";
import { Environment } from "../environment";
import { PopupSystem } from "../ui/popup";
import { logger, LogCategory } from "../utils/Logger";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    // Set the scene to be transparent so we can see the map underneath
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0.1)");

    // Initialize map manager with default location (London)
    this.mapManager = new MapManager({
      lat: 51.505,
      lng: -0.09,
      zoom: 16,
      boundaryRadius: 600,
      territoryRadius: 500,
    });

    // Initialize map
    this.mapManager.initMap("game-container");

    // Enable debug mode for more verbose logging
    this.mapManager.setDebug(true);

    // Initialize player manager
    this.playerManager = new PlayerManager(this, this.mapManager);
    
    // Register the player in the scene registry for other systems to access
    this.registry.set('player', this.playerManager.getPlayer());

    // Initialize flag manager
    this.flagManager = new FlagManager(this, this.mapManager);

    // Initialize player stats
    this.playerStats = {
      health: 100,
      maxHealth: 100,
      xp: 0,
      xpToNextLevel: 100,
      gold: 0,
      level: 1
    };

    // Initialize popup system
    this.popupSystem = new PopupSystem(this, this.mapManager);

    // Initialize environment system
    this.environment = new Environment(this);
    
    // Connect environment with popup system
    this.environment.setPopupSystem(this.popupSystem);

    // Initialize UI manager
    this.uiManager = new UIManager(this, this.mapManager);

    // Set up event listeners
    this.setupEventListeners();

    // Add DOM event listeners to handle interactions
    this.setupDOMEventListeners();

    // Generate environment elements around the player
    const player = this.playerManager.getPlayer();
    this.environment.generateEnvironment(player.x, player.y, 300);

    // Log debug info
    logger.info(LogCategory.GAME, "Game scene created");
    logger.info(LogCategory.GAME, "Map:", this.mapManager.getMap());
    logger.info(LogCategory.GAME, "Player:", this.playerManager.getPlayer());
    logger.info(LogCategory.GAME, "Environment initialized");
  }

  setupEventListeners() {
    // Listen for placeFlag event from UI
    this.events.on("placeFlag", () => {
      this.handlePlayerClick();
    });
    
    // Listen for double-click-move event from interactive objects
    this.events.on("double-click-move", (data) => {
      this.handleDoubleClickMove(data);
    });
    
    // Listen for add-item-to-inventory event
    this.events.on("add-item-to-inventory", (data) => {
      this.handleAddItemToInventory(data);
    });
  }

  setupDOMEventListeners() {
    // Get the canvas element
    const canvas = this.sys.game.canvas;

    // Add a click event listener to the canvas
    this.canvasClickListener = (e) => {
      // Check if the click is on the player
      const player = this.playerManager.getPlayer();
      const bounds = player.getBounds();
      const clickX = e.offsetX;
      const clickY = e.offsetY;

      if (
        clickX >= bounds.left &&
        clickX <= bounds.right &&
        clickY >= bounds.top &&
        clickY <= bounds.bottom
      ) {
        logger.info(LogCategory.GAME, "Player clicked via DOM event");
        this.handlePlayerClick();
        e.stopPropagation();
      }
    };

    canvas.addEventListener("click", this.canvasClickListener);
    
    // Add a double-click event listener to the canvas for movement
    this.canvasDoubleClickListener = (e) => {
      // Get the click position
      const clickX = e.offsetX;
      const clickY = e.offsetY;
      
      logger.info(LogCategory.GAME, "Double-click detected at:", clickX, clickY);
      
      // Handle double-click movement
      this.handleDoubleClickMove({
        x: clickX,
        y: clickY
      });
      
      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
    };
    
    canvas.addEventListener("dblclick", this.canvasDoubleClickListener);

    // Add a class to the canvas for CSS targeting
    canvas.classList.add("game-canvas");
  }

  handlePlayerClick() {
    // Try to place a flag using the player manager
    const flag = this.playerManager.handleClick();

    if (flag) {
      // Update flag counter
      this.uiManager.updateFlagCounter();

      // Show success message
      this.uiManager.showMedievalMessage("Flag placed successfully!", "success");
    } else {
      // Show error message
      this.uiManager.showMedievalMessage("Cannot place flag here!", "error");
    }
  }

  /**
   * Handle double-click movement to a target position
   * @param {Object} data - Data containing target position
   */
  handleDoubleClickMove(data) {
    if (!data || !this.mapManager) return;
    
    // Get the target position in lat/lng
    const targetLatLng = this.mapManager.pixelToLatLng(data.x, data.y);
    
    // Set the target position for player movement
    const success = this.mapManager.setTargetPosition(targetLatLng.lat, targetLatLng.lng);
    
    if (success) {
      // Play movement animation
      const player = this.playerManager.getPlayer();
      if (player) {
        player.play("player-move");
        
        // Determine direction for flipping the sprite
        if (data.x > player.x) {
          player.setFlipX(false);
        } else {
          player.setFlipX(true);
        }
      }
      
      logger.info(LogCategory.GAME, "Moving player to double-clicked position:", targetLatLng);
    } else {
      this.uiManager.showMedievalMessage("Cannot move to that location!", "error");
    }
  }

  /**
   * Handle adding an item to the inventory
   * @param {Object} data - Data containing itemId and quantity
   */
  handleAddItemToInventory(data) {
    if (!data || !data.itemId || !data.quantity) return;
    
    // Log the item being added
    logger.info(LogCategory.INVENTORY, `Adding ${data.quantity}x ${data.itemId} to inventory`);
    
    // Here you would update the player's inventory
    // For now, we'll just show a message
    this.uiManager.showMedievalMessage(`Thou hast acquired ${data.quantity}x ${data.itemId}!`, "success");
    
    // Update any UI elements that show inventory
    // For example, update menu badges
    if (this.uiManager) {
      // Increment the new items counter
      this.playerStats.newItems = (this.playerStats.newItems || 0) + 1;
      // Update the inventory badge
      this.uiManager.updateMenuBadge('inventory', this.playerStats.newItems);
    }
  }

  update(time, delta) {
    // Update player position
    if (this.playerManager) {
      this.playerManager.update(delta);
      
      // Ensure the player reference in the registry is up to date
      this.registry.set('player', this.playerManager.getPlayer());
    }
    
    // Update flag positions
    if (this.flagManager) {
      this.flagManager.update();
    }
    
    // Update UI
    if (this.uiManager) {
      this.uiManager.update();
    }
    
    // Update environment and check for healing auras
    if (this.environment && this.playerManager) {
      const player = this.playerManager.getPlayer();
      // Check if player is in any healing aura and apply effects
      const isInHealingAura = this.environment.checkHealingAuras(player, this.playerStats, this);
      
      // Track player's healing aura state to emit events when it changes
      if (isInHealingAura && !this.playerInHealingAura) {
        this.playerInHealingAura = true;
        this.events.emit('player-in-healing-aura');
      } else if (!isInHealingAura && this.playerInHealingAura) {
        this.playerInHealingAura = false;
        this.events.emit('player-left-healing-aura');
      }
    }
    
    // Ensure the map is properly invalidated to handle any size changes
    this.mapManager?.getMap()?.invalidateSize();
  }

  shutdown() {
    // Clean up event listeners
    const canvas = this.sys.game.canvas;
    if (canvas && this.canvasClickListener) {
      canvas.removeEventListener("click", this.canvasClickListener);
    }
    
    // Clean up double-click event listener
    if (canvas && this.canvasDoubleClickListener) {
      canvas.removeEventListener("dblclick", this.canvasDoubleClickListener);
    }
    
    // Clean up custom event listeners
    this.events.off("double-click-move");
    this.events.off("add-item-to-inventory");

    // Clean up managers
    if (this.playerManager) {
      this.playerManager.destroy();
    }

    if (this.uiManager) {
      this.uiManager.destroy();
    }
    
    if (this.flagManager) {
      this.flagManager.destroy();
    }
    
    if (this.environment) {
      this.environment.destroy();
    }
    
    if (this.popupSystem) {
      this.popupSystem.destroy();
    }

    logger.info(LogCategory.GAME, "Game scene shutdown");
  }
}
