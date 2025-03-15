import { Scene } from "phaser";
import { MapManager } from "../utils/MapManager";
import { PlayerManager } from "../utils/player/PlayerManager";
import { UIManager } from "../utils/ui/UIManager";
import { FlagManager } from "../utils/FlagManager";
import { Environment } from "../environment";
import { PopupSystem } from "../ui/popup";
import { logger, LogCategory } from "../utils/Logger";
import { MonsterSystem, MonsterPopupSystem } from "../monsters";
import { ItemSystem } from "../items/item";
// Import the ItemSystem extension
import { BaseItem } from "../items/item-system-extension";
import { Inventory } from "../items/inventory";
import { InventoryManager } from "../items/inventory-manager";
import { InventoryUI } from "../ui/inventory-ui/index";
import { CombatSystem } from "../utils/CombatSystem";
import { CharacterStatsUI } from "../ui/character-stats";
import playerStatsService from "../utils/player/PlayerStatsService";
import { StatusEffectsUI } from "../ui/StatusEffectsUI";
import { StatusEffectType } from "../utils/StatusEffectSystem";
import { EquipmentManager } from "../items/equipment-manager";
import { MedievalEquipmentUI } from "../ui/equipment-ui/index";

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
      
      // Show healing effect if we have a player manager
      if (this.playerManager?.statsManager) {
        this.playerManager.statsManager.showGodModeHealEffect(this.playerStats.maxHealth - oldHealth);
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
    this.events.off("monster-click");
    this.events.off("openInventory");
    this.events.off("openEquipment");

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
}
