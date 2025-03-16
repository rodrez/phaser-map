// test-leaderboard.js
// This script tests the leaderboard functionality

import leaderboardController from '../controllers/leaderboardController.js';

// Test data
const testPlayers = [
  { id: 'player1', name: 'Alice' },
  { id: 'player2', name: 'Bob' },
  { id: 'player3', name: 'Charlie' },
  { id: 'player4', name: 'Dave' },
  { id: 'player5', name: 'Eve' }
];

// Test scores for each category
const testScores = {
  monstersKilled: [150, 120, 180, 90, 200],
  damageDone: [5000, 4500, 6000, 3500, 7000],
  healingDone: [3000, 4000, 2500, 5000, 3500],
  goldCollected: [1000, 1200, 800, 1500, 900],
  experiencePoints: [5000, 4800, 5200, 4600, 5500],
  dungeonsCompleted: [10, 8, 12, 7, 15],
  buoysAttacked: [25, 20, 30, 15, 35],
  flagsAttacked: [15, 12, 18, 10, 20],
  playersKilled: [30, 25, 35, 20, 40],
  goldSpent: [800, 1000, 700, 1200, 750],
  mostGold: [200, 250, 150, 300, 180]
};

// Run tests
const runTests = async () => {
  console.log('Starting leaderboard tests...');
  
  // Reset all leaderboards first
  console.log('Resetting all leaderboards...');
  Object.values(leaderboardController.LEADERBOARD_CATEGORIES).forEach(category => {
    const result = leaderboardController.resetLeaderboard(category);
    if (!result.success) {
      console.error(`Failed to reset ${category} leaderboard:`, result.message);
    }
  });
  
  // Update scores for each player in each category
  console.log('Updating player scores...');
  Object.entries(testScores).forEach(([category, scores]) => {
    scores.forEach((score, index) => {
      const player = testPlayers[index];
      const result = leaderboardController.updatePlayerScore(
        player.id,
        player.name,
        category,
        score
      );
      
      if (!result.success) {
        console.error(`Failed to update ${player.name}'s score in ${category}:`, result.message);
      }
    });
  });
  
  // Get all leaderboards
  console.log('\nAll leaderboards:');
  const allLeaderboards = leaderboardController.getAllLeaderboards();
  console.log(`Last updated: ${allLeaderboards.lastUpdated}`);
  console.log(`Number of categories: ${Object.keys(allLeaderboards.categories).length}`);
  
  // Get each leaderboard and display top 3
  console.log('\nTop 3 players in each category:');
  Object.values(leaderboardController.LEADERBOARD_CATEGORIES).forEach(category => {
    const leaderboard = leaderboardController.getLeaderboard(category);
    console.log(`\n${category}:`);
    
    leaderboard.entries.slice(0, 3).forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.playerName}: ${entry.score}`);
    });
  });
  
  // Get player ranks
  console.log('\nPlayer ranks:');
  testPlayers.forEach(player => {
    console.log(`\n${player.name}'s ranks:`);
    
    Object.values(leaderboardController.LEADERBOARD_CATEGORIES).forEach(category => {
      const rank = leaderboardController.getPlayerRank(player.id, category);
      if (rank.found) {
        console.log(`  ${category}: #${rank.rank} (Score: ${rank.entry.score})`);
      } else {
        console.log(`  ${category}: Not ranked`);
      }
    });
  });
  
  console.log('\nLeaderboard tests completed!');
};

// Run the tests
runTests().catch(error => {
  console.error('Error running leaderboard tests:', error);
}); 