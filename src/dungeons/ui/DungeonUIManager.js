import { logger, LogCategory } from "../../utils/Logger";

/**
 * DungeonUIManager - Handles all dungeon UI elements
 */
export class DungeonUIManager {
  /**
   * Constructor for the DungeonUIManager
   * @param {Object} scene - The dungeon scene
   * @param {Object} options - Configuration options
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.uiElements = new Map();
    this.popups = [];

    // Reference to the player stats for UI updates
    this.playerStats = scene.playerStats;

    // Monster counter for all rooms
    this.monsterCount = 0;
    this.isBossRoom = false;

    // Track monsters with a Map for more reliable tracking
    this.monstersInRoom = new Map();

    // Track rooms and their monsters
    this.rooms = new Map();
    this.currentRoomId = null;

    // Flag to track if the exit portal has been activated
    this.portalActivated = false;

    logger.info(LogCategory.DUNGEON, "Dungeon UI manager initialized");
  }

  /**
   * Initialize the UI
   */
  initialize() {
    // Create dungeon info display
    this.createDungeonInfoDisplay();

    // Create player health display
    this.createPlayerHealthDisplay();

    // Create exit button
    this.createExitButton();

    // Listen for monster defeated events
    this.scene.events.on("monsterDefeated", this.handleMonsterDefeated, this);

    // Add update listener to ensure monster counter stays updated
    this.scene.events.on("update", this.onUpdate, this);

    logger.info(LogCategory.DUNGEON, "Dungeon UI initialized");
  }

  /**
   * Create a dungeon info display
   */
  createDungeonInfoDisplay() {
    const dungeonInfoText = this.scene.add
      .text(
        10,
        10,
        `${this.scene.currentDungeon.name} - Level ${this.scene.currentLevel}`,
        {
          fontFamily: "Cinzel, serif",
          fontSize: "18px",
          color: "#f0d6a8",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setScrollFactor(0);

    this.uiElements.set("dungeonInfoText", dungeonInfoText);
  }

  /**
   * Create a player health display
   */
  createPlayerHealthDisplay() {
    const healthText = this.scene.add
      .text(
        10,
        40,
        `Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`,
        {
          fontFamily: "Cinzel, serif",
          fontSize: "16px",
          color: "#ff6666",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setScrollFactor(0);

    this.uiElements.set("healthText", healthText);

    // Update the health display in the update loop
    this.scene.events.on("update", this.updateHealthDisplay, this);
  }

  /**
   * Update the health display
   */
  updateHealthDisplay() {
    const healthText = this.uiElements.get("healthText");
    if (healthText) {
      healthText.setText(
        `Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`,
      );
    }
  }

  /**
   * Create an exit button
   */
  createExitButton() {
    const exitButton = this.scene.add
      .image(this.scene.cameras.main.width - 50, 50, "dungeon-exit")
      .setInteractive()
      .setScrollFactor(0);

    exitButton.on("pointerdown", () => {
      this.showExitConfirmation();
    });

    this.uiElements.set("exitButton", exitButton);
  }

  /**
   * Show exit confirmation dialog
   */
  showExitConfirmation() {
    // Create confirmation content
    const html = `
      <div class="dungeon-exit-popup">
        <h2>Exit Dungeon</h2>
        <p>Are you sure you want to exit the dungeon?</p>
        <div class="dungeon-popup-buttons">
          <button id="confirm-exit-btn" class="medieval-button">Exit Dungeon</button>
          <button id="cancel-exit-btn" class="medieval-button">Cancel</button>
        </div>
      </div>
    `;

    // Create popup content object
    const content = {
      html: html,
      buttons: [
        {
          selector: "#confirm-exit-btn",
          onClick: () => {
            this.scene.exitDungeon();
            this.closeAllPopups();
          },
        },
        {
          selector: "#cancel-exit-btn",
          onClick: () => {
            this.closeAllPopups();
          },
        },
      ],
    };

    // Show popup
    this.showCustomPopup(content, {
      className: "medieval-popup",
      width: 400,
      centered: true,
    });
  }

  /**
   * Show a custom popup
   * @param {Object} content - The popup content
   * @param {Object} options - Popup options
   */
  showCustomPopup(content, options = {}) {
    // If we have a popup system, use it
    if (this.scene.popupSystem) {
      this.scene.popupSystem.createCenteredPopup(content, options);
    } else {
      logger.warn(LogCategory.DUNGEON, "Popup system not available");
    }
  }

  /**
   * Close all popups
   */
  closeAllPopups() {
    if (this.scene.popupSystem) {
      this.scene.popupSystem.closeAllPopups();
    }
  }

  /**
   * Show a medieval-styled message
   * @param {string} message - The message to show
   * @param {string} type - The type of message (info, success, warning, error, question)
   * @param {number} duration - How long to show the message (0 for indefinite)
   * @param {Array} buttons - Optional array of button objects {text, callback}
   */
  showMedievalMessage(message, type = "info", duration = 3000, buttons = null) {
    // Create a container for the message
    const container = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      100,
    );
    container.setDepth(1000);

    // Create a background for the message
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(-200, -50, 400, buttons ? 150 : 100, 10);
    background.lineStyle(2, this.getMessageColor(type), 1);
    background.strokeRoundedRect(-200, -50, 400, buttons ? 150 : 100, 10);

    // Create the message text
    const text = this.scene.add.text(0, 0, message, {
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
      fontSize: "18px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 380 },
    });
    text.setOrigin(0.5);

    // Add the background and text to the container
    container.add(background);
    container.add(text);

    // Add buttons if provided
    if (buttons && buttons.length > 0) {
      const buttonWidth = 120;
      const buttonHeight = 40;
      const buttonSpacing = 20;
      const totalButtonWidth =
        buttons.length * buttonWidth + (buttons.length - 1) * buttonSpacing;
      const startX = -(totalButtonWidth / 2) + buttonWidth / 2;

      buttons.forEach((buttonData, index) => {
        const x = startX + index * (buttonWidth + buttonSpacing);
        const y = 40;

        // Create button background
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(0x333333, 0.8);
        buttonBg.fillRoundedRect(
          x - buttonWidth / 2,
          y - buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          5,
        );
        buttonBg.lineStyle(2, 0xffffff, 0.8);
        buttonBg.strokeRoundedRect(
          x - buttonWidth / 2,
          y - buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          5,
        );

        // Create button text
        const buttonText = this.scene.add.text(x, y, buttonData.text, {
          fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
          fontSize: "16px",
          color: "#ffffff",
          align: "center",
        });
        buttonText.setOrigin(0.5);

        // Create interactive button zone
        const buttonZone = this.scene.add
          .zone(x, y, buttonWidth, buttonHeight)
          .setInteractive();

        // Add hover effects
        buttonZone.on("pointerover", () => {
          buttonBg.clear();
          buttonBg.fillStyle(0x555555, 0.8);
          buttonBg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            5,
          );
          buttonBg.lineStyle(2, 0xffffff, 1);
          buttonBg.strokeRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            5,
          );
        });

        buttonZone.on("pointerout", () => {
          buttonBg.clear();
          buttonBg.fillStyle(0x333333, 0.8);
          buttonBg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            5,
          );
          buttonBg.lineStyle(2, 0xffffff, 0.8);
          buttonBg.strokeRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            5,
          );
        });

        // Add click handler
        buttonZone.on("pointerdown", () => {
          if (buttonData.callback) {
            buttonData.callback();
          }
          container.destroy();
        });

        // Add button elements to container
        container.add(buttonBg);
        container.add(buttonText);
        container.add(buttonZone);
      });
    }

    // Add the message to the UI elements
    this.uiElements.set(`message-${Date.now()}`, container);

    // Add entrance animation
    container.setAlpha(0);
    container.y = 50;
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      y: 100,
      duration: 300,
      ease: "Power2",
    });

    // Auto-remove after duration (if not indefinite)
    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => {
        // Add exit animation
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          y: 50,
          duration: 300,
          ease: "Power2",
          onComplete: () => {
            container.destroy();
            this.uiElements.delete(`message-${Date.now()}`);
          },
        });
      });
    }

    return container;
  }

  /**
   * Get the color for a message type
   * @param {string} type - The type of message
   * @returns {number} - The color as a hex value
   */
  getMessageColor(type) {
    switch (type) {
      case "success":
        return 0x00ff00;
      case "warning":
        return 0xffaa00;
      case "error":
        return 0xff0000;
      case "question":
        return 0x00aaff;
      case "info":
      default:
        return 0xffffff;
    }
  }

  /**
   * Check if a click is on a UI element
   * @param {Object} pointer - The pointer object
   * @returns {boolean} - Whether the click is on a UI element
   */
  isClickOnUI(pointer) {
    // Check each UI element
    for (const element of this.uiElements.values()) {
      if (
        element.getBounds &&
        element.getBounds().contains(pointer.x, pointer.y)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Show the exit portal
   * @param {Object} position - The position to show the portal
   * @param {boolean} isActive - Whether the portal is active (default: true)
   * @returns {Object} The created portal sprite
   */
  showExitPortal(position, isActive = true) {
    // If we have a portal activation state, use it instead of the provided isActive
    if (this.currentRoomId && this.rooms.has(this.currentRoomId)) {
      const room = this.rooms.get(this.currentRoomId);
      if (room.isBossRoom) {
        // In boss rooms, the portal is only active if all monsters are defeated
        isActive = this.portalActivated;

        // If there are still monsters and the portal isn't activated, don't show it at all
        if (room.monsters.size > 0 && !this.portalActivated) {
          logger.info(
            LogCategory.DUNGEON,
            `Not showing exit portal in boss room with ${room.monsters.size} monsters remaining`,
          );
          return null;
        }

        logger.info(
          LogCategory.DUNGEON,
          `Showing exit portal in boss room with active state: ${isActive}`,
          {
            roomId: this.currentRoomId,
            monstersRemaining: this.monsterCount,
          },
        );
      }
    }

    const exitPortal = this.scene.physics.add.sprite(
      position.x,
      position.y,
      "portal",
    );

    // Set the portal's active state
    exitPortal.isActive = isActive;

    // Set fixed scale based on active state
    exitPortal.setScale(0.5);

    // Set alpha based on active state
    exitPortal.setAlpha(isActive ? 1.0 : 0.4);

    // Add a particle effect around the portal using the new Phaser 3.60+ API
    try {
      // Create the particle emitter with the new API
      const emitter = this.scene.add.particles(
        position.x,
        position.y,
        "particle",
        {
          speed: { min: 10, max: 30 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.3, end: 0 },
          blendMode: "ADD",
          lifespan: 2000,
          tint: isActive ? 0x00ffff : 0x888888,
          frequency: isActive ? 150 : 300,
          quantity: 1,
        },
      );

      // Store the emitter with the portal for cleanup
      exitPortal.particleEmitter = emitter;

      // Log successful particle creation
      logger.debug(
        LogCategory.DUNGEON,
        `Created portal particles at (${position.x}, ${position.y}), active: ${isActive}`,
      );
    } catch (error) {
      logger.warn(
        LogCategory.DUNGEON,
        `Failed to create portal particles: ${error.message}`,
      );

      // Create a simple animation instead as fallback
      this.scene.tweens.add({
        targets: exitPortal,
        scale: { from: 0.4, to: 0.6 },
        alpha: { from: 0.8, to: 1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Store the portal in the room data if we have a current room
    if (this.currentRoomId && this.rooms.has(this.currentRoomId)) {
      const room = this.rooms.get(this.currentRoomId);
      room.exitPortal = exitPortal;
    }

    return exitPortal;
  }

  /**
   * Create a monster counter display for any room
   * @param {number} count - The initial monster count
   * @returns {Object} The created monster counter text object
   */
  createMonsterCounterDisplay(count) {
    // Remove existing counter if it exists
    if (this.uiElements.has("monsterCounter")) {
      const existingCounter = this.uiElements.get("monsterCounter");
      if (existingCounter) {
        existingCounter.destroy();
      }
      this.uiElements.delete("monsterCounter");
    }

    // Set the monster count - if we have monsters registered, use that count instead
    if (this.monstersInRoom.size > 0) {
      this.monsterCount = this.monstersInRoom.size;

      // If the provided count doesn't match our tracking, log a warning
      if (count !== this.monsterCount) {
        logger.warn(
          LogCategory.DUNGEON,
          `Monster count mismatch: provided ${count}, tracked ${this.monsterCount}`,
          {
            trackedMonsters: Array.from(this.monstersInRoom.keys()),
          },
        );
      }
    } else {
      // Otherwise use the provided count
      this.monsterCount = count;
    }

    // Log the initial monster count
    logger.info(
      LogCategory.DUNGEON,
      `Room entered with ${this.monsterCount} monsters, boss room: ${this.isBossRoom}`,
    );

    // Create the monster counter text - positioned on the left side, 100px down
    const monsterCounter = this.scene.add
      .text(10, 100, `Monsters Remaining: ${this.monsterCount}`, {
        fontFamily: "Cinzel, serif",
        fontSize: "16px",
        color: "#ff9900",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0);

    // Add to UI elements
    this.uiElements.set("monsterCounter", monsterCounter);

    // Show a message about defeating monsters if in boss room
    if (this.isBossRoom) {
      this.showMedievalMessage(
        "Defeat all monsters to activate the exit portal!",
        "warning",
        4000,
      );
    }

    return monsterCounter;
  }

  /**
   * Register a room in the dungeon
   * @param {string} roomId - Unique identifier for the room
   * @param {Object} roomData - Data about the room (type, position, etc.)
   * @returns {Object} The room object
   */
  registerRoom(roomId, roomData = {}) {
    // Create a room object if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        monsters: new Map(),
        isBossRoom: roomData.isBossRoom || false,
        isCleared: false,
        ...roomData,
      });

      logger.info(LogCategory.DUNGEON, `Registered room ${roomId}`, {
        isBossRoom: roomData.isBossRoom || false,
        roomType: roomData.type || "standard",
      });
    }

    return this.rooms.get(roomId);
  }

  /**
   * Set the current room
   * @param {string} roomId - The ID of the room player is entering
   * @param {boolean} showUI - Whether to show room-specific UI
   */
  setCurrentRoom(roomId, showUI = true) {
    // If we're already in this room, do nothing
    if (this.currentRoomId === roomId) {
      return;
    }

    const previousRoomId = this.currentRoomId;
    this.currentRoomId = roomId;

    // Register the room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.registerRoom(roomId);
    }

    const room = this.rooms.get(roomId);

    logger.info(LogCategory.DUNGEON, `Player entered room ${roomId}`, {
      previousRoom: previousRoomId,
      isBossRoom: room.isBossRoom,
      isCleared: room.isCleared,
      monsterCount: room.monsters.size,
    });

    // Update the monster tracking to use the current room's monsters
    this.monstersInRoom = room.monsters;

    // Reset portal activation flag when entering a new room
    this.portalActivated = false;

    // If this is a boss room, update the boss room state
    if (room.isBossRoom) {
      // Get all monsters in the room as an array
      const monsters = Array.from(room.monsters.values()).map(
        (data) => data.monster,
      );

      // Set boss room state with the monsters
      this.setBossRoomState(true, monsters.length, monsters);
    } else if (
      previousRoomId &&
      this.rooms.has(previousRoomId) &&
      this.rooms.get(previousRoomId).isBossRoom
    ) {
      // If we're leaving a boss room, clear the boss room state
      this.setBossRoomState(false);
    }

    // If requested, show room-specific UI
    if (showUI) {
      this.showRoomInfo(room);
    }

    return room;
  }

  /**
   * Show information about the current room
   * @param {Object} room - The room object
   */
  showRoomInfo(room) {
    // Only show room info for non-boss rooms (boss rooms have their own UI)
    if (room.isBossRoom) {
      return;
    }

    // Show a message about the room type
    let message = "";
    let messageType = "info";

    switch (room.type) {
      case "treasure":
        message = "You've entered a treasure room! Look for valuable items.";
        messageType = "success";
        break;
      case "monster":
        message = `Monster room - ${room.monsters.size} creatures lurk here.`;
        messageType = "warning";
        break;
      case "puzzle":
        message = "A puzzle room. Solve it to proceed.";
        messageType = "question";
        break;
      case "trap":
        message = "Be careful! This room may contain traps.";
        messageType = "error";
        break;
      default:
        message = `You've entered a new room.`;
        messageType = "info";
    }

    // Show the message
    if (message) {
      this.showMedievalMessage(message, messageType, 3000);
    }

    // Update any room-specific UI elements
    this.updateRoomUI(room);
  }

  /**
   * Update UI elements specific to the current room
   * @param {Object} room - The room object
   */
  updateRoomUI(room) {
    // Update room info text if it exists
    if (this.uiElements.has("roomInfoText")) {
      const roomInfoText = this.uiElements.get("roomInfoText");

      // Set text based on room type
      let roomText = `Room: ${room.id}`;
      if (room.name) {
        roomText = `${room.name}`;
      }

      if (room.type) {
        roomText += ` (${room.type})`;
      }

      roomInfoText.setText(roomText);
    } else {
      // Create room info text if it doesn't exist
      const roomInfoText = this.scene.add
        .text(10, 70, `Room: ${room.id}`, {
          fontFamily: "Cinzel, serif",
          fontSize: "14px",
          color: "#d0d0d0",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setScrollFactor(0);

      this.uiElements.set("roomInfoText", roomInfoText);
    }

    // Always show monster counter if monsters exist
    if (room.monsters.size > 0) {
      this.updateMonsterCounter();
    } else if (this.uiElements.has("monsterCounter")) {
      // Remove monster counter if no monsters
      const counter = this.uiElements.get("monsterCounter");
      if (counter) {
        counter.destroy();
      }
      this.uiElements.delete("monsterCounter");
    }
  }

  /**
   * Update the monster counter based on the number of tracked monsters
   */
  updateMonsterCounter() {
    // Get the current room
    const room = this.rooms.get(this.currentRoomId);

    // Set the monster count to the number of monsters in the current room
    this.monsterCount = room ? room.monsters.size : 0;

    // Update the monster counter text
    const monsterCounter = this.uiElements.get("monsterCounter");
    if (monsterCounter) {
      monsterCounter.setText(`Monsters Remaining: ${this.monsterCount}`);
    } else if (this.monsterCount > 0) {
      // Create the counter if it doesn't exist but should
      this.createMonsterCounterDisplay(this.monsterCount);
    }

    // If all monsters are defeated in a boss room and portal hasn't been activated yet, activate the portal
    if (this.monsterCount === 0 && this.isBossRoom && !this.portalActivated) {
      logger.info(LogCategory.DUNGEON, "All monsters defeated in boss room!");

      this.showMedievalMessage(
        "All monsters defeated! The exit portal is now active.",
        "success",
        3000,
      );

      // Change the counter color to green to indicate completion
      if (monsterCounter) {
        monsterCounter.setColor("#00ff00");
      }

      // Mark the room as cleared
      if (room) {
        room.isCleared = true;
      }

      // Set the portal activated flag to prevent multiple activations
      this.portalActivated = true;

      // Notify the dungeon scene that all monsters are defeated
      if (
        this.scene &&
        typeof this.scene.activatePortalAfterDelay === "function"
      ) {
        logger.info(
          LogCategory.DUNGEON,
          "Notifying dungeon scene to activate portal",
        );
        this.scene.activatePortalAfterDelay(500);
      }

      // Create the portal if it doesn't exist
      this.createExitPortalAfterDelay(1000);
    }
  }

  /**
   * Create the exit portal after a delay
   * @param {number} delay - The delay in milliseconds
   */
  createExitPortalAfterDelay(delay) {
    // Only create portal if we're in a boss room and all monsters are defeated
    if (!this.isBossRoom || this.monsterCount > 0 || !this.portalActivated) {
      return;
    }

    // Get the current room
    const room = this.rooms.get(this.currentRoomId);
    if (!room) {
      return;
    }

    // If the room already has a portal, just activate it
    if (room.exitPortal) {
      this.activateExistingPortal(room.exitPortal);
      return;
    }

    // Otherwise, notify the scene to create a new portal
    this.scene.time.delayedCall(delay, () => {
      if (this.scene && typeof this.scene.createExitPortal === "function") {
        logger.info(LogCategory.DUNGEON, "Creating exit portal after delay");
        this.scene.createExitPortal();
      }
    });
  }

  /**
   * Handle when a room is cleared of all monsters
   * @param {Object} room - The room that was cleared
   */
  handleRoomCleared(room) {
    // Mark the room as cleared
    room.isCleared = true;

    // Show a message for all room types
    this.showMedievalMessage("Room cleared of monsters!", "success", 2000);

    // Handle portal activation for boss rooms
    if (room.isBossRoom && !this.portalActivated) {
      logger.info(
        LogCategory.DUNGEON,
        "Boss room cleared, ensuring portal activation",
      );
      this.portalActivated = true;

      if (
        this.scene &&
        typeof this.scene.activatePortalAfterDelay === "function"
      ) {
        this.scene.activatePortalAfterDelay(500);
      }
    }

    // Emit a roomCleared event for the scene to handle
    this.scene.events.emit("roomCleared", room.id);

    logger.info(LogCategory.DUNGEON, `Room ${room.id} cleared of all monsters`);
  }

  /**
   * Set the boss room state and initialize monster counter
   * @param {boolean} isBossRoom - Whether this is a boss room
   * @param {number} monsterCount - The number of monsters in the room
   * @param {Array} monsters - Optional array of monsters in the room to register
   */
  setBossRoomState(isBossRoom, monsterCount = 0, monsters = []) {
    // Log previous state
    logger.info(
      LogCategory.DUNGEON,
      `Changing boss room state from ${this.isBossRoom} to ${isBossRoom}`,
      {
        previousMonsterCount: this.monsterCount,
        newMonsterCount: monsterCount,
        providedMonsters: monsters.length,
      },
    );

    // Update the current room's boss status if we have a current room
    if (this.currentRoomId && this.rooms.has(this.currentRoomId)) {
      const room = this.rooms.get(this.currentRoomId);
      room.isBossRoom = isBossRoom;
    }

    // Reset portal activation flag when boss room state changes
    this.portalActivated = false;

    // Clear existing monster tracking only if we're changing state
    if (this.isBossRoom !== isBossRoom) {
      this.monstersInRoom.clear();
    }

    this.isBossRoom = isBossRoom;

    // Remove existing monster counter to ensure clean state
    if (this.uiElements.has("monsterCounter")) {
      const existingCounter = this.uiElements.get("monsterCounter");
      if (existingCounter) {
        existingCounter.destroy();
      }
      this.uiElements.delete("monsterCounter");
    }

    // Register provided monsters if any
    if (Array.isArray(monsters) && monsters.length > 0) {
      this.registerMonsters(monsters, (monster) => {
        logger.info(
          LogCategory.DUNGEON,
          `Monster defeated via callback in room`,
          {
            monsterName: monster.name || monster.monsterName,
            isBossRoom: this.isBossRoom,
            remainingMonsters: this.monstersInRoom.size - 1, // -1 because this monster is still in the map
          },
        );
      });

      // Update monster count based on registered monsters
      monsterCount = this.monstersInRoom.size;
    }

    // Create or update the monster counter display
    if (monsterCount > 0) {
      const counter = this.createMonsterCounterDisplay(monsterCount);

      // Add a brief animation to draw attention to the counter
      if (counter) {
        this.scene.tweens.add({
          targets: counter,
          scale: { from: 0, to: 1 },
          duration: 500,
          ease: "Back.Out",
        });
      }
    }

    // Show a message about the boss room
    if (isBossRoom) {
      this.showMedievalMessage(
        "You've entered a boss room! Defeat all monsters to proceed.",
        "warning",
        4000,
      );

      // If the room is already cleared (no monsters), activate the portal
      if (monsterCount === 0 && !this.portalActivated) {
        logger.info(
          LogCategory.DUNGEON,
          "Boss room entered with no monsters, activating portal immediately",
        );
        this.portalActivated = true;

        if (
          this.scene &&
          typeof this.scene.activatePortalAfterDelay === "function"
        ) {
          this.scene.activatePortalAfterDelay(1000);
        }
      }
    }

    logger.info(
      LogCategory.DUNGEON,
      `Boss room state set to ${isBossRoom} with ${monsterCount} monsters`,
    );
  }

  /**
   * Register a monster for tracking in the current room
   * @param {Object} monster - The monster to track
   * @param {Function} deathCallback - Optional callback to execute when monster dies
   * @param {string} roomId - Optional room ID (defaults to current room)
   * @returns {string} The monster's unique ID in the tracking system
   */
  registerMonster(monster, deathCallback = null, roomId = null) {
    // Use provided roomId or current room
    const targetRoomId = roomId || this.currentRoomId;

    // If no room is specified and no current room, log warning and use a default
    if (!targetRoomId) {
      logger.warn(
        LogCategory.DUNGEON,
        "Registering monster without a room ID",
        {
          monsterName: monster.name || monster.monsterName,
          monsterType: monster.monsterType,
        },
      );
      // Use a default room ID
      this.registerRoom("default");
      this.setCurrentRoom("default");
    }

    // Ensure the room exists
    if (!this.rooms.has(targetRoomId)) {
      this.registerRoom(targetRoomId);
    }

    // Get the room
    const room = this.rooms.get(targetRoomId);

    // Generate a unique ID for the monster if it doesn't have one
    const monsterId =
      monster.id || `monster-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Store the monster in the room's monster map
    room.monsters.set(monsterId, {
      monster,
      deathCallback,
      registered: Date.now(),
    });

    // If this is the current room, also update the monstersInRoom reference
    if (targetRoomId === this.currentRoomId) {
      this.monstersInRoom = room.monsters;

      // Update the monster counter display
      this.updateMonsterCounter();
    }

    // Add a direct callback to the monster itself
    if (monster.on && typeof monster.on === "function") {
      // If the monster has an event emitter, use it
      monster.on("died", () =>
        this.handleMonsterDeath(monsterId, monster, targetRoomId),
      );
    } else {
      // Otherwise, monkey patch the monster's die method
      const originalDie = monster.die;
      monster.die = () => {
        // Call the original die method
        if (originalDie && typeof originalDie === "function") {
          originalDie.call(monster);
        }

        // Then handle the death in our tracking system
        this.handleMonsterDeath(monsterId, monster, targetRoomId);
      };
    }

    logger.debug(
      LogCategory.DUNGEON,
      `Registered monster ${monsterId} in room ${targetRoomId}`,
      {
        monsterName: monster.name || monster.monsterName,
        monsterType: monster.monsterType,
        totalInRoom: room.monsters.size,
      },
    );

    return monsterId;
  }

  /**
   * Register multiple monsters at once for tracking
   * @param {Array} monsters - Array of monsters to track
   * @param {Function} deathCallback - Optional callback to execute when any monster dies
   * @param {string} roomId - Optional room ID (defaults to current room)
   * @returns {Array} Array of monster IDs in the tracking system
   */
  registerMonsters(monsters, deathCallback = null, roomId = null) {
    if (!Array.isArray(monsters)) {
      logger.warn(
        LogCategory.DUNGEON,
        "registerMonsters called with non-array argument",
        {
          type: typeof monsters,
          value: monsters,
        },
      );
      return [];
    }

    const monsterIds = [];

    // Register each monster
    for (const monster of monsters) {
      const id = this.registerMonster(monster, deathCallback, roomId);
      monsterIds.push(id);
    }

    // Get the target room
    const targetRoomId = roomId || this.currentRoomId || "default";
    const room = this.rooms.get(targetRoomId);

    logger.info(
      LogCategory.DUNGEON,
      `Registered ${monsterIds.length} monsters in room ${targetRoomId}`,
      {
        totalInRoom: room ? room.monsters.size : 0,
      },
    );

    return monsterIds;
  }

  /**
   * Handle a monster's death directly through our callback system
   * @param {string} monsterId - The ID of the monster that died
   * @param {Object} monster - The monster object
   * @param {string} roomId - Optional room ID (defaults to current room)
   */
  handleMonsterDeath(monsterId, monster, roomId = null) {
    // Use provided roomId or current room
    const targetRoomId = roomId || this.currentRoomId;

    // If no valid room ID, log error and return
    if (!targetRoomId || !this.rooms.has(targetRoomId)) {
      logger.error(
        LogCategory.DUNGEON,
        `Cannot handle monster death: invalid room ID ${targetRoomId}`,
      );
      return;
    }

    // Get the room
    const room = this.rooms.get(targetRoomId);

    // Get the monster data from the room's monster map
    const monsterData = room.monsters.get(monsterId);

    if (!monsterData) {
      logger.warn(
        LogCategory.DUNGEON,
        `Monster ${monsterId} not found in room ${targetRoomId} when handling death`,
      );
      return;
    }

    // Execute the death callback if one was provided
    if (
      monsterData.deathCallback &&
      typeof monsterData.deathCallback === "function"
    ) {
      try {
        monsterData.deathCallback(monster);
      } catch (error) {
        logger.error(
          LogCategory.DUNGEON,
          `Error executing death callback for monster ${monsterId}`,
          error,
        );
      }
    }

    // Remove the monster from the room's monster map
    room.monsters.delete(monsterId);

    // If this is the current room, update UI accordingly
    if (targetRoomId === this.currentRoomId) {
      // Update the monstersInRoom reference
      this.monstersInRoom = room.monsters;

      // Update the monster counter
      this.updateMonsterCounter();

      // Check if the room is now cleared of monsters
      if (room.monsters.size === 0) {
        this.handleRoomCleared(room);
      }
    }

    logger.debug(
      LogCategory.DUNGEON,
      `Monster ${monsterId} removed from room ${targetRoomId}`,
      {
        remainingMonsters: room.monsters.size,
      },
    );
  }

  /**
   * Handle monster defeated event
   * @param {Object} monster - The defeated monster
   */
  handleMonsterDefeated(monster) {
    // This method is kept for backward compatibility
    // It will be called by the scene's event system

    // Log monster details
    logger.info(LogCategory.DUNGEON, `Monster defeated via event system`, {
      monsterName: monster.name || monster.monsterName,
      isBoss: monster.isBoss,
      currentCount: this.monsterCount,
      monsterType: monster.monsterType,
      isBossRoom: this.isBossRoom,
    });

    // Try to find the monster in our tracking system by comparing properties
    let foundMonsterId = null;
    for (const [id, data] of this.monstersInRoom.entries()) {
      if (data.monster === monster) {
        foundMonsterId = id;
        break;
      }
    }

    // If we found the monster in our tracking system, handle its death
    if (foundMonsterId) {
      this.handleMonsterDeath(foundMonsterId, monster);
    } else {
      // If the monster wasn't in our tracking system, register and immediately remove it
      // This ensures the counter is updated properly
      logger.warn(
        LogCategory.DUNGEON,
        `Monster defeated but not found in tracking system. Adding and removing it.`,
      );

      // Create a temporary ID for the monster
      const tempId = `temp-monster-${Date.now()}`;

      // Get the current room
      const room = this.rooms.get(this.currentRoomId);
      if (room) {
        // Add the monster to the room's monster map
        room.monsters.set(tempId, {
          monster,
          deathCallback: null,
          registered: Date.now(),
        });

        // Then immediately remove it
        room.monsters.delete(tempId);

        // Update the monstersInRoom reference
        this.monstersInRoom = room.monsters;

        // Force update the monster counter
        this.updateMonsterCounter();

        // Check if the room is now cleared of monsters
        if (room.monsters.size === 0) {
          this.handleRoomCleared(room);
        }
      }
    }
  }

  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  onUpdate(time, delta) {
    // Update the monster counter every few frames to ensure it stays in sync
    // We use a modulo on time to avoid doing this every single frame
    if (time % 30 < 1) {
      // Only update if we have a current room with monsters
      if (this.currentRoomId && this.rooms.has(this.currentRoomId)) {
        const room = this.rooms.get(this.currentRoomId);
        if (room.monsters.size > 0 || this.uiElements.has("monsterCounter")) {
          this.updateMonsterCounter();
        }
      }
    }
  }

  /**
   * Original update method for backward compatibility
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Call our new onUpdate method to maintain functionality
    this.onUpdate(time, delta);
  }

  /**
   * Clean up resources when the manager is destroyed
   */
  destroy() {
    logger.info(LogCategory.DUNGEON, "Destroying dungeon UI manager");

    // Remove event listeners
    this.scene.events.off("update", this.updateHealthDisplay, this);
    this.scene.events.off("monsterDefeated", this.handleMonsterDefeated, this);
    this.scene.events.off("update", this.onUpdate, this);

    // Clear all room and monster tracking
    this.rooms.forEach((room) => {
      room.monsters.clear();
    });
    this.rooms.clear();
    this.monstersInRoom.clear();

    // Destroy all UI elements
    this.uiElements.forEach((element) => {
      if (element.off) {
        element.off("pointerdown"); // Remove event listeners
      }
      element.destroy();
    });

    this.uiElements.clear();
  }

  /**
   * Manually activate the exit portal
   * This can be called from outside when the portal needs to be activated
   * regardless of monster count (e.g., for puzzle rooms or special events)
   * @param {boolean} showMessage - Whether to show a success message
   */
  activatePortal(showMessage = true) {
    // If portal is already activated, do nothing
    if (this.portalActivated) {
      logger.debug(
        LogCategory.DUNGEON,
        "Portal already activated, ignoring activation request",
      );
      return;
    }

    // Set the portal activated flag
    this.portalActivated = true;

    // Get the current room
    const room = this.rooms.get(this.currentRoomId);

    // Mark the room as cleared
    if (room) {
      room.isCleared = true;
    }

    // Show a message if requested
    if (showMessage) {
      this.showMedievalMessage(
        "The exit portal is now active!",
        "success",
        3000,
      );
    }

    // If this is a boss room, update the monster counter color
    if (this.isBossRoom) {
      const monsterCounter = this.uiElements.get("monsterCounter");
      if (monsterCounter) {
        monsterCounter.setColor("#00ff00");
      }
    }

    // Notify the dungeon scene to activate the portal
    if (
      this.scene &&
      typeof this.scene.activatePortalAfterDelay === "function"
    ) {
      logger.info(LogCategory.DUNGEON, "Manually activating portal");
      this.scene.activatePortalAfterDelay(500);
    }
  }

  /**
   * Check if the portal is currently activated
   * @returns {boolean} Whether the portal is activated
   */
  isPortalActivated() {
    return this.portalActivated;
  }

  /**
   * Activate an existing exit portal
   * @param {Object} portal - The portal sprite to activate
   */
  activateExistingPortal(portal) {
    if (!portal) {
      logger.warn(LogCategory.DUNGEON, "Cannot activate null portal");
      return;
    }

    // Set the portal to active
    portal.isActive = true;

    // Update visual appearance
    portal.setAlpha(1.0);

    // Update particle effects if they exist
    if (portal.particleEmitter) {
      try {
        portal.particleEmitter.setFrequency(150);
        portal.particleEmitter.setTint(0x00ffff);
      } catch (error) {
        logger.warn(
          LogCategory.DUNGEON,
          `Failed to update portal particles: ${error.message}`,
        );
      }
    }

    // Set the portal activated flag
    this.portalActivated = true;

    logger.info(LogCategory.DUNGEON, "Existing portal activated");
  }
}

