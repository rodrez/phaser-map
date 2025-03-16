// leaderboardUtils.js
// Utility functions for leaderboard operations

/**
 * Format a leaderboard entry for display
 * @param {Object} entry - The leaderboard entry
 * @param {number} rank - The rank of the entry
 * @returns {Object} Formatted entry
 */
export const formatLeaderboardEntry = (entry, rank) => {
  return {
    rank,
    playerName: entry.playerName,
    score: entry.score,
    formattedScore: formatScore(entry.score),
    updatedAt: new Date(entry.updatedAt).toLocaleString(),
    playerId: entry.playerId
  };
};

/**
 * Format a score based on its type
 * @param {number} score - The score to format
 * @returns {string} Formatted score
 */
export const formatScore = (score) => {
  // Format large numbers with commas
  return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Get the display name for a leaderboard category
 * @param {string} category - The category key
 * @returns {string} Display name
 */
export const getCategoryDisplayName = (category) => {
  const displayNames = {
    monstersKilled: 'Most Monsters Killed',
    damageDone: 'Most Damage Done',
    healingDone: 'Most Healing Done',
    goldCollected: 'Most Gold Collected',
    experiencePoints: 'Most Experience Points',
    dungeonsCompleted: 'Most Dungeons Completed',
    buoysAttacked: 'Most Buoys Attacked',
    flagsAttacked: 'Most Flags Attacked',
    playersKilled: 'Most Players Killed',
    goldSpent: 'Most Gold Spent',
    mostGold: 'Most Gold'
  };
  
  return displayNames[category] || category;
};

/**
 * Get the appropriate icon for a leaderboard category
 * @param {string} category - The category key
 * @returns {string} Icon name (can be used with font-awesome or similar)
 */
export const getCategoryIcon = (category) => {
  const icons = {
    monstersKilled: 'skull',
    damageDone: 'fire',
    healingDone: 'heart',
    goldCollected: 'coins',
    experiencePoints: 'star',
    dungeonsCompleted: 'dungeon',
    buoysAttacked: 'water',
    flagsAttacked: 'flag',
    playersKilled: 'user-slash',
    goldSpent: 'shopping-cart',
    mostGold: 'money-bill-wave'
  };
  
  return icons[category] || 'trophy';
};

/**
 * Get the appropriate color for a rank
 * @param {number} rank - The rank (1-based)
 * @returns {string} CSS color
 */
export const getRankColor = (rank) => {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return '#FFFFFF'; // White for other ranks
};

/**
 * Get the appropriate medal emoji for a rank
 * @param {number} rank - The rank (1-based)
 * @returns {string} Medal emoji
 */
export const getRankMedal = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
};

/**
 * Filter leaderboard entries by time period
 * @param {Array} entries - The leaderboard entries
 * @param {string} period - The time period ('all', 'day', 'week', 'month')
 * @returns {Array} Filtered entries
 */
export const filterEntriesByPeriod = (entries, period) => {
  if (period === 'all') return entries;
  
  const now = new Date();
  const cutoff = new Date();
  
  switch (period) {
    case 'day':
      cutoff.setDate(now.getDate() - 1);
      break;
    case 'week':
      cutoff.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoff.setMonth(now.getMonth() - 1);
      break;
    default:
      return entries;
  }
  
  return entries.filter(entry => new Date(entry.updatedAt) >= cutoff);
};

/**
 * Get the top N entries from a leaderboard
 * @param {Array} entries - The leaderboard entries
 * @param {number} limit - The maximum number of entries to return
 * @returns {Array} Top N entries
 */
export const getTopEntries = (entries, limit = 10) => {
  return entries.slice(0, limit).map((entry, index) => {
    return formatLeaderboardEntry(entry, index + 1);
  });
}; 