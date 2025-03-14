/**
 * Enhanced skill system for handling complex skill effects
 * 
 * This is the main entry point for the skill system.
 */

// Export all components from the enhanced skill system
export * from './enhanced-index';

// Re-export the runSkillSystemExample function for easy access
export { runSkillSystemExample } from './usage-example';

// Import skill creators and export a function to create all skills
import {
  createWarriorTrainingSkill,
  createOiyoiMasterTrainingSkill,
  createDragonMasterSkill,
  createBlacksmithingSkill
} from './skill-examples';

/**
 * Creates all skills in the game.
 * @returns Array of all skills
 */
export function createAllSkills() {
  return [
    createWarriorTrainingSkill(),
    createOiyoiMasterTrainingSkill(),
    createDragonMasterSkill(),
    createBlacksmithingSkill()
    // Add more skills here as they are implemented
  ];
} 