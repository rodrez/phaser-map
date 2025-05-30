import Phaser from 'phaser';
import { EffectType, SkillEffectUnion, DodgeChanceEffect } from './effect-types';
import { EnhancedSkill } from './skill';
import playerStatsService from '../utils/player/PlayerStatsService';

/**
 * Interface for player stats that can be modified by skills
 */
export interface PlayerStats {
  // Base stats
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  
  // Weapon-specific stats
  weaponAttackBonuses: Map<string, number>; // weaponType -> bonus
  weaponDefenseBonuses: Map<string, Map<string, number>>; // weaponType -> (attackType -> bonus)
  weaponRangeBonuses: Map<string, number>; // weaponType -> bonus
  
  // Armor-specific stats
  armorDefenseBonuses: Map<string, Map<string, number>>; // armorType -> (attackType -> bonus)
  armorSpeedPenaltyReductions: Map<string, number>; // armorType -> percentage
  
  // Dodge chance
  dodgeChance: number;
  
  // Healing bonuses
  healingMultiplier: number;
  
  // Merchant discounts
  merchantDiscounts: Map<string, number>; // merchantType -> percentage
  
  // Aggressive timer reduction
  aggressiveTimerReduction: number;
  
  // Crafting bonuses
  craftingTimeReduction: number;
  craftingExtraItems: Map<string, number>; // ratio type -> value
  
  // Resource gathering bonuses
  resourceBonuses: Map<string, Map<string, number>>; // resourceType -> (bonusType -> value)
  
  // Durability bonuses
  durabilityMultipliers: Map<string, number>; // itemType -> multiplier
  
  // Unlocked abilities
  unlockedAbilities: Set<string>;
  
  // Ability modifiers
  abilityCooldownReductions: Map<string, number>; // abilityName -> seconds/percentage
  abilityDurationIncreases: Map<string, number>; // abilityName -> seconds/percentage
  abilityEffectIncreases: Map<string, Map<string, number>>; // abilityName -> (effectType -> value)
  
  // Pet bonuses
  petBonuses: Map<string, number | string>; // bonusType -> value
  
  // Minion unlocks and bonuses
  unlockedMinions: Map<string, number>; // minionType -> count
  minionBonuses: Map<string, Map<string, number | string>>; // minionType -> (bonusType -> value)
  
  // Special interactions
  specialInteractions: Map<string, string>; // interactionType -> description
  
  // Target-specific bonuses
  targetAttackBonuses: Map<string, number>; // targetType -> bonus
  targetDefenseBonuses: Map<string, number>; // targetType -> bonus
  
  // Environment-specific bonuses
  environmentSpeedBonuses: Map<string, number>; // environment -> bonus
  
  // Crafting unlocks
  craftableItems: Set<string>;
}

/**
 * System responsible for applying skill effects to the player.
 */
export class EnhancedSkillEffectSystem extends Phaser.Events.EventEmitter {
  /** Map of player skills */
  private playerSkills: Map<string, EnhancedSkill>;
  
  /** Cached player stats with skill bonuses applied */
  private cachedPlayerStats: PlayerStats | null = null;
  
  /** Flag to track if stats need recalculation */
  private needsRecalculation: boolean = true;
  
  /** Reference to the player stats service */
  private statsService = playerStatsService;
  
  /**
   * Creates a new EnhancedSkillEffectSystem.
   * @param playerSkills Map of player skills
   */
  constructor(playerSkills: Map<string, EnhancedSkill>) {
    super();
    this.playerSkills = playerSkills;
    
    // Listen for stats changes from the service
    this.statsService.on('stats-changed', (statsUpdate) => {
      // Only recalculate if this is not a silent update
      // Silent updates are typically from us, so we don't need to recalculate
      if (statsUpdate && !statsUpdate.silent) {
        this.flagForRecalculation();
      }
    });
  }
  
  /**
   * Flags the system to recalculate stats on next access.
   */
  flagForRecalculation(): void {
    this.needsRecalculation = true;
    this.emit('stats-changed');
  }
  
  /**
   * Updates the player skills map.
   * @param playerSkills New map of player skills
   */
  updatePlayerSkills(playerSkills: Map<string, EnhancedSkill>): void {
    this.playerSkills = playerSkills;
    this.flagForRecalculation();
  }
  
  /**
   * Gets the player's stats with all skill effects applied.
   * @param baseStats Base player stats without skill effects
   * @returns Player stats with all skill effects applied
   */
  getPlayerStats(baseStats?: Partial<PlayerStats>): PlayerStats {
    // If we have cached stats and don't need recalculation, return the cached stats
    if (this.cachedPlayerStats && !this.needsRecalculation && !baseStats) {
      return this.cachedPlayerStats;
    }
    
    // Get the current stats from the service
    const currentStats = this.statsService.getStats();
    
    // Start with base stats or create default stats
    // Important: We need to use base stats without any skill effects
    const stats: PlayerStats = {
      attack: baseStats?.attack ?? (currentStats as any).baseAttack ?? 10,
      defense: baseStats?.defense ?? (currentStats as any).baseDefense ?? 5,
      speed: baseStats?.speed ?? (currentStats as any).baseSpeed ?? 5,
      maxHp: baseStats?.maxHp ?? (currentStats as any).baseMaxHealth ?? 100,
      
      // Initialize maps and sets with empty collections to avoid accumulating effects
      weaponAttackBonuses: new Map(),
      weaponDefenseBonuses: new Map(),
      weaponRangeBonuses: new Map(),
      
      armorDefenseBonuses: new Map(),
      armorSpeedPenaltyReductions: new Map(),
      
      // Reset dodge chance to 0 before applying skill effects
      dodgeChance: 0,
      
      healingMultiplier: baseStats?.healingMultiplier ?? 1,
      
      merchantDiscounts: new Map(),
      
      aggressiveTimerReduction: 0,
      
      craftingTimeReduction: 0,
      craftingExtraItems: new Map(),
      
      resourceBonuses: new Map(),
      
      durabilityMultipliers: new Map(),
      
      unlockedAbilities: new Set(),
      
      abilityCooldownReductions: new Map(),
      abilityDurationIncreases: new Map(),
      abilityEffectIncreases: new Map(),
      
      petBonuses: new Map(),
      
      unlockedMinions: new Map(),
      minionBonuses: new Map(),
      
      specialInteractions: new Map(),
      
      targetAttackBonuses: new Map(),
      targetDefenseBonuses: new Map(),
      
      environmentSpeedBonuses: new Map(),
      
      craftableItems: new Set(),
    };
    
    // Copy base craftable items from current stats
    if ((currentStats as any).baseCraftableItems) {
      (currentStats as any).baseCraftableItems.forEach((item: string) => {
        stats.craftableItems.add(item);
      });
    }
    
    // Apply effects from all player skills
    for (const skill of this.playerSkills.values()) {
      // Only apply effects from learned skill levels
      for (let level = 1; level <= skill.level; level++) {
        const skillLevel = skill.levels.find(l => l.level === level);
        if (skillLevel) {
          for (const effect of skillLevel.effects) {
            // Handle conditional effects
            if (effect.type === EffectType.CONDITIONAL_EFFECT) {
              // For now, we'll apply conditional effects directly
              // In a real game, you'd check the condition against the current game state
              // For example, for Martial Arts level 2, we'd check if the player is unarmed or using Oiyoi Gear
              
              // For demonstration purposes, we'll apply the effect directly
              // In a real implementation, you'd check the condition first
              this.applyEffect(stats, effect.effect as SkillEffectUnion);
            } else if (effect.type === EffectType.CHANCE_EFFECT) {
              // For chance effects, we'll apply the effect directly for stat calculation
              // In a real game, you'd roll the chance when the effect is triggered
              this.applyEffect(stats, effect.effect as SkillEffectUnion);
            } else {
              this.applyEffect(stats, effect);
            }
          }
        }
      }
    }
    
    // Cache the stats and reset the recalculation flag
    this.cachedPlayerStats = stats;
    this.needsRecalculation = false;
    
    // Update the stats service with the new stats
    this.updateStatsService(stats);
    
    return stats;
  }
  
  /**
   * Updates the stats service with the calculated stats
   * @param stats The calculated stats
   */
  private updateStatsService(stats: PlayerStats): void {
    // Only update if there are changes
    const currentStats = this.statsService.getStats();
    
    // Create an update object with only the changed values
    const updates: any = {};
    
    // Update basic stats
    if (stats.attack !== currentStats.attack) updates.attack = stats.attack;
    if (stats.defense !== currentStats.defense) updates.defense = stats.defense;
    if (stats.speed !== currentStats.speed) updates.speed = stats.speed;
    if (stats.maxHp !== currentStats.maxHealth) updates.maxHealth = stats.maxHp;
    
    // Update dodge chance
    if (stats.dodgeChance !== currentStats.dodgeChance) updates.dodgeChance = stats.dodgeChance;
    
    // Update weapon attack bonuses
    if (stats.weaponAttackBonuses.size > 0) {
      const weaponAttackBonuses = new Map();
      stats.weaponAttackBonuses.forEach((value, key) => {
        weaponAttackBonuses.set(key, value);
      });
      updates.weaponAttackBonuses = weaponAttackBonuses;
    }
    
    // Update weapon range bonuses
    if (stats.weaponRangeBonuses.size > 0) {
      const weaponRangeBonuses = new Map();
      stats.weaponRangeBonuses.forEach((value, key) => {
        weaponRangeBonuses.set(key, value);
      });
      updates.weaponRangeBonuses = weaponRangeBonuses;
    }
    
    // Update craftable items
    if (stats.craftableItems.size > 0) {
      const craftableItems = new Set();
      stats.craftableItems.forEach(item => {
        craftableItems.add(item);
      });
      updates.craftableItems = craftableItems;
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      // Use silent update to avoid recursion
      this.statsService.updateStats(updates, true); // Silent update to avoid recursion
    }
  }
  
  /**
   * Applies a single skill effect to the player stats.
   * @param stats Player stats to modify
   * @param effect Skill effect to apply
   */
  private applyEffect(stats: PlayerStats, effect: SkillEffectUnion): void {
    switch (effect.type) {
      case EffectType.ATTACK_BONUS:
        stats.attack += effect.value;
        if (effect.targetType) {
          const currentBonus = stats.targetAttackBonuses.get(effect.targetType) || 0;
          stats.targetAttackBonuses.set(effect.targetType, currentBonus + effect.value);
        }
        break;
        
      case EffectType.DEFENSE_BONUS:
        stats.defense += effect.value;
        if (effect.targetType) {
          const currentBonus = stats.targetDefenseBonuses.get(effect.targetType) || 0;
          stats.targetDefenseBonuses.set(effect.targetType, currentBonus + effect.value);
        }
        break;
        
      case EffectType.SPEED_BONUS:
        stats.speed += effect.value;
        if (effect.environment) {
          const currentBonus = stats.environmentSpeedBonuses.get(effect.environment) || 0;
          stats.environmentSpeedBonuses.set(effect.environment, currentBonus + effect.value);
        }
        break;
        
      case EffectType.MAX_HP_BONUS:
        stats.maxHp += effect.value;
        break;
        
      case EffectType.RANGE_BONUS:
        // General range bonus would be applied to all weapons
        for (const weaponType of stats.weaponRangeBonuses.keys()) {
          const currentBonus = stats.weaponRangeBonuses.get(weaponType) || 0;
          stats.weaponRangeBonuses.set(weaponType, currentBonus + effect.value);
        }
        break;
        
      case EffectType.WEAPON_ATTACK_BONUS:
        const weaponAttackBonus = stats.weaponAttackBonuses.get(effect.weaponType) || 0;
        stats.weaponAttackBonuses.set(effect.weaponType, weaponAttackBonus + effect.value);
        break;
        
      case EffectType.WEAPON_DEFENSE_BONUS:
        if (!stats.weaponDefenseBonuses.has(effect.weaponType)) {
          stats.weaponDefenseBonuses.set(effect.weaponType, new Map());
        }
        const weaponDefenseMap = stats.weaponDefenseBonuses.get(effect.weaponType)!;
        const attackType = effect.againstType || 'all';
        const currentDefenseBonus = weaponDefenseMap.get(attackType) || 0;
        weaponDefenseMap.set(attackType, currentDefenseBonus + effect.value);
        break;
        
      case EffectType.WEAPON_RANGE_BONUS:
        const weaponRangeBonus = stats.weaponRangeBonuses.get(effect.weaponType) || 0;
        stats.weaponRangeBonuses.set(effect.weaponType, weaponRangeBonus + effect.value);
        break;
        
      case EffectType.ARMOR_DEFENSE_BONUS:
        if (!stats.armorDefenseBonuses.has(effect.armorType)) {
          stats.armorDefenseBonuses.set(effect.armorType, new Map());
        }
        const armorDefenseMap = stats.armorDefenseBonuses.get(effect.armorType)!;
        const armorAgainstType = effect.againstType || 'all';
        const currentArmorBonus = armorDefenseMap.get(armorAgainstType) || 0;
        armorDefenseMap.set(armorAgainstType, currentArmorBonus + effect.value);
        break;
        
      case EffectType.ARMOR_SPEED_PENALTY_REDUCTION:
        const currentReduction = stats.armorSpeedPenaltyReductions.get(effect.armorType) || 0;
        stats.armorSpeedPenaltyReductions.set(effect.armorType, currentReduction + effect.percentage);
        break;
        
      case EffectType.CRAFTING_UNLOCK:
        for (const item of effect.items) {
          stats.craftableItems.add(item);
        }
        break;
        
      case EffectType.CRAFTING_BONUS:
        // This would depend on the specific bonus type
        break;
        
      case EffectType.CRAFTING_TIME_REDUCTION:
        stats.craftingTimeReduction += effect.percentage;
        break;
        
      case EffectType.CRAFTING_EXTRA_ITEMS:
        // This would depend on the specific ratio
        break;
        
      case EffectType.RESOURCE_BONUS:
        const resourceTypes = Array.isArray(effect.resourceType) 
          ? effect.resourceType 
          : [effect.resourceType];
          
        for (const resourceType of resourceTypes) {
          if (!stats.resourceBonuses.has(resourceType)) {
            stats.resourceBonuses.set(resourceType, new Map());
          }
          const bonusMap = stats.resourceBonuses.get(resourceType)!;
          const currentBonusValue = bonusMap.get(effect.bonusType) || 0;
          bonusMap.set(effect.bonusType, currentBonusValue + effect.value);
        }
        break;
        
      case EffectType.ABILITY_UNLOCK:
        stats.unlockedAbilities.add(effect.abilityName);
        break;
        
      case EffectType.ABILITY_COOLDOWN_REDUCTION:
        const currentCooldownReduction = stats.abilityCooldownReductions.get(effect.abilityName) || 0;
        stats.abilityCooldownReductions.set(effect.abilityName, currentCooldownReduction + effect.value);
        break;
        
      case EffectType.ABILITY_DURATION_INCREASE:
        const currentDurationIncrease = stats.abilityDurationIncreases.get(effect.abilityName) || 0;
        stats.abilityDurationIncreases.set(effect.abilityName, currentDurationIncrease + effect.value);
        break;
        
      case EffectType.ABILITY_EFFECT_INCREASE:
        if (!stats.abilityEffectIncreases.has(effect.abilityName)) {
          stats.abilityEffectIncreases.set(effect.abilityName, new Map());
        }
        const effectMap = stats.abilityEffectIncreases.get(effect.abilityName)!;
        const currentEffectValue = effectMap.get(effect.effectType) || 0;
        effectMap.set(effect.effectType, currentEffectValue + effect.value);
        break;
        
      case EffectType.CONDITIONAL_EFFECT:
        // Conditional effects would be evaluated at runtime based on the condition
        // This is a placeholder for the actual implementation
        break;
        
      case EffectType.CHANCE_EFFECT:
        // Chance effects would be evaluated at runtime based on the chance
        // This is a placeholder for the actual implementation
        break;
        
      case EffectType.PET_BONUS:
        const currentPetBonus = stats.petBonuses.get(effect.bonusType) || 0;
        stats.petBonuses.set(effect.bonusType, effect.value);
        break;
        
      case EffectType.MINION_UNLOCK:
        const currentMinionCount = stats.unlockedMinions.get(effect.minionType) || 0;
        stats.unlockedMinions.set(effect.minionType, currentMinionCount + effect.count);
        break;
        
      case EffectType.MINION_BONUS:
        if (!stats.minionBonuses.has(effect.minionType)) {
          stats.minionBonuses.set(effect.minionType, new Map());
        }
        const minionBonusMap = stats.minionBonuses.get(effect.minionType)!;
        minionBonusMap.set(effect.bonusType, effect.value);
        break;
        
      case EffectType.DURABILITY_BONUS:
        const itemTypes = Array.isArray(effect.itemType) ? effect.itemType : [effect.itemType];
        for (const itemType of itemTypes) {
          const currentMultiplier = stats.durabilityMultipliers.get(itemType) || 1;
          stats.durabilityMultipliers.set(itemType, currentMultiplier * effect.multiplier);
        }
        break;
        
      case EffectType.DODGE_CHANCE:
        // Handle both 'value' and 'chance' properties for backward compatibility
        const dodgeValue = 'value' in effect ? (effect as any).value : ('chance' in effect ? (effect as DodgeChanceEffect).chance : 0);
        stats.dodgeChance += dodgeValue;
        break;
        
      case EffectType.HEAL_BONUS:
        stats.healingMultiplier *= effect.multiplier;
        break;
        
      case EffectType.MERCHANT_DISCOUNT:
        const merchantType = effect.merchantType || 'all';
        const currentDiscount = stats.merchantDiscounts.get(merchantType) || 0;
        stats.merchantDiscounts.set(merchantType, currentDiscount + effect.percentage);
        break;
        
      case EffectType.AGGRESSIVE_TIMER_REDUCTION:
        stats.aggressiveTimerReduction += effect.percentage;
        break;
        
      case EffectType.SPECIAL_INTERACTION:
        stats.specialInteractions.set(effect.interactionType, effect.description);
        break;
    }
  }
  
  /**
   * Evaluates a conditional effect based on the current game state.
   * @param condition The condition to evaluate
   * @param gameState The current game state
   * @returns Whether the condition is met
   */
  evaluateCondition(condition: any, gameState: any): boolean {
    // This would be implemented based on the game's state tracking
    // For now, return a placeholder value
    return false;
  }
  
  /**
   * Evaluates a chance effect based on the current game state.
   * @param chance The chance percentage (0-100)
   * @returns Whether the chance effect triggers
   */
  evaluateChance(chance: number): boolean {
    return Math.random() * 100 < chance;
  }
} 