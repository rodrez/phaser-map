// leaderboardController.js
// This file handles the logic for managing leaderboards

import { 
  LEADERBOARD_CATEGORIES, 
  initializeLeaderboards, 
  saveLeaderboards 
} from '../models/leaderboardModel.js';

// Initialize leaderboard data
let leaderboardData = initializeLeaderboards();

// Maximum number of entries to keep per leaderboard category
const MAX_LEADERBOARD_ENTRIES = 100;

// Get all leaderboard data
const getAllLeaderboards = () => {
  return leaderboardData;
};

// Get leaderboard for a specific category
const getLeaderboard = (category) => {
  if (!Object.values(LEADERBOARD_CATEGORIES).includes(category)) {
    return { error: 'Invalid leaderboard category' };
  }
  
  return {
    category,
    entries: leaderboardData.categories[category] || [],
    lastUpdated: leaderboardData.lastUpdated
  };
};

// Update a player's score in a specific leaderboard category
const updatePlayerScore = (playerId, playerName, category, score) => {
  // Validate category
  if (!Object.values(LEADERBOARD_CATEGORIES).includes(category)) {
    return { success: false, message: 'Invalid leaderboard category' };
  }
  
  // Ensure the category exists in our data structure
  if (!leaderboardData.categories[category]) {
    leaderboardData.categories[category] = [];
  }
  
  // Find if player already exists in this category
  const existingEntryIndex = leaderboardData.categories[category]
    .findIndex(entry => entry.playerId === playerId);
  
  if (existingEntryIndex !== -1) {
    // Update existing entry if new score is higher
    if (score > leaderboardData.categories[category][existingEntryIndex].score) {
      leaderboardData.categories[category][existingEntryIndex] = {
        playerId,
        playerName,
        score,
        updatedAt: new Date().toISOString()
      };
    } else {
      // No update needed if score is not higher
      return { 
        success: true, 
        message: 'Score not updated as it is not higher than the current score' 
      };
    }
  } else {
    // Add new entry
    leaderboardData.categories[category].push({
      playerId,
      playerName,
      score,
      updatedAt: new Date().toISOString()
    });
  }
  
  // Sort entries by score (descending)
  leaderboardData.categories[category].sort((a, b) => b.score - a.score);
  
  // Trim to max entries
  if (leaderboardData.categories[category].length > MAX_LEADERBOARD_ENTRIES) {
    leaderboardData.categories[category] = 
      leaderboardData.categories[category].slice(0, MAX_LEADERBOARD_ENTRIES);
  }
  
  // Save updated data
  const saved = saveLeaderboards(leaderboardData);
  
  return {
    success: saved,
    message: saved ? 'Leaderboard updated successfully' : 'Failed to save leaderboard data'
  };
};

// Get a player's rank in a specific category
const getPlayerRank = (playerId, category) => {
  // Validate category
  if (!Object.values(LEADERBOARD_CATEGORIES).includes(category)) {
    return { error: 'Invalid leaderboard category' };
  }
  
  // Find player's position
  const entries = leaderboardData.categories[category] || [];
  const playerIndex = entries.findIndex(entry => entry.playerId === playerId);
  
  if (playerIndex === -1) {
    return { 
      found: false, 
      message: 'Player not found in this leaderboard' 
    };
  }
  
  return {
    found: true,
    rank: playerIndex + 1,
    total: entries.length,
    entry: entries[playerIndex]
  };
};

// Reset a specific leaderboard category
const resetLeaderboard = (category) => {
  // Validate category
  if (!Object.values(LEADERBOARD_CATEGORIES).includes(category)) {
    return { success: false, message: 'Invalid leaderboard category' };
  }
  
  // Reset the category
  leaderboardData.categories[category] = [];
  
  // Save updated data
  const saved = saveLeaderboards(leaderboardData);
  
  return {
    success: saved,
    message: saved ? 'Leaderboard reset successfully' : 'Failed to reset leaderboard'
  };
};

export default {
  LEADERBOARD_CATEGORIES,
  getAllLeaderboards,
  getLeaderboard,
  updatePlayerScore,
  getPlayerRank,
  resetLeaderboard
}; 