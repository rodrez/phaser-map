import { logger, LogCategory } from './Logger';

export class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.playerStats = scene.playerStats;
        this.playerManager = scene.playerManager;
        this.playerHealthSystem = scene.playerHealthSystem;
        
        // Register this system in the scene for other systems to access
        this.scene.combatSystem = this;
        
        logger.info(LogCategory.COMBAT, 'Combat system initialized');
    }
    
    /**
     * Handle a monster attacking the player
     * @param {Object} monster - The monster attacking the player
     * @param {number} damage - The base damage amount
     */
    monsterAttackPlayer(monster, damage) {
        if (!this.playerStats) {
            logger.error(LogCategory.COMBAT, 'Cannot attack player: playerStats not found');
            return;
        }
        
        // Calculate actual damage (can be modified by player defense, etc.)
        const actualDamage = Math.max(1, damage);
        
        // Apply damage to player using the PlayerManager or PlayerHealthSystem
        if (this.playerManager && typeof this.playerManager.takeDamage === 'function') {
            this.playerManager.takeDamage(actualDamage, monster.monsterName || 'monster');
        } else if (this.playerHealthSystem) {
            this.playerHealthSystem.takeDamage(actualDamage, monster.monsterName || 'monster');
        } else {
            logger.error(LogCategory.COMBAT, 'Cannot damage player: neither PlayerManager nor PlayerHealthSystem is available');
        }
    }
    
    /**
     * Handle player attacking a monster
     * @param {Object} monster - The monster being attacked
     * @param {number} damage - The base damage amount
     */
    playerAttackMonster(monster, damage) {
        if (!monster) {
            logger.error(LogCategory.COMBAT, 'Cannot attack monster: monster is null');
            return;
        }
        
        // Calculate actual damage (can be modified by weapon, skills, etc.)
        const actualDamage = Math.max(1, damage);
        
        // Apply damage to monster
        monster.takeDamage(actualDamage);
        
        // Log the attack
        logger.info(
            LogCategory.COMBAT, 
            `Player attacked ${monster.monsterName} for ${actualDamage} damage. Monster health: ${monster.attributes.health}/${monster.attributes.maxHealth}`
        );
    }
    
    /**
     * Handle player death
     * This is now handled by PlayerHealthSystem, but kept for backward compatibility
     */
    handlePlayerDeath() {
        logger.info(LogCategory.COMBAT, 'Player died - delegating to PlayerHealthSystem');
        
        if (this.playerHealthSystem) {
            this.playerHealthSystem.handlePlayerDeath();
        } else {
            logger.error(LogCategory.COMBAT, 'PlayerHealthSystem not available, cannot handle player death properly');
            
            // Fallback death handling
            if (this.scene.uiManager) {
                this.scene.uiManager.showMedievalMessage('You have died!', 'error', 5000);
            }
            
            // Transition to game over scene after a delay
            this.scene.time.delayedCall(2000, () => {
                this.scene.scene.start('GameOver');
            });
        }
    }
} 