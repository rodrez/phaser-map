import Phaser from 'phaser';
import { EnhancedSkill } from './skill';
import { EnhancedSkillEffectSystem, PlayerStats } from './skill-effect-system';

/**
 * Manages all skills and their effects for a player.
 */
export class EnhancedSkillManager extends Phaser.Events.EventEmitter {
  /** Map of all available skills */
  private availableSkills: Map<string, EnhancedSkill> = new Map();
  
  /** Map of player's learned skills */
  private playerSkills: Map<string, EnhancedSkill> = new Map();
  
  /** Player's available skill points */
  private skillPoints: number = 0;
  
  /** Player's current specialization path */
  private specializationPath: string | null = null;
  
  /** Skill effect system */
  private effectSystem: EnhancedSkillEffectSystem;
  
  /**
   * Creates a new EnhancedSkillManager.
   * @param availableSkills Array of all available skills
   * @param initialSkillPoints Initial skill points
   */
  constructor(availableSkills: EnhancedSkill[], initialSkillPoints: number = 0) {
    super();
    
    // Register all available skills
    for (const skill of availableSkills) {
      this.availableSkills.set(skill.id, skill);
    }
    
    this.skillPoints = initialSkillPoints;
    this.effectSystem = new EnhancedSkillEffectSystem(this.playerSkills);
    
    // Listen for stats changes
    this.effectSystem.on('stats-changed', () => {
      this.emit('stats-changed');
    });
  }
  
  /**
   * Gets all available skills.
   * @returns Array of all available skills
   */
  getAllSkills(): EnhancedSkill[] {
    return Array.from(this.availableSkills.values());
  }
  
  /**
   * Gets a skill by ID.
   * @param skillId Skill ID
   * @returns The skill, or undefined if not found
   */
  getSkill(skillId: string): EnhancedSkill | undefined {
    return this.availableSkills.get(skillId);
  }
  
  /**
   * Gets all player's learned skills.
   * @returns Array of player's learned skills
   */
  getPlayerSkills(): EnhancedSkill[] {
    return Array.from(this.playerSkills.values());
  }
  
  /**
   * Gets player's available skill points.
   * @returns Player's available skill points
   */
  getSkillPoints(): number {
    return this.skillPoints;
  }
  
  /**
   * Sets player's available skill points.
   * @param points New skill points
   */
  setSkillPoints(points: number): void {
    this.skillPoints = points;
    this.emit('skill-points-changed', this.skillPoints);
  }
  
  /**
   * Adds skill points to the player.
   * @param points Skill points to add
   */
  addSkillPoints(points: number): void {
    this.skillPoints += points;
    this.emit('skill-points-changed', this.skillPoints);
  }
  
  /**
   * Gets player's current specialization path.
   * @returns Player's current specialization path, or null if none
   */
  getSpecializationPath(): string | null {
    return this.specializationPath;
  }
  
  /**
   * Sets player's current specialization path.
   * @param path New specialization path, or null to clear
   */
  setSpecializationPath(path: string | null): void {
    // Check if the path is valid
    if (path !== null) {
      const specializationSkills = this.getAllSkills().filter(
        skill => skill.isSpecialization && skill.specializationPath === path
      );
      
      if (specializationSkills.length === 0) {
        throw new Error(`Invalid specialization path: ${path}`);
      }
    }
    
    // Reset all specialization skills if changing path
    if (this.specializationPath !== path) {
      for (const skill of this.playerSkills.values()) {
        if (skill.isSpecialization && skill.specializationPath !== path) {
          const refundedPoints = this.resetSkill(skill.id);
          this.skillPoints += refundedPoints;
        }
      }
    }
    
    this.specializationPath = path;
    this.emit('specialization-changed', this.specializationPath);
  }
  
  /**
   * Learns or upgrades a skill.
   * @param skillId Skill ID
   * @returns Whether the skill was learned/upgraded successfully
   */
  learnSkill(skillId: string): boolean {
    const skill = this.availableSkills.get(skillId);
    if (!skill) {
      return false;
    }
    
    // Check if the skill is a specialization skill
    if (skill.isSpecialization) {
      // Check if the player has a specialization path
      if (this.specializationPath === null) {
        this.specializationPath = skill.specializationPath!;
      }
      // Check if the skill is in the player's specialization path
      else if (skill.specializationPath !== this.specializationPath) {
        return false;
      }
    }
    
    // Get a copy of the skill for the player
    let playerSkill = this.playerSkills.get(skillId);
    if (!playerSkill) {
      // Create a new instance with the same properties
      playerSkill = new EnhancedSkill({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        levels: skill.levels,
        prerequisites: skill.prerequisites,
        specialUnlockRequirements: skill.specialUnlockRequirements,
        isSpecialization: skill.isSpecialization,
        specializationPath: skill.specializationPath,
        iconUrl: skill.iconUrl
      });
      this.playerSkills.set(skillId, playerSkill);
    }
    
    // Try to upgrade the skill
    const cost = playerSkill.upgrade(this.skillPoints, this.playerSkills);
    if (cost === 0) {
      return false;
    }
    
    // Deduct skill points
    this.skillPoints -= cost;
    
    // Update the effect system
    this.effectSystem.updatePlayerSkills(this.playerSkills);
    
    // Emit events
    this.emit('skill-learned', skillId, playerSkill.level);
    this.emit('skill-points-changed', this.skillPoints);
    
    return true;
  }
  
  /**
   * Resets a skill, refunding skill points.
   * @param skillId Skill ID
   * @returns Number of skill points refunded
   */
  resetSkill(skillId: string): number {
    const skill = this.playerSkills.get(skillId);
    if (!skill || skill.level === 0) {
      return 0;
    }
    
    // Calculate refunded points
    let refundedPoints = 0;
    for (let i = 0; i < skill.level; i++) {
      refundedPoints += skill.levels[i].cost;
    }
    
    // Reset the skill
    skill.level = 0;
    
    // Update the effect system
    this.effectSystem.updatePlayerSkills(this.playerSkills);
    
    // Emit events
    this.emit('skill-reset', skillId);
    
    return refundedPoints;
  }
  
  /**
   * Resets all skills, refunding skill points.
   * @returns Number of skill points refunded
   */
  resetAllSkills(): number {
    let refundedPoints = 0;
    
    for (const skillId of this.playerSkills.keys()) {
      refundedPoints += this.resetSkill(skillId);
    }
    
    // Clear specialization path
    this.specializationPath = null;
    
    // Emit events
    this.emit('all-skills-reset');
    this.emit('specialization-changed', this.specializationPath);
    
    return refundedPoints;
  }
  
  /**
   * Gets the player's stats with all skill effects applied.
   * @param baseStats Base player stats without skill effects
   * @returns Player stats with all skill effects applied
   */
  getPlayerStats(baseStats: Partial<PlayerStats>): PlayerStats {
    return this.effectSystem.getPlayerStats(baseStats);
  }
  
  /**
   * Checks if a skill can be learned or upgraded.
   * @param skillId Skill ID
   * @returns Whether the skill can be learned/upgraded
   */
  canLearnSkill(skillId: string): boolean {
    const skill = this.availableSkills.get(skillId);
    if (!skill) {
      return false;
    }
    
    // Check if the skill is a specialization skill
    if (skill.isSpecialization) {
      // Check if the player has a specialization path
      if (this.specializationPath === null) {
        // Player can choose any specialization path
      }
      // Check if the skill is in the player's specialization path
      else if (skill.specializationPath !== this.specializationPath) {
        return false;
      }
    }
    
    // Get a copy of the skill for the player
    let playerSkill = this.playerSkills.get(skillId);
    if (!playerSkill) {
      // Create a new instance with the same properties
      playerSkill = new EnhancedSkill({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        levels: skill.levels,
        prerequisites: skill.prerequisites,
        specialUnlockRequirements: skill.specialUnlockRequirements,
        isSpecialization: skill.isSpecialization,
        specializationPath: skill.specializationPath,
        iconUrl: skill.iconUrl
      });
      // Don't add it to playerSkills yet, just check if it can be learned
    }
    
    return playerSkill.canUpgrade(this.skillPoints, this.playerSkills);
  }
  
  /**
   * Gets all skills that can be learned or upgraded.
   * @returns Array of skills that can be learned/upgraded
   */
  getLearnableSkills(): EnhancedSkill[] {
    return this.getAllSkills().filter(skill => this.canLearnSkill(skill.id));
  }
} 