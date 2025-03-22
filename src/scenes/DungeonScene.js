import { Scene } from "phaser";
import { logger, LogCategory } from "../utils/Logger";
import { CombatSystem } from "../utils/CombatSystem";
import playerStatsService from "../utils/player/PlayerStatsService";
import { PopupSystem } from "../ui/popup";

// Import our dungeon system components
import { DungeonSystem } from "../dungeons/core/DungeonSystem";
import { DungeonEventSystem } from "../dungeons/core/DungeonEventSystem";
import { DungeonPlayerManager } from "../dungeons/core/DungeonPlayerManager";
import { DungeonUIManager } from "../dungeons/ui/DungeonUIManager";
import { DungeonBackgroundManager } from "../dungeons/ui/DungeonBackgroundManager";
import { DungeonRewardSystem } from "../dungeons/mechanics/DungeonRewardSystem";
import { DungeonLevelSystem } from "../dungeons/core/DungeonLevelSystem";
import { DungeonFactory } from "../dungeons/core/DungeonFactory";
import { dungeonConfigRegistry } from "../dungeons/core/DungeonConfig";

/**
 * DungeonScene - The scene for dungeon exploration and combat
 */
export class DungeonScene extends Scene {
  constructor() {
    super("DungeonScene");
  }

  /**
   * Initialize the scene with the current dungeon data
   * @param {Object} data - Data passed from the previous scene
   */
  init(data) {
    logger.info(
      LogCategory.DUNGEON,
      "DungeonScene.init called with data:",
      data,
    );

    // Check if we have a dungeonId passed directly from the portal system
    if (data?.dungeonId) {
      logger.info(
        LogCategory.DUNGEON,
        `Initializing dungeon scene with dungeonId: ${data.dungeonId}`,
      );

      // Get the dungeon config from the registry
      const dungeonConfig = dungeonConfigRegistry.get(data.dungeonId);

      if (!dungeonConfig) {
        logger.error(
          LogCategory.DUNGEON,
          `Unknown dungeon type: ${data.dungeonId}`,
        );
        this.scene.start("MMOGame"); // Return to the main game if dungeon config not found
        return;
      }

      // Create a dungeon object
      this.currentDungeon = DungeonFactory.createDungeon(
        this,
        data.dungeonId,
        data.level || 1,
      );

      // Store it in the registry for future reference
      this.registry.set("currentDungeon", this.currentDungeon);

      logger.info(
        LogCategory.DUNGEON,
        `Created dungeon from dungeonId: ${this.currentDungeon.name}`,
      );
    } else {
      // Get the current dungeon from the registry (legacy method)
      this.currentDungeon = this.registry.get("currentDungeon");

      if (!this.currentDungeon) {
        logger.error(LogCategory.DUNGEON, "No dungeon data found in registry");
        this.scene.start("MMOGame"); // Return to the main game if no dungeon data
        return;
      }

      logger.info(
        LogCategory.DUNGEON,
        `Retrieved dungeon from registry: ${this.currentDungeon.name}`,
      );
    }

    logger.info(
      LogCategory.DUNGEON,
      `Initializing dungeon scene for: ${this.currentDungeon.name}`,
    );

    // Set the current level (default to 1)
    this.currentLevel = this.currentDungeon.currentLevel || 1;

    // Initialize player stats from the service
    this.playerStats = playerStatsService.getStats();

    // Debug flag to disable collisions (for testing movement issues)
    this.debugDisableCollisions = false;

    // Add a key to toggle collision debugging
    this.input.keyboard.once("keydown-C", () => {
      this.debugDisableCollisions = !this.debugDisableCollisions;
      logger.info(
        LogCategory.DUNGEON,
        `Collisions ${this.debugDisableCollisions ? "disabled" : "enabled"} for debugging`,
      );

      // Update colliders based on the debug flag
      if (this.debugDisableCollisions && this.wallsCollider) {
        this.wallsCollider.active = false;
        logger.info(LogCategory.DUNGEON, "Wall collisions disabled");
      } else if (!this.debugDisableCollisions && this.wallsCollider) {
        this.wallsCollider.active = true;
        logger.info(LogCategory.DUNGEON, "Wall collisions enabled");
      }
    });
  }

  /**
   * Preload assets specific to this dungeon
   */
  preload() {
    // Fix paths to use public directory
    this.load.setPath("assets");

    // Ensure currentDungeon exists and has required properties
    if (!this.currentDungeon) {
      logger.error(
        LogCategory.DUNGEON,
        "No dungeon data available in preload method",
      );
      this.scene.start("MMOGame");
      return;
    }

    // Set default values if properties are missing
    if (!this.currentDungeon.levels) {
      logger.warn(
        LogCategory.DUNGEON,
        "Dungeon missing levels property, setting default value",
      );
      this.currentDungeon.levels = 4;
    }

    if (!this.currentDungeon.id) {
      logger.error(LogCategory.DUNGEON, "Dungeon missing id property");
      this.scene.start("MMOGame");
      return;
    }

    // Load dungeon level images
    try {
      for (let i = 1; i <= this.currentDungeon.levels; i++) {
        this.load.image(
          `${this.currentDungeon.id}-level-${i}`,
          `dungeons/${this.currentDungeon.id}/level${i}.jpeg`,
        );

        // Log the image path for debugging
        logger.info(
          LogCategory.DUNGEON,
          `Loading level image: dungeons/${this.currentDungeon.id}/level${i}.jpeg`,
        );
      }
    } catch (error) {
      logger.error(
        LogCategory.DUNGEON,
        `Error loading dungeon level images: ${error}`,
      );
    }

    // Load monster sprites specific to this dungeon
    this.load.spritesheet("lizardfolk", "/monsters/lizardfolk-64.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image(
      "lizardfolk-king",
      "/dungeons/lost-swamp/lizardfolk-king-128.png",
    );

    // Load dungeon UI elements
    this.load.image("dungeon-exit", "/ui/dungeon/dungeon-exit.svg");
    this.load.image("level-portal", "/ui/dungeon/level-portal.svg");
    this.load.image("portal", "/dungeons/portal-128.png");

    // Load particle texture for item drops
    this.load.image("particle", "/particles/particle.png");
  }

  /**
   * Create the dungeon scene
   */
  create() {
    // Double-check that we have a valid dungeon
    if (!this.currentDungeon) {
      logger.error(
        LogCategory.DUNGEON,
        "No dungeon data available in create method",
      );
      this.scene.start("MMOGame");
      return;
    }

    logger.info(LogCategory.DUNGEON, "DEBUG: DungeonScene.create called", {
      currentDungeon: this.currentDungeon,
      currentLevel: this.currentLevel,
      isLostSwampLevel4:
        this.currentDungeon &&
        this.currentDungeon.id === "lost-swamp" &&
        this.currentLevel === 4,
    });

    logger.info(
      LogCategory.DUNGEON,
      `Creating dungeon scene for level ${this.currentLevel}`,
    );

    // Initialize the dungeon system with the current dungeon data
    this.dungeonSystem = new DungeonSystem(
      this,
      this.currentDungeon.id,
      this.currentLevel,
    );

    // Initialize subsystems
    this.initializeSubsystems();

    // Create the initial dungeon level
    if (this.dungeonLevelManager) {
      this.dungeonLevelManager.createLevel(this.currentLevel);

      // Setup player collision with walls
      if (this.dungeonLevelManager.walls && this.player) {
        this.physics.add.collider(this.player, this.dungeonLevelManager.walls);
      }
    }

    // Show welcome message
    this.uiManager.showMedievalMessage(
      `Entered ${this.currentDungeon.name} - Level ${this.currentLevel}`,
      "info",
      2000,
    );

    // Set up DOM event listeners for player interaction
    this.setupDOMEventListeners();
  }

  /**
   * Initialize subsystems
   */
  initializeSubsystems() {
    // Create background manager first (needed for level display)
    this.backgroundManager = new DungeonBackgroundManager(this);
    this.dungeonSystem.backgroundManager = this.backgroundManager;

    // Setup the background (black background, level image, vignette)
    this.backgroundManager.setupBackground();

    // Create popup system (needed by UI manager)
    this.popupSystem = new PopupSystem(this, null);

    // Create UI manager
    this.uiManager = new DungeonUIManager(this);
    this.uiManager.initialize();
    this.dungeonSystem.uiManager = this.uiManager;

    // Create event system
    this.eventSystem = new DungeonEventSystem(this);
    this.eventSystem.registerStandardEvents();
    this.dungeonSystem.eventSystem = this.eventSystem;

    // Create dungeon level system
    this.dungeonLevelManager = new DungeonLevelSystem(this);
    this.dungeonSystem.levelManager = this.dungeonLevelManager;

    // Create player manager and setup player
    this.playerManager = new DungeonPlayerManager(this);
    this.dungeonSystem.playerManager = this.playerManager;

    // Setup player first - this needs to happen before dungeon level creation
    const startPosition = this.dungeonLevelManager.getPlayerStartPosition();
    this.player = this.playerManager.setupPlayer(startPosition);

    // Create a simple item system for the dungeon
    // This is needed for the MonsterFactory
    this.itemSystem = {
      createItem: (x, y, itemId, quantity = 1, itemData = null) => {
        // If itemData is provided, use it, otherwise create a basic item data object
        const item = itemData || {
          id: itemId,
          name: this.getItemName(itemId),
          rarity: this.getItemRarity(itemId),
        };

        logger.info(
          LogCategory.ITEM,
          `Creating item ${item.name || itemId} (${item.rarity || "common"}) x${quantity} at (${x}, ${y})`,
        );

        // In the dungeon, we'll just log the item creation and add it to the registry
        // for the main game to handle when we return
        const items = this.registry.get("dungeonItems") || [];
        items.push({
          itemId,
          quantity,
          name: item.name,
          rarity: item.rarity,
          description: item.description,
        });
        this.registry.set("dungeonItems", items);

        // Show a message about the item with rarity color
        const rarityColor = this.getRarityColor(item.rarity);
        this.uiManager.showMedievalMessage(
          `Found ${quantity} ${rarityColor}${item.name || itemId}`,
          "success",
          2000,
        );

        // Create a visual effect for the item drop
        this.createItemDropEffect(x, y, item.rarity);

        return true;
      },

      // Helper method to get item name from ID
      getItemName: (itemId) => {
        // Map of special item names
        const itemNames = {
          "crown-of-the-swamp": "Crown of the Swamp",
          "lizardfolk-scale-armor": "Lizardfolk Scale Armor",
          "swamp-scepter": "Swamp Scepter",
          "potion-of-regeneration": "Potion of Regeneration",
          "ancient-swamp-map": "Ancient Swamp Map",
        };

        // Return the name if it exists, otherwise format the ID
        return (
          itemNames[itemId] ||
          itemId
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        );
      },

      // Helper method to get item rarity from ID
      getItemRarity: (itemId) => {
        // Map of special item rarities
        const itemRarities = {
          "crown-of-the-swamp": "legendary",
          "lizardfolk-scale-armor": "rare",
          "swamp-scepter": "rare",
          "potion-of-regeneration": "uncommon",
          "ancient-swamp-map": "quest",
        };

        // Return the rarity if it exists, otherwise return 'common'
        return itemRarities[itemId] || "common";
      },
    };

    // Create combat system
    this.combatSystem = new CombatSystem(this);
    this.dungeonSystem.combatSystem = this.combatSystem;

    // Create reward system
    this.rewardSystem = new DungeonRewardSystem(this);
    this.dungeonSystem.rewardSystem = this.rewardSystem;

    // Initialize the MonsterPopupSystem for monster interactions
    try {
      const { MonsterPopupSystem } = require("../monsters/MonsterPopupSystem");
      this.monsterPopupSystem = new MonsterPopupSystem(this, this.popupSystem);
      logger.info(LogCategory.MONSTER, "Monster popup system initialized");

      // Make the MonsterPopupSystem available to the scene and dungeonSystem
      this.dungeonSystem.monsterPopupSystem = this.monsterPopupSystem;
    } catch (error) {
      logger.error(
        LogCategory.MONSTER,
        `Failed to initialize MonsterPopupSystem: ${error.message}`,
      );
    }

    // Set up event listener for monster creation to ensure they're interactive
    this.events.on("monsterCreated", (monster) => {
      if (monster) {
        // Ensure monster is interactive
        monster.setInteractive({ useHandCursor: true });

        // Set up collision between player and monster for combat
        if (this.player && this.physics) {
          this.physics.add.overlap(
            this.player,
            monster,
            (player, monster) => {
              // Only process if monster is alive and not on cooldown
              if (monster.currentState !== "DEAD" && this.combatSystem) {
                this.combatSystem.monsterAttackPlayer(
                  monster,
                  monster.attributes.damage,
                );
              }
            },
            null,
            this,
          );
        }
      }
    });

    logger.info(LogCategory.DUNGEON, "All dungeon subsystems initialized");
  }

  /**
   * Get color code for item rarity
   * @param {string} rarity - The item rarity
   * @returns {string} - HTML color code
   */
  getRarityColor(rarity) {
    const rarityColors = {
      common: "#FFFFFF",
      uncommon: "#00FF00",
      rare: "#0070DD",
      epic: "#A335EE",
      legendary: "#FF8000",
      quest: "#FFD700",
    };

    const color = rarityColors[rarity] || "#FFFFFF";
    return `<span style="color: ${color}">`;
  }

  /**
   * Create a visual effect for item drops
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @param {string} rarity - The item rarity
   */
  createItemDropEffect(x, y, rarity) {
    // Create a particle effect based on rarity
    const rarityColors = {
      common: 0xffffff,
      uncommon: 0x00ff00,
      rare: 0x0070dd,
      epic: 0xa335ee,
      legendary: 0xff8000,
      quest: 0xffd700,
    };

    const color = rarityColors[rarity] || 0xffffff;

    try {
      // Use the new Phaser 3.60+ particle API
      const emitter = this.add.particles(x, y, "particle", {
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        blendMode: "ADD",
        lifespan: 1000,
        tint: color,
        quantity: 20,
        emitting: false, // Start with emitting off
      });

      // Emit a burst of particles
      emitter.explode(20);

      // Destroy the emitter after particles are done
      this.time.delayedCall(1500, () => {
        emitter.destroy();
      });

      logger.debug(
        LogCategory.ITEM,
        `Created item drop effect at (${x}, ${y}) with color ${color}`,
      );
    } catch (error) {
      logger.error(
        LogCategory.ITEM,
        `Error creating item drop effect: ${error.message}`,
      );
      // Don't let particle errors break the game
    }
  }

  /**
   * Handle monster defeat
   * @param {Object} monster - The defeated monster
   */
  handleMonsterDefeated(monster) {
    // Get the remaining monster count before filtering
    const initialMonsterCount = this.dungeonLevelManager.monsters.length;

    // Determine if this is a boss room
    const isBossRoom =
      this.currentLevel === this.currentDungeon.levels ||
      (this.currentDungeon.id === "lost-swamp" && this.currentLevel === 4);

    logger.info(
      LogCategory.DUNGEON,
      `Monster defeated: ${monster.name || monster.monsterName}`,
      {
        isBoss: monster.isBoss,
        monsterType: monster.monsterType,
        currentLevel: this.currentLevel,
        dungeonId: this.currentDungeon.id,
        initialRemainingMonsters: initialMonsterCount,
        isBossRoom: isBossRoom,
      },
    );

    // If we're in a boss room, make sure the UI is updated
    if (
      isBossRoom &&
      this.uiManager &&
      typeof this.uiManager.handleMonsterDefeated === "function"
    ) {
      // Directly call the UI manager's monster defeated handler to update the counter
      this.uiManager.handleMonsterDefeated(monster);

      // Check if the UI counter has reached 0
      if (this.uiManager.monsterCount === 0) {
        logger.info(
          LogCategory.DUNGEON,
          "UI monster counter has reached 0 - all monsters defeated!",
        );

        // Mark the monster as dead in case it's not already marked
        if (monster && !monster.isDead) {
          monster.isDead = true;
        }

        // Force a check for all monsters defeated
        this.activatePortalAfterDelay(500);
        return;
      }
    }

    // Check if this was the boss
    if (monster.isBoss) {
      logger.info(LogCategory.DUNGEON, "Boss defeated!");

      // Mark the boss as defeated
      this.dungeonLevelManager.setBossDefeated(true);

      // Special handling for Lizardfolk King in level 4 of Lost Swamp
      if (
        this.currentDungeon.id === "lost-swamp" &&
        this.currentLevel === 4 &&
        monster.name === "Lizardfolk King"
      ) {
        this.handleLizardfolkKingDefeated(monster);

        // Check if all monsters are defeated after the boss
        if (this.uiManager && this.uiManager.monsterCount === 0) {
          this.activatePortalAfterDelay(500);
        }
        return;
      }

      // Show victory message
      this.uiManager.showMedievalMessage(
        `You have defeated ${monster.name || monster.monsterName}!`,
        "success",
        3000,
      );

      // Give rewards
      if (monster.rewards) {
        this.rewardSystem.giveRewards(monster.rewards);
      } else if (monster.lootTable && monster.lootTable.length > 0) {
        // Process loot table if rewards aren't directly specified
        for (const loot of monster.lootTable) {
          if (Math.random() <= (loot.chance || loot.dropChance || 0.5)) {
            if (this.itemSystem) {
              this.itemSystem.createItem(
                monster.x,
                monster.y,
                loot.itemId,
                1, // Quantity
                {
                  id: loot.itemId,
                  name: loot.name || this.itemSystem.getItemName(loot.itemId),
                  rarity:
                    loot.rarity || this.itemSystem.getItemRarity(loot.itemId),
                  description: `A rare item dropped by ${monster.name || monster.monsterName}.`,
                },
              );
            }
          }
        }
      }
    }

    // Mark the monster as dead
    if (monster && !monster.isDead) {
      monster.isDead = true;
    }

    // Force a check for all monsters defeated immediately
    const allDefeatedImmediate =
      this.dungeonLevelManager.areAllMonstersDefeated();
    const remainingMonsters = this.dungeonLevelManager.monsters.length;

    logger.info(
      LogCategory.DUNGEON,
      `Immediate all monsters defeated check: ${allDefeatedImmediate}`,
      {
        remainingMonsters: remainingMonsters,
        isFinalLevel: this.currentLevel === this.currentDungeon.levels,
        isBossRoom: isBossRoom,
      },
    );

    if (allDefeatedImmediate) {
      this.activatePortalAfterDelay(500);
      return;
    }

    // Check if all monsters are defeated after a short delay
    // This gives time for any death animations or effects to complete
    this.time.delayedCall(1000, () => {
      const allDefeated = this.dungeonLevelManager.areAllMonstersDefeated();
      const finalRemainingMonsters = this.dungeonLevelManager.monsters.length;

      logger.info(
        LogCategory.DUNGEON,
        `Delayed all monsters defeated check: ${allDefeated}`,
        {
          remainingMonsters: finalRemainingMonsters,
          isBossRoom: isBossRoom,
        },
      );

      if (allDefeated) {
        this.activatePortalAfterDelay(500);
      }
    });
  }

  /**
   * Activate the portal after a delay
   * @param {number} delay - The delay in milliseconds
   */
  activatePortalAfterDelay(delay) {
    // Prevent multiple activations
    if (this._portalActivationInProgress) {
      logger.debug(
        LogCategory.DUNGEON,
        "Portal activation already in progress, ignoring duplicate call",
      );
      return;
    }

    // Set flag to prevent multiple activations
    this._portalActivationInProgress = true;

    logger.info(LogCategory.DUNGEON, "All monsters defeated!");

    // Show victory message
    this.uiManager.showMedievalMessage(
      "All enemies have been defeated!",
      "success",
      3000,
    );

    // Determine if this is a boss room
    const isFinalLevel =
      this.currentLevel === this.currentDungeon.levels ||
      (this.currentDungeon.id === "lost-swamp" && this.currentLevel === 4);

    // If we're in a boss room, update the monster counter to show 0
    if (
      isFinalLevel &&
      this.uiManager &&
      typeof this.uiManager.handleMonsterDefeated === "function"
    ) {
      // Make sure the monster counter shows 0
      const monsterCounter = this.uiManager.uiElements.get("monsterCounter");
      if (monsterCounter) {
        monsterCounter.setText("Monsters Remaining: 0");
        monsterCounter.setColor("#00ff00"); // Set to green to indicate completion
      }

      // Also ensure the UI manager's monster count is 0
      if (this.uiManager.monsterCount > 0) {
        this.uiManager.monsterCount = 0;
      }

      logger.info(
        LogCategory.DUNGEON,
        "Updated monster counter to show all monsters defeated",
      );
    }

    // Force clear any remaining monsters in the level manager
    if (
      this.dungeonLevelManager &&
      this.dungeonLevelManager.monsters.length > 0
    ) {
      logger.info(
        LogCategory.DUNGEON,
        `Forcing monster array to be empty. Previous count: ${this.dungeonLevelManager.monsters.length}`,
      );
      this.dungeonLevelManager.monsters = [];
    }

    // Activate the portal at the center of the level
    this.time.delayedCall(delay, () => {
      logger.info(
        LogCategory.DUNGEON,
        "Activating portal after all monsters defeated",
        {
          hasExitPortal: !!this.dungeonLevelManager.exitPortal,
          isPortalActive: this.dungeonLevelManager.exitPortal
            ? this.dungeonLevelManager.exitPortal.isActive
            : false,
          isFinalLevel: isFinalLevel,
        },
      );

      // If this is the final level, mark the dungeon as completed
      if (isFinalLevel) {
        this.registry.set("dungeonCompleted", this.currentDungeon.id);

        // Show a message about completing the dungeon
        this.uiManager.showMedievalMessage(
          "You have completed this dungeon! Use the portal to exit.",
          "success",
          4000,
        );
      }

      // If there's an inactive portal, activate it, otherwise create a new one
      if (
        this.dungeonLevelManager.exitPortal &&
        !this.dungeonLevelManager.exitPortal.isActive
      ) {
        if (isFinalLevel) {
          // For final level, directly activate the portal
          this.dungeonLevelManager.exitPortal.isActive = true;
          this.dungeonLevelManager.exitPortal.setAlpha(1.0);

          // Update particles to show it's active
          if (this.dungeonLevelManager.exitPortal.particleEmitter) {
            this.dungeonLevelManager.exitPortal.particleEmitter.stop();
            this.dungeonLevelManager.exitPortal.particleEmitter.destroy();
          }

          // Create new particles with active colors
          const emitter = this.add.particles(
            this.dungeonLevelManager.exitPortal.x,
            this.dungeonLevelManager.exitPortal.y,
            "particle",
            {
              speed: { min: 10, max: 30 },
              angle: { min: 0, max: 360 },
              scale: { start: 0.3, end: 0 },
              blendMode: "ADD",
              lifespan: 2000,
              tint: 0x00ffff,
              frequency: 150,
              quantity: 1,
            },
          );

          this.dungeonLevelManager.exitPortal.particleEmitter = emitter;
        } else {
          // For non-final levels, use the existing method
          this.dungeonLevelManager.createCenterPortal();
        }
      } else if (!this.dungeonLevelManager.exitPortal) {
        // If there's no portal, create one
        if (isFinalLevel) {
          // For final level, create an exit portal
          const bounds = this.dungeonLevelManager.getLevelBounds();
          const portalPosition = {
            x: bounds.centerX,
            y: bounds.centerY,
          };

          const portal = this.uiManager.showExitPortal(portalPosition, true);
          this.dungeonLevelManager.exitPortal = portal;

          // Add collision with player
          this.physics.add.overlap(
            this.player,
            portal,
            this.handleExitPortalCollision,
            null,
            this,
          );
        } else {
          // For non-final levels, use the existing method
          this.dungeonLevelManager.createCenterPortal();
        }
      }

      // Reset the activation flag after portal is created
      this._portalActivationInProgress = false;
    });
  }

  /**
   * Handle the defeat of the Lizardfolk King in level 4
   * @param {Object} king - The defeated Lizardfolk King
   */
  handleLizardfolkKingDefeated(king) {
    // Create a dramatic sequence for the king's defeat

    // 1. Show a dramatic message
    this.uiManager.showMedievalMessage(
      "The Lizardfolk King falls from his throne!",
      "success",
      4000,
    );

    // 2. After a delay, show another message with story progression
    this.time.delayedCall(4500, () => {
      this.uiManager.showMedievalMessage(
        "With his dying breath, the king reveals the location of the sacred artifact...",
        "info",
        5000,
      );

      // 3. After another delay, show a message about rewards
      this.time.delayedCall(5500, () => {
        // Give special rewards
        if (king.lootTable && king.lootTable.length > 0) {
          // Process each item in the loot table
          for (const loot of king.lootTable) {
            // Check if the item should drop based on chance
            if (Math.random() <= loot.chance) {
              // Add the item to the player's inventory with proper name and rarity
              if (this.itemSystem) {
                this.itemSystem.createItem(
                  king.x,
                  king.y,
                  loot.itemId,
                  1, // Quantity
                  {
                    id: loot.itemId,
                    name: loot.name || this.itemSystem.getItemName(loot.itemId),
                    rarity:
                      loot.rarity || this.itemSystem.getItemRarity(loot.itemId),
                    description: "A rare item dropped by the Lizardfolk King.",
                  },
                );
              }
            }
          }
        } else {
          // Fallback if no loot table is defined
          if (this.itemSystem) {
            this.itemSystem.createItem(
              king.x,
              king.y,
              "crown-of-the-swamp",
              1,
              {
                id: "crown-of-the-swamp",
                name: "Crown of the Swamp",
                rarity: "legendary",
                description:
                  "The crown of the Lizardfolk King, imbued with ancient swamp magic.",
              },
            );
          }
        }

        // Add some gold as well
        this.playerStats.gold += king.goldReward || 500;
        this.uiManager.showMedievalMessage(
          `You found ${king.goldReward || 500} gold!`,
          "success",
          3000,
        );

        // Add experience
        this.playerStats.experience += king.experienceReward || 1000;
        this.uiManager.showMedievalMessage(
          `You gained ${king.experienceReward || 1000} experience!`,
          "success",
          3000,
        );

        // 4. After all rewards, activate the portal
        this.time.delayedCall(3500, () => {
          // Check if all monsters are defeated
          if (this.dungeonLevelManager.areAllMonstersDefeated()) {
            // Mark the dungeon as completed since this is the final boss
            this.registry.set("dungeonCompleted", this.currentDungeon.id);

            // If there's an inactive portal, activate it
            if (
              this.dungeonLevelManager.exitPortal &&
              !this.dungeonLevelManager.exitPortal.isActive
            ) {
              // Activate the existing portal
              this.dungeonLevelManager.exitPortal.isActive = true;
              this.dungeonLevelManager.exitPortal.setAlpha(1.0);

              // Add a particle effect to show it's active
              if (this.dungeonLevelManager.exitPortal.particleEmitter) {
                this.dungeonLevelManager.exitPortal.particleEmitter.stop();
                this.dungeonLevelManager.exitPortal.particleEmitter.destroy();
              }

              // Create new particles with active colors
              const emitter = this.add.particles(
                this.dungeonLevelManager.exitPortal.x,
                this.dungeonLevelManager.exitPortal.y,
                "particle",
                {
                  speed: { min: 10, max: 30 },
                  angle: { min: 0, max: 360 },
                  scale: { start: 0.3, end: 0 },
                  blendMode: "ADD",
                  lifespan: 2000,
                  tint: 0x00ffff,
                  frequency: 150,
                  quantity: 1,
                },
              );

              this.dungeonLevelManager.exitPortal.particleEmitter = emitter;

              // Show a hint message
              this.uiManager.showMedievalMessage(
                "The king's power flows into the portal, fully activating it! You can now exit the dungeon.",
                "info",
                3000,
              );
            } else if (!this.dungeonLevelManager.exitPortal) {
              // If there's no portal, create one at the throne position
              const thronePosition = {
                x: king.thronePosition ? king.thronePosition.x : king.x,
                y: king.thronePosition ? king.thronePosition.y : king.y,
              };

              const portal = this.uiManager.showExitPortal(
                thronePosition,
                true,
              );
              this.dungeonLevelManager.exitPortal = portal;

              // Add collision with player
              this.physics.add.overlap(
                this.player,
                portal,
                this.handleExitPortalCollision,
                null,
                this,
              );

              // Show a hint message
              this.uiManager.showMedievalMessage(
                "A magical portal appears on the throne! You can now exit the dungeon.",
                "info",
                3000,
              );
            }
          } else {
            // If there are still monsters, show a message
            this.uiManager.showMedievalMessage(
              "The portal remains dormant. Defeat all remaining enemies to activate it!",
              "warning",
              3000,
            );
          }
        });
      });
    });
  }

  /**
   * Handle level completion
   */
  handleLevelCompleted() {
    logger.info(LogCategory.DUNGEON, `Level ${this.currentLevel} completed`);

    // Show level completion message
    this.uiManager.showMedievalMessage(
      `Level ${this.currentLevel} completed!`,
      "success",
      3000,
    );

    // If this is the final level, mark the dungeon as completed
    if (this.currentLevel === this.currentDungeon.levels) {
      this.eventSystem.emit("dungeonCompleted");
    } else {
      // Otherwise, proceed to the next level
      this.goToNextLevel();
    }
  }

  /**
   * Handle dungeon completion
   */
  handleDungeonCompleted() {
    logger.info(
      LogCategory.DUNGEON,
      `Dungeon ${this.currentDungeon.name} completed`,
    );

    // Mark the dungeon as completed
    this.registry.set("dungeonCompleted", this.currentDungeon.id);

    // Show dungeon completion message
    this.uiManager.showMedievalMessage(
      `You have conquered ${this.currentDungeon.name}!`,
      "success",
      5000,
    );
  }

  /**
   * Go to the next level of the dungeon
   */
  goToNextLevel() {
    // Increment the current level
    this.currentLevel++;

    console.log(
      `Going to next level: ${this.currentLevel} in dungeon ${this.currentDungeon.name} (${this.currentDungeon.id})`,
    );

    // Update the current level in the dungeon object
    this.currentDungeon.currentLevel = this.currentLevel;

    // Update the registry
    this.registry.set("currentDungeon", this.currentDungeon);

    // Update the background to show the new level image
    if (this.backgroundManager) {
      this.backgroundManager.changeLevel(this.currentLevel);
    }

    // Create the new level
    if (this.dungeonLevelManager) {
      this.dungeonLevelManager.createLevel(this.currentLevel);
    }

    // Get the new player start position
    const startPosition = this.dungeonLevelManager.getPlayerStartPosition();

    // Move the player to the new start position
    if (this.player) {
      this.player.setPosition(startPosition.x, startPosition.y);

      // Reset player velocity and animation
      this.player.setVelocity(0, 0);
      this.player.anims.play("player-idle", true);
    }

    // Setup player collision with walls
    if (this.dungeonLevelManager.walls && this.player) {
      this.physics.add.collider(this.player, this.dungeonLevelManager.walls);
    }

    // Show level transition message
    this.uiManager.showMedievalMessage(
      `Entering Level ${this.currentLevel}`,
      "info",
      3000,
    );

    logger.info(LogCategory.DUNGEON, `Advanced to level ${this.currentLevel}`);
  }

  /**
   * Handle collision with the exit portal
   * @param {Object} player - The player sprite
   * @param {Object} portal - The portal sprite
   */
  handleExitPortalCollision(player, portal) {
    // Check if the portal is active
    if (!portal.isActive) {
      // Only process once per second to avoid spam
      const now = Date.now();
      if (this.lastPortalCollision && now - this.lastPortalCollision < 1000) {
        return;
      }
      this.lastPortalCollision = now;

      // Show a message that the portal cannot be used yet
      this.uiManager.showMedievalMessage(
        "This portal is dormant. Defeat all enemies to activate it.",
        "warning",
        2000,
      );

      logger.info(
        LogCategory.DUNGEON,
        "Player attempted to use inactive portal",
      );
      return;
    }

    // Log the collision
    logger.info(
      LogCategory.DUNGEON,
      "Player collided with active exit portal",
      {
        portalPosition: { x: portal.x, y: portal.y },
        playerPosition: { x: player.x, y: player.y },
        isFinalLevel: this.currentLevel === this.currentDungeon.levels,
        currentLevel: this.currentLevel,
        dungeonId: this.currentDungeon.id,
      },
    );

    // Only process once per second to avoid spam
    const now = Date.now();
    if (
      this.lastActivePortalCollision &&
      now - this.lastActivePortalCollision < 1000
    ) {
      return;
    }
    this.lastActivePortalCollision = now;

    // Check if this is the final level of the dungeon
    const isFinalLevel =
      this.currentLevel === this.currentDungeon.levels ||
      (this.currentDungeon.id === "lost-swamp" && this.currentLevel === 4);

    // If this is the final level, show a different message about exiting the dungeon
    if (isFinalLevel) {
      this.uiManager.showMedievalMessage(
        "Do you want to exit the dungeon? You have completed all levels.",
        "question",
        0,
        [
          {
            text: "Exit Dungeon",
            callback: () => {
              logger.info(LogCategory.DUNGEON, "Player confirmed dungeon exit");

              // Mark the dungeon as completed
              this.registry.set("dungeonCompleted", this.currentDungeon.id);

              // Exit the dungeon
              this.exitDungeon();
            },
          },
          {
            text: "Stay",
            callback: () => {
              // Do nothing
              logger.info(LogCategory.DUNGEON, "Player declined dungeon exit");
            },
          },
        ],
      );
    } else {
      // For non-final levels, show the regular next level message
      this.uiManager.showMedievalMessage(
        "Do you want to proceed to the next level?",
        "question",
        0,
        [
          {
            text: "Yes",
            callback: () => {
              logger.info(LogCategory.DUNGEON, "Player confirmed portal use");
              // Proceed to the next level
              this.goToNextLevel();
            },
          },
          {
            text: "No",
            callback: () => {
              // Do nothing
              logger.info(LogCategory.DUNGEON, "Player declined portal use");
            },
          },
        ],
      );
    }
  }

  /**
   * Exit the dungeon and return to the main game
   */
  exitDungeon() {
    logger.info(
      LogCategory.DUNGEON,
      `Exiting dungeon: ${this.currentDungeon.name}`,
    );

    try {
      // Check if the dungeon was completed
      const dungeonCompleted = this.registry.get("dungeonCompleted");

      // If the dungeon was completed, update its status in the main game
      if (dungeonCompleted === this.currentDungeon.id) {
        this.registry.set("updateDungeonStatus", {
          id: this.currentDungeon.id,
          completed: true,
        });
      }

      // Use a more controlled transition back to the main game scene
      // First, wake up the Game scene if it's sleeping
      if (this.scene.isSleeping("MMOGame")) {
        this.scene.wake("MMOGame");

        // After a short delay, stop this scene
        this.time.delayedCall(100, () => {
          this.scene.stop();
        });
      } else {
        // If Game scene is not sleeping, start it and stop this scene
        this.scene.start("MMOGame");
      }

      logger.info(LogCategory.DUNGEON, "Successfully exited dungeon");
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error exiting dungeon: ${error}`);

      // Fallback to direct transition if the controlled transition fails
      this.scene.start("MMOGame");
    }
  }

  /**
   * Handle double-click movement to a target position
   * This method is added for compatibility with the Game scene
   * @param {Object} data - Data containing target position
   */
  handleDoubleClickMove(data) {
    if (!data || !this.playerManager) return;

    logger.info(
      LogCategory.DUNGEON,
      `DungeonScene.handleDoubleClickMove called with data:`,
      data,
    );

    try {
      // Use the playerManager to move the player
      this.playerManager.movePlayerToPosition(data.x, data.y);
    } catch (error) {
      logger.error(LogCategory.DUNGEON, "Error during player movement:", error);
      if (this.uiManager) {
        this.uiManager.showMessage("Movement error occurred!", "error");
      }
    }
  }

  /**
   * Set up DOM event listeners for player interaction
   */
  setupDOMEventListeners() {
    // Get the canvas element
    const canvas = this.sys.game.canvas;

    // Add a double-click event listener to the canvas for movement
    this.canvasDoubleClickListener = (e) => {
      // Get the click position
      const clickX = e.offsetX;
      const clickY = e.offsetY;

      logger.info(
        LogCategory.DUNGEON,
        "Double-click detected at:",
        clickX,
        clickY,
      );

      // Handle double-click movement
      this.handleDoubleClickMove({
        x: clickX,
        y: clickY,
      });

      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener("dblclick", this.canvasDoubleClickListener);

    logger.info(
      LogCategory.DUNGEON,
      "DOM event listeners set up for dungeon scene",
    );
  }

  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Update the dungeon system, which will update all subsystems
    if (this.dungeonSystem) {
      this.dungeonSystem.update(time, delta);
    }
  }

  /**
   * Clean up resources when the scene is shut down
   */
  shutdown() {
    try {
      logger.info(
        LogCategory.DUNGEON,
        "Starting DungeonScene shutdown process",
      );

      // Destroy the dungeon system, which will destroy all subsystems
      if (this.dungeonSystem) {
        this.dungeonSystem.destroy();
        this.dungeonSystem = null;
      }

      // Stop all tweens
      this.tweens.killAll();

      // Stop all timers
      this.time.removeAllEvents();

      // Clear all physics bodies
      this.physics.world.colliders.destroy();

      // Clear the display list manually to avoid issues
      const displayList = this.children.list;
      for (let i = displayList.length - 1; i >= 0; i--) {
        const child = displayList[i];
        if (child && typeof child.destroy === "function") {
          child.destroy();
        }
      }

      // Clean up double-click event listener
      const canvas = this.sys.game.canvas;
      if (canvas && this.canvasDoubleClickListener) {
        canvas.removeEventListener("dblclick", this.canvasDoubleClickListener);
      }

      logger.info(
        LogCategory.DUNGEON,
        "DungeonScene shutdown completed successfully",
      );
    } catch (error) {
      logger.error(
        LogCategory.DUNGEON,
        `Error during dungeon scene shutdown: ${error}`,
      );
    }
  }
}

