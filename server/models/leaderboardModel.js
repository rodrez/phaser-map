// leaderboardModel.js
// This file defines the structure and methods for leaderboard data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the leaderboard data file
const dataPath = path.join(__dirname, '../data/leaderboards.json');

// Leaderboard categories from leaderboards.md
const LEADERBOARD_CATEGORIES = {
  MONSTERS_KILLED: 'monstersKilled',
  DAMAGE_DONE: 'damageDone',
  HEALING_DONE: 'healingDone',
  GOLD_COLLECTED: 'goldCollected',
  EXPERIENCE_POINTS: 'experiencePoints',
  DUNGEONS_COMPLETED: 'dungeonsCompleted',
  BUOYS_ATTACKED: 'buoysAttacked',
  FLAGS_ATTACKED: 'flagsAttacked',
  PLAYERS_KILLED: 'playersKilled',
  GOLD_SPENT: 'goldSpent',
  MOST_GOLD: 'mostGold'
};

// Initialize leaderboard data structure
const initializeLeaderboards = () => {
  // Create default structure if file doesn't exist
  if (!fs.existsSync(dataPath)) {
    const defaultData = {
      categories: Object.values(LEADERBOARD_CATEGORIES).reduce((acc, category) => {
        acc[category] = [];
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };
    
    // Create directory if it doesn't exist
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write default data
    fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  
  // Read existing data
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading leaderboard data:', error);
    return null;
  }
};

// Save leaderboard data to file
const saveLeaderboards = (data) => {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving leaderboard data:', error);
    return false;
  }
};

export {
  LEADERBOARD_CATEGORIES,
  initializeLeaderboards,
  saveLeaderboards
}; 