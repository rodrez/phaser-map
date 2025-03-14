import { logger, LogCategory } from './Logger';
import { CombatConfig } from './CombatConfig';
import { StatusEffectType } from './StatusEffectSystem';

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
        
        // Retaliation properties from config
        this.retaliationRange = CombatConfig.RETALIATION.RANGE;
        this.retaliationCooldown = 0; // Cooldown timer for retaliation
        this.retaliationDamageModifier = CombatConfig.RETALIATION.DAMAGE_MODIFIER;
        
        // Global attack cooldown tracking
        this.globalMonsterAttackCooldown = 0;
        
        logger.info(LogCategory.COMBAT, 'Combat system initialized with balanced configuration');
    }
    
    /**
     * Handle a monster attacking the player
     * @param {Object} monster - The monster attacking the player
     * @param {number} damage - The base damage amount
     * @returns {boolean} - Whether the attack was successful (false if on cooldown)
     */
    monsterAttackPlayer(monster, damage) {
        // Check global monster attack cooldown
        if (this.globalMonsterAttackCooldown > 0) {
            logger.debug(LogCategory.COMBAT, `Monster attack on cooldown (${this.globalMonsterAttackCooldown}ms remaining)`);
            return false;
        }
        
        if (!this.playerStats) {
            logger.error(LogCategory.COMBAT, 'Cannot attack player: playerStats not found');
            return false;
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
                return false;
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
        
        // Set global monster attack cooldown based on monster type
        this.setGlobalMonsterAttackCooldown(monster);
        
        return true;
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
        
        // Get critical hit chance and multiplier from config
        let critChance = CombatConfig.PLAYER_ATTACK.CRITICAL_CHANCE * 100; // Convert to percentage
        const critMultiplier = CombatConfig.PLAYER_ATTACK.CRITICAL_MULTIPLIER;
        let isCritical = false;
        
        // Check for critical hit chance bonuses from player stats
        if (this.playerStats) {
            if (typeof this.playerStats.getStat === 'function' && this.playerStats.getStat('criticalHitChance') !== undefined) {
                const statValue = this.playerStats.getStat('criticalHitChance');
                critChance = isNaN(statValue) ? critChance : statValue;
            } else if (this.playerStats.criticalHitChance !== undefined) {
                const statValue = this.playerStats.criticalHitChance;
                critChance = isNaN(statValue) ? critChance : statValue;
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
            
            // Apply retaliation damage modifier from config
            const retaliationBaseDamage = baseDamage * this.retaliationDamageModifier;
            
            const { damage: retaliationDamage, isCritical } = this.calculatePlayerAttackDamage(retaliationBaseDamage);
            
            // Apply damage to monster
            this.playerAttackMonster(monster, retaliationDamage);
            
            // Set retaliation cooldown from config
            this.retaliationCooldown = CombatConfig.RETALIATION.COOLDOWN;
            
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
        let damage = this.retaliationDamageModifier;
        
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
            logger.error(LogCategory.COMBAT, `Calculated damage is NaN, defaulting to ${this.retaliationDamageModifier}`);
            return this.retaliationDamageModifier;
        }
        
        return finalDamage;
    }
    
    /**
     * Set the global monster attack cooldown based on monster type
     * @param {Object} monster - The monster that just attacked
     */
    setGlobalMonsterAttackCooldown(monster) {
        // Get base cooldown from config
        let cooldown = CombatConfig.MONSTER_ATTACK.BASE_COOLDOWN;
        
        // Apply monster type modifier if available
        if (monster && monster.monsterType && CombatConfig.MONSTER_TYPE_MODIFIERS[monster.monsterType]) {
            const attackSpeedMod = CombatConfig.MONSTER_TYPE_MODIFIERS[monster.monsterType][0];
            cooldown = cooldown / attackSpeedMod;
        }
        
        // Apply boss modifier if this is a boss monster
        if (monster && monster.isBoss) {
            cooldown *= CombatConfig.MONSTER_ATTACK.BOSS_COOLDOWN_MODIFIER;
        }
        
        // Ensure cooldown is not below minimum
        cooldown = Math.max(cooldown, CombatConfig.MONSTER_ATTACK.MIN_COOLDOWN);
        
        // Set the global cooldown
        this.globalMonsterAttackCooldown = cooldown;
        
        logger.debug(LogCategory.COMBAT, `Set global monster attack cooldown to ${cooldown}ms for ${monster.monsterName}`);
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
        
        // Update global monster attack cooldown
        if (this.globalMonsterAttackCooldown > 0) {
            this.globalMonsterAttackCooldown -= delta;
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
     * Apply a status effect to the player from a monster
     * @param {Object} monster - The monster applying the effect
     * @param {string} effectType - The type of status effect (from StatusEffectType)
     * @param {Object} config - Configuration for the status effect
     * @returns {boolean} - Whether the effect was applied
     */
    applyStatusEffectToPlayer(monster, effectType, config = {}) {
        if (!this.playerManager) {
            logger.error(LogCategory.COMBAT, 'Cannot apply status effect: playerManager not found');
            return false;
        }
        
        // Ensure monster is provided
        if (!monster) {
            logger.error(LogCategory.COMBAT, 'Cannot apply status effect: monster is null');
            return false;
        }
        
        // Set default values if not provided
        const effectConfig = {
            damage: config.damage || 1,
            duration: config.duration || 5000, // Default 5 seconds
            tickInterval: config.tickInterval || 1000, // Default 1 second
            source: monster
        };
        
        // Apply the effect
        const applied = this.playerManager.applyStatusEffect(effectType, effectConfig);
        
        if (applied) {
            logger.info(
                LogCategory.COMBAT, 
                `${monster.monsterName || 'Monster'} applied ${effectType} effect to player`
            );
        }
        
        return applied;
    }
    
    /**
     * Apply poison effect to the player
     * @param {Object} monster - The monster applying the poison
     * @param {number} damage - Damage per tick
     * @param {number} duration - Duration in milliseconds
     * @returns {boolean} - Whether the effect was applied
     */
    applyPoisonToPlayer(monster, damage = 1, duration = 5000) {
        return this.applyStatusEffectToPlayer(monster, StatusEffectType.POISON, {
            damage,
            duration,
            tickInterval: 1000 // 1 tick per second
        });
    }
    
    /**
     * Apply burn effect to the player
     * @param {Object} monster - The monster applying the burn
     * @param {number} damage - Damage per tick
     * @param {number} duration - Duration in milliseconds
     * @returns {boolean} - Whether the effect was applied
     */
    applyBurnToPlayer(monster, damage = 1, duration = 3000) {
        return this.applyStatusEffectToPlayer(monster, StatusEffectType.BURN, {
            damage,
            duration,
            tickInterval: 500 // 2 ticks per second (burns are more intense but shorter)
        });
    }
    
    /**
     * Check if the player has a specific status effect
     * @param {string} effectType - The type of status effect to check
     * @returns {boolean} - Whether the player has the effect
     */
    playerHasStatusEffect(effectType) {
        if (!this.playerManager) {
            logger.error(LogCategory.COMBAT, 'Cannot check status effect: playerManager not found');
            return false;
        }
        
        return this.playerManager.hasStatusEffect(effectType);
    }
    
    /**
     * Remove a status effect from the player
     * @param {string} effectType - The type of status effect to remove
     * @returns {boolean} - Whether the effect was removed
     */
    removeStatusEffectFromPlayer(effectType) {
        if (!this.playerManager) {
            logger.error(LogCategory.COMBAT, 'Cannot remove status effect: playerManager not found');
            return false;
        }
        
        return this.playerManager.removeStatusEffect(effectType);
    }
    
    /**
     * Clear all status effects from the player
     */
    clearAllPlayerStatusEffects() {
        if (!this.playerManager) {
            logger.error(LogCategory.COMBAT, 'Cannot clear status effects: playerManager not found');
            return;
        }
        
        this.playerManager.clearAllStatusEffects();
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath() {
        // Clear all status effects when player dies
        this.clearAllPlayerStatusEffects();
        
        // Existing death handling code...
        logger.info(LogCategory.COMBAT, 'Player has died');
        
        // Emit player death event
        if (this.scene.events) {
            this.scene.events.emit('player-death');
        }
    }
} 