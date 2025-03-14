/**
 * Defines all possible effect types that skills can have
 */

/**
 * Base interface for all skill effects
 */
export interface SkillEffect {
  type: EffectType;
  description: string;
}

/**
 * Enum of all possible effect types
 */
export enum EffectType {
  // Stat modifiers
  ATTACK_BONUS = 'ATTACK_BONUS',
  DEFENSE_BONUS = 'DEFENSE_BONUS',
  SPEED_BONUS = 'SPEED_BONUS',
  MAX_HP_BONUS = 'MAX_HP_BONUS',
  RANGE_BONUS = 'RANGE_BONUS',
  
  // Weapon-specific bonuses
  WEAPON_ATTACK_BONUS = 'WEAPON_ATTACK_BONUS',
  WEAPON_DEFENSE_BONUS = 'WEAPON_DEFENSE_BONUS',
  WEAPON_RANGE_BONUS = 'WEAPON_RANGE_BONUS',
  
  // Armor-specific bonuses
  ARMOR_DEFENSE_BONUS = 'ARMOR_DEFENSE_BONUS',
  ARMOR_SPEED_PENALTY_REDUCTION = 'ARMOR_SPEED_PENALTY_REDUCTION',
  
  // Crafting abilities
  CRAFTING_UNLOCK = 'CRAFTING_UNLOCK',
  CRAFTING_BONUS = 'CRAFTING_BONUS',
  CRAFTING_TIME_REDUCTION = 'CRAFTING_TIME_REDUCTION',
  CRAFTING_EXTRA_ITEMS = 'CRAFTING_EXTRA_ITEMS',
  
  // Resource gathering
  RESOURCE_BONUS = 'RESOURCE_BONUS',
  
  // Special abilities
  ABILITY_UNLOCK = 'ABILITY_UNLOCK',
  ABILITY_COOLDOWN_REDUCTION = 'ABILITY_COOLDOWN_REDUCTION',
  ABILITY_DURATION_INCREASE = 'ABILITY_DURATION_INCREASE',
  ABILITY_EFFECT_INCREASE = 'ABILITY_EFFECT_INCREASE',
  
  // Conditional effects
  CONDITIONAL_EFFECT = 'CONDITIONAL_EFFECT',
  
  // Chance-based effects
  CHANCE_EFFECT = 'CHANCE_EFFECT',
  
  // Pet/minion effects
  PET_BONUS = 'PET_BONUS',
  MINION_UNLOCK = 'MINION_UNLOCK',
  MINION_BONUS = 'MINION_BONUS',
  
  // Miscellaneous
  DURABILITY_BONUS = 'DURABILITY_BONUS',
  DODGE_CHANCE = 'DODGE_CHANCE',
  HEAL_BONUS = 'HEAL_BONUS',
  MERCHANT_DISCOUNT = 'MERCHANT_DISCOUNT',
  AGGRESSIVE_TIMER_REDUCTION = 'AGGRESSIVE_TIMER_REDUCTION',
  SPECIAL_INTERACTION = 'SPECIAL_INTERACTION',
  
  // Additional effects
  SPECIAL_ATTACK = 'SPECIAL_ATTACK',
  RANGE_EXTENSION = 'RANGE_EXTENSION',
  SPECIAL_MECHANIC = 'SPECIAL_MECHANIC',
}

/**
 * Attack bonus effect
 */
export interface AttackBonusEffect extends SkillEffect {
  type: EffectType.ATTACK_BONUS;
  value: number;
  targetType?: string; // Optional target type (e.g., "Dragons", "Monsters")
}

/**
 * Defense bonus effect
 */
export interface DefenseBonusEffect extends SkillEffect {
  type: EffectType.DEFENSE_BONUS;
  value: number;
  targetType?: string; // Optional target type
}

/**
 * Speed bonus effect
 */
export interface SpeedBonusEffect extends SkillEffect {
  type: EffectType.SPEED_BONUS;
  value: number;
  environment?: string; // Optional environment (e.g., "Land", "Water", "Dungeon")
}

/**
 * Max HP bonus effect
 */
export interface MaxHpBonusEffect extends SkillEffect {
  type: EffectType.MAX_HP_BONUS;
  value: number;
}

/**
 * Range bonus effect
 */
export interface RangeBonusEffect extends SkillEffect {
  type: EffectType.RANGE_BONUS;
  value: number;
}

/**
 * Weapon-specific attack bonus
 */
export interface WeaponAttackBonusEffect extends SkillEffect {
  type: EffectType.WEAPON_ATTACK_BONUS;
  weaponType: string; // e.g., "Sword", "Axe", "Crossbow"
  value: number;
}

/**
 * Weapon-specific defense bonus
 */
export interface WeaponDefenseBonusEffect extends SkillEffect {
  type: EffectType.WEAPON_DEFENSE_BONUS;
  weaponType: string; // e.g., "Shield"
  value: number;
  againstType?: string; // Optional attack type to defend against (e.g., "Ranged")
}

/**
 * Weapon-specific range bonus
 */
export interface WeaponRangeBonusEffect extends SkillEffect {
  type: EffectType.WEAPON_RANGE_BONUS;
  weaponType: string; // e.g., "Longbow", "Crossbow"
  value: number;
}

/**
 * Armor-specific defense bonus
 */
export interface ArmorDefenseBonusEffect extends SkillEffect {
  type: EffectType.ARMOR_DEFENSE_BONUS;
  armorType: string; // e.g., "Heavy Armor", "Leather Armor"
  value: number;
  againstType?: string; // Optional attack type to defend against
}

/**
 * Armor speed penalty reduction
 */
export interface ArmorSpeedPenaltyReductionEffect extends SkillEffect {
  type: EffectType.ARMOR_SPEED_PENALTY_REDUCTION;
  armorType: string; // e.g., "Heavy Armor"
  percentage: number; // Percentage reduction of the penalty
}

/**
 * Crafting unlock effect
 */
export interface CraftingUnlockEffect extends SkillEffect {
  type: EffectType.CRAFTING_UNLOCK;
  items: string[]; // List of items that can be crafted
}

/**
 * Crafting bonus effect
 */
export interface CraftingBonusEffect extends SkillEffect {
  type: EffectType.CRAFTING_BONUS;
  bonusType: string; // Type of bonus (e.g., "Pages", "Quality")
  value: number | string; // Value or formula for the bonus
}

/**
 * Crafting time reduction effect
 */
export interface CraftingTimeReductionEffect extends SkillEffect {
  type: EffectType.CRAFTING_TIME_REDUCTION;
  percentage: number; // Percentage reduction in crafting time
}

/**
 * Crafting extra items effect
 */
export interface CraftingExtraItemsEffect extends SkillEffect {
  type: EffectType.CRAFTING_EXTRA_ITEMS;
  ratio: string; // e.g., "1 per 7 crafted"
}

/**
 * Resource gathering bonus
 */
export interface ResourceBonusEffect extends SkillEffect {
  type: EffectType.RESOURCE_BONUS;
  resourceType: string | string[]; // Type(s) of resource
  bonusType: 'chance' | 'amount'; // Whether it's a chance for extra or a fixed amount
  value: number; // Percentage chance or fixed amount
}

/**
 * Ability unlock effect
 */
export interface AbilityUnlockEffect extends SkillEffect {
  type: EffectType.ABILITY_UNLOCK;
  abilityName: string;
  abilityDescription: string;
  cooldown?: number; // Optional cooldown in seconds
  duration?: number; // Optional duration in seconds
}

/**
 * Ability cooldown reduction
 */
export interface AbilityCooldownReductionEffect extends SkillEffect {
  type: EffectType.ABILITY_COOLDOWN_REDUCTION;
  abilityName: string;
  value: number; // Reduction in seconds or percentage
  isPercentage?: boolean; // Whether the value is a percentage
}

/**
 * Ability duration increase
 */
export interface AbilityDurationIncreaseEffect extends SkillEffect {
  type: EffectType.ABILITY_DURATION_INCREASE;
  abilityName: string;
  value: number; // Increase in seconds or percentage
  isPercentage?: boolean; // Whether the value is a percentage
}

/**
 * Ability effect increase
 */
export interface AbilityEffectIncreaseEffect extends SkillEffect {
  type: EffectType.ABILITY_EFFECT_INCREASE;
  abilityName: string;
  effectType: string; // Type of effect being increased
  value: number; // Amount of increase
}

/**
 * Conditional effect
 */
export interface ConditionalEffect extends SkillEffect {
  type: EffectType.CONDITIONAL_EFFECT;
  condition: {
    type: 'hp_below' | 'hp_above' | 'environment' | 'target_type' | 'equipment' | 'status';
    value: any; // The value to compare against
  };
  effect: SkillEffect; // The effect to apply when condition is met
}

/**
 * Chance-based effect
 */
export interface ChanceEffect extends SkillEffect {
  type: EffectType.CHANCE_EFFECT;
  chance: number; // Percentage chance (0-100)
  effect: SkillEffect; // The effect to apply when triggered
}

/**
 * Pet bonus effect
 */
export interface PetBonusEffect extends SkillEffect {
  type: EffectType.PET_BONUS;
  bonusType: string; // Type of bonus (e.g., "Health", "Active Time")
  value: number | string; // Value or formula for the bonus
}

/**
 * Minion unlock effect
 */
export interface MinionUnlockEffect extends SkillEffect {
  type: EffectType.MINION_UNLOCK;
  minionType: string;
  count: number;
}

/**
 * Minion bonus effect
 */
export interface MinionBonusEffect extends SkillEffect {
  type: EffectType.MINION_BONUS;
  minionType: string; // Type of minion
  bonusType: string; // Type of bonus
  value: number | string; // Value or formula for the bonus
}

/**
 * Durability bonus effect
 */
export interface DurabilityBonusEffect extends SkillEffect {
  type: EffectType.DURABILITY_BONUS;
  itemType: string | string[]; // Type(s) of item
  multiplier: number; // How much longer the item lasts
}

/**
 * Dodge chance effect
 */
export interface DodgeChanceEffect extends SkillEffect {
  type: EffectType.DODGE_CHANCE;
  chance: number; // Percentage chance to dodge
  conditions?: string[]; // Optional conditions (e.g., "when using Oiyoi gear")
}

/**
 * Heal bonus effect
 */
export interface HealBonusEffect extends SkillEffect {
  type: EffectType.HEAL_BONUS;
  multiplier: number; // How much faster/more healing
  conditions?: string[]; // Optional conditions
}

/**
 * Merchant discount effect
 */
export interface MerchantDiscountEffect extends SkillEffect {
  type: EffectType.MERCHANT_DISCOUNT;
  percentage: number; // Percentage discount
  merchantType?: string; // Optional merchant type
}

/**
 * Aggressive timer reduction effect
 */
export interface AggressiveTimerReductionEffect extends SkillEffect {
  type: EffectType.AGGRESSIVE_TIMER_REDUCTION;
  percentage: number; // Percentage reduction
}

/**
 * Special interaction effect
 */
export interface SpecialInteractionEffect extends SkillEffect {
  type: EffectType.SPECIAL_INTERACTION;
  interactionType: string;
  description: string;
}

/**
 * Special attack effect
 */
export interface SpecialAttackEffect extends SkillEffect {
  type: EffectType.SPECIAL_ATTACK;
  value: number; // Percentage of normal attack damage
  targets: number; // Number of targets affected
  description: string;
}

/**
 * Range extension effect
 */
export interface RangeExtensionEffect extends SkillEffect {
  type: EffectType.RANGE_EXTENSION;
  weaponTypes: string[]; // Types of weapons affected
  value: number; // Range extension amount
  description: string;
}

/**
 * Special mechanic effect
 */
export interface SpecialMechanicEffect extends SkillEffect {
  type: EffectType.SPECIAL_MECHANIC;
  mechanicType: string; // Type of mechanic
  description: string;
}

/**
 * Union type of all possible skill effects
 */
export type SkillEffectUnion = 
  | AttackBonusEffect
  | DefenseBonusEffect
  | SpeedBonusEffect
  | MaxHpBonusEffect
  | RangeBonusEffect
  | WeaponAttackBonusEffect
  | WeaponDefenseBonusEffect
  | WeaponRangeBonusEffect
  | ArmorDefenseBonusEffect
  | ArmorSpeedPenaltyReductionEffect
  | CraftingUnlockEffect
  | CraftingBonusEffect
  | CraftingTimeReductionEffect
  | CraftingExtraItemsEffect
  | ResourceBonusEffect
  | AbilityUnlockEffect
  | AbilityCooldownReductionEffect
  | AbilityDurationIncreaseEffect
  | AbilityEffectIncreaseEffect
  | ConditionalEffect
  | ChanceEffect
  | PetBonusEffect
  | MinionUnlockEffect
  | MinionBonusEffect
  | DurabilityBonusEffect
  | DodgeChanceEffect
  | HealBonusEffect
  | MerchantDiscountEffect
  | AggressiveTimerReductionEffect
  | SpecialInteractionEffect
  | SpecialAttackEffect
  | RangeExtensionEffect
  | SpecialMechanicEffect; 