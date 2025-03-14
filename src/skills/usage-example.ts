import { EnhancedSkillManager } from './enhanced-skill-manager';
import { 
  createWarriorTrainingSkill, 
  createOiyoiMasterTrainingSkill,
  createDragonMasterSkill,
  createBlacksmithingSkill
} from './skill-examples';

/**
 * Example of how to use the enhanced skill system
 */
export function runSkillSystemExample(): void {
  console.log('Running skill system example...');
  
  // Create some skills
  const warriorTraining = createWarriorTrainingSkill();
  const oiyoiMasterTraining = createOiyoiMasterTrainingSkill();
  const dragonMaster = createDragonMasterSkill();
  const blacksmithing = createBlacksmithingSkill();
  
  // Create a skill manager with the skills and some initial skill points
  const skillManager = new EnhancedSkillManager(
    [warriorTraining, oiyoiMasterTraining, dragonMaster, blacksmithing],
    10 // Initial skill points
  );
  
  // Listen for skill-related events
  skillManager.on('skill-learned', (skillId, level) => {
    console.log(`Learned skill ${skillId} to level ${level}`);
  });
  
  skillManager.on('skill-points-changed', (points) => {
    console.log(`Skill points changed to ${points}`);
  });
  
  skillManager.on('specialization-changed', (path) => {
    console.log(`Specialization path changed to ${path}`);
  });
  
  // Get all available skills
  console.log('Available skills:');
  skillManager.getAllSkills().forEach(skill => {
    console.log(`- ${skill.name} (${skill.id})`);
  });
  
  // Get learnable skills
  console.log('\nLearnable skills:');
  skillManager.getLearnableSkills().forEach(skill => {
    console.log(`- ${skill.name} (${skill.id})`);
  });
  
  // Learn some skills
  console.log('\nLearning skills...');
  
  // Learn blacksmithing to level 3
  skillManager.learnSkill('blacksmithing'); // Level 1
  skillManager.learnSkill('blacksmithing'); // Level 2
  skillManager.learnSkill('blacksmithing'); // Level 3
  
  // Learn dragon master to level 2
  skillManager.learnSkill('dragon_master'); // Level 1
  skillManager.learnSkill('dragon_master'); // Level 2
  
  // Try to learn a specialization skill
  console.log('\nTrying to learn warrior_training...');
  const success = skillManager.learnSkill('warrior_training');
  console.log(`Success: ${success}`);
  
  // Get player's learned skills
  console.log('\nPlayer skills:');
  skillManager.getPlayerSkills().forEach(skill => {
    console.log(`- ${skill.name} (${skill.id}) - Level ${skill.level}`);
    console.log(`  Effects: ${skill.getEffectsDescription()}`);
  });
  
  // Get player stats with skill effects
  console.log('\nPlayer stats with skill effects:');
  const baseStats = {
    attack: 5,
    defense: 5,
    speed: 10,
    maxHp: 100
  };
  const playerStats = skillManager.getPlayerStats(baseStats);
  console.log(`- Attack: ${playerStats.attack}`);
  console.log(`- Defense: ${playerStats.defense}`);
  console.log(`- Speed: ${playerStats.speed}`);
  console.log(`- Max HP: ${playerStats.maxHp}`);
  
  // Check durability bonuses
  console.log('\nDurability bonuses:');
  for (const [itemType, multiplier] of playerStats.durabilityMultipliers.entries()) {
    console.log(`- ${itemType}: ${multiplier}x`);
  }
  
  // Check craftable items
  console.log('\nCraftable items:');
  for (const item of playerStats.craftableItems) {
    console.log(`- ${item}`);
  }
  
  // Reset a skill
  console.log('\nResetting blacksmithing skill...');
  const refundedPoints = skillManager.resetSkill('blacksmithing');
  console.log(`Refunded ${refundedPoints} skill points`);
  
  // Get player's learned skills after reset
  console.log('\nPlayer skills after reset:');
  skillManager.getPlayerSkills().forEach(skill => {
    console.log(`- ${skill.name} (${skill.id}) - Level ${skill.level}`);
  });
  
  // Reset all skills
  console.log('\nResetting all skills...');
  const totalRefundedPoints = skillManager.resetAllSkills();
  console.log(`Refunded a total of ${totalRefundedPoints} skill points`);
  
  console.log('\nSkill system example completed.');
} 