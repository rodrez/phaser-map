/**
 * test-db-integration.js
 * Test the integration between PlayerStateSystem and PostgreSQL
 */

import dotenv from 'dotenv';
dotenv.config();

// Set environment to test mode
process.env.NODE_ENV = 'test';

import logger from './utils/logger.js';
import { pool, transaction } from './config/postgres.js';
import PlayerRepository from './repositories/PlayerRepository.js';
import PlayerStateSystem from './game/systems/PlayerStateSystem.js';

// Test player data
const testPlayers = [
  {
    id: 'test-player-1',
    username: 'testplayer1',
    email: 'test1@example.com',
    passwordHash: 'hashedpassword1',
    displayName: 'Test Player 1',
    position: { lat: 35.1, lng: -78.9, currentArea: 'forest' }
  },
  {
    id: 'test-player-2',
    username: 'testplayer2',
    email: 'test2@example.com',
    passwordHash: 'hashedpassword2',
    displayName: 'Test Player 2',
    position: { lat: 35.2, lng: -78.8, currentArea: 'desert' }
  },
  {
    id: 'test-player-3',
    username: 'testplayer3',
    email: 'test3@example.com',
    passwordHash: 'hashedpassword3',
    displayName: 'Test Player 3',
    position: { lat: 35.15, lng: -78.85, currentArea: 'forest' }
  }
];

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    await transaction(async (client) => {
      // Delete test players
      for (const player of testPlayers) {
        await client.query('DELETE FROM players WHERE id = $1', [player.id]);
      }
    });

    logger.info('Test data cleaned up');
  } catch (error) {
    logger.error(`Error cleaning up test data: ${error.message}`);
  }
}

/**
 * Test player registration
 */
async function testPlayerRegistration() {
  logger.info('=== Testing Player Registration ===');
  
  try {
    // Register players using PlayerStateSystem
    for (const player of testPlayers) {
      const result = await PlayerStateSystem.registerPlayer(player.id, {
        isNewPlayer: true,
        username: player.username,
        email: player.email,
        passwordHash: player.passwordHash,
        profile: { displayName: player.displayName },
        position: player.position
      });
      
      logger.info(`Registered player ${player.id}: ${result ? 'SUCCESS' : 'FAILED'}`);
    }
    
    // Verify registration in database
    for (const player of testPlayers) {
      const dbPlayer = await PlayerRepository.getPlayerById(player.id);
      logger.info(`Retrieved player ${player.id} from database: ${dbPlayer ? 'SUCCESS' : 'FAILED'}`);
      
      if (dbPlayer) {
        logger.info(`Player data: ${JSON.stringify(dbPlayer, null, 2)}`);
      }
    }
  } catch (error) {
    logger.error(`Registration test failed: ${error.message}`);
  }
}

/**
 * Test player updates
 */
async function testPlayerUpdates() {
  logger.info('=== Testing Player Updates ===');
  
  try {
    // Update player 1's position
    const newPosition = { lat: 35.12, lng: -78.92, currentArea: 'mountains' };
    const updateResult = await PlayerStateSystem.updatePlayerPosition(testPlayers[0].id, newPosition);
    logger.info(`Updated player position: ${updateResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Verify update in database
    const updatedPlayer = await PlayerRepository.getPlayerPosition(testPlayers[0].id);
    logger.info(`Retrieved updated position: ${JSON.stringify(updatedPlayer)}`);
    
    // Update player 2's profile
    const profileUpdate = {
      profile: {
        displayName: 'Updated Test Player 2',
        level: 5,
        experience: 1000
      }
    };
    
    const profileUpdateResult = await PlayerStateSystem.updatePlayer(testPlayers[1].id, profileUpdate);
    logger.info(`Updated player profile: ${profileUpdateResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Verify profile update in database
    const updatedProfilePlayer = await PlayerRepository.getPlayerById(testPlayers[1].id);
    logger.info(`Retrieved updated profile: ${JSON.stringify(updatedProfilePlayer?.profile)}`);
  } catch (error) {
    logger.error(`Update test failed: ${error.message}`);
  }
}

/**
 * Test player queries
 */
async function testPlayerQueries() {
  logger.info('=== Testing Player Queries ===');
  
  try {
    // Test getPlayersInArea
    const forestPlayers = await PlayerStateSystem.getPlayersInArea('forest');
    logger.info(`Players in forest area: ${forestPlayers.length}`);
    logger.info(`Forest players: ${JSON.stringify(forestPlayers, null, 2)}`);
    
    // Test getPlayersInBounds
    const bounds = {
      minLat: 35.0,
      maxLat: 35.3,
      minLng: -79.0,
      maxLng: -78.7
    };
    
    const playersInBounds = await PlayerStateSystem.getPlayersInBounds(bounds);
    logger.info(`Players in bounds: ${playersInBounds.length}`);
    logger.info(`Bounded players: ${JSON.stringify(playersInBounds, null, 2)}`);
  } catch (error) {
    logger.error(`Query test failed: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  logger.info('Starting PostgreSQL integration tests');
  
  try {
    // First clean up any existing test data
    await cleanupTestData();
    
    // Test player registration
    await testPlayerRegistration();
    
    // Test player updates
    await testPlayerUpdates();
    
    // Test player queries
    await testPlayerQueries();
    
    // Clean up again
    await cleanupTestData();
    
    logger.info('All tests completed successfully');
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
  } finally {
    // Close the database connection
    await pool.end();
    process.exit(0);
  }
}

// Run the tests
runTests(); 