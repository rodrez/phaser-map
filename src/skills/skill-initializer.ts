import { EnhancedSkillManager } from './skill-manager';
import { getTier1Skills, getAllSkills } from './skill-definitions';
import playerStatsService from '../utils/player/PlayerStatsService';
import { logger, LogCategory } from '../utils/Logger';
import { PlayerStats } from './skill-effect-system';

/**
 * Initializes the skill system and applies skill effects to the player
 */
export class SkillInitializer {
  private static instance: SkillInitializer;
  private skillManager: EnhancedSkillManager;
  private initialized = false;
  private isUpdating = false; // Flag to prevent recursive updates

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize the skill manager with all available skills
    this.skillManager = new EnhancedSkillManager(getAllSkills(), 5); // Start with 5 skill points
    
    // Listen for stats changes from the skill manager
    this.skillManager.on('stats-changed', this.onStatsChanged.bind(this));
    
    logger.info(LogCategory.SKILLS, 'Skill system initialized');
  }

  /**
   * Gets the singleton instance of the SkillInitializer
   * @returns The SkillInitializer instance
   */
  public static getInstance(): SkillInitializer {
    if (!SkillInitializer.instance) {
      SkillInitializer.instance = new SkillInitializer();
    }
    return SkillInitializer.instance;
  }

  /**
   * Initializes the skill system
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn(LogCategory.SKILLS, 'Skill system already initialized');
      return;
    }

    // Apply initial stats
    this.applySkillEffects();
    
    this.initialized = true;
    logger.info(LogCategory.SKILLS, 'Skill system initialization complete');
  }

  /**
   * Manually applies skill effects to the player
   * This can be called after learning a skill to ensure effects are applied
   */
  public applyEffects(): void {
    logger.info(LogCategory.SKILLS, 'Manually applying skill effects');
    this.applySkillEffects();
    
    // Log the current stats after applying effects
    const stats = playerStatsService.getStats();
    logger.info(LogCategory.SKILLS, 'Current player stats after applying effects:', {
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      maxHealth: stats.maxHealth,
      dodgeChance: stats.dodgeChance
    });
  }

  /**
   * Gets the skill manager
   * @returns The skill manager
   */
  public getSkillManager(): EnhancedSkillManager {
    return this.skillManager;
  }

  /**
   * Applies skill effects to the player
   */
  private applySkillEffects(): void {
    // Prevent recursive updates
    if (this.isUpdating) {
      return;
    }
    
    this.isUpdating = true;
    
    try {
      // Get player stats with skill effects applied
      const baseStats = playerStatsService.getStats();
      const enhancedStats = this.skillManager.getPlayerStats({
        attack: baseStats.attack,
        defense: baseStats.defense,
        speed: baseStats.speed,
        maxHp: baseStats.maxHealth,
        dodgeChance: baseStats.dodgeChance || 0,
        // Add other stats as needed
        weaponAttackBonuses: new Map(baseStats.weaponAttackBonuses),
        weaponDefenseBonuses: new Map(),
        weaponRangeBonuses: new Map(),
        armorDefenseBonuses: new Map(),
        armorSpeedPenaltyReductions: new Map(),
        healingMultiplier: 1.0,
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
        craftableItems: new Set()
      });

      // Update player stats with enhanced stats - use silent update to prevent event loop
      playerStatsService.updateStats({
        attack: enhancedStats.attack,
        defense: enhancedStats.defense,
        speed: enhancedStats.speed,
        maxHealth: enhancedStats.maxHp,
        dodgeChance: enhancedStats.dodgeChance,
        // Add other stats as needed
      }, true); // Pass true for silent update to prevent event emission

      logger.info(LogCategory.SKILLS, 'Applied skill effects to player', {
        attack: enhancedStats.attack,
        defense: enhancedStats.defense,
        speed: enhancedStats.speed,
        maxHealth: enhancedStats.maxHp,
        dodgeChance: enhancedStats.dodgeChance
      });
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Handles stats changes from the skill manager
   */
  private onStatsChanged(): void {
    // Only apply effects if not already updating
    if (!this.isUpdating) {
      this.applySkillEffects();
    }
  }
}

/**
 * Convenience function to get the skill initializer instance
 * @returns The skill initializer instance
 */
export function getSkillInitializer(): SkillInitializer {
  return SkillInitializer.getInstance();
}

/**
 * Convenience function to get the skill manager
 * @returns The skill manager
 */
export function getSkillManager(): EnhancedSkillManager {
  return getSkillInitializer().getSkillManager();
} 