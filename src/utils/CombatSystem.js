import { logger, LogCategory } from './Logger';

export class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.playerStats = scene.playerStats;
        this.playerManager = scene.playerManager;
        this.playerHealthSystem = scene.playerHealthSystem;
        
        // Register this system in the scene for other systems to access
        this.scene.combatSystem = this;
        
        // Track the last monster that attacked the player for retaliation
        this.lastAttackingMonster = null;
        
        // Retaliation properties
        this.retaliationRange = 100; // Range at which player can retaliate
        this.retaliationCooldown = 0; // Cooldown timer for retaliation
        this.retaliationDamage = 10; // Base damage for retaliation
        
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
            return;
        }
        
        // Set the last attacking monster for retaliation
        this.lastAttackingMonster = monster;
        
        // Trigger immediate retaliation if not on cooldown
        if (this.retaliationCooldown <= 0) {
            this.retaliateAgainstMonster(monster);
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
        
        // Set this monster as the last attacking monster for continued retaliation
        this.lastAttackingMonster = monster;
        
        // Log the attack
        logger.info(
            LogCategory.COMBAT, 
            `Player attacked ${monster.monsterName} for ${actualDamage} damage. Monster health: ${monster.attributes.health}/${monster.attributes.maxHealth}`
        );
    }
    
    /**
     * Retaliate against a monster that attacked the player
     * @param {Object} monster - The monster to retaliate against
     */
    retaliateAgainstMonster(monster) {
        if (!monster || !monster.active) {
            logger.debug(LogCategory.COMBAT, 'Cannot retaliate: monster is null or inactive');
            return;
        }
        
        // Check if monster is in range for retaliation
        if (!this.isMonsterInRetaliationRange(monster)) {
            logger.debug(LogCategory.COMBAT, `${monster.monsterName} is out of retaliation range`);
            return;
        }
        
        // Calculate retaliation damage (can be modified by weapon, skills, etc.)
        const retaliationDamage = this.calculatePlayerDamage();
        
        // Apply damage to monster
        this.playerAttackMonster(monster, retaliationDamage);
        
        // Set retaliation cooldown (1 second)
        this.retaliationCooldown = 1000;
        
        logger.info(
            LogCategory.COMBAT, 
            `Player retaliated against ${monster.monsterName} for ${retaliationDamage} damage`
        );
    }
    
    /**
     * Check if a monster is in range for retaliation
     * @param {Object} monster - The monster to check
     * @returns {boolean} - True if monster is in range, false otherwise
     */
    isMonsterInRetaliationRange(monster) {
        if (!monster || !this.scene.playerManager) {
            return false;
        }
        
        const player = this.scene.playerManager.getPlayer();
        if (!player) {
            return false;
        }
        
        // Calculate distance between player and monster
        const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            monster.x, monster.y
        );
        
        return distance <= this.retaliationRange;
    }
    
    /**
     * Calculate player damage based on stats, weapons, etc.
     * @returns {number} - The calculated damage
     */
    calculatePlayerDamage() {
        // Base damage
        let damage = this.retaliationDamage;
        
        // Add weapon damage if available
        if (this.playerStats && this.playerStats.weaponDamage) {
            damage += this.playerStats.weaponDamage;
        }
        
        // Add random variation (±20%)
        const variation = damage * 0.2;
        damage += Math.random() * variation * 2 - variation;
        
        return Math.max(1, Math.floor(damage));
    }
    
    /**
     * Update method to be called in the scene's update loop
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Update retaliation cooldown
        if (this.retaliationCooldown > 0) {
            this.retaliationCooldown -= delta;
        }
        
        // Check for retaliation if there's a last attacking monster and cooldown is done
        if (this.lastAttackingMonster && this.retaliationCooldown <= 0) {
            // Only retaliate if monster is still active and in range
            if (this.lastAttackingMonster.active && this.isMonsterInRetaliationRange(this.lastAttackingMonster)) {
                this.retaliateAgainstMonster(this.lastAttackingMonster);
            } else {
                // Clear last attacking monster if it's no longer valid
                this.lastAttackingMonster = null;
            }
        }
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