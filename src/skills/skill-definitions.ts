import { 
  EffectType, 
  WeaponAttackBonusEffect, 
  DodgeChanceEffect,
  AttackBonusEffect,
  DefenseBonusEffect,
  RangeExtensionEffect,
  CraftingUnlockEffect,
  ConditionalEffect,
  ChanceEffect
} from './effect-types';
import { EnhancedSkill, SkillCategory } from './skill';

/**
 * Creates the Martial Arts skill
 * @returns The Martial Arts skill
 */
export function createMartialArtsSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'martial_arts',
    name: 'Martial Arts',
    description: 'Train your body to swiftly dodge incoming attacks, improving your defense during unarmed combat.',
    category: SkillCategory.COMBAT,
    isSpecialization: false,
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'No weapon or armor equipped'
            },
            effect: {
              type: EffectType.CONDITIONAL_EFFECT,
              condition: {
                type: 'equipment',
                value: 'No weapon or armor equipped'
              },
              effect: {
                type: EffectType.ATTACK_BONUS,
                value: 'level',
                maxValue: 25,
                description: 'Attack strength based on character level (up to level 25)'
              },
              description: 'Attack strength based on character level (up to level 25)'
            },
            description: 'When you have no weapon or armor equipped, your attack and defense strengths will be determined by the level of your character (up to level 25)'
          } as ConditionalEffect,
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'No weapon or armor equipped'
            },
            effect: {
              type: EffectType.DEFENSE_BONUS,
              value: 'level',
              maxValue: 25,
              description: 'Defense strength based on character level (up to level 25)'
            },
            description: 'Defense strength based on character level (up to level 25)'
          } as ConditionalEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Blowdart',
            value: 1,
            description: '+1 with Blowdarts'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Shuriken',
            value: 1,
            description: '+1 with Shurikens'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.CRAFTING_UNLOCK,
            items: ['Shuriken', 'Blowdart', 'Brass Knuckles', 'Staff', 'Tunic'],
            description: 'Can use Oiyoi weapons and armor: Shuriken, Blowdart, Brass Knuckles, Staff, Tunic'
          } as CraftingUnlockEffect
        ]
      },
      {
        level: 2,
        cost: 2,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'Unarmed or using Oiyoi Gear'
            },
            effect: {
              type: EffectType.DODGE_CHANCE,
              value: 15,
              description: '15% Dodge Chance'
            },
            description: '15% Dodge Chance when unarmed or when using Oiyoi Gear'
          } as ConditionalEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Blowdart',
            value: 2,
            description: '+2 with Blowdarts'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Shuriken',
            value: 2,
            description: '+2 with Shurikens'
          } as WeaponAttackBonusEffect
        ]
      },
      {
        level: 3,
        cost: 2,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'Unarmed or using Oiyoi Gear'
            },
            effect: {
              type: EffectType.DODGE_CHANCE,
              value: 30,
              description: '30% Dodge Chance'
            },
            description: '30% Dodge Chance when unarmed or when using Oiyoi Gear'
          } as ConditionalEffect,
          {
            type: EffectType.CRAFTING_UNLOCK,
            items: ['Oiyoi Gear'],
            description: 'Can craft Oiyoi Gear'
          } as CraftingUnlockEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Blowdart',
            value: 3,
            description: '+3 with Blowdarts'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Shuriken',
            value: 3,
            description: '+3 with Shurikens'
          } as WeaponAttackBonusEffect
        ],
        unlocksSkills: ['assassin_training', 'ninja_training', 'martial_master_training', 'thief_training']
      }
    ]
  });
}

/**
 * Creates the Sunder skill
 * @returns The Sunder skill
 */
export function createSunderSkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'sunder',
    name: 'Sunder',
    description: 'A powerful melee skill granting your attacks a chance to hit multiple enemies simultaneously. Highly effective with melee weapons (Sword, Axe, Dagger, Brass Knuckles, Spear, Staff), but useless with ranged weapons.',
    category: SkillCategory.COMBAT,
    isSpecialization: false,
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'Using Melee Weapons'
            },
            effect: {
              type: EffectType.CHANCE_EFFECT,
              chance: 5,
              effect: {
                type: EffectType.SPECIAL_ATTACK,
                value: 50,
                targets: 3,
                description: 'Deal 50% of normal attack damage to 3 nearby targets'
              },
              description: '5% chance of dealing 50% of normal attack damage to 3 nearby targets'
            },
            description: '5% chance of dealing 50% of normal attack damage to 3 nearby targets (does not include original target) when using Melee Weapons'
          } as ConditionalEffect
        ]
      },
      {
        level: 2,
        cost: 2,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'Using Melee Weapons'
            },
            effect: {
              type: EffectType.CHANCE_EFFECT,
              chance: 10,
              effect: {
                type: EffectType.SPECIAL_ATTACK,
                value: 50,
                targets: 4,
                description: 'Deal 50% of normal attack damage to 4 nearby targets'
              },
              description: '10% chance of dealing 50% of normal attack damage to 4 nearby targets'
            },
            description: '10% chance of dealing 50% of normal attack damage to 4 nearby targets when using Melee Weapons'
          } as ConditionalEffect
        ]
      },
      {
        level: 3,
        cost: 2,
        effects: [
          {
            type: EffectType.CONDITIONAL_EFFECT,
            condition: {
              type: 'equipment',
              value: 'Using Melee Weapons'
            },
            effect: {
              type: EffectType.CHANCE_EFFECT,
              chance: 15,
              effect: {
                type: EffectType.SPECIAL_ATTACK,
                value: 50,
                targets: 5,
                description: 'Deal 50% of normal attack damage to 5 nearby targets'
              },
              description: '15% chance of dealing 50% of normal attack damage to 5 nearby targets'
            },
            description: '15% chance of dealing 50% of normal attack damage to 5 nearby targets when using Melee Weapons'
          } as ConditionalEffect
        ],
        unlocksSkills: ['knight_training', 'legion_training', 'warrior_training']
      }
    ]
  });
}

/**
 * Creates the Archery skill
 * @returns The Archery skill
 */
export function createArcherySkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'archery',
    name: 'Archery',
    description: 'A valuable skill for users of ranged weapons. Without Precision Shot, you can\'t wield Crossbows, Longbows, or Slings. This skill also enhances your accuracy and effectiveness with these weapons.',
    category: SkillCategory.COMBAT,
    isSpecialization: false,
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Crossbow',
            value: 1,
            description: '+1 with Crossbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Longbow',
            value: 1,
            description: '+1 with Longbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.CRAFTING_UNLOCK,
            items: ['Longbow', 'Crossbow'],
            description: 'Enables you to craft Longbows and Crossbows'
          } as CraftingUnlockEffect
        ]
      },
      {
        level: 2,
        cost: 2,
        effects: [
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Crossbow',
            value: 2,
            description: '+2 with Crossbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Longbow',
            value: 2,
            description: '+2 with Longbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.RANGE_EXTENSION,
            weaponTypes: ['Longbow', 'Crossbow'],
            value: 25,
            description: '+25 Range with Longbows and Crossbows'
          } as RangeExtensionEffect
        ]
      },
      {
        level: 3,
        cost: 2,
        effects: [
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Crossbow',
            value: 3,
            description: '+3 with Crossbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.WEAPON_ATTACK_BONUS,
            weaponType: 'Longbow',
            value: 3,
            description: '+3 with Longbows'
          } as WeaponAttackBonusEffect,
          {
            type: EffectType.RANGE_EXTENSION,
            weaponTypes: ['Longbow', 'Crossbow'],
            value: 50,
            description: '+50 Range with Longbows and Crossbows'
          } as RangeExtensionEffect
        ],
        unlocksSkills: ['militia_training', 'ranger_training', 'mercenary_training']
      }
    ]
  });
}

/**
 * Creates the Strategy skill
 * @returns The Strategy skill
 */
export function createStrategySkill(): EnhancedSkill {
  return new EnhancedSkill({
    id: 'strategy',
    name: 'Strategy',
    description: 'Carefully plan your moves before combat, increasing your effectiveness and efficiency in battle.',
    category: SkillCategory.COMBAT,
    isSpecialization: false,
    levels: [
      {
        level: 1,
        cost: 1,
        effects: [
          {
            type: EffectType.SPECIAL_MECHANIC,
            mechanicType: 'Tactics',
            description: 'Gain a +0.1 Damage bonus (Tactics) against Monsters for every Chopped Tree or 30 seconds spent Unaggressive. For every 10 seconds you are Aggressive, you lose +0.1 of the bonus. (Max of +1)'
          }
        ]
      },
      {
        level: 2,
        cost: 2,
        effects: [
          {
            type: EffectType.SPECIAL_MECHANIC,
            mechanicType: 'Tactics',
            description: 'Tactics bonus gains +0.2 each time. You still lose +0.1 while Aggressive. (Max of +2)'
          }
        ]
      },
      {
        level: 3,
        cost: 2,
        effects: [
          {
            type: EffectType.SPECIAL_MECHANIC,
            mechanicType: 'Tactics',
            description: 'Tactics bonus gains +0.3 each time. You still lose +0.1 while Aggressive. (Max of +3)'
          }
        ],
        unlocksSkills: ['merchant', 'crafter', 'druid', 'explorer']
      }
    ]
  });
}

/**
 * Get all Tier 1 skills
 * @returns Array of all Tier 1 skills
 */
export function getTier1Skills(): EnhancedSkill[] {
  return [
    createMartialArtsSkill(),
    createSunderSkill(),
    createArcherySkill(),
    createStrategySkill()
  ];
}

/**
 * Get all skills
 * @returns Array of all skills
 */
export function getAllSkills(): EnhancedSkill[] {
  return [
    ...getTier1Skills()
  ];
} 