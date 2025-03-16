// leaderboardRoutes.js
// This file defines the API routes for leaderboard functionality

import express from 'express';
import leaderboardController from '../controllers/leaderboardController.js';

const router = express.Router();

// Get all leaderboards
router.get('/', (req, res) => {
  const leaderboards = leaderboardController.getAllLeaderboards();
  res.status(200).json(leaderboards);
});

// Get a specific leaderboard by category
router.get('/:category', (req, res) => {
  const { category } = req.params;
  const leaderboard = leaderboardController.getLeaderboard(category);
  
  if (leaderboard.error) {
    return res.status(400).json({ error: leaderboard.error });
  }
  
  res.status(200).json(leaderboard);
});

// Get a player's rank in a specific leaderboard
router.get('/:category/player/:playerId', (req, res) => {
  const { category, playerId } = req.params;
  const playerRank = leaderboardController.getPlayerRank(playerId, category);
  
  if (playerRank.error) {
    return res.status(400).json({ error: playerRank.error });
  }
  
  res.status(200).json(playerRank);
});

// Update a player's score in a leaderboard
router.post('/:category/update', (req, res) => {
  const { category } = req.params;
  const { playerId, playerName, score } = req.body;
  
  // Validate required fields
  if (!playerId || !playerName || score === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields: playerId, playerName, and score are required' 
    });
  }
  
  // Validate score is a number
  if (isNaN(score)) {
    return res.status(400).json({ error: 'Score must be a number' });
  }
  
  const result = leaderboardController.updatePlayerScore(
    playerId, 
    playerName, 
    category, 
    Number(score)
  );
  
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  
  res.status(200).json({ message: result.message });
});

// Reset a leaderboard (admin only - would need auth middleware in production)
router.delete('/:category/reset', (req, res) => {
  const { category } = req.params;
  
  // TODO: Add authentication middleware to protect this route
  
  const result = leaderboardController.resetLeaderboard(category);
  
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  
  res.status(200).json({ message: result.message });
});

export default router; 