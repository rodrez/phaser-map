import { Scene } from "phaser";
import { MapManager } from "../utils/MapManager";
import { GeoPlayerManager } from "../utils/player/GeoPlayerManager";
import { UIManager } from "../utils/ui/UIManager";
import { FlagManager } from "../utils/FlagManager";
import { Environment } from "../environment";
import { PopupSystem } from "../ui/popup";
import { logger, LogCategory } from "../utils/Logger";
import { MonsterSystem, MonsterPopupSystem } from "../monsters";
import { ItemSystem } from "../items/item";
// Import the ItemSystem extension
import { BaseItem } from "../items/item-system-extension";
import { InventoryManager } from "../items/inventory-manager";
import { InventoryUI } from "../ui/inventory-ui/index";
import { CombatSystem } from "../utils/CombatSystem";
import { CharacterStatsUI } from "../ui/character-stats";
import playerStatsService from "../utils/player/PlayerStatsService";
import { StatusEffectsUI } from "../ui/StatusEffectsUI";
import { StatusEffectType } from "../utils/StatusEffectSystem";
import { EquipmentManager } from "../items/equipment-manager";
import { MedievalEquipmentUI } from "../ui/equipment-ui/index";
import { ChatExample } from "../ui/chat-ui";
import { chatService } from "../utils/ChatService";
import { dungeonConfigRegistry } from "../dungeons/core/DungeonConfig";
// Import the PlayerReferenceService
import playerReferenceService from "../utils/player/PlayerReferenceService";

export class Game extends Scene {
  constructor(sceneKey = "Game") {
    super(sceneKey);
  }

  preload() {
    // Load particle effects
    this.load.atlas('flares', '/assets/particles/flares.png', '/assets/particles/flares.json');
    
    // Load Lost Swamp dungeon entrance only
    this.load.image('lost-swamp-entrance', '/assets/dungeons/lost-swamp/entrance-256.png');
    
    // Comment out other dungeon entrances since we're only testing Lost Swamp
    // this.load.image('cave-dungeon-entrance', '/assets/dungeons/cave/entrance-256.png');
    // this.load.image('forest-dungeon-entrance', '/assets/dungeons/forest/entrance-256.png');
  }

  create() {
    // Set the scene to be transparent so we can see the map underneath
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0.1)");

    // Fix: Set up proper input priority to ensure environment interactions work
    this.input.topOnly = false; // Allow input to pass through to lower objects
    console.log("INPUT DEBUG: Setting input.topOnly to false to allow clicks on layered objects");

    // Get the player's username from the registry (set in LoginScene)
    const username = this.registry.get('username') || 'Adventurer';
    logger.info(LogCategory.PLAYER, `Player logged in as: ${username}`);

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

    // Initialize player manager with the username
    this.playerManager = new GeoPlayerManager(this, this.mapManager);
    
    // Set the player's name from the login
    this.playerManager.setPlayerName(username);
    
    // Initialize the player sprite
    this.playerManager.setupPlayer();
    
    // Register the player in the scene registry for other systems to access
    this.registry.set('player', this.playerManager.getPlayer());
    
    // Initialize the PlayerReferenceService with the scene and player sprite
    playerReferenceService.initialize(this);
    playerReferenceService.setPlayerSprite(this.playerManager.getPlayer());

    // Initialize flag manager
    this.flagManager = new FlagManager(this, this.mapManager);

    // Use the PlayerStatsService instead of maintaining a separate playerStats object
    this.playerStats = playerStatsService.getStats();
    
    // Make the playerStatsService available to the scene
    this.playerStatsService = playerStatsService;

    // Initialize popup system
    this.popupSystem = new PopupSystem(this, this.mapManager);

    // Initialize item system
    this.itemSystem = new ItemSystem(this);
    
    // Preload item assets if they haven't been loaded yet
    try {
      const assetManager = this.itemSystem.getAssetManager();
      if (assetManager) {
        logger.info(LogCategory.ASSETS, "Initializing item asset manager");
        // Set the asset manager for all items
        BaseItem.setAssetManager(assetManager);
        // Preload assets if needed
        assetManager.preloadAssets();
      } else {
        logger.warn(LogCategory.ASSETS, "Asset manager not available in ItemSystem");
      }
    } catch (error) {
      logger.error(LogCategory.ASSETS, "Error accessing asset manager:", error);
    }

    // Initialize inventory manager
    this.inventoryManager = new InventoryManager(this, this.itemSystem);
    
    // Initialize inventory UI
    this.inventoryUI = new InventoryUI(this, {
      inventory: this.inventoryManager.getInventory(),
      itemSystem: this.itemSystem,
      onItemClick: (itemStack, index) => this.handleInventoryItemClick(itemStack, index),
      onItemRightClick: (itemStack, index) => this.handleInventoryItemRightClick(itemStack, index),
      onClose: () => {
        // Reset the new items counter when inventory is closed
        this.playerStats.newItems = 0;
        this.uiManager.updateMenuBadge('inventory', 0);
      }
    });
    
    // Connect the inventory UI to the inventory manager
    this.inventoryManager.setInventoryUI(this.inventoryUI);
    
    // Add default items to inventory for testing
    this.inventoryManager.addDefaultItems();

    // Initialize equipment manager
    this.equipmentManager = new EquipmentManager(this, this.playerManager, this.inventoryManager);
    
    // Initialize equipment UI with the equipment manager
    this.equipmentUI = new MedievalEquipmentUI(this, {
      equipmentManager: this.equipmentManager
    });

    // Initialize combat system
    this.combatSystem = new CombatSystem(this);

    // Initialize environment system
    this.environment = new Environment(this);
    
    // Connect environment with popup system
    this.environment.setPopupSystem(this.popupSystem);

    // Initialize monster popup system
    this.monsterPopupSystem = new MonsterPopupSystem(this, this.popupSystem);

    // Initialize monster system
    this.monsterSystem = new MonsterSystem(
      this, 
      this.mapManager, 
      this.playerManager, 
      this.itemSystem
    );
    
    // Connect monster system with environment
    this.monsterSystem.setEnvironment(this.environment);

    // Initialize dungeon registry instead of using DungeonManager
    this.dungeonRegistry = dungeonConfigRegistry;

    // Initialize UI manager
    this.uiManager = new UIManager(this, this.mapManager);

    // Initialize character stats UI
    this.characterStatsUI = new CharacterStatsUI(this);
    
    // Initialize status effects UI to display ailments below the player's health bar
    this.statusEffectsUI = new StatusEffectsUI(this, this.playerManager);

    // Set up event listeners
    this.setupEventListeners();

    // Add DOM event listeners to handle interactions
    this.setupDOMEventListeners();

    // Generate environment elements around the player with a small delay to ensure all systems are properly initialized
    const player = this.playerManager.getPlayer();
    this.time.delayedCall(500, () => {
      // Log that we're generating environment
      logger.info(LogCategory.GAME, "Generating environment around player");
      
      // Make sure all textures are loaded before generating environment
      this.textures.once('onload', () => {
        logger.info(LogCategory.GAME, "Textures loaded, generating environment");
        this.environment.generateEnvironment(player.x, player.y, 300);
      });
      
      // Check if textures are still loading
      if (this.textures.isLoading) {
        logger.info(LogCategory.GAME, "Waiting for textures to load before generating environment");
      } else {
        // If textures are already loaded, generate environment immediately
        this.environment.generateEnvironment(player.x, player.y, 300);
      }
    });

    // Log debug info
    logger.info(LogCategory.GAME, "Game scene created");
    logger.info(LogCategory.GAME, "Map:", this.mapManager.getMap());
    logger.info(LogCategory.GAME, "Player:", this.playerManager.getPlayer());
    logger.info(LogCategory.GAME, "Environment initialized");
    logger.info(LogCategory.GAME, "Monster system initialized");
    
    // Emit create-complete event to signal that the scene is fully created
    this.events.emit('create-complete');
  }

  setupEventListeners() {
    // Listen for placeFlag event from UI
    this.events.on("placeFlag", () => {
      this.handlePlayerClick();
    });
    
    // Listen for player-hitarea-clicked event from PlayerInteractionManager
    this.events.on("player-hitarea-clicked", () => {
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
    
    // Listen for monster-click event
    this.events.on("monster-click", (monster) => {
      this.handleMonsterClick(monster);
    });

    // Character stats UI events
    this.events.on('openCharacter', () => {
      logger.info(LogCategory.UI, 'Opening character stats UI');
      this.characterStatsUI.show();
    });

    // Listen for openInventory event
    this.events.on('openInventory', (data) => {
      logger.info(LogCategory.UI, 'Opening inventory UI');
      
      // If data is provided with filter parameters
      if (data && typeof data === 'object') {
        // Show the inventory with the provided options
        this.inventoryUI.show(data);
      } else {
        // Just show the inventory without filters
        this.inventoryUI.show();
      }
    });

    // Listen for openEquipment event
    this.events.on('openEquipment', () => {
      logger.info(LogCategory.UI, 'Opening equipment UI');
      this.equipmentUI.show();
    });
    
    // Listen for openChat event
    this.events.on('openChat', () => {
      logger.info(LogCategory.UI, 'Opening chat UI');
      this.toggleChat();
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
    
    // The double-click handler is now managed by the GeoPlayerManager
    // We don't need to set it up here anymore
    
    // Add a class to the canvas for CSS targeting
    canvas.classList.add("game-canvas");
  }

  handlePlayerClick() {
    // Try to place a flag using the player manager
    const flag = this.playerManager.handleClick();

    // The message is now handled in the GeoPlayerManager.handleClick
    // We don't need to show messages here anymore
  }

  /**
   * Handle double-click movement to a target position
   * @param {Object} data - Data containing target position
   */
  handleDoubleClickMove(data) {
    // Log the source of the double-click if available
    if (data.source) {
      logger.info(LogCategory.GAME, `Processing double-click movement from ${data.source}:`, data);
    } else {
      logger.info(LogCategory.GAME, "Processing double-click movement:", data);
    }
    
    // Delegate to the player manager's handle double click move method
    this.playerManager.handleDoubleClickMove(data);
  }

  /**
   * Handle adding an item to the inventory
   * @param {Object} data - Data containing itemId and quantity
   */
  handleAddItemToInventory(data) {
    if (!data || !data.itemId || !data.quantity) return;
    
    // Log the item being added
    logger.info(LogCategory.INVENTORY, `Adding ${data.quantity}x ${data.itemId} to inventory`);
    
    // Get the item from the item system
    const item = this.itemSystem.getItem(data.itemId);
    if (!item) {
      logger.error(LogCategory.INVENTORY, `Item ${data.itemId} not found in item database`);
      return;
    }
    
    // Ensure the item has the correct icon URL from the asset manager
    try {
      if (typeof item.updateIconUrl === 'function') {
        item.updateIconUrl();
      } else {
        logger.warn(LogCategory.INVENTORY, "Item does not have updateIconUrl method");
      }
    } catch (error) {
      logger.warn(LogCategory.INVENTORY, "Could not update item icon URL:", error);
    }
    
    // Add the item to the player's inventory using the inventory manager
    const added = this.inventoryManager.addItem(data.itemId, data.quantity);
    
    // Show appropriate message based on whether all items were added
    if (!added) {
      this.uiManager.showMedievalMessage(
        `Thou cannot carry any more ${item.name}!`, 
        "warning"
      );
    } else {
      const quantity = this.inventoryManager.getItemQuantity(data.itemId);
      this.uiManager.showMedievalMessage(`Thou hast acquired ${data.quantity}x ${item.name}!`, "success");
    }
    
    // Update any UI elements that show inventory
    if (this.uiManager) {
      // Increment the new items counter
      this.playerStats.newItems = (this.playerStats.newItems || 0) + 1;
      // Update the inventory badge
      this.uiManager.updateMenuBadge('inventory', this.playerStats.newItems);
    }
  }

  /**
   * Handle inventory item click
   * @param {Object} itemStack - The clicked item stack
   * @param {number} index - The index of the item in the inventory
   */
  handleInventoryItemClick(itemStack, index) {
    const item = itemStack.item;
    
    // Check if we're in equipment selection mode
    if (this.inventoryUI.options.equipToSlot) {
      // Get the slot we're equipping to
      const slotId = this.inventoryUI.options.equipToSlot;
      
      // Try to equip the item
      if (this.equipmentManager.equipFromInventory(index)) {
        // Emit the itemEquipped event for the equipment UI to handle
        this.events.emit('itemEquipped', {
          slotId: slotId,
          item: item
        });
        
        // Show success message
        this.uiManager.showMedievalMessage(`Thou hast equipped ${item.name}!`, "success");
        
        // Clear the equip mode
        this.inventoryUI.options.equipToSlot = null;
      } else {
        // Show error message if equipping failed
        this.uiManager.showMedievalMessage(`Thou cannot equip ${item.name} in that slot!`, "warning");
      }
      
      return;
    }
    
    // If the item is usable, use it
    if (item.usable) {
      logger.info(LogCategory.INVENTORY, `Using item: ${item.name}`);
      
      if (this.inventoryManager.useItem(index)) {
        // If the item was used successfully
        this.uiManager.showMedievalMessage(`Thou hast used ${item.name}!`, "info");
      }
    } else {
      // Just show info about the item
      this.uiManager.showMedievalMessage(`${item.name}: ${item.description}`, "info");
    }
  }
  
  /**
   * Handle inventory item right click (context menu)
   * @param {Object} itemStack - The right-clicked item stack
   * @param {number} index - The index of the item in the inventory
   */
  handleInventoryItemRightClick(itemStack, index) {
    const item = itemStack.item;
    
    // For now, just drop the item
    logger.info(LogCategory.INVENTORY, `Dropping item: ${item.name}`);
    
    // Remove one of the item from inventory
    this.inventoryManager.removeItemFromSlot(index, 1);
    
    // Show message
    this.uiManager.showMedievalMessage(`Thou hast dropped ${item.name}!`, "info");
  }

  /**
   * Give an item to the player
   * @param {string} itemId - The ID of the item to give
   * @param {number} quantity - The quantity of the item to give
   */
  givePlayerItem(itemId, quantity = 1) {
    // Log the item being given
    logger.info(LogCategory.INVENTORY, `Giving player ${quantity}x ${itemId}`);
    
    // Add the item to the player's inventory
    this.events.emit('add-item-to-inventory', { itemId, quantity });
    
    // Show a message to the player
    if (this.uiManager) {
      const item = this.itemSystem.getItem(itemId);
      if (item) {
        const itemName = item.name || itemId;
        this.uiManager.showMedievalMessage(`Thou hast acquired ${quantity}x ${itemName}!`, 'success', 3000);
      }
    }
  }

  /**
   * Add XP to the player
   * @param {number} amount - The amount of XP to add
   */
  addXP(amount) {
    // Use PlayerStatsService to add XP
    const leveledUp = playerStatsService.addXP(amount);
    
    // Update our reference to the stats
    this.playerStats = playerStatsService.getStats();
    
    // Show a message to the player
    if (this.uiManager) {
      this.uiManager.showMedievalMessage(`Gained ${amount} experience!`, 'success', 2000);
      
      if (leveledUp) {
        this.uiManager.showMedievalMessage(`Level Up! Thou art now level ${this.playerStats.level}!`, 'success', 3000);
      }
    }
  }

  /**
   * Add gold to the player
   * @param {number} amount - The amount of gold to add
   */
  addGold(amount) {
    // Use PlayerStatsService to add gold
    playerStatsService.addGold(amount);
    
    // Update our reference to the stats
    this.playerStats = playerStatsService.getStats();
    
    // Show a message to the player
    if (this.uiManager) {
      this.uiManager.showMedievalMessage(`Gained ${amount} gold!`, 'success', 2000);
    }
  }

  /**
   * Handle a click on a monster
   * @param {Object} monster - The monster that was clicked
   */
  handleMonsterClick(monster) {
    if (!monster) return;
    
    // Log the monster click
    logger.info(LogCategory.MONSTER, `Clicked on monster: ${monster.monsterName}`);
    
    // Make sure the map is not in a drag state
    if (this.mapManager) {
      this.mapManager.exitDragState();
    }
    
    // Attack the monster with a base damage of 10
    // In a real game, this would be based on the player's weapon, stats, etc.
    if (this.combatSystem) {
      this.combatSystem.playerAttackMonster(monster, 10);
    }
  }

  update(time, delta) {
    // Update player position
    if (this.playerManager) {
      this.playerManager.update(delta);
      
      // Ensure the player reference in the registry is up to date
      this.registry.set('player', this.playerManager.getPlayer());
    }
    
    // Update combat system for player retaliation
    if (this.combatSystem) {
      this.combatSystem.update(time, delta);
    }
    
    // Apply god mode healing if enabled and health is below 50%
    if (this.playerStats?.godMode && this.playerStats.health < this.playerStats.maxHealth * 0.5) {
      // Heal to full health immediately when in god mode and health is below 50%
      const oldHealth = this.playerStats.health;
      this.playerStats.health = this.playerStats.maxHealth;
      
      // Update UI to reflect health changes
      if (this.uiManager) {
        this.uiManager.updateHealthBar(this.playerStats.health, this.playerStats.maxHealth);
        this.uiManager.showMedievalMessage("God Mode: Thou art fully healed!", "success", 1500);
      }
      
      logger.info(LogCategory.GAME, `God Mode healing applied. Health: ${oldHealth} -> ${this.playerStats.health}/${this.playerStats.maxHealth}`);
    }
    
    // Update flag positions
    if (this.flagManager) {
      this.flagManager.update();
    }
    
    // Update UI
    if (this.uiManager) {
      this.uiManager.update();
    }
    
    // Update monster system
    if (this.monsterSystem) {
      this.monsterSystem.update(time, delta);
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
      
      // Update environment positions to ensure fruits stay with their trees
      this.environment.updateEnvironmentPositions();
    }
    
    // Update status effects UI
    if (this.statusEffectsUI) {
      this.statusEffectsUI.update();
    }
    
    // Ensure the map is properly invalidated to handle any size changes
    this.mapManager?.getMap()?.invalidateSize();
  }

  shutdown() {
    // Reset the PlayerReferenceService when the scene is shut down
    playerReferenceService.reset();
    
    // Clean up event listeners
    const canvas = this.sys.game.canvas;
    if (canvas && this.canvasClickListener) {
      canvas.removeEventListener("click", this.canvasClickListener);
    }
    
    // We don't need to clean up the double-click listener here anymore
    // It's now managed by the GeoPlayerManager
    
    // Clean up custom event listeners
    this.events.off("double-click-move");
    this.events.off("add-item-to-inventory");
    this.events.off("monster-click");
    this.events.off("openInventory");
    this.events.off("openEquipment");
    this.events.off("player-hitarea-clicked"); // Clean up player hitarea event

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
    
    if (this.monsterSystem) {
      this.monsterSystem.destroy();
    }
    
    if (this.monsterPopupSystem) {
      this.monsterPopupSystem.destroy();
    }

    // Destroy character stats UI
    if (this.characterStatsUI) {
      this.characterStatsUI.destroy();
    }
    
    // Destroy inventory manager
    if (this.inventoryManager) {
      this.inventoryManager.destroy();
    }
    
    // Destroy inventory UI
    if (this.inventoryUI) {
      this.inventoryUI.destroy();
    }

    // Destroy equipment manager
    if (this.equipmentManager) {
      this.equipmentManager.destroy();
    }
    
    // Destroy equipment UI
    if (this.equipmentUI) {
      this.equipmentUI.destroy();
    }

    // Destroy status effects UI
    if (this.statusEffectsUI) {
      this.statusEffectsUI.destroy();
    }

    // Destroy chat if it exists
    if (this.chatExample) {
      this.chatExample.destroy();
      this.chatExample = null;
    }

    logger.info(LogCategory.GAME, "Game scene shutdown");
  }

  /**
   * Apply test status effects to the player for debugging
   */
  applyTestStatusEffects() {
    if (!this.playerManager || !this.playerManager.statusEffectSystem) {
      logger.error(LogCategory.COMBAT, "Cannot apply test status effects: playerManager or statusEffectSystem not found");
      return;
    }
    
    // Apply poison effect
    this.playerManager.statusEffectSystem.applyEffect(StatusEffectType.POISON, {
      damage: 5,
      duration: 10000, // 10 seconds
      tickInterval: 2000, // 2 seconds
      source: { monsterName: 'Test Monster' }
    });
    
    // Apply burn effect
    this.playerManager.statusEffectSystem.applyEffect(StatusEffectType.BURN, {
      damage: 8,
      duration: 8000, // 8 seconds
      tickInterval: 1000, // 1 second
      source: { monsterName: 'Test Monster' }
    });
    
    // Apply frozen effect
    this.playerManager.statusEffectSystem.applyEffect(StatusEffectType.FROZEN, {
      damage: 30, // 30% movement speed reduction
      duration: 5000, // 5 seconds
      tickInterval: 1000, // Not used for movement effects
      source: { monsterName: 'Test Monster' }
    });
    
    logger.info(LogCategory.COMBAT, "Applied test status effects to player");
    
    // Show a message to the player
    if (this.uiManager) {
      this.uiManager.showMedievalMessage("Test status effects applied!", "info", 3000);
    }
  }

  /**
   * Toggle the chat UI
   */
  toggleChat() {
    if (this.chatExample) {
      this.chatExample.toggle();
    } else {
      this.initializeChat();
    }
  }

  /**
   * Initialize the chat UI
   */
  initializeChat() {
    // Create chat example
    this.chatExample = new ChatExample(this);
    
    // Get the player's name from the registry (set during login)
    const username = this.registry.get('username') || this.playerManager.getPlayerName() || 'Adventurer';
    
    // Set the username in the chat service
    chatService.setUsername(username);
    
    logger.info(LogCategory.CHAT, `Chat initialized with player name: ${username}`);
    
    // Show the chat UI
    this.chatExample.show();
  }

  // After the create method, add a new method to handle scene initialization
  init() {
    const updateDungeonStatus = this.registry.get('updateDungeonStatus');
    if (updateDungeonStatus) {
      // Update dungeon status using the registry directly
      if (updateDungeonStatus?.id) {
        // Store completion status in local storage or game state
        const dungeonKey = `dungeon_${updateDungeonStatus.id}_completed`;
        localStorage.setItem(dungeonKey, updateDungeonStatus.completed ? 'true' : 'false');
        
        // Emit an event that can be listened to by other systems
        this.events.emit('dungeonStatusUpdated', {
          id: updateDungeonStatus.id,
          completed: updateDungeonStatus.completed
        });
        
        logger.info(LogCategory.DUNGEON, `Updated dungeon status: ${updateDungeonStatus.id} - Completed: ${updateDungeonStatus.completed}`);
      }
      
      // Clear the registry value
      this.registry.remove('updateDungeonStatus');
    }
    
    // Check if we need to add items to inventory
    const addItemToInventory = this.registry.get('addItemToInventory');
    if (addItemToInventory) {
      // Add the item to inventory when the scene is fully created
      this.events.once('create-complete', () => {
        if (this.inventoryManager) {
          this.inventoryManager.addItemById(addItemToInventory);
          logger.info(LogCategory.INVENTORY, `Added item from dungeon: ${addItemToInventory}`);
        }
      });
      
      // Clear the registry value
      this.registry.remove('addItemToInventory');
    }
  }

  /**
   * Wake method - called when the scene is woken up (e.g., after returning from the dungeon)
   * This is necessary to reinitialize the map dragging functionality and restore game state
   */
  wake() {
    // Log that the Game scene is waking up
    logger.info(LogCategory.GAME, "Game scene waking up after dungeon");
    
    // Store current map state before manipulating it
    let currentCenter = null;
    let currentZoom = null;
    
    // Get current map state if available
    if (this.mapManager && this.mapManager.getMap()) {
      const map = this.mapManager.getMap();
      currentCenter = map.getCenter();
      currentZoom = map.getZoom();
      logger.info(LogCategory.MAP, `Stored map position: ${JSON.stringify(currentCenter)}, zoom: ${currentZoom}`);
    }
    
    // STEP 1: Reset map drag state - use a more aggressive approach
    if (this.mapManager) {
      const map = this.mapManager.getMap();
      
      if (map) {
        // IMPORTANT: First completely disable dragging to ensure clean state
        try {
          if (map.dragging) {
            map.dragging.disable();
            logger.info(LogCategory.MAP, "Map dragging disabled");
          }
          
          // Reset any internal dragging state in our MapManager
          this.mapManager.isDragging = false;
          
          // Delay re-enabling of map drag to ensure clean state
          this.time.delayedCall(50, () => {
            // Re-enable dragging with a clean slate
            if (map.dragging) {
              map.dragging.enable();
              logger.info(LogCategory.MAP, "Map dragging re-enabled");
            }
            
            // Force cancel any ongoing interaction with the map
            if (map._container) {
              // Create synthetic mouseup event
              const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              
              // Dispatch to map container to ensure any ongoing drag is canceled
              map._container.dispatchEvent(mouseUpEvent);
              logger.info(LogCategory.MAP, "Synthetic mouseup event dispatched to map container");
            }
            
            // Invalidate size to ensure proper rendering
            map.invalidateSize(true);
            
            // Restore the map position and zoom
            if (currentCenter && currentZoom) {
              map.setView(currentCenter, currentZoom, { animate: false });
              logger.info(LogCategory.MAP, "Restored map position and zoom");
            }
            
            // Re-initialize map drag functionality after a short delay
            this.time.delayedCall(100, () => {
              if (this.mapManager) {
                // Force exit any drag state
                this.mapManager.exitDragState();
                
                // Set up map drag with a clean implementation
                this.mapManager.setupMapDrag();
                logger.info(LogCategory.MAP, "Map drag functionality reinitialized");
              }
            });
          });
        } catch (error) {
          logger.error(LogCategory.MAP, `Error resetting map drag: ${error.message}`);
        }
      }
    }
    
    // STEP 2: Restore game state - update positions of all objects
    
    // Ensure player position is properly updated
    if (this.playerManager) {
      // Update player's pixel position on the map
      this.playerManager.updatePlayerPosition();
      
      // Update any player visuals or animations
      this.playerManager.update(0);
      
      logger.info(LogCategory.PLAYER, "Player position restored");
    }
    
    // Make sure environment objects are in the right positions
    if (this.environment) {
      // Update all environment object positions
      this.environment.updateEnvironmentPositions();
      
      // Re-register all environment objects with the map manager
      this.environment.refreshMapRegistration();
      
      logger.info(LogCategory.ENVIRONMENT, "Environment positions restored");
    }
    
    // Update monster positions
    if (this.monsterSystem) {
      // Update all monster positions
      this.monsterSystem.updateMonsterPositions();
      logger.info(LogCategory.MONSTER, "Monster positions restored");
    }
    
    // Make sure the UI is properly updated
    if (this.uiManager) {
      // Force UI elements to update their positions
      this.uiManager.updateUIPositions();
      this.uiManager.update();
      logger.info(LogCategory.UI, "UI elements restored");
    }
    
    // STEP 3: Final refresh of all coordinate-based objects
    
    // Use a slightly longer delay to ensure all state is properly reset
    this.time.delayedCall(300, () => {
      if (this.mapManager) {
        // Refresh all coordinate cached objects
        const cache = this.mapManager.getCoordinateCache();
        if (cache && typeof cache.refreshAllObjects === 'function') {
          cache.refreshAllObjects();
          logger.info(LogCategory.MAP, "Coordinate cache refreshed");
        }
        
        // Final map invalidation after all updates
        const map = this.mapManager.getMap();
        if (map) {
          map.invalidateSize(true);
          logger.info(LogCategory.MAP, "Final map invalidation complete");
        }
      }
    });
    
    // Log completion
    logger.info(LogCategory.GAME, "Game scene wake process complete");
  }
}
