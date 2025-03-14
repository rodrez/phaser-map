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
        
        // Ensure damage is a valid number
        if (isNaN(damage) || damage === undefined) {
            logger.error(LogCategory.COMBAT, `Invalid damage amount from monster: ${damage}, defaulting to 1`);
            damage = 1;
        }
        
        // Convert damage to a number to ensure it's not a string
        damage = Number(damage);
        
        // Pass the raw damage to the player's damage handling system
        // The actual damage calculation (including defense and dodge) will happen there
        let damageDealt = 0;
        
        try {
            if (this.playerManager && typeof this.playerManager.takeDamage === 'function') {
                damageDealt = this.playerManager.takeDamage(damage, monster.monsterName || 'monster');
            } else if (this.playerHealthSystem) {
                damageDealt = this.playerHealthSystem.takeDamage(damage, monster.monsterName || 'monster');
            } else {
                logger.error(LogCategory.COMBAT, 'Cannot damage player: neither PlayerManager nor PlayerHealthSystem is available');
                return;
            }
            
            // Ensure damageDealt is a valid number
            if (isNaN(damageDealt)) {
                logger.error(LogCategory.COMBAT, `Damage dealt is NaN, treating as 0`);
                damageDealt = 0;
            }
            
            // Convert to number to ensure proper comparison
            damageDealt = Number(damageDealt);
            
            // Log the result of the attack
            if (damageDealt === 0) {
                logger.info(LogCategory.COMBAT, `Player avoided damage from ${monster.monsterName || 'monster'} (likely dodged)`);
            } else {
                logger.info(LogCategory.COMBAT, `Monster ${monster.monsterName || 'unknown'} dealt ${damageDealt} damage to player`);
            }
        } catch (error) {
            logger.error(LogCategory.COMBAT, `Error applying damage to player: ${error.message}`);
            damageDealt = 0;
        }
        
        // If damage was completely avoided (e.g., dodged), don't set last attacking monster
        if (damageDealt > 0) {
            // Set the last attacking monster for retaliation
            this.lastAttackingMonster = monster;
            
            // Trigger immediate retaliation if not on cooldown
            if (this.retaliationCooldown <= 0) {
                this.retaliateAgainstMonster(monster);
            }
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
        
        // Ensure damage is a valid number
        if (isNaN(damage) || damage === undefined) {
            logger.error(LogCategory.COMBAT, `Invalid damage amount: ${damage}, defaulting to 1`);
            damage = 1;
        }
        
        // Calculate actual damage (can be modified by weapon, skills, etc.)
        const { damage: actualDamage, isCritical } = this.calculatePlayerAttackDamage(damage);
        
        try {
            // Apply damage to monster
            if (typeof monster.takeDamage === 'function') {
                monster.takeDamage(actualDamage);
            } else {
                logger.error(LogCategory.COMBAT, `Monster ${monster.monsterName || 'unknown'} does not have takeDamage method`);
                return;
            }
            
            // Set this monster as the last attacking monster for continued retaliation
            this.lastAttackingMonster = monster;
            
            // Log the attack
            const criticalText = isCritical ? ' (CRITICAL HIT!)' : '';
            logger.info(
                LogCategory.COMBAT, 
                `Player attacked ${monster.monsterName} for ${actualDamage} damage${criticalText}. Monster health: ${monster.attributes.health}/${monster.attributes.maxHealth}`
            );
        } catch (error) {
            logger.error(LogCategory.COMBAT, `Error applying damage to monster: ${error.message}`);
        }
    }
    
    /**
     * Calculate player attack damage with critical hit chance
     * @param {number} baseDamage - The base damage amount
     * @returns {Object} - Object containing the calculated damage and whether it was a critical hit
     */
    calculatePlayerAttackDamage(baseDamage) {
        // Ensure baseDamage is a valid number
        if (isNaN(baseDamage) || baseDamage === undefined) {
            logger.error(LogCategory.COMBAT, `Invalid base damage: ${baseDamage}, defaulting to 1`);
            baseDamage = 1;
        }
        
        // Start with base damage
        let damage = baseDamage;
        
        // Default critical hit chance (5%) and multiplier (2x)
        let critChance = 5;
        const critMultiplier = 2.0;
        let isCritical = false;
        
        // Check for critical hit chance bonuses from player stats
        if (this.playerStats) {
            if (typeof this.playerStats.getStat === 'function' && this.playerStats.getStat('criticalHitChance') !== undefined) {
                const statValue = this.playerStats.getStat('criticalHitChance');
                critChance = isNaN(statValue) ? 5 : statValue;
            } else if (this.playerStats.criticalHitChance !== undefined) {
                const statValue = this.playerStats.criticalHitChance;
                critChance = isNaN(statValue) ? 5 : statValue;
            }
        }
        
        // Roll for critical hit
        if (Math.random() * 100 <= critChance) {
            damage *= critMultiplier;
            isCritical = true;
        }
        
        // Add random variation (±10%)
        const variation = damage * 0.1;
        damage += Math.random() * variation * 2 - variation;
        
        // Ensure final damage is a valid number
        const finalDamage = Math.max(1, Math.floor(damage));
        if (isNaN(finalDamage)) {
            logger.error(LogCategory.COMBAT, `Calculated damage is NaN, defaulting to 1`);
            return {
                damage: 1,
                isCritical
            };
        }
        
        return {
            damage: finalDamage,
            isCritical
        };
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
        
        try {
            // Calculate retaliation damage using player's attack stat
            const baseDamage = this.calculatePlayerDamage();
            
            // Ensure baseDamage is a valid number
            if (isNaN(baseDamage)) {
                logger.error(LogCategory.COMBAT, `Base damage for retaliation is NaN, aborting retaliation`);
                return;
            }
            
            const { damage: retaliationDamage, isCritical } = this.calculatePlayerAttackDamage(baseDamage);
            
            // Apply damage to monster
            this.playerAttackMonster(monster, retaliationDamage);
            
            // Set retaliation cooldown (1 second)
            this.retaliationCooldown = 1000;
            
            // Log the retaliation
            const criticalText = isCritical ? ' (CRITICAL HIT!)' : '';
            logger.info(
                LogCategory.COMBAT, 
                `Player retaliated against ${monster.monsterName} for ${retaliationDamage} damage${criticalText}`
            );
        } catch (error) {
            logger.error(LogCategory.COMBAT, `Error during retaliation: ${error.message}`);
        }
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
        // Base damage from player's attack stat
        let damage = this.retaliationDamage;
        
        // Add player's attack stat if available
        if (this.playerStats) {
            if (typeof this.playerStats.getStat === 'function') {
                // If playerStats is the service with getStat method
                const attackStat = this.playerStats.getStat('attack');
                if (!isNaN(attackStat) && attackStat !== undefined) {
                    damage = attackStat;
                } else {
                    logger.warn(LogCategory.COMBAT, `Invalid attack stat: ${attackStat}, using base damage`);
                }
            } else if (this.playerStats.attack !== undefined) {
                // If playerStats is a direct reference to the stats object
                const attackStat = this.playerStats.attack;
                if (!isNaN(attackStat)) {
                    damage = attackStat;
                } else {
                    logger.warn(LogCategory.COMBAT, `Invalid attack stat: ${attackStat}, using base damage`);
                }
            }
        }
        
        // Add weapon damage if available
        if (this.playerStats) {
            if (this.playerStats.weaponDamage) {
                const weaponDamage = this.playerStats.weaponDamage;
                if (!isNaN(weaponDamage)) {
                    damage += weaponDamage;
                }
            }
            
            // Check for weapon type bonuses
            const currentWeaponType = this.playerStats.currentWeapon || 'sword';
            if (typeof this.playerStats.getStat === 'function') {
                const weaponBonuses = this.playerStats.getStat('weaponAttackBonuses');
                if (weaponBonuses instanceof Map && weaponBonuses.has(currentWeaponType)) {
                    const bonus = weaponBonuses.get(currentWeaponType);
                    if (!isNaN(bonus)) {
                        damage += bonus;
                    }
                }
            } else if (this.playerStats.weaponAttackBonuses instanceof Map) {
                if (this.playerStats.weaponAttackBonuses.has(currentWeaponType)) {
                    const bonus = this.playerStats.weaponAttackBonuses.get(currentWeaponType);
                    if (!isNaN(bonus)) {
                        damage += bonus;
                    }
                }
            }
        }
        
        // Add random variation (±20%)
        const variation = damage * 0.2;
        damage += Math.random() * variation * 2 - variation;
        
        // Ensure final damage is a valid number
        const finalDamage = Math.max(1, Math.floor(damage));
        if (isNaN(finalDamage)) {
            logger.error(LogCategory.COMBAT, `Calculated damage is NaN, defaulting to ${this.retaliationDamage}`);
            return this.retaliationDamage;
        }
        
        return finalDamage;
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