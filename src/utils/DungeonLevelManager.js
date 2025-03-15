import { logger, LogCategory } from './Logger';
import { MonsterFactory } from '../monsters/MonsterFactory';
import { MonsterType } from '../monsters/MonsterTypes';

/**
 * DungeonLevelManager class to handle dungeon level creation and management
 */
export class DungeonLevelManager {
  /**
   * Constructor for the DungeonLevelManager
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    this.scene = scene;
    this.currentDungeon = scene.currentDungeon;
    this.currentLevel = scene.currentLevel;
    this.map = null;
    this.layers = {};
    this.monsters = [];
    this.bossDefeated = false;
    this.playerStartPosition = { x: 0, y: 0 };
    this.exitPortalPosition = { x: 0, y: 0 };
    
    // Register this manager in the scene for other systems to access
    this.scene.dungeonLevelManager = this;
    
    // We don't need to create a MonsterFactory instance since it uses static methods
    // this.monsterFactory = new MonsterFactory(scene);
    
    logger.info(LogCategory.DUNGEON, `Dungeon level manager initialized for ${this.currentDungeon.name} - Level ${this.currentLevel}`);
  }
  
  /**
   * Create a dungeon level
   * @param {number} levelNumber - The level number to create
   */
  createLevel(levelNumber) {
    logger.info(LogCategory.DUNGEON, `Creating level ${levelNumber} for dungeon ${this.currentDungeon.name}`);
    
    // Get the level image key
    const levelKey = `${this.currentDungeon.id}-level-${levelNumber}`;
    
    // Create a background image for the level
    const levelWidth = this.scene.cameras.main.width;
    const levelHeight = this.scene.cameras.main.height;
    
    // Add the level background image
    this.levelBackground = this.scene.add.image(levelWidth / 2, levelHeight / 2, levelKey);
    
    // Scale the image to fit the screen while maintaining aspect ratio
    const scaleX = levelWidth / this.levelBackground.width;
    const scaleY = levelHeight / this.levelBackground.height;
    const scale = Math.max(scaleX, scaleY);
    this.levelBackground.setScale(scale);
    
    // Create invisible walls around the edges of the level
    this.createInvisibleWalls();
    
    // Set player start position based on level number
    this.setPlayerStartPosition(levelNumber);
    
    // Set exit portal position based on level number
    this.setExitPortalPosition(levelNumber);
    
    // Create monsters for this level
    this.createMonsters();
    
    // Set camera bounds
    this.scene.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
    
    // Set camera to follow player if it exists
    if (this.scene.player && typeof this.scene.player.x === 'number' && typeof this.scene.player.y === 'number') {
      this.scene.cameras.main.startFollow(this.scene.player);
      logger.info(LogCategory.DUNGEON, `Camera following player at (${this.scene.player.x}, ${this.scene.player.y})`);
    } else {
      logger.warn(LogCategory.DUNGEON, 'Player not available for camera to follow');
    }
    
    logger.info(LogCategory.DUNGEON, `Level ${levelNumber} created successfully`);
  }
  
  /**
   * Create invisible walls around the edges of the level
   */
  createInvisibleWalls() {
    // Create a physics group for the walls
    this.walls = this.scene.physics.add.staticGroup();
    
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Create invisible walls
    const wallThickness = 20;
    
    // Top wall
    const topWall = this.scene.add.rectangle(width / 2, -wallThickness / 2, width, wallThickness, 0x000000, 0);
    this.scene.physics.add.existing(topWall, true);
    this.walls.add(topWall);
    
    // Bottom wall
    const bottomWall = this.scene.add.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, 0x000000, 0);
    this.scene.physics.add.existing(bottomWall, true);
    this.walls.add(bottomWall);
    
    // Left wall
    const leftWall = this.scene.add.rectangle(-wallThickness / 2, height / 2, wallThickness, height, 0x000000, 0);
    this.scene.physics.add.existing(leftWall, true);
    this.walls.add(leftWall);
    
    // Right wall
    const rightWall = this.scene.add.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, 0x000000, 0);
    this.scene.physics.add.existing(rightWall, true);
    this.walls.add(rightWall);
  }
  
  /**
   * Set player start position based on level number
   * @param {number} levelNumber - The level number
   */
  setPlayerStartPosition(levelNumber) {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Default positions for each level
    switch (levelNumber) {
      case 1:
        this.playerStartPosition = { x: width / 2, y: height - 100 };
        break;
      case 2:
        this.playerStartPosition = { x: width / 2, y: height - 100 };
        break;
      case 3:
        this.playerStartPosition = { x: width / 2, y: height - 100 };
        break;
      case 4:
        this.playerStartPosition = { x: width / 2, y: height - 100 };
        break;
      default:
        this.playerStartPosition = { x: width / 2, y: height - 100 };
    }
  }
  
  /**
   * Set exit portal position based on level number
   * @param {number} levelNumber - The level number
   */
  setExitPortalPosition(levelNumber) {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Default positions for each level
    switch (levelNumber) {
      case 1:
        this.exitPortalPosition = { x: width / 2, y: 100 };
        break;
      case 2:
        this.exitPortalPosition = { x: width / 2, y: 100 };
        break;
      case 3:
        this.exitPortalPosition = { x: width / 2, y: 100 };
        break;
      case 4:
        this.exitPortalPosition = { x: width / 2, y: 100 };
        break;
      default:
        this.exitPortalPosition = { x: width / 2, y: 100 };
    }
  }
  
  /**
   * Create monsters for the current level
   */
  createMonsters() {
    try {
      // Clear existing monsters
      this.monsters.forEach(monster => {
        if (monster && typeof monster.destroy === 'function') {
          monster.destroy();
        }
      });
      this.monsters = [];
      
      const width = this.scene.cameras.main.width;
      const height = this.scene.cameras.main.height;
      
      // Create monsters based on level
      const monsterCount = this.currentLevel * 2; // More monsters in higher levels
      let successfullyCreated = 0;
      
      for (let i = 0; i < monsterCount; i++) {
        // Create regular monsters
        let x, y;
        let validPosition = false;
        
        // Try to find a valid position that's not too close to the player or exit
        while (!validPosition) {
          x = Phaser.Math.Between(100, width - 100);
          y = Phaser.Math.Between(100, height - 100);
          
          // Check distance from player start
          const distFromPlayer = Phaser.Math.Distance.Between(
            x, y, 
            this.playerStartPosition.x, this.playerStartPosition.y
          );
          
          // Check distance from exit
          const distFromExit = Phaser.Math.Distance.Between(
            x, y, 
            this.exitPortalPosition.x, this.exitPortalPosition.y
          );
          
          // Valid if not too close to player or exit
          validPosition = distFromPlayer > 150 && distFromExit > 150;
        }
        
        // Create a monster at the valid position
        const monster = this.createMonster(MonsterType.LIZARDFOLK, x, y, this.currentLevel);
        
        if (monster) {
          this.monsters.push(monster); // Add to monsters array
          successfullyCreated++;
        }
      }
      
      // Create boss on the final level
      if (this.currentLevel === this.currentDungeon.levels) {
        // Place boss near the exit portal
        const bossX = this.exitPortalPosition.x;
        const bossY = this.exitPortalPosition.y + 150; // Place below the exit
        
        const boss = this.createBossMonster(bossX, bossY);
        
        if (boss) {
          this.monsters.push(boss); // Add to monsters array
          logger.info(LogCategory.DUNGEON, 'Boss monster created successfully');
        } else {
          logger.warn(LogCategory.DUNGEON, 'Failed to create boss monster');
        }
      }
      
      logger.info(LogCategory.DUNGEON, `Created ${successfullyCreated} monsters for level ${this.currentLevel}`);
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error creating monsters: ${error.message}`);
    }
  }
  
  /**
   * Create a regular monster
   * @param {string} type - The type of monster to create
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @param {number} level - The monster level
   * @returns {Object} - The created monster
   */
  createMonster(type, x, y, level) {
    try {
      // Use the MonsterFactory static method to create the monster
      const monsterData = {
        type: type,
        level: level,
        isBoss: false,
        // Add required properties for BaseMonster
        name: type.toString(),
        behavior: 'aggressive', // Default behavior
        attributes: {
          health: 50 + (level * 10),
          maxHealth: 50 + (level * 10),
          damage: 5 + (level * 2),
          defense: 2 + level,
          speed: 100,
          detectionRadius: 200
        },
        lootTable: [], // Empty loot table for now
        spriteKey: type.toString(),
        goldReward: 5 + (level * 2),
        xpReward: 10 + (level * 5)
      };
      
      // Get player sprite from the scene
      const playerSprite = this.scene.player;
      
      // Get item system from the scene
      const itemSystem = this.scene.itemSystem;
      
      // Check if required objects exist
      if (!playerSprite) {
        logger.warn(LogCategory.DUNGEON, 'Player sprite not available for monster creation');
        return null;
      }
      
      if (!itemSystem) {
        logger.warn(LogCategory.DUNGEON, 'Item system not available for monster creation');
        return null;
      }
      
      // Create the monster using the static method
      const monster = MonsterFactory.createMonster(
        this.scene,
        x,
        y,
        monsterData,
        playerSprite,
        itemSystem
      );
      
      // Check if monster was created successfully
      if (!monster || !monster.sprite) {
        logger.error(LogCategory.DUNGEON, `Failed to create monster of type ${type}`);
        return null;
      }
      
      // Add collision with walls if both objects exist
      if (this.walls && monster.sprite) {
        this.scene.physics.add.collider(monster.sprite, this.walls);
      }
      
      // Add overlap with player for combat if both objects exist
      if (this.scene.player && monster.sprite) {
        this.scene.physics.add.overlap(
          this.scene.player,
          monster.sprite,
          () => {
            this.handleMonsterPlayerOverlap(monster);
          },
          null,
          this
        );
      }
      
      // Don't add to monsters array here, it will be done in createMonsters
      
      return monster;
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error creating monster: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create a boss monster
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @returns {Object} - The created boss monster
   */
  createBossMonster(x, y) {
    try {
      // Use the MonsterFactory static method to create the boss
      const monsterData = {
        type: MonsterType.LIZARDFOLK_KING,
        level: this.currentLevel + 2, // Boss is stronger than regular monsters
        isBoss: true,
        // Add required properties for BaseMonster
        name: 'Lizardfolk King',
        behavior: 'aggressive', // Boss is always aggressive
        attributes: {
          health: 200 + (this.currentLevel * 20),
          maxHealth: 200 + (this.currentLevel * 20),
          damage: 15 + (this.currentLevel * 3),
          defense: 10 + this.currentLevel,
          speed: 80,
          detectionRadius: 300
        },
        lootTable: [
          {
            itemId: 'item-leather',
            minQuantity: 5,
            maxQuantity: 10,
            dropChance: 1.0 // 100% chance
          },
          {
            itemId: 'sword',
            minQuantity: 1,
            maxQuantity: 1,
            dropChance: 0.5 // 50% chance
          }
        ],
        spriteKey: 'lizardfolk-king',
        goldReward: 50 + (this.currentLevel * 10),
        xpReward: 100 + (this.currentLevel * 20)
      };
      
      // Get player sprite from the scene
      const playerSprite = this.scene.player;
      
      // Get item system from the scene
      const itemSystem = this.scene.itemSystem;
      
      // Check if required objects exist
      if (!playerSprite) {
        logger.warn(LogCategory.DUNGEON, 'Player sprite not available for boss creation');
        return null;
      }
      
      if (!itemSystem) {
        logger.warn(LogCategory.DUNGEON, 'Item system not available for boss creation');
        return null;
      }
      
      // Create the boss using the static method
      const boss = MonsterFactory.createMonster(
        this.scene,
        x,
        y,
        monsterData,
        playerSprite,
        itemSystem
      );
      
      // Check if boss was created successfully
      if (!boss || !boss.sprite) {
        logger.error(LogCategory.DUNGEON, 'Failed to create boss monster');
        return null;
      }
      
      // Add collision with walls if both objects exist
      if (this.walls && boss.sprite) {
        this.scene.physics.add.collider(boss.sprite, this.walls);
      }
      
      // Add overlap with player for combat if both objects exist
      if (this.scene.player && boss.sprite) {
        this.scene.physics.add.overlap(
          this.scene.player,
          boss.sprite,
          () => {
            this.handleMonsterPlayerOverlap(boss);
          },
          null,
          this
        );
      }
      
      // Don't add to monsters array here, it will be done in createMonsters
      
      return boss;
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error creating boss: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Handle overlap between player and monster
   * @param {Object} monster - The monster that overlapped with the player
   */
  handleMonsterPlayerOverlap(monster) {
    // Initiate combat with the monster
    this.scene.combatSystem.playerAttackMonster(monster, this.scene.playerStats.damage);
  }
  
  /**
   * Check if all monsters in the level are defeated
   * @returns {boolean} - True if all monsters are defeated
   */
  areAllMonstersDefeated() {
    return this.monsters.every(monster => monster.isDead);
  }
  
  /**
   * Check if the level is completed
   * @returns {boolean} - True if the level is completed
   */
  isLevelCompleted() {
    // For boss level, level is completed when boss is defeated
    if (this.currentLevel === this.currentDungeon.levels) {
      return this.bossDefeated;
    }
    
    // For other levels, level is completed when all monsters are defeated
    return this.areAllMonstersDefeated();
  }
  
  /**
   * Set boss defeated status
   * @param {boolean} defeated - Whether the boss is defeated
   */
  setBossDefeated(defeated) {
    this.bossDefeated = defeated;
    
    // If boss is defeated and this is the final level, emit level completed event
    if (defeated && this.currentLevel === this.currentDungeon.levels) {
      this.scene.events.emit('levelCompleted');
    }
  }
  
  /**
   * Check if the boss is defeated
   * @returns {boolean} - True if the boss is defeated
   */
  isBossDefeated() {
    return this.bossDefeated;
  }
  
  /**
   * Get the player start position
   * @returns {Object} - The player start position {x, y}
   */
  getPlayerStartPosition() {
    return this.playerStartPosition;
  }
  
  /**
   * Get the exit portal position
   * @returns {Object} - The exit portal position {x, y}
   */
  getExitPortalPosition() {
    return this.exitPortalPosition;
  }
  
  /**
   * Get the walls layer for collision
   * @returns {Object} - The walls layer
   */
  getWallsLayer() {
    return this.walls;
  }
  
  /**
   * Update loop
   * @param {number} time - Current time
   * @param {number} delta - Time since last update
   */
  update(time, delta) {
    // Update monsters
    this.monsters.forEach(monster => {
      if (monster.update) {
        monster.update(time, delta);
      }
    });
    
    // Check if level is completed
    if (!this.isLevelCompleted() && this.areAllMonstersDefeated()) {
      // Emit level completed event
      this.scene.events.emit('levelCompleted');
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Destroy monsters
    this.monsters.forEach(monster => {
      monster.destroy();
    });
    this.monsters = [];
    
    logger.info(LogCategory.DUNGEON, 'Dungeon level manager destroyed');
  }
} 