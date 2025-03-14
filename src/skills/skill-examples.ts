import { 
  EffectType, 
  WeaponAttackBonusEffect, 
  MaxHpBonusEffect, 
  ConditionalEffect,
  DodgeChanceEffect,
  SpeedBonusEffect,
  HealBonusEffect,
  ArmorDefenseBonusEffect,
  AbilityUnlockEffect,
  ChanceEffect,
  AttackBonusEffect,
  DefenseBonusEffect,
  CraftingUnlockEffect,
  DurabilityBonusEffect,
  PetBonusEffect,
  SpecialInteractionEffect
} from './effect-types';
import { EnhancedSkill, SkillCategory, SkillPrerequisite, SpecialUnlockRequirement } from './enhanced-skill';

/**
 * Creates the Warrior Training skill
 * @returns The Warrior Training skill
 */
export function createWarriorTrainingSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'warrior_training',
    name: 'Warrior Training',
    description: 'Warriors are brutes that deal more powerful blows with Axes as their improved Health lowers.',
    category: SkillCategory.SPECIALIZATION,
    isSpecialization: true,
    specializationPath: 'warrior',
    prerequisites: [
      { skillId: 'cleave', level: 3 } as SkillPrerequisite
    ],
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.MAX_HP_BONUS,
            value: 10,
            description: '+10 Max HP'
          } as MaxHpBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Axe',
            value: 1,
            description: '+1 attack bonus with Axe'
          } as WeaponAttackBonusEffect
        ]
      },
      {
        level: 2,
        cost: 1,
        effects: [
          {
            type: EffectType.MAX_HP_BONUS,
            value: 20,
            description: '+20 Max HP'
          } as MaxHpBonusEffect,
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'hp_below',
              value: 50 // 50% HP
            },
            effect: {
              type: EffectType.ATTACK_BONUS,
              value: 1,
              description: '+1 melee attack bonus when HP < 50%'
            },
            description: '+1 melee attack bonus when HP < 50%'
          } as ConditionalEffect
        ]
      },
      {
        level: 3,
        cost: 1,
        effects: [
          {
            type: EffectType.MAX_HP_BONUS,
            value: 30,
            description: '+30 Max HP'
          } as MaxHpBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Axe',
            value: 2,
            description: '+2 attack bonus with Axe'
          } as WeaponAttackBonusEffect
        ]
      },
      {
        level: 4,
        cost: 1,
        effects: [
          {
            type: EffectType.MAX_HP_BONUS,
            value: 40,
            description: '+40 Max HP'
          } as MaxHpBonusEffect,
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'hp_below',
              value: 35 // 35% HP
            },
            effect: {
              type: EffectType.WEAPON_ATTACK_BONUS,
              weaponType: 'Axe',
              value: 2,
              description: 'Additional +2 attack bonus with Axe when HP < 35%'
            },
            description: 'Additional +2 attack bonus with Axe when HP < 35%'
          } as ConditionalEffect
        ]
      },
      {
        level: 5,
        cost: 1,
        effects: [
          {
            type: EffectType.MAX_HP_BONUS,
            value: 50,
            description: '+50 Max HP'
          } as MaxHpBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Axe',
            value: 3,
            description: '+3 attack bonus with axe'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'hp_below',
              value: 25 // 25% HP
            },
            effect: {
              type: EffectType.ATTACK_BONUS,
              value: 3,
              description: '+3 melee attack bonus when HP < 25%'
            },
            description: '+3 melee attack bonus when HP < 25%'
          } as ConditionalEffect
        ]
      }
    ]
  });
}

/**
 * Creates the Oiyoi Master Training skill
 * @returns The Oiyoi Master Training skill
 */
export function createOiyoiMasterTrainingSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'oiyoi_master_training',
    name: 'Oiyoi Master Training',
    description: 'Staff-wielding Martial Artists of Oiyoi capable of faster healing and stunning enemies.',
    category: SkillCategory.SPECIALIZATION,
    isSpecialization: true,
    specializationPath: 'oiyoi_master',
    prerequisites: [
      { skillId: 'oiyoi_martial_art', level: 3 } as SkillPrerequisite
    ],
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.DODGE_CHANCE,
            chance: 15,
            conditions: ['when using Slings'],
            description: 'Can Dodge using Slings'
          } as DodgeChanceEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Staff',
            value: 1,
            description: '+1 with Staffs'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Sling',
            value: 1,
            description: '+1 with Slings'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.HEAL_BONUS,
            multiplier: 1.3,
            conditions: ['when Unaggressive'],
            description: 'Heal 30% faster when Unaggressive'
          } as HealBonusEffect
        ]
      },
      {
        level: 2,
        cost: 1,
        effects: [
          {
            type: EffectType.ARMOR_DEFENSE_BONUS,
            armorType: 'Tunic',
            value: 1,
            description: '+1 with Tunics'
          } as ArmorDefenseBonusEffect,
          {
            type: EffectType.SPEED_BONUS,
            value: -10,
            description: '-10 Base Speed to Nearby Enemies'
          } as SpeedBonusEffect,
          {
            type: EffectType.CHANCE_EFFECT,
            chance: 3,
            effect: {
              type: EffectType.ABILITY_UNLOCK,
              abilityName: 'Stun',
              abilityDescription: 'Stun an enemy for 5 seconds',
              duration: 5,
              description: 'Slings and Staffs have a 3% chance to stun an enemy for 5 seconds'
            } as AbilityUnlockEffect,
            description: 'Slings and Staffs have a 3% chance to stun an enemy for 5 seconds'
          } as ChanceEffect
        ]
      },
      {
        level: 3,
        cost: 1,
        effects: [
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Staff',
            value: 2,
            description: '+2 with Staffs'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Sling',
            value: 2,
            description: '+2 with Slings'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.HEAL_BONUS,
            multiplier: 1.6,
            conditions: ['when Unaggressive'],
            description: 'Heal 60% faster when Unaggressive'
          } as HealBonusEffect
        ]
      },
      {
        level: 4,
        cost: 1,
        effects: [
          {
            type: EffectType.ARMOR_DEFENSE_BONUS,
            armorType: 'Tunic',
            value: 2,
            description: '+2 with Tunics'
          } as ArmorDefenseBonusEffect,
          {
            type: EffectType.SPEED_BONUS,
            value: -20,
            description: '-20 Base Speed to Nearby Enemies'
          } as SpeedBonusEffect,
          {
            type: EffectType.CHANCE_EFFECT,
            chance: 6,
            effect: {
              type: EffectType.ABILITY_UNLOCK,
              abilityName: 'Stun',
              abilityDescription: 'Stun an enemy for 5 seconds',
              duration: 5,
              description: 'Slings and Staffs have a 6% chance to stun an enemy for 5 seconds'
            } as AbilityUnlockEffect,
            description: 'Slings and Staffs have a 6% chance to stun an enemy for 5 seconds'
          } as ChanceEffect
        ]
      },
      {
        level: 5,
        cost: 1,
        effects: [
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Staff',
            value: 3,
            description: '+3 with Staffs'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Sling',
            value: 3,
            description: '+3 with Slings'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.ARMOR_DEFENSE_BONUS,
            armorType: 'Tunic',
            value: 3,
            description: '+3 defense bonus with Tunics'
          } as ArmorDefenseBonusEffect,
          {
            type: EffectType.SPEED_BONUS,
            value: -30,
            description: '-30 Base Speed to Nearby Enemies'
          } as SpeedBonusEffect,
          {
            type: EffectType.HEAL_BONUS,
            multiplier: 2.0,
            conditions: ['when Unaggressive'],
            description: '2x Healing when Unaggressive'
          } as HealBonusEffect
        ]
      }
    ]
  });
}

/**
 * Creates the Dragon Master skill
 * @returns The Dragon Master skill
 */
export function createDragonMasterSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'dragon_master',
    name: 'Dragon Master',
    description: 'Knowledge from defeating Dragons that lets you command their prowess.',
    category: SkillCategory.OTHER,
    specialUnlockRequirements: [
      {
        type: 'level_requirement',
        description: 'Must be Level 25',
        data: { level: 25 }
      } as SpecialUnlockRequirement,
      {
        type: 'item_collection',
        description: 'Place 5 Dragon Eggs in the Dragon\'s nest',
        data: { item: 'Dragon Egg', count: 5, location: 'Dragon\'s nest' }
      } as SpecialUnlockRequirement
    ],
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.SPECIAL_INTERACTION,
            interactionType: 'pet_usage',
            description: 'Allows you to have / use a Dragon Pet'
          } as SpecialInteractionEffect,
          {
            type: EffectType.CRAFTING_UNLOCK,
            items: ['Dragon Scalemail', 'Dragon Shield'],
            description: 'Allows you to craft Dragon Scalemail and Dragon Shield'
          } as CraftingUnlockEffect,
          {
            type: EffectType.MAX_HP_BONUS,
            value: 5,
            description: 'Increases Maximum HP by +5'
          } as MaxHpBonusEffect
        ]
      },
      {
        level: 2,
        cost: 1,
        effects: [
          {
            type: EffectType.PET_BONUS,
            bonusType: 'active_timer',
            value: 30, // 30 minutes
            description: 'Increases Dragon Pet\'s active timer by 30 minutes'
          } as PetBonusEffect,
          {
            type: EffectType.MAX_HP_BONUS,
            value: 10,
            description: 'Increases Maximum HP by +10'
          } as MaxHpBonusEffect,
          {
            type: EffectType.DEFENSE_BONUS,
            value: 1,
            targetType: 'Dragons',
            description: '+1 Defense against Dragons'
          } as DefenseBonusEffect
        ]
      },
      {
        level: 3,
        cost: 1,
        effects: [
          {
            type: EffectType.PET_BONUS,
            bonusType: 'active_timer',
            value: 60, // 60 minutes
            description: 'Increases Dragon Pet\'s active timer by 1 hour'
          } as PetBonusEffect,
          {
            type: EffectType.MAX_HP_BONUS,
            value: 20,
            description: 'Increases Maximum HP by +20'
          } as MaxHpBonusEffect,
          {
            type: EffectType.ATTACK_BONUS,
            value: 1,
            targetType: 'Dragons',
            description: '+1 Attack against Dragons'
          } as AttackBonusEffect
        ]
      }
    ]
  });
}

/**
 * Creates the Blacksmithing skill
 * @returns The Blacksmithing skill
 */
export function createBlacksmithingSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'blacksmithing',
    name: 'Blacksmithing',
    description: 'Provides skill in crafting Metal Items and reducing Gear durability loss.',
    category: SkillCategory.CRAFTING,
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.SPECIAL_INTERACTION,
            interactionType: 'repair_gear',
            description: 'Can Repair Gear at a rate of 150 Gold per 10%, up to 100%'
          } as SpecialInteractionEffect,
          {
            type: EffectType.DURABILITY_BONUS,
            itemType: 'Gear',
            multiplier: 1.5,
            description: 'Gear you are wielding lasts 1.5x longer'
          } as DurabilityBonusEffect
        ]
      },
      {
        level: 2,
        cost: 1,
        effects: [
          {
            type: EffectType.SPECIAL_INTERACTION,
            interactionType: 'repair_gear',
            description: 'Can Repair Gear at a rate of 125 Gold per 10%, up to 100%'
          } as SpecialInteractionEffect,
          {
            type: EffectType.DURABILITY_BONUS,
            itemType: 'Gear',
            multiplier: 2.0,
            description: 'Gear you are wielding lasts 2x longer'
          } as DurabilityBonusEffect
        ]
      },
      {
        level: 3,
        cost: 1,
        effects: [
          {
            type: EffectType.SPECIAL_INTERACTION,
            interactionType: 'repair_gear',
            description: 'Can Repair Gear at a rate of 100 Gold per 10%, up to 100%'
          } as SpecialInteractionEffect,
          {
            type: EffectType.DURABILITY_BONUS,
            itemType: 'Gear',
            multiplier: 3.0,
            description: 'Gear you are wielding lasts 3x longer'
          } as DurabilityBonusEffect,
          {
            type: EffectType.CRAFTING_UNLOCK,
            items: ['Traps'],
            description: 'Can craft Traps'
          } as CraftingUnlockEffect,
          {
            type: EffectType.SPECIAL_INTERACTION,
            interactionType: 'trap_return',
            description: 'Killing an enemy in your Trap returns the trap to your inventory'
          } as SpecialInteractionEffect
        ]
      }
    ]
  });
} 