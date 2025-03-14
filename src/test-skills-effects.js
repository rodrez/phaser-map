import { EnhancedSkillManager } from './skills/skill-manager';
import { getTier1Skills } from './skills/skill-definitions';
import playerStatsService from './utils/player/PlayerStatsService';

/**
 * Test script to demonstrate how skill effects are applied to player stats
 */
function testSkillEffects() {
  console.log('Testing skill effects...');
  
  // Initialize the skill manager with all tier 1 skills and 10 skill points
  const skillManager = new EnhancedSkillManager(getTier1Skills(), 10);
  
  // Print initial player stats
  console.log('Initial player stats:');
  console.log('Dodge Chance:', playerStatsService.getStat('dodgeChance'));
  console.log('Attack:', playerStatsService.getStat('attack'));
  console.log('Defense:', playerStatsService.getStat('defense'));
  console.log('Weapon Attack Bonuses:', mapToObject(playerStatsService.getStat('weaponAttackBonuses')));
  
  // Learn Martial Arts level 1
  console.log('\nLearning Martial Arts level 1...');
  skillManager.learnSkill('martial_arts');
  
  // Print player stats after learning Martial Arts level 1
  console.log('Player stats after learning Martial Arts level 1:');
  console.log('Dodge Chance:', playerStatsService.getStat('dodgeChance'));
  console.log('Attack:', playerStatsService.getStat('attack'));
  console.log('Defense:', playerStatsService.getStat('defense'));
  console.log('Weapon Attack Bonuses:', mapToObject(playerStatsService.getStat('weaponAttackBonuses')));
  
  // Learn Martial Arts level 2
  console.log('\nLearning Martial Arts level 2...');
  skillManager.learnSkill('martial_arts');
  
  // Print player stats after learning Martial Arts level 2
  console.log('Player stats after learning Martial Arts level 2:');
  console.log('Dodge Chance:', playerStatsService.getStat('dodgeChance'));
  console.log('Attack:', playerStatsService.getStat('attack'));
  console.log('Defense:', playerStatsService.getStat('defense'));
  console.log('Weapon Attack Bonuses:', mapToObject(playerStatsService.getStat('weaponAttackBonuses')));
  
  // Learn Martial Arts level 3
  console.log('\nLearning Martial Arts level 3...');
  skillManager.learnSkill('martial_arts');
  
  // Print player stats after learning Martial Arts level 3
  console.log('Player stats after learning Martial Arts level 3:');
  console.log('Dodge Chance:', playerStatsService.getStat('dodgeChance'));
  console.log('Attack:', playerStatsService.getStat('attack'));
  console.log('Defense:', playerStatsService.getStat('defense'));
  console.log('Weapon Attack Bonuses:', mapToObject(playerStatsService.getStat('weaponAttackBonuses')));
  
  console.log('\nTest complete!');
}

/**
 * Helper function to convert a Map to a plain object for logging
 * @param {Map} map - The map to convert
 * @returns {Object} - The converted object
 */
function mapToObject(map) {
  if (!map || !(map instanceof Map)) {
    return map;
  }
  
  const obj = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// Run the test
testSkillEffects(); 