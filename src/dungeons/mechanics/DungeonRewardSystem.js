import { logger, LogCategory } from '../../utils/Logger';
import playerStatsService from '../../utils/player/PlayerStatsService';

/**
 * DungeonRewardSystem - Handles rewards in dungeons
 */
export class DungeonRewardSystem {
  /**
   * Constructor for the DungeonRewardSystem
   * @param {Object} scene - The dungeon scene
   */
  constructor(scene) {
    this.scene = scene;
    this.uiManager = scene.uiManager;
    
    logger.info(LogCategory.DUNGEON, 'Dungeon reward system initialized');
  }
  
  /**
   * Give rewards to the player
   * @param {Object} rewards - The rewards to give
   */
  giveRewards(rewards) {
    if (!rewards) {
      logger.warn(LogCategory.DUNGEON, 'No rewards to give');
      return;
    }
    
    logger.info(LogCategory.DUNGEON, `Giving rewards: ${JSON.stringify(rewards)}`);
    
    // Give XP
    if (rewards.xp) {
      this.giveXP(rewards.xp);
    }
    
    // Give gold
    if (rewards.gold) {
      this.giveGold(rewards.gold);
    }
    
    // Give items
    if (rewards.items && rewards.items.length > 0) {
      this.giveItems(rewards.items);
    }
  }
  
  /**
   * Give XP to the player
   * @param {number} amount - The amount of XP to give
   */
  giveXP(amount) {
    if (!amount || amount <= 0) return;
    
    playerStatsService.addXP(amount);
    
    // Show message
    if (this.uiManager) {
      this.uiManager.showMedievalMessage(`+${amount} XP`, 'success', 2000);
    }
    
    logger.info(LogCategory.DUNGEON, `Gave ${amount} XP to player`);
  }
  
  /**
   * Give gold to the player
   * @param {number} amount - The amount of gold to give
   */
  giveGold(amount) {
    if (!amount || amount <= 0) return;
    
    playerStatsService.addGold(amount);
    
    // Show message
    if (this.uiManager) {
      this.uiManager.showMedievalMessage(`+${amount} Gold`, 'success', 2000);
    }
    
    logger.info(LogCategory.DUNGEON, `Gave ${amount} gold to player`);
  }
  
  /**
   * Give items to the player
   * @param {Array} items - The items to give
   */
  giveItems(items) {
    if (!items || !items.length) return;
    
    items.forEach(itemId => {
      // Add the item to the player's inventory (handled in the main game scene)
      this.scene.registry.set('addItemToInventory', itemId);
      
      // Show message
      if (this.uiManager) {
        this.uiManager.showMedievalMessage(`Found item: ${itemId}`, 'success', 2000);
      }
      
      logger.info(LogCategory.DUNGEON, `Gave item ${itemId} to player`);
    });
    
    // Store all dungeon items in the registry for the main game to handle
    const dungeonItems = this.scene.registry.get('dungeonItems') || [];
    this.scene.registry.set('dungeonItems', [...dungeonItems, ...items.map(id => ({ itemId: id, quantity: 1 }))]);
  }
  
  /**
   * Generate random rewards based on level and difficulty
   * @param {number} level - The dungeon level
   * @param {string} difficulty - The difficulty level (easy, medium, hard, boss)
   * @returns {Object} - The generated rewards
   */
  generateRandomRewards(level, difficulty = 'medium') {
    const rewards = {
      xp: 0,
      gold: 0,
      items: []
    };
    
    // Base values that scale with level
    const baseXP = 10 * level;
    const baseGold = 5 * level;
    
    // Multipliers based on difficulty
    let multiplier = 1;
    let itemChance = 0.1; // 10% chance for normal enemies
    
    switch (difficulty) {
      case 'easy':
        multiplier = 0.5;
        itemChance = 0.05;
        break;
      case 'medium':
        multiplier = 1;
        itemChance = 0.1;
        break;
      case 'hard':
        multiplier = 2;
        itemChance = 0.2;
        break;
      case 'boss':
        multiplier = 5;
        itemChance = 1; // 100% chance for bosses
        break;
    }
    
    // Calculate rewards
    rewards.xp = Math.floor(baseXP * multiplier * (0.8 + Math.random() * 0.4)); // ±20% randomness
    rewards.gold = Math.floor(baseGold * multiplier * (0.8 + Math.random() * 0.4)); // ±20% randomness
    
    // Determine if an item should be given
    if (Math.random() < itemChance) {
      // This is a placeholder - in a real implementation, you would have a loot table
      // and select items based on level, difficulty, and dungeon type
      rewards.items.push(`dungeon_item_${level}_${difficulty}`);
    }
    
    logger.info(LogCategory.DUNGEON, `Generated rewards for level ${level}, difficulty ${difficulty}: ${JSON.stringify(rewards)}`);
    
    return rewards;
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // This method is a hook for future expansion
    // Currently, the reward system doesn't need per-frame updates
  }
  
  /**
   * Clean up resources when the system is destroyed
   */
  destroy() {
    logger.info(LogCategory.DUNGEON, 'Destroying dungeon reward system');
    // No specific cleanup needed for now
  }
} 