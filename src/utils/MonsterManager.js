import { LogCategory, logger } from '../utils/Logger';
// Import the MonsterType enum
import { MonsterType } from '../monsters/MonsterTypes';

/**
 * Class to manage monsters in the dungeon
 */
class MonsterManager {
  /**
   * Constructor
   * @param {Phaser.Scene} scene - The scene this manager belongs to
   */
  constructor(scene) {
    this.scene = scene;
    this.monsters = [];
  }

  /**
   * Spawn monsters for the current level
   * @param {number} levelNumber - The level number
   * @param {string} dungeonId - The dungeon ID
   */
  spawnMonsters(levelNumber, dungeonId) {
    // Clear existing monsters
    this.clearMonsters();
    
    // Special case for the Lizardfolk King in level 4 of Lost Swamp
    if (dungeonId === 'lost-swamp' && levelNumber === 4) {
      this.spawnLizardfolkKing();
      return;
    }
    
    // Get the level bounds
    const bounds = this.scene.dungeonManager.getLevelBounds();
    
    // Determine number of monsters based on level
    const baseMonsters = 3;
    const monstersPerLevel = 2;
    const maxMonsters = baseMonsters + (levelNumber * monstersPerLevel);
    
    // Get monster types for this dungeon
    const monsterTypes = this.getMonsterTypesForDungeon(dungeonId);
    
    // Spawn monsters
    for (let i = 0; i < maxMonsters; i++) {
      // Get a random monster type
      const monsterType = Phaser.Utils.Array.GetRandom(monsterTypes);
      
      // Get a random position within the level bounds
      const x = Phaser.Math.Between(bounds.left + 100, bounds.right - 100);
      const y = Phaser.Math.Between(bounds.top + 100, bounds.bottom - 100);
      
      // Create the monster
      this.createMonster(x, y, monsterType, levelNumber);
    }
    
    logger.info(LogCategory.MONSTER, `Spawned ${this.monsters.length} monsters for level ${levelNumber}`);
  }
  
  /**
   * Spawn the Lizardfolk King in the throne room
   */
  spawnLizardfolkKing() {
    logger.info(LogCategory.MONSTER, 'Spawning Lizardfolk King');
    // Get the level bounds
    const bounds = this.scene.dungeonManager.getLevelBounds();
    
    // Position the king at the top center (on the throne)
    const x = bounds.centerX;
    const y = bounds.top + 120; // Near the top wall
    
    // Create the Lizardfolk King with special properties
    const king = this.createMonster(x, y, MonsterType.LIZARDFOLK_KING, 4);
    
    // Make the king special
    king.setScale(1.5); // Larger than normal monsters
    king.setTint(0xffdd00); // Give him a golden tint
    king.health = 500; // Much more health than regular monsters
    king.maxHealth = 500;
    king.damage = 30; // Does more damage
    king.name = 'Lizardfolk King';
    king.isUnique = true; // Mark as a unique monster
    king.isBoss = true; // Mark as a boss
    king.goldReward = 500; // Special gold reward
    king.experienceReward = 1000; // Special XP reward
    
    // Add a special loot table for the king
    king.lootTable = [
      { itemId: 'crown-of-the-swamp', chance: 1.0, name: 'Crown of the Swamp', rarity: 'legendary' },
      { itemId: 'lizardfolk-scale-armor', chance: 0.8, name: 'Lizardfolk Scale Armor', rarity: 'rare' },
      { itemId: 'swamp-scepter', chance: 0.6, name: 'Swamp Scepter', rarity: 'rare' },
      { itemId: 'potion-of-regeneration', chance: 1.0, name: 'Potion of Regeneration', rarity: 'uncommon' },
      { itemId: 'ancient-swamp-map', chance: 1.0, name: 'Ancient Swamp Map', rarity: 'quest' }
    ];
    
    // Store the throne position for later use
    king.thronePosition = { x, y: y + 20 };
    
    // Add a crown above his head
    const crown = this.scene.add.sprite(x, y - 40, 'particle');
    crown.setScale(0.5);
    crown.setTint(0xffdd00); // Gold color
    this.scene.tweens.add({
      targets: crown,
      y: y - 50,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add the crown to the level container
    if (this.scene.dungeonManager.levelContainer) {
      this.scene.dungeonManager.levelContainer.add(crown);
    }
    
    // Add a throne behind the king (visual indicator)
    const throne = this.scene.add.rectangle(
      x,
      y + 20,
      80,
      120,
      0x8b0000, // Dark red
      0.3 // Slightly visible to help identify the throne area
    );
    
    // Add some gold decoration to the throne
    const throneBorder = this.scene.add.rectangle(
      x,
      y + 20,
      90,
      130,
      0xffdd00, // Gold
      0.2 // Slightly visible
    );
    throneBorder.setDepth(-1); // Behind the throne
    
    // Add the throne to the level container
    if (this.scene.dungeonManager.levelContainer) {
      this.scene.dungeonManager.levelContainer.add(throne);
      this.scene.dungeonManager.levelContainer.add(throneBorder);
    }
    
    // Add some lizardfolk guards
    this.spawnLizardfolkGuards(bounds);
    logger.info(LogCategory.MONSTER, 'Spawned Lizardfolk Guards');
    
    // Show a message to the player
    if (this.scene.uiManager) {
      this.scene.uiManager.showMedievalMessage(
        "The Lizardfolk King sits on his throne, watching your every move...",
        'warning',
        4000
      );
    }
    
    logger.info(LogCategory.MONSTER, 'Spawned Lizardfolk King in throne room');
    
    return king;
  }
  
  /**
   * Spawn lizardfolk guards in the throne room
   * @param {Object} bounds - The level bounds
   */
  spawnLizardfolkGuards(bounds) {
    logger.info(LogCategory.MONSTER, 'Spawning Lizardfolk Guards');
    // Guard positions
    const guardPositions = [
      // Guards near the throne
      { x: bounds.centerX - 100, y: bounds.top + 150 },
      { x: bounds.centerX + 100, y: bounds.top + 150 },
      
      // Guards in the middle of the room
      { x: bounds.centerX - 150, y: bounds.centerY },
      { x: bounds.centerX + 150, y: bounds.centerY },
      
      // Guards near the entrance
      { x: bounds.centerX - 80, y: bounds.bottom - 150 },
      { x: bounds.centerX + 80, y: bounds.bottom - 150 }
    ];
    
    // Create guards
    guardPositions.forEach(position => {
      const guard = this.createMonster(
        position.x,
        position.y,
        'lizardfolk',
        4
      );
      
      // Make guards a bit stronger
      guard.health = 150;
      guard.maxHealth = 150;
      guard.damage = 20;
      guard.name = 'Lizardfolk Guard';
      guard.goldReward = 50;
      guard.experienceReward = 100;
    });
  }
  
  /**
   * Get monster types for a specific dungeon
   * @param {string} dungeonId - The dungeon ID
   * @returns {Array} - Array of monster types
   */
  getMonsterTypesForDungeon(dungeonId) {
    // Define monster types for each dungeon using MonsterType enum
    const monstersByDungeon = {
      'lost-swamp': [MonsterType.LIZARDFOLK, MonsterType.WOLF, MonsterType.BOAR],
      'ancient-ruins': [MonsterType.LIZARDFOLK, MonsterType.WOLF, MonsterType.OGRE],
      'dark-forest': [MonsterType.WOLF, MonsterType.BOAR, MonsterType.STAG]
    };
    
    // Return monster types for the specified dungeon, or default types
    return monstersByDungeon[dungeonId] || [MonsterType.WOLF, MonsterType.BOAR, MonsterType.LIZARDFOLK];
  }
  
  /**
   * Create a monster
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @param {string} type - The monster type
   * @param {number} level - The level number
   * @returns {Phaser.GameObjects.Sprite} - The monster sprite
   */
  createMonster(x, y, type, level) {
    // Convert string type to MonsterType enum if needed
    const monsterType = typeof type === 'string' ? this.convertStringToMonsterType(type) : type;
    
    // Create the monster sprite - use the monsterType as the key for the sprite frame
    const monster = this.scene.physics.add.sprite(x, y, 'monsters', `${monsterType}.png`);
    
    // Set up monster properties
    monster.type = monsterType;
    monster.level = level;
    monster.health = 100 + (level * 20);
    monster.maxHealth = monster.health;
    monster.damage = 10 + (level * 2);
    monster.name = this.getMonsterName(monsterType);
    monster.goldReward = 10 + (level * 5);
    monster.experienceReward = 20 + (level * 10);
    
    // Add to the monsters array
    this.monsters.push(monster);
    
    // Add to the level container
    if (this.scene.dungeonManager.levelContainer) {
      this.scene.dungeonManager.levelContainer.add(monster);
    }
    
    return monster;
  }
  
  /**
   * Convert string monster type to MonsterType enum
   * @param {string} typeString - The monster type as a string
   * @returns {MonsterType} - The monster type enum value
   */
  convertStringToMonsterType(typeString) {
    // Handle special case for lizardfolk-king
    if (typeString === 'lizardfolk-king') {
      return MonsterType.LIZARDFOLK_KING;
    }
    
    // Try to find the matching enum value
    for (const key in MonsterType) {
      if (MonsterType[key].toLowerCase() === typeString.toLowerCase()) {
        return MonsterType[key];
      }
    }
    
    // Default to wolf if not found
    logger.warn(LogCategory.MONSTER, `Unknown monster type string: ${typeString}, defaulting to wolf`);
    return MonsterType.WOLF;
  }
  
  /**
   * Get a name for a monster type
   * @param {string|MonsterType} type - The monster type
   * @returns {string} - The monster name
   */
  getMonsterName(type) {
    // If it's already a string, just capitalize it
    if (typeof type === 'string') {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    // If it's a MonsterType enum, convert to readable name
    const typeName = String(type).replace(/-/g, ' ');
    return typeName.charAt(0).toUpperCase() + typeName.slice(1);
  }
  
  /**
   * Clear all monsters
   */
  clearMonsters() {
    // Destroy all monsters
    this.monsters.forEach(monster => {
      monster.destroy();
    });
    
    // Clear the array
    this.monsters = [];
  }
}

export default MonsterManager; 