import { Scene } from 'phaser';
import { logger, LogCategory } from '../utils/Logger';
import { DungeonLevelManager } from '../utils/DungeonLevelManager';
import { PlayerManager } from '../utils/player/PlayerManager';
import { UIManager } from '../utils/ui/UIManager';
import { CombatSystem } from '../utils/CombatSystem';
import playerStatsService from '../utils/player/PlayerStatsService';
import { PopupSystem } from '../ui/popup';

/**
 * DungeonScene - The scene for dungeon exploration and combat
 */
export class DungeonScene extends Scene {
  constructor() {
    super('DungeonScene');
  }

  /**
   * Initialize the scene with the current dungeon data
   * @param {Object} data - Data passed from the previous scene
   */
  init(data) {
    // Get the current dungeon from the registry
    this.currentDungeon = this.registry.get('currentDungeon');
    
    if (!this.currentDungeon) {
      logger.error(LogCategory.DUNGEON, 'No dungeon data found in registry');
      this.scene.start('Game'); // Return to the main game if no dungeon data
      return;
    }
    
    logger.info(LogCategory.DUNGEON, `Initializing dungeon scene for: ${this.currentDungeon.name}`);
    
    // Set the current level (default to 1)
    this.currentLevel = this.currentDungeon.currentLevel || 1;
    
    // Initialize player stats from the service
    this.playerStats = playerStatsService.getStats();
  }

  /**
   * Preload assets specific to this dungeon
   */
  preload() {
    // Load dungeon level images
    for (let i = 1; i <= this.currentDungeon.levels; i++) {
      this.load.image(
        `${this.currentDungeon.id}-level-${i}`,
        `assets/dungeons/${this.currentDungeon.id}/level${i}.jpeg`
      );
    }
    
    // Load monster sprites specific to this dungeon
    this.load.spritesheet('lizardfolk', 'assets/monsters/lizardfolk.png', { 
      frameWidth: 32, 
      frameHeight: 32 
    });
    
    this.load.spritesheet('lizardfolk-king', 'assets/monsters/lizardfolk-king.png', { 
      frameWidth: 64, 
      frameHeight: 64 
    });
    
    // Load dungeon UI elements
    this.load.image('dungeon-exit', 'assets/ui/dungeon/dungeon-exit.svg');
    this.load.image('level-portal', 'assets/ui/dungeon/level-portal.svg');
  }

  /**
   * Create the dungeon scene
   */
  create() {
    logger.info(LogCategory.DUNGEON, `Creating dungeon scene for level ${this.currentLevel}`);
    
    // Set a dark background color
    this.cameras.main.setBackgroundColor('#000000');
    
    // Initialize managers
    this.initializeManagers();
    
    // Setup player first - this needs to happen before dungeon level creation
    this.setupPlayer();
    
    // Create the dungeon level after player is set up
    this.dungeonLevelManager.createLevel(this.currentLevel);
    
    // Setup UI
    this.setupUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show welcome message
    this.showMedievalMessage(
      `Entered ${this.currentDungeon.name} - Level ${this.currentLevel}`,
      'info',
      3000
    );
  }
  
  /**
   * Initialize managers
   */
  initializeManagers() {
    // Create UI manager
    this.uiManager = new UIManager(this, null);
    
    // Create dungeon level manager
    this.dungeonLevelManager = new DungeonLevelManager(this);
    
    // Create player manager
    this.playerManager = new PlayerManager(this);
    
    // Create combat system
    this.combatSystem = new CombatSystem(this);
    
    // Create popup system
    this.popupSystem = new PopupSystem(this, null);
    
    // Create a simple item system for the dungeon
    // This is needed for the MonsterFactory
    this.itemSystem = {
      createItem: (x, y, itemId, quantity = 1) => {
        logger.info(LogCategory.ITEM, `Creating item ${itemId} x${quantity} at (${x}, ${y})`);
        // In the dungeon, we'll just log the item creation and add it to the registry
        // for the main game to handle when we return
        const items = this.registry.get('dungeonItems') || [];
        items.push({ itemId, quantity });
        this.registry.set('dungeonItems', items);
        
        // Show a message about the item
        this.showMedievalMessage(`Found ${quantity} ${itemId}`, 'success', 2000);
        
        return true;
      }
    };
    
    logger.info(LogCategory.DUNGEON, 'Managers initialized');
  }
  
  /**
   * Setup the player in the dungeon
   */
  setupPlayer() {
    // Get player start position, or use default if not available yet
    let startX = 400;
    let startY = 300;
    
    // Try to get position from dungeon level manager if available
    if (this.dungeonLevelManager && typeof this.dungeonLevelManager.getPlayerStartPosition === 'function') {
      const startPos = this.dungeonLevelManager.getPlayerStartPosition();
      if (startPos && typeof startPos.x === 'number' && typeof startPos.y === 'number') {
        startX = startPos.x;
        startY = startPos.y;
      }
    }
    
    // Create player sprite
    this.player = this.physics.add.sprite(startX, startY, 'player');
    
    // Set up basic player properties
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setDepth(10); // Ensure player is above other objects
    
    // Setup player animations if player manager is available
    if (this.playerManager && typeof this.playerManager.setupPlayerAnimations === 'function') {
      this.playerManager.setupPlayerAnimations();
    }
    
    // Setup player movement if player manager is available
    if (this.playerManager && typeof this.playerManager.setupPlayerMovement === 'function') {
      this.playerManager.setupPlayerMovement();
    }
    
    // Setup player collision with walls if available
    if (this.dungeonLevelManager && this.dungeonLevelManager.walls) {
      this.physics.add.collider(
        this.player,
        this.dungeonLevelManager.walls
      );
    }
    
    logger.info(LogCategory.DUNGEON, `Player set up at position (${startX}, ${startY})`);
  }
  
  /**
   * Setup the dungeon UI
   */
  setupUI() {
    // Create a simple dungeon info display
    this.createDungeonInfoDisplay();
    
    // Create a simple player health display
    this.createPlayerHealthDisplay();
    
    // Create exit button
    this.exitButton = this.add.image(
      this.cameras.main.width - 50,
      50,
      'dungeon-exit'
    ).setInteractive().setScrollFactor(0);
    
    this.exitButton.on('pointerdown', () => {
      this.showExitConfirmation();
    });
    
    // If this is the boss level and the boss is defeated, show exit portal
    if (this.currentLevel === this.currentDungeon.levels && 
        this.dungeonLevelManager.isBossDefeated()) {
      this.showExitPortal();
    }
  }
  
  /**
   * Create a simple dungeon info display
   */
  createDungeonInfoDisplay() {
    // Create a text display for dungeon info
    this.dungeonInfoText = this.add.text(
      10, 
      10, 
      `${this.currentDungeon.name} - Level ${this.currentLevel}`, 
      { 
        fontFamily: 'Cinzel, serif',
        fontSize: '18px',
        color: '#f0d6a8',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setScrollFactor(0);
  }
  
  /**
   * Create a simple player health display
   */
  createPlayerHealthDisplay() {
    // Create a text display for player health
    this.healthText = this.add.text(
      10, 
      40, 
      `Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`, 
      { 
        fontFamily: 'Cinzel, serif',
        fontSize: '16px',
        color: '#ff6666',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setScrollFactor(0);
    
    // Update the health display in the update loop
    this.events.on('update', () => {
      if (this.healthText) {
        this.healthText.setText(`Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`);
      }
    });
  }
  
  /**
   * Setup event listeners for the dungeon
   */
  setupEventListeners() {
    // Listen for player click
    this.input.on('pointerdown', (pointer) => {
      // Check if the click is on a UI element
      if (this.uiManager.isClickOnUI(pointer)) {
        return;
      }
      
      // Handle player movement
      this.playerManager.handlePlayerMovement(pointer);
    });
    
    // Listen for monster defeat
    this.events.on('monsterDefeated', (monster) => {
      this.handleMonsterDefeated(monster);
    });
    
    // Listen for level completion
    this.events.on('levelCompleted', () => {
      this.handleLevelCompleted();
    });
    
    // Listen for dungeon completion
    this.events.on('dungeonCompleted', () => {
      this.handleDungeonCompleted();
    });
  }
  
  /**
   * Handle monster defeat
   * @param {Object} monster - The defeated monster
   */
  handleMonsterDefeated(monster) {
    logger.info(LogCategory.DUNGEON, `Monster defeated: ${monster.name}`);
    
    // Check if this was the boss
    if (monster.isBoss) {
      logger.info(LogCategory.DUNGEON, 'Boss defeated!');
      
      // Mark the boss as defeated
      this.dungeonLevelManager.setBossDefeated(true);
      
      // If this is the final level, show the exit portal
      if (this.currentLevel === this.currentDungeon.levels) {
        this.showExitPortal();
      }
      
      // Show victory message
      this.showMedievalMessage(
        `You have defeated ${monster.name}!`,
        'success',
        3000
      );
      
      // Give rewards
      this.giveRewards(monster.rewards);
    }
  }
  
  /**
   * Handle level completion
   */
  handleLevelCompleted() {
    logger.info(LogCategory.DUNGEON, `Level ${this.currentLevel} completed`);
    
    // Show level completion message
    this.showMedievalMessage(
      `Level ${this.currentLevel} completed!`,
      'success',
      3000
    );
    
    // If this is the final level, mark the dungeon as completed
    if (this.currentLevel === this.currentDungeon.levels) {
      this.events.emit('dungeonCompleted');
    } else {
      // Otherwise, proceed to the next level
      this.goToNextLevel();
    }
  }
  
  /**
   * Handle dungeon completion
   */
  handleDungeonCompleted() {
    logger.info(LogCategory.DUNGEON, `Dungeon ${this.currentDungeon.name} completed`);
    
    // Mark the dungeon as completed
    this.registry.set('dungeonCompleted', this.currentDungeon.id);
    
    // Show dungeon completion message
    this.showMedievalMessage(
      `You have conquered ${this.currentDungeon.name}!`,
      'success',
      5000
    );
  }
  
  /**
   * Go to the next level of the dungeon
   */
  goToNextLevel() {
    // Increment the current level
    this.currentLevel++;
    
    // Update the current level in the dungeon object
    this.currentDungeon.currentLevel = this.currentLevel;
    
    // Update the registry
    this.registry.set('currentDungeon', this.currentDungeon);
    
    // Restart the scene to load the new level
    this.scene.restart();
  }
  
  /**
   * Show the exit portal after defeating the boss
   */
  showExitPortal() {
    // Create the exit portal
    const portalPosition = this.dungeonLevelManager.getExitPortalPosition();
    
    this.exitPortal = this.physics.add.sprite(
      portalPosition.x,
      portalPosition.y,
      'level-portal'
    );
    
    // Add a simple animation to the portal
    this.tweens.add({
      targets: this.exitPortal,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.8, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add a rotation animation
    this.tweens.add({
      targets: this.exitPortal,
      angle: 360,
      duration: 10000,
      repeat: -1,
      ease: 'Linear'
    });
    
    // Add collision with player
    this.physics.add.overlap(
      this.player,
      this.exitPortal,
      this.handleExitPortalCollision,
      null,
      this
    );
  }
  
  /**
   * Handle collision with the exit portal
   */
  handleExitPortalCollision() {
    // Show exit confirmation
    this.showExitConfirmation();
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
          selector: '#confirm-exit-btn',
          onClick: () => {
            this.exitDungeon();
            this.uiManager.closeAllPopups();
          }
        },
        {
          selector: '#cancel-exit-btn',
          onClick: () => {
            this.uiManager.closeAllPopups();
          }
        }
      ]
    };
    
    // Show popup using UI manager
    this.uiManager.showCustomPopup(content, {
      className: 'medieval-popup',
      width: 400,
      centered: true
    });
  }
  
  /**
   * Exit the dungeon and return to the main game
   */
  exitDungeon() {
    logger.info(LogCategory.DUNGEON, `Exiting dungeon: ${this.currentDungeon.name}`);
    
    try {
      // Check if the dungeon was completed
      const dungeonCompleted = this.registry.get('dungeonCompleted');
      
      // If the dungeon was completed, update its status in the main game
      if (dungeonCompleted === this.currentDungeon.id) {
        this.registry.set('updateDungeonStatus', {
          id: this.currentDungeon.id,
          completed: true
        });
      }
      
      // Use a more controlled transition back to the main game scene
      // First, wake up the Game scene if it's sleeping
      if (this.scene.isSleeping('Game')) {
        this.scene.wake('Game');
        
        // After a short delay, stop this scene
        this.time.delayedCall(100, () => {
          this.scene.stop();
        });
      } else {
        // If Game scene is not sleeping, start it and stop this scene
        this.scene.start('Game');
      }
      
      logger.info(LogCategory.DUNGEON, 'Successfully exited dungeon');
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error exiting dungeon: ${error.message}`);
      
      // Fallback to direct transition if the controlled transition fails
      this.scene.start('Game');
    }
  }
  
  /**
   * Give rewards to the player
   * @param {Object} rewards - The rewards to give
   */
  giveRewards(rewards) {
    // Give XP
    if (rewards.xp) {
      playerStatsService.addXP(rewards.xp);
      this.showMedievalMessage(`+${rewards.xp} XP`, 'success', 2000);
    }
    
    // Give gold
    if (rewards.gold) {
      playerStatsService.addGold(rewards.gold);
      this.showMedievalMessage(`+${rewards.gold} Gold`, 'success', 2000);
    }
    
    // Give items
    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(itemId => {
        // Add the item to the player's inventory (handled in the main game scene)
        this.registry.set('addItemToInventory', itemId);
        
        // Show message
        this.showMedievalMessage(`Found item: ${itemId}`, 'success', 2000);
      });
    }
  }
  
  /**
   * Update function called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Update player
    this.playerManager.update(time, delta);
    
    // Update dungeon level
    this.dungeonLevelManager.update(time, delta);
    
    // Update combat system
    this.combatSystem.update(time, delta);
  }
  
  /**
   * Clean up resources when the scene is shut down
   */
  shutdown() {
    try {
      logger.info(LogCategory.DUNGEON, 'Starting DungeonScene shutdown process');
      
      // Remove all event listeners
      this.input.off('pointerdown');
      this.events.off('monsterDefeated');
      this.events.off('levelCompleted');
      this.events.off('dungeonCompleted');
      this.events.off('update');
      
      // Clean up UI elements
      if (this.dungeonInfoText) {
        this.dungeonInfoText.destroy();
        this.dungeonInfoText = null;
      }
      
      if (this.healthText) {
        this.healthText.destroy();
        this.healthText = null;
      }
      
      if (this.exitButton) {
        this.exitButton.off('pointerdown'); // Remove event listener
        this.exitButton.destroy();
        this.exitButton = null;
      }
      
      if (this.exitPortal) {
        this.exitPortal.destroy();
        this.exitPortal = null;
      }
      
      // Stop all tweens
      this.tweens.killAll();
      
      // Stop all timers
      this.time.removeAllEvents();
      
      // Clean up managers with proper null checks
      if (this.dungeonLevelManager) {
        this.dungeonLevelManager.destroy();
        this.dungeonLevelManager = null;
      }
      
      if (this.playerManager) {
        this.playerManager.destroy();
        this.playerManager = null;
      }
      
      if (this.uiManager) {
        this.uiManager.destroy();
        this.uiManager = null;
      }
      
      if (this.combatSystem) {
        this.combatSystem.destroy();
        this.combatSystem = null;
      }
      
      if (this.popupSystem) {
        this.popupSystem.destroy();
        this.popupSystem = null;
      }
      
      // Clean up player sprite
      if (this.player) {
        this.player.destroy();
        this.player = null;
      }
      
      // Clear all physics bodies
      this.physics.world.colliders.destroy();
      
      // Clear the display list manually to avoid issues
      const displayList = this.children.list;
      for (let i = displayList.length - 1; i >= 0; i--) {
        const child = displayList[i];
        if (child && typeof child.destroy === 'function') {
          child.destroy();
        }
      }
      
      logger.info(LogCategory.DUNGEON, 'DungeonScene shutdown completed successfully');
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error during dungeon scene shutdown: ${error}`);
    }
  }

  /**
   * Show a medieval-styled message
   * @param {string} text - The message text
   * @param {string} type - The message type (info, success, error, warning)
   * @param {number} duration - The duration to show the message in milliseconds
   */
  showMedievalMessage(text, type = 'info', duration = 3000) {
    // Create a text object for the message
    const messageText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 100,
      text,
      {
        fontFamily: 'Cinzel, serif',
        fontSize: '18px',
        color: this.getMessageColor(type),
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    
    // Add a background
    const bounds = messageText.getBounds();
    const padding = 20;
    const background = this.add.rectangle(
      bounds.centerX,
      bounds.centerY,
      bounds.width + padding * 2,
      bounds.height + padding,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(999);
    
    // Add a border
    const border = this.add.rectangle(
      bounds.centerX,
      bounds.centerY,
      bounds.width + padding * 2,
      bounds.height + padding,
      this.getMessageColor(type, true),
      0
    ).setStrokeStyle(2, this.getMessageColor(type)).setScrollFactor(0).setDepth(999);
    
    // Fade in
    this.tweens.add({
      targets: [messageText, background, border],
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Power2'
    });
    
    // Fade out and destroy after duration
    this.time.delayedCall(duration - 300, () => {
      this.tweens.add({
        targets: [messageText, background, border],
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          messageText.destroy();
          background.destroy();
          border.destroy();
        }
      });
    });
  }
  
  /**
   * Get the color for a message type
   * @param {string} type - The message type
   * @param {boolean} isBackground - Whether this is for a background
   * @returns {number|string} - The color
   */
  getMessageColor(type, isBackground = false) {
    if (isBackground) {
      switch (type) {
        case 'success': return 0x00aa00;
        case 'error': return 0xaa0000;
        case 'warning': return 0xaaaa00;
        case 'info':
        default: return 0x0000aa;
      }
    } else {
      switch (type) {
        case 'success': return '#00ff00';
        case 'error': return '#ff0000';
        case 'warning': return '#ffff00';
        case 'info':
        default: return '#ffffff';
      }
    }
  }
} 