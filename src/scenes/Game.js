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
      this.uiManager.showMessage("Flag placed successfully!", "#4CAF50");
    } else {
      // Show error message
      this.uiManager.showMessage("Cannot place flag here!", "#FF5252");
    }
  }

  update(time, delta) {
    // Update player position
    if (this.playerManager) {
      this.playerManager.update(delta);
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
