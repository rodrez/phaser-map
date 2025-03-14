import { SkillEffectUnion } from './effect-types';

/**
 * Represents a skill prerequisite
 */
export interface SkillPrerequisite {
  skillId: string;
  level: number;
}

/**
 * Represents a special unlock requirement
 */
export interface SpecialUnlockRequirement {
  type: 'item_collection' | 'location_visit' | 'monster_defeat' | 'quest_completion' | 'level_requirement';
  description: string;
  data: any; // Additional data specific to the requirement type
}

/**
 * Represents a skill level with its effects and costs
 */
export interface EnhancedSkillLevel {
  level: number;
  cost: number;
  effects: SkillEffectUnion[];
  unlocksSkills?: string[]; // IDs of skills unlocked by this level
}

/**
 * Enum for skill categories
 */
export enum SkillCategory {
  COMBAT = 'Combat',
  CRAFTING = 'Crafting',
  KNOWLEDGE = 'Knowledge',
  EXPLORATION = 'Exploration',
  SPECIALIZATION = 'Specialization',
  OTHER = 'Other'
}

/**
 * Enhanced skill class that uses structured effect types
 */
export class EnhancedSkill {
  /** Unique identifier for the skill */
  readonly id: string;
  
  /** Display name of the skill */
  readonly name: string;
  
  /** Detailed description of the skill */
  readonly description: string;
  
  /** Current level of the skill (0 = not learned) */
  private _level: number = 0;
  
  /** Maximum level this skill can reach */
  readonly maxLevel: number;
  
  /** Skill category */
  readonly category: SkillCategory;
  
  /** Skill levels with their effects and costs */
  readonly levels: EnhancedSkillLevel[];
  
  /** Prerequisites for learning this skill */
  readonly prerequisites: SkillPrerequisite[] = [];
  
  /** Special unlock requirements */
  readonly specialUnlockRequirements?: SpecialUnlockRequirement[];
  
  /** Whether this skill is a specialization (class) skill */
  readonly isSpecialization: boolean = false;
  
  /** Path for specialization skills */
  readonly specializationPath?: string;
  
  /** Icon for the skill in the UI */
  readonly iconUrl?: string;
  
  /**
   * Creates a new enhanced skill.
   */
  constructor(params: {
    id: string;
    name: string;
    description: string;
    category: SkillCategory;
    levels: EnhancedSkillLevel[];
    prerequisites?: SkillPrerequisite[];
    specialUnlockRequirements?: SpecialUnlockRequirement[];
    isSpecialization?: boolean;
    specializationPath?: string;
    iconUrl?: string;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.category = params.category;
    this.levels = params.levels;
    this.maxLevel = params.levels.length;
    
    if (params.prerequisites) {
      this.prerequisites = params.prerequisites;
    }
    
    if (params.specialUnlockRequirements) {
      this.specialUnlockRequirements = params.specialUnlockRequirements;
    }
    
    if (params.isSpecialization) {
      this.isSpecialization = params.isSpecialization;
    }
    
    if (params.specializationPath) {
      this.specializationPath = params.specializationPath;
    }
    
    if (params.iconUrl) {
      this.iconUrl = params.iconUrl;
    }
  }
  
  /**
   * Gets the current level of the skill.
   */
  get level(): number {
    return this._level;
  }
  
  /**
   * Sets the current level of the skill.
   */
  set level(value: number) {
    if (value < 0 || value > this.maxLevel) {
      throw new Error(`Invalid skill level: ${value}. Must be between 0 and ${this.maxLevel}.`);
    }
    this._level = value;
  }
  
  /**
   * Gets all effects for the current level.
   */
  getAllEffects(): SkillEffectUnion[] {
    if (this._level === 0) {
      return [];
    }
    
    // Collect effects from all levels up to the current level
    const allEffects: SkillEffectUnion[] = [];
    for (let i = 0; i < this._level; i++) {
      allEffects.push(...this.levels[i].effects);
    }
    
    return allEffects;
  }
  
  /**
   * Gets effects for a specific level.
   */
  getEffectsForLevel(level: number): SkillEffectUnion[] {
    if (level < 1 || level > this.maxLevel) {
      throw new Error(`Invalid skill level: ${level}. Must be between 1 and ${this.maxLevel}.`);
    }
    
    return this.levels[level - 1].effects;
  }
  
  /**
   * Checks if the skill can be upgraded.
   */
  canUpgrade(availableSkillPoints: number, playerSkills: Map<string, EnhancedSkill>): boolean {
    // Check if already at max level
    if (this._level >= this.maxLevel) {
      return false;
    }
    
    // Check if player has enough skill points
    const nextLevelCost = this.levels[this._level].cost;
    if (availableSkillPoints < nextLevelCost) {
      return false;
    }
    
    // Check if prerequisites are met
    if (!this.meetsPrerequisites(playerSkills)) {
      return false;
    }
    
    // Check if special unlock requirements are met (would need game state)
    // This would be implemented based on the game's state tracking
    
    return true;
  }
  
  /**
   * Checks if prerequisites are met.
   */
  meetsPrerequisites(playerSkills: Map<string, EnhancedSkill>): boolean {
    for (const prereq of this.prerequisites) {
      const skill = playerSkills.get(prereq.skillId);
      if (!skill || skill.level < prereq.level) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Upgrades the skill if possible.
   * @returns The number of skill points spent, or 0 if upgrade failed.
   */
  upgrade(availableSkillPoints: number, playerSkills: Map<string, EnhancedSkill>): number {
    if (!this.canUpgrade(availableSkillPoints, playerSkills)) {
      return 0;
    }
    
    const cost = this.levels[this._level].cost;
    this._level++;
    return cost;
  }
  
  /**
   * Gets a description of the effects for the current level.
   */
  getEffectsDescription(): string {
    if (this._level === 0) {
      return 'Not learned yet.';
    }
    
    const effects = this.getAllEffects();
    return effects.map(effect => effect.description).join('\n');
  }
  
  /**
   * Gets a description of the effects for a specific level.
   */
  getEffectsDescriptionForLevel(level: number): string {
    if (level < 1 || level > this.maxLevel) {
      return 'Invalid level.';
    }
    
    const effects = this.getEffectsForLevel(level);
    return effects.map(effect => effect.description).join('\n');
  }
  
  /**
   * Gets skills unlocked at the current level.
   */
  getUnlockedSkills(): string[] {
    if (this._level === 0) {
      return [];
    }
    
    const unlockedSkills: string[] = [];
    for (let i = 0; i < this._level; i++) {
      if (this.levels[i].unlocksSkills) {
        unlockedSkills.push(...this.levels[i].unlocksSkills!);
      }
    }
    
    return unlockedSkills;
  }
} 