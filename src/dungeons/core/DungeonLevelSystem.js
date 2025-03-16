import { logger, LogCategory } from '../../utils/Logger';

/**
 * DungeonLevelSystem - Manages dungeon level creation and state
 * Replaces the old DungeonLevelManager with a more modular approach
 */
export class DungeonLevelSystem {
  /**
   * Constructor for the DungeonLevelSystem
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    this.scene = scene;
    this.dungeonSystem = scene.dungeonSystem;
    
    // Level properties
    this.currentLevel = 1;
    this.walls = null;
    this.monsters = [];
    this.exitPortal = null;
    this.passageWays = {};
    this.bossDefeated = false;
    
    logger.info(LogCategory.DUNGEON, 'DungeonLevelSystem initialized');
  }
  
  /**
   * Create a dungeon level
   * @param {number} level - The level number to create
   */
  createLevel(level) {
    this.currentLevel = level;
    
    // Get the dungeon configuration
    const dungeon = this.dungeonSystem.currentDungeon;
    if (!dungeon) {
      logger.error(LogCategory.DUNGEON, 'No dungeon configuration found');
      return;
    }
    
    logger.info(LogCategory.DUNGEON, `Creating level ${level} for ${dungeon.name}`);
    
    // Clear any existing level elements
    this.clearLevel();
    
    // Create the level container
    this.levelContainer = this.scene.add.container(0, 0);
    
    // Create walls and obstacles
    this.createWalls();
    
    // Create monsters for this level
    this.createMonsters();
    
    // Reset boss defeated flag
    this.bossDefeated = false;
    
    // Emit level created event
    this.scene.events.emit('levelCreated', { level });
  }
  
  /**
   * Clear the current level
   */
  clearLevel() {
    // Clear monsters
    this.monsters.forEach(monster => {
      if (monster && monster.destroy) {
        monster.destroy();
      }
    });
    this.monsters = [];
    
    // Clear exit portal
    if (this.exitPortal) {
      if (this.exitPortal.particleEmitter) {
        this.exitPortal.particleEmitter.stop();
        this.exitPortal.particleEmitter.destroy();
      }
      this.exitPortal.destroy();
      this.exitPortal = null;
    }
    
    // Clear walls
    if (this.walls) {
      this.walls.destroy();
      this.walls = null;
    }
    
    // Clear level container
    if (this.levelContainer) {
      this.levelContainer.destroy();
      this.levelContainer = null;
    }
    
    // Clear passage ways
    this.passageWays = {};
  }
  
  /**
   * Create walls and obstacles for the level
   */
  createWalls() {
    // Create a static physics group for walls
    this.walls = this.scene.physics.add.staticGroup();
    
    // Get room generation parameters from the dungeon
    const roomParams = this.dungeonSystem.currentDungeon.roomParams;
    
    // Create walls based on room parameters
    // This is a simplified version - actual implementation would use the dungeon's
    // room generation logic to create walls, obstacles, etc.
    
    // Add the walls to the level container
    if (this.levelContainer) {
      this.levelContainer.add(this.walls);
    }
  }
  
  /**
   * Create monsters for the level
   */
  createMonsters() {
    // Get monster configuration from the dungeon
    const monsterConfig = this.dungeonSystem.currentDungeon.monsterConfig;
    if (!monsterConfig) {
      logger.warn(LogCategory.DUNGEON, 'No monster configuration found for level');
      return;
    }
    
    // Create monsters based on configuration
    // This is a simplified version - actual implementation would use the MonsterFactory
    // to create monsters based on the dungeon's monster configuration
    
    // Add monsters to the level container
    if (this.levelContainer) {
      // Add monsters to the container
    }
  }
  
  /**
   * Create a center portal (exit portal)
   */
  createCenterPortal() {
    // Create a portal in the center of the level
    const bounds = this.getLevelBounds();
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;
    
    // Create the portal
    const portal = this.scene.add.sprite(centerX, centerY, 'portal');
    portal.setScale(0.5);
    portal.setAlpha(0.8);
    portal.isActive = true;
    
    // Add physics to the portal
    this.scene.physics.add.existing(portal, true);
    
    // Set the portal as the exit portal
    this.exitPortal = portal;
    
    // Add the portal to the level container
    if (this.levelContainer) {
      this.levelContainer.add(portal);
    }
    
    return portal;
  }
  
  /**
   * Get the player start position
   * @returns {Object} The player start position {x, y}
   */
  getPlayerStartPosition() {
    // Get the level bounds
    const bounds = this.getLevelBounds();
    
    // Return a position near the bottom of the level
    return {
      x: bounds.centerX,
      y: bounds.bottom - 100
    };
  }
  
  /**
   * Get the level bounds
   * @returns {Object} The level bounds
   */
  getLevelBounds() {
    // Return the scene bounds if no specific level bounds are defined
    return {
      x: 0,
      y: 0,
      width: this.scene.cameras.main.width,
      height: this.scene.cameras.main.height,
      centerX: this.scene.cameras.main.width / 2,
      centerY: this.scene.cameras.main.height / 2,
      left: 0,
      right: this.scene.cameras.main.width,
      top: 0,
      bottom: this.scene.cameras.main.height
    };
  }
  
  /**
   * Check if all monsters are defeated
   * @returns {boolean} True if all monsters are defeated
   */
  areAllMonstersDefeated() {
    return this.monsters.length === 0;
  }
  
  /**
   * Set the boss defeated flag
   * @param {boolean} defeated - Whether the boss is defeated
   */
  setBossDefeated(defeated) {
    this.bossDefeated = defeated;
  }
  
  /**
   * Handle passage way click
   * @param {Object} passageWay - The passage way that was clicked
   */
  handlePassageWayClick(passageWay) {
    if (!passageWay) return;
    
    // Handle passage way click logic
    logger.info(LogCategory.DUNGEON, `Passage way clicked: ${passageWay.direction}`);
    
    // Emit passage way clicked event
    this.scene.events.emit('passageWayClicked', { passageWay });
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time delta since the last update
   */
  update(time, delta) {
    // Update monsters
    this.monsters.forEach(monster => {
      if (monster && monster.update) {
        monster.update(time, delta);
      }
    });
  }
  
  /**
   * Destroy the level system
   */
  destroy() {
    this.clearLevel();
  }
} 