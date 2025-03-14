import Phaser from 'phaser';
import { logger, LogCategory } from '../Logger';

/**
 * PlayerStatsService - Single source of truth for all player stats
 * This service manages all player statistics and provides methods to modify them
 */
export class PlayerStatsService extends Phaser.Events.EventEmitter {
    /**
     * Create a new PlayerStatsService
     */
    constructor() {
        super();
        
        // Initialize base stats
        this.stats = {
            // Character info
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            gold: 50,
            
            // Basic stats
            health: 100,
            maxHealth: 100,
            attack: 15,
            defense: 10,
            speed: 8,
            
            // Base stats (without skill effects)
            baseAttack: 15,
            baseDefense: 10,
            baseSpeed: 8,
            baseMaxHealth: 100,
            
            // Combat stats
            criticalHitChance: 5, // 5% base critical hit chance
            
            // Special modes
            godMode: false,
            
            // Weapon-specific stats
            weaponAttackBonuses: new Map([
                ['sword', 5],
                ['bow', 3],
                ['axe', 7]
            ]), // weaponType -> bonus
            weaponDefenseBonuses: new Map(), // weaponType -> (attackType -> bonus)
            weaponRangeBonuses: new Map(), // weaponType -> bonus
            
            // Armor-specific stats
            armorDefenseBonuses: new Map(), // armorType -> (attackType -> bonus)
            armorSpeedPenaltyReductions: new Map(), // armorType -> percentage
            
            // Dodge chance
            dodgeChance: 0,
            
            // Healing bonuses
            healingMultiplier: 1.2,
            
            // Merchant discounts
            merchantDiscounts: new Map(), // merchantType -> percentage
            
            // Aggressive timer reduction
            aggressiveTimerReduction: 0,
            
            // Crafting bonuses
            craftingTimeReduction: 10,
            craftingExtraItems: new Map(), // ratio type -> value
            
            // Resource gathering bonuses
            resourceBonuses: new Map(), // resourceType -> (bonusType -> value)
            
            // Durability bonuses
            durabilityMultipliers: new Map(), // itemType -> multiplier
            
            // Unlocked abilities
            unlockedAbilities: new Set([
                'Double Strike',
                'Quick Dodge',
                'Power Attack'
            ]),
            
            // Ability modifiers
            abilityCooldownReductions: new Map(), // abilityName -> seconds/percentage
            abilityDurationIncreases: new Map(), // abilityName -> seconds/percentage
            abilityEffectIncreases: new Map(), // abilityName -> (effectType -> value)
            
            // Pet bonuses
            petBonuses: new Map(), // bonusType -> value
            
            // Minion unlocks and bonuses
            unlockedMinions: new Map(), // minionType -> count
            minionBonuses: new Map(), // minionType -> (bonusType -> value)
            
            // Special interactions
            specialInteractions: new Map(), // interactionType -> description
            
            // Target-specific bonuses
            targetAttackBonuses: new Map(), // targetType -> bonus
            targetDefenseBonuses: new Map(), // targetType -> bonus
            
            // Environment-specific bonuses
            environmentSpeedBonuses: new Map(), // environment -> bonus
            
            // Crafting unlocks
            craftableItems: new Set([
                'Health Potion',
                'Strength Potion',
                'Iron Sword',
                'Leather Armor'
            ]),
            
            // Base craftable items (without skill effects)
            baseCraftableItems: new Set([
                'Health Potion',
                'Strength Potion',
                'Iron Sword',
                'Leather Armor'
            ]),
        };
        
        logger.info(LogCategory.PLAYER, "PlayerStatsService initialized");
    }
    
    /**
     * Get all player stats
     * @returns {Object} The player stats object
     */
    getStats() {
        return this.stats;
    }
    
    /**
     * Get a specific stat value
     * @param {string} statName - The name of the stat to get
     * @returns {any} The value of the stat
     */
    getStat(statName) {
        return this.stats[statName];
    }
    
    /**
     * Set a specific stat value
     * @param {string} statName - The name of the stat to set
     * @param {any} value - The value to set
     * @param {boolean} silent - Whether to emit the stats-changed event
     */
    setStat(statName, value, silent = false) {
        this.stats[statName] = value;
        
        if (!silent) {
            this.emit('stats-changed', { [statName]: value });
        }
    }
    
    /**
     * Update multiple stats at once
     * @param {Object} updates - Object containing stat updates
     * @param {boolean} silent - Whether to emit the stats-changed event
     */
    updateStats(updates, silent = false) {
        const changedStats = {};
        
        // Apply all updates
        for (const [statName, value] of Object.entries(updates)) {
            // Handle special cases for Maps and Sets
            if (value instanceof Map) {
                if (!this.stats[statName]) {
                    this.stats[statName] = new Map();
                }
                
                // Clear existing map and add new values
                this.stats[statName].clear();
                value.forEach((val, key) => {
                    this.stats[statName].set(key, val);
                });
            } else if (value instanceof Set) {
                if (!this.stats[statName]) {
                    this.stats[statName] = new Set();
                }
                
                // Clear existing set and add new values
                this.stats[statName].clear();
                value.forEach(item => {
                    this.stats[statName].add(item);
                });
            } else {
                // Regular value update
                this.stats[statName] = value;
                
                // Update base stats if needed
                if (statName === 'attack' && !('baseAttack' in updates)) {
                    this.stats.baseAttack = value;
                }
                if (statName === 'defense' && !('baseDefense' in updates)) {
                    this.stats.baseDefense = value;
                }
                if (statName === 'speed' && !('baseSpeed' in updates)) {
                    this.stats.baseSpeed = value;
                }
                if (statName === 'maxHealth' && !('baseMaxHealth' in updates)) {
                    this.stats.baseMaxHealth = value;
                }
            }
            
            changedStats[statName] = value;
        }
        
        if (!silent && Object.keys(changedStats).length > 0) {
            this.emit('stats-changed', changedStats);
        }
    }
    
    /**
     * Apply damage to the player
     * @param {number} damage - The amount of damage to apply
     * @param {string} source - The source of the damage
     * @returns {number} - The actual damage applied
     */
    takeDamage(damage, source = 'unknown') {
        // Ensure damage is a valid number
        if (isNaN(damage) || damage === undefined) {
            logger.error(LogCategory.HEALTH, `Invalid damage amount: ${damage}, defaulting to 0`);
            damage = 0;
        }
        
        // Convert damage to a number to ensure it's not a string
        damage = Number(damage);
        
        // Check for dodge chance
        if (this.stats.dodgeChance > 0) {
            // Ensure dodge chance is a valid number
            const dodgeChance = isNaN(this.stats.dodgeChance) ? 0 : Number(this.stats.dodgeChance);
            
            // Roll for dodge
            const dodgeRoll = Math.random() * 100;
            if (dodgeRoll <= dodgeChance) {
                // Successfully dodged the attack
                logger.info(
                    LogCategory.COMBAT,
                    `Player dodged attack from ${source}!`
                );
                
                // Emit dodge event
                this.emit('attack-dodged', { 
                    source,
                    dodgeChance: dodgeChance
                });
                
                return 0; // No damage taken
            }
        }
        
        // Calculate actual damage (modified by defense)
        // Formula: damage = max(1, baseDamage - (defense * 0.5))
        // This means each point of defense reduces damage by 0.5
        const defense = isNaN(this.stats.defense) ? 0 : Number(this.stats.defense);
        const damageReduction = defense * 0.5;
        const actualDamage = Math.max(1, Math.floor(damage - damageReduction));
        
        // Store current health before damage
        const oldHealth = this.stats.health;
        
        // Apply damage to player
        this.stats.health = Math.max(0, this.stats.health - actualDamage);
        
        // Log the damage
        logger.info(
            LogCategory.HEALTH, 
            `Player took ${actualDamage} damage from ${source} (${damage} base, ${damageReduction.toFixed(1)} reduced by defense). Health: ${oldHealth} -> ${this.stats.health}/${this.stats.maxHealth}`
        );
        
        // Emit damage taken event
        this.emit('damage-taken', { 
            damage: actualDamage, 
            baseDamage: damage,
            damageReduction,
            source, 
            oldHealth, 
            newHealth: this.stats.health 
        });
        
        // Emit stats changed event
        this.emit('stats-changed', { health: this.stats.health });
        
        return actualDamage;
    }
    
    /**
     * Heal the player by a specific amount
     * @param {number} amount - The amount to heal
     * @param {string} source - The source of healing
     * @returns {number} - The actual amount healed
     */
    heal(amount, source = 'potion') {
        // Calculate how much we can actually heal
        const maxHealAmount = this.stats.maxHealth - this.stats.health;
        const actualHealAmount = Math.min(maxHealAmount, amount);
        
        // If no healing needed, return early
        if (actualHealAmount <= 0) {
            logger.info(LogCategory.HEALTH, `Heal attempt from ${source} - Player already at full health`);
            return 0;
        }
        
        // Store current health before healing
        const oldHealth = this.stats.health;
        
        // Apply healing
        this.stats.health += actualHealAmount;
        
        // Log the healing
        logger.info(
            LogCategory.HEALTH, 
            `Player healed for ${actualHealAmount} from ${source}. Health: ${oldHealth} -> ${this.stats.health}/${this.stats.maxHealth}`
        );
        
        // Emit healing event
        this.emit('healing', { 
            amount: actualHealAmount, 
            source, 
            oldHealth, 
            newHealth: this.stats.health 
        });
        
        // Emit stats changed event
        this.emit('stats-changed', { health: this.stats.health });
        
        return actualHealAmount;
    }
    
    /**
     * Heal the player to full health
     * @param {string} source - The source of the full heal
     * @returns {number} - The amount healed
     */
    healToFull(source = 'full heal') {
        const healAmount = this.stats.maxHealth - this.stats.health;
        return this.heal(healAmount, source);
    }
    
    /**
     * Toggle god mode
     * @returns {boolean} - The new god mode state
     */
    toggleGodMode() {
        // Toggle god mode
        this.stats.godMode = !this.stats.godMode;
        
        // If enabling god mode, heal player to full health
        if (this.stats.godMode) {
            this.healToFull('god mode toggle');
        }
        
        // Emit god mode changed event
        this.emit('god-mode-changed', this.stats.godMode);
        
        // Emit stats changed event
        this.emit('stats-changed', { godMode: this.stats.godMode });
        
        logger.info(LogCategory.PLAYER, `God mode ${this.stats.godMode ? 'enabled' : 'disabled'}`);
        
        return this.stats.godMode;
    }
    
    /**
     * Check if god mode should trigger healing
     */
    checkGodModeHealing() {
        if (this.stats.godMode === true) {
            logger.info(LogCategory.PLAYER, "God mode active, checking if healing is needed");
            
            // Get the current health
            const currentHealth = this.stats.health;
            
            // Only heal if health is below 50% of max health
            const healthThreshold = this.stats.maxHealth * 0.5; // 50% of max health
            if (currentHealth < healthThreshold) {
                logger.info(LogCategory.HEALTH, `Health ${currentHealth}/${this.stats.maxHealth} is below 50% threshold, triggering god mode healing`);
                
                // Calculate heal amount
                const healAmount = this.stats.maxHealth - currentHealth;
                
                // Immediately heal the player to full health
                this.stats.health = this.stats.maxHealth;
                
                // Emit god mode healing event
                this.emit('god-mode-healing', { 
                    amount: healAmount, 
                    oldHealth: currentHealth, 
                    newHealth: this.stats.health 
                });
                
                // Emit stats changed event
                this.emit('stats-changed', { health: this.stats.health });
                
                logger.info(LogCategory.HEALTH, `God mode healed player for ${healAmount} health (below 50% threshold). Health: ${currentHealth} -> ${this.stats.health}/${this.stats.maxHealth}`);
                
                return healAmount;
            } else {
                logger.info(LogCategory.HEALTH, `Health ${currentHealth}/${this.stats.maxHealth} is above 50% threshold, no god mode healing needed`);
            }
        }
        
        return 0;
    }
    
    /**
     * Add experience points to the player
     * @param {number} amount - The amount of XP to add
     * @returns {boolean} - Whether the player leveled up
     */
    addXP(amount) {
        if (amount <= 0) return false;
        
        // Store current XP and level
        const oldXP = this.stats.xp;
        const oldLevel = this.stats.level;
        
        // Add XP
        this.stats.xp += amount;
        
        // Check for level up
        let leveledUp = false;
        while (this.stats.xp >= this.stats.xpToNextLevel) {
            // Level up
            this.stats.level += 1;
            this.stats.xp -= this.stats.xpToNextLevel;
            
            // Increase XP required for next level
            this.stats.xpToNextLevel = Math.floor(this.stats.xpToNextLevel * 1.5);
            
            // Increase max health
            const oldMaxHealth = this.stats.maxHealth;
            this.stats.maxHealth += 10;
            this.stats.health = this.stats.maxHealth; // Heal to full on level up
            
            // Increase attack and defense
            this.stats.attack += 2;
            this.stats.defense += 1;
            
            leveledUp = true;
            
            logger.info(
                LogCategory.PLAYER, 
                `Player leveled up! Level ${oldLevel} -> ${this.stats.level}. Max Health: ${oldMaxHealth} -> ${this.stats.maxHealth}`
            );
        }
        
        // Emit XP gained event
        this.emit('xp-gained', { 
            amount, 
            oldXP, 
            newXP: this.stats.xp, 
            oldLevel, 
            newLevel: this.stats.level,
            leveledUp
        });
        
        // Emit stats changed event
        this.emit('stats-changed', { 
            xp: this.stats.xp, 
            level: this.stats.level, 
            xpToNextLevel: this.stats.xpToNextLevel,
            maxHealth: this.stats.maxHealth,
            health: this.stats.health,
            attack: this.stats.attack,
            defense: this.stats.defense
        });
        
        return leveledUp;
    }
    
    /**
     * Add gold to the player
     * @param {number} amount - The amount of gold to add
     */
    addGold(amount) {
        if (amount <= 0) return;
        
        // Store current gold
        const oldGold = this.stats.gold;
        
        // Add gold
        this.stats.gold += amount;
        
        // Emit gold gained event
        this.emit('gold-gained', { 
            amount, 
            oldGold, 
            newGold: this.stats.gold 
        });
        
        // Emit stats changed event
        this.emit('stats-changed', { gold: this.stats.gold });
        
        logger.info(
            LogCategory.PLAYER, 
            `Player gained ${amount} gold. Gold: ${oldGold} -> ${this.stats.gold}`
        );
    }
    
    /**
     * Spend gold if the player has enough
     * @param {number} amount - The amount of gold to spend
     * @returns {boolean} - Whether the transaction was successful
     */
    spendGold(amount) {
        if (amount <= 0) return true;
        if (this.stats.gold < amount) return false;
        
        // Store current gold
        const oldGold = this.stats.gold;
        
        // Subtract gold
        this.stats.gold -= amount;
        
        // Emit gold spent event
        this.emit('gold-spent', { 
            amount, 
            oldGold, 
            newGold: this.stats.gold 
        });
        
        // Emit stats changed event
        this.emit('stats-changed', { gold: this.stats.gold });
        
        logger.info(
            LogCategory.PLAYER, 
            `Player spent ${amount} gold. Gold: ${oldGold} -> ${this.stats.gold}`
        );
        
        return true;
    }
}

// Create a singleton instance
const playerStatsService = new PlayerStatsService();

// Export the singleton
export default playerStatsService; 