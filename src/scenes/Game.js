import { Scene } from "phaser";
import { MapManager } from "../utils/MapManager";
import { PlayerManager } from "../utils/PlayerManager";
import { UIManager } from "../utils/UIManager";
import { FlagManager } from "../utils/FlagManager";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    // Set the scene to be transparent so we can see the map underneath
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

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

    // Initialize UI manager
    this.uiManager = new UIManager(this, this.mapManager);

    // Set up event listeners
    this.setupEventListeners();

    // Add DOM event listeners to handle interactions
    this.setupDOMEventListeners();

    // Log debug info
    console.log("Game scene created");
    console.log("Map:", this.mapManager.getMap());
    console.log("Player:", this.playerManager.getPlayer());
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
        console.log("Player clicked via DOM event");
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

    console.log("Game scene shutdown");
  }
}
