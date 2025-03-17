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
    this.wallsContainer = null;
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
    
    logger.info(LogCategory.DUNGEON, `Creating level ${level} for ${dungeon.name}`, {
      dungeonId: dungeon.id,
      level: level,
      hasRoomParams: !!dungeon.roomParams,
      hasMonsterConfig: !!dungeon.monsterConfig
    });
    
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
    
    logger.info(LogCategory.DUNGEON, `Level ${level} created successfully`, {
      wallsCreated: !!this.walls,
      monsterCount: Array.isArray(this.monsters) ? this.monsters.length : 0,
      exitPortalCreated: !!this.exitPortal
    });
  }
  
  /**
   * Clear the current level
   */
  clearLevel() {
    // Clear monsters
    for (const monster of this.monsters) {
      if (monster?.destroy) {
        monster.destroy();
      }
    }
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
    this.walls?.destroy();
    this.walls = null;
    
    // Clear walls container
    this.wallsContainer?.destroy();
    this.wallsContainer = null;
    
    // Clear level container
    this.levelContainer?.destroy();
    this.levelContainer = null;
    
    // Clear passage ways
    this.passageWays = {};
  }
  
  /**
   * Create walls for the level
   */
  createWalls() {
    logger.info(LogCategory.DUNGEON, 'Creating walls for level');
    
    // Create physics group for walls
    this.walls = this.scene.physics.add.staticGroup();
    
    // Create container for walls
    this.wallsContainer = this.scene.add.container(0, 0);
    
    // Get the level size from the scene or config
    const bounds = this.getLevelBounds();
    const width = bounds.width;
    const height = bounds.height;
    
    // Create outer walls
    const wallThickness = 20;
    const wallColor = 0x555555;
    
    // Create top wall
    const topWall = this.scene.add.rectangle(width / 2, wallThickness / 2, width, wallThickness, wallColor);
    this.walls.add(topWall);
    this.wallsContainer.add(topWall);
    
    // Create bottom wall
    const bottomWall = this.scene.add.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, wallColor);
    this.walls.add(bottomWall);
    this.wallsContainer.add(bottomWall);
    
    // Create left wall
    const leftWall = this.scene.add.rectangle(wallThickness / 2, height / 2, wallThickness, height, wallColor);
    this.walls.add(leftWall);
    this.wallsContainer.add(leftWall);
    
    // Create right wall
    const rightWall = this.scene.add.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, wallColor);
    this.walls.add(rightWall);
    this.wallsContainer.add(rightWall);
    
    // Create the exit portal
    this.exitPortal = this.createCenterPortal();
    
    // Get passage configuration from dungeon type
    const dungeonConfig = this.dungeonSystem.currentDungeon;
    let passageConfig;
    
    // Check if the getPassageConfig method exists on the dungeon config
    if (dungeonConfig && typeof dungeonConfig.getPassageConfig === 'function') {
      // Use the method if it exists
      passageConfig = dungeonConfig.getPassageConfig(this.currentLevel);
      logger.info(LogCategory.DUNGEON, `Using passage configuration from ${dungeonConfig.name}`, {
        positions: passageConfig.positions?.length || 0,
        interactive: passageConfig.interactive
      });
    } else {
      // Fallback to default passage configuration if the method doesn't exist
      logger.info(LogCategory.DUNGEON, 'getPassageConfig method not found on dungeon config, using default passage configuration');
      passageConfig = {
        // Default positions for passages (centered on each wall)
        positions: [
          { direction: 'up', positionX: 0.5, width: 80 },
          { direction: 'down', positionX: 0.5, width: 80 },
          { direction: 'left', positionY: 0.5, height: 120 },
          { direction: 'right', positionY: 0.5, height: 120 }
        ],
        color: 0x222222, // Dark gray color
        interactive: true  // Whether passages are clickable
      };
    }
    
    // Create passageways based on configuration
    this.passageWays = [];
    
    // Loop through the passage positions
    for (const passage of passageConfig.positions) {
      // Calculate actual position based on relative values
      let x;
      let y;
      let passageWidth;
      let passageHeight;
      
      switch (passage.direction) {
        case 'up':
          // Top wall passage
          x = width * (passage.positionX || 0.5); // Default to center if not specified
          y = wallThickness / 2;
          passageWidth = passage.width || 80;
          passageHeight = wallThickness;
          break;
          
        case 'down':
          // Bottom wall passage
          x = width * (passage.positionX || 0.5);
          y = height - wallThickness / 2;
          passageWidth = passage.width || 80;
          passageHeight = wallThickness;
          break;
          
        case 'left':
          // Left wall passage
          x = wallThickness / 2;
          y = height * (passage.positionY || 0.5);
          passageWidth = wallThickness;
          passageHeight = passage.height || 120;
          break;
          
        case 'right':
          // Right wall passage
          x = width - wallThickness / 2;
          y = height * (passage.positionY || 0.5);
          passageWidth = wallThickness;
          passageHeight = passage.height || 120;
          break;
          
        default:
          logger.warn(LogCategory.DUNGEON, `Unknown passage direction: ${passage.direction}`);
          continue;
      }
      
      // Create the passage rectangle
      const passageWay = this.scene.add.rectangle(x, y, passageWidth, passageHeight, passageConfig.color || 0x222222);
      passageWay.setData('direction', passage.direction);
      
      // Make passage interactive if configured
      if (passageConfig.interactive) {
        passageWay.setInteractive({ useHandCursor: true });
        passageWay.on('pointerdown', () => this.handlePassageWayClick(passageWay));
      }
      
      this.wallsContainer.add(passageWay);
      this.passageWays.push(passageWay);
    }
    
    // Add the walls container to the level container
    this.levelContainer?.add(this.wallsContainer);
    
    logger.info(LogCategory.DUNGEON, `Created walls for level ${this.currentLevel}`);
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
    
    logger.info(LogCategory.DUNGEON, 'Creating monsters for level', {
      level: this.currentLevel,
      monsterConfig: monsterConfig
    });
    
    // Get the level bounds
    const bounds = this.getLevelBounds();
    const width = bounds.width;
    const height = bounds.height;
    
    // Determine how many monsters to create based on level
    const monsterCount = Math.min(3 + this.currentLevel * 2, 10); // More monsters on higher levels, max 10
    
    // Create regular monsters
    for (let i = 0; i < monsterCount; i++) {
      // Random position (avoiding the edges and center)
      const wallThickness = 40; // Keep away from walls
      const centerAvoidance = 150; // Keep away from center (where portal will be)
      
      let x;
      let y;
      let validPosition = false;
      
      // Try to find a valid position that's not too close to other monsters
      let attempts = 0;
      while (!validPosition && attempts < 10) {
        x = wallThickness + Math.random() * (width - wallThickness * 2);
        y = wallThickness + Math.random() * (height - wallThickness * 2);
        
        // Avoid center area where portal will be
        const distanceToCenter = Math.sqrt(
          (x - bounds.centerX) ** 2 + 
          (y - bounds.centerY) ** 2
        );
        
        if (distanceToCenter > centerAvoidance) {
          validPosition = true;
          
          // Check distance to other monsters
          for (const existingMonster of this.monsters) {
            const distanceToMonster = Math.sqrt(
              (x - existingMonster.x) ** 2 + 
              (y - existingMonster.y) ** 2
            );
            
            if (distanceToMonster < 100) {
              validPosition = false;
              break;
            }
          }
        }
        
        attempts++;
      }
      
      // Create the monster
      try {
        const monster = this.dungeonSystem.createMonster(x, y);
        this.monsters.push(monster);
        
        // Add the monster to the level container
        if (monster?.sprite) {
          this.levelContainer?.add(monster.sprite);
        }
        
        // Emit event that monster was created
        this.scene.events.emit('monsterCreated', monster);
      } catch (error) {
        logger.error(LogCategory.DUNGEON, `Error creating monster: ${error}`);
      }
    }
    
    // Check if this is the final level and should have a boss
    const isFinalLevel = this.currentLevel === this.dungeonSystem.currentDungeon.levels;
    const isSpecialLevel = this.dungeonSystem.currentDungeon.isSpecialLevel?.(this.currentLevel);
    
    if (isFinalLevel || isSpecialLevel) {
      // Create a boss at the center
      try {
        const boss = this.dungeonSystem.createMonster(
          bounds.centerX, 
          bounds.centerY, 
          null, // Let the factory pick the boss type
          true  // This is a boss
        );
        
        this.monsters.push(boss);
        
        // Add the boss to the level container
        if (boss?.sprite) {
          this.levelContainer?.add(boss.sprite);
        }
        
        // Emit event that boss was created
        this.scene.events.emit('monsterCreated', boss);
        
        logger.info(LogCategory.DUNGEON, `Created boss for level ${this.currentLevel}`);
      } catch (error) {
        logger.error(LogCategory.DUNGEON, `Error creating boss: ${error}`);
      }
    }
    
    logger.info(LogCategory.DUNGEON, `Created ${this.monsters.length} monsters for level ${this.currentLevel}`);
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
    this.levelContainer?.add(portal);
    
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
    for (const monster of this.monsters) {
      if (monster?.update) {
        monster.update(time, delta);
      }
    }
  }
  
  /**
   * Destroy the level system
   */
  destroy() {
    this.clearLevel();
  }
} 