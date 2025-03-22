/**
 * Test script for the geospatial player synchronization system
 * Tests player movement, flag placement, and area-based interactions
 * Run with: NODE_ENV=test node test-geospatial.js
 */

import { logger } from '../utils/logger.js';
import PlayerStateSystem from '../game/systems/PlayerStateSystem.js';
import GeospatialAreaSystem from '../game/systems/GeospatialAreaSystem.js';
import FlagSystem from '../game/systems/FlagSystem.js';
import MovementSystem from '../game/systems/MovementSystem.js';

// Set environment to test
process.env.NODE_ENV = 'test';

// Mock Socket.io for testing
const mockIo = {
  to: (id) => ({
    emit: (event, data) => {
      logger.debug(`Emitting ${event} to ${id}`, { data });
    }
  }),
  emit: (event, data) => {
    logger.debug(`Emitting ${event} globally`, { data });
  }
};

// Initialize systems
const playerStateSystem = new PlayerStateSystem();
const geospatialSystem = new GeospatialAreaSystem(mockIo, playerStateSystem);
const flagSystem = new FlagSystem(mockIo, playerStateSystem, geospatialSystem);
const movementSystem = new MovementSystem(mockIo, playerStateSystem, geospatialSystem, flagSystem);

// Example mock players for testing
const testPlayers = [
  {
    id: 'player1',
    username: 'TestPlayer1',
    position: { lat: 0.05, lng: 0.05 },
    startPosition: { lat: 0.05, lng: 0.05 },
    direction: 0,
    socketId: 'socket1',
    lastUpdate: Date.now()
  },
  {
    id: 'player2',
    username: 'TestPlayer2',
    position: { lat: 0.06, lng: 0.06 },
    startPosition: { lat: 0.06, lng: 0.06 },
    direction: 90,
    socketId: 'socket2',
    lastUpdate: Date.now()
  },
  {
    id: 'player3',
    username: 'TestPlayer3',
    position: { lat: 0.15, lng: 0.15 },
    startPosition: { lat: 0.15, lng: 0.15 },
    direction: 180,
    socketId: 'socket3',
    lastUpdate: Date.now()
  }
];

/**
 * Initialize test data
 */
async function setupTestData() {
  logger.info('Setting up test data...');
  
  // Set up areas
  geospatialSystem.registerArea({
    id: 'starting-area',
    name: 'Starting Area',
    boundingBox: {
      minLat: 0.0,
      minLng: 0.0,
      maxLat: 0.1,
      maxLng: 0.1
    },
    properties: {
      type: 'safe-zone',
      description: 'A safe area for new players to start their journey'
    }
  });
  
  geospatialSystem.registerArea({
    id: 'city-area',
    name: 'Central City',
    boundingBox: {
      minLat: 0.1,
      minLng: 0.1,
      maxLat: 0.2,
      maxLng: 0.2
    },
    properties: {
      type: 'city',
      description: 'A bustling city center with shops and NPCs'
    }
  });
  
  // Set up a system flag
  await flagSystem.createFlag({
    id: 'starting-flag',
    name: 'Starting Flag',
    position: { lat: 0.05, lng: 0.05 },
    ownerId: 'system',
    properties: {
      type: 'system',
      description: 'Starting point for new players'
    }
  });
  
  // Register test players
  for (const player of testPlayers) {
    await playerStateSystem.updatePlayer(player.id, player);
  }
  
  logger.info('Test data setup completed', {
    areas: geospatialSystem.getAreas().length,
    flags: (await flagSystem.getAllFlags()).length,
    players: (await playerStateSystem.getAllPlayers()).length
  });
}

/**
 * Test player movement
 */
async function testPlayerMovement() {
  logger.info('Testing player movement...');
  
  // Move player within valid range of starting flag
  const moveResult1 = await movementSystem.handleMovementUpdate({
    playerId: 'player1',
    position: { lat: 0.055, lng: 0.052 },
    direction: 45,
    timestamp: Date.now()
  });
  
  logger.info('Moving player1 within valid range', {
    success: moveResult1.success,
    error: moveResult1.error,
    visiblePlayers: moveResult1.visiblePlayers?.length
  });
  
  // Try to move player beyond valid range
  const moveResult2 = await movementSystem.handleMovementUpdate({
    playerId: 'player2',
    position: { lat: 0.5, lng: 0.5 },
    direction: 90,
    timestamp: Date.now()
  });
  
  logger.info('Moving player2 beyond valid range', {
    success: moveResult2.success,
    error: moveResult2.error
  });
  
  // Check player positions
  const player1 = await playerStateSystem.getPlayer('player1');
  const player2 = await playerStateSystem.getPlayer('player2');
  
  logger.info('Player positions after movement', {
    player1Position: player1.position,
    player2Position: player2.position
  });
}

/**
 * Test flag placement
 */
async function testFlagPlacement() {
  logger.info('Testing flag placement...');
  
  // Place a flag for player1
  const flagResult = await flagSystem.placeFlag(
    'player1',
    { lat: 0.07, lng: 0.07 },
    'Player1 Flag'
  );
  
  logger.info('Flag placement result', {
    success: flagResult.success,
    flag: flagResult.flag?.id,
    error: flagResult.error
  });
  
  // Try to move farther with the new flag's range
  if (flagResult.success) {
    const moveResult = await movementSystem.handleMovementUpdate({
      playerId: 'player1',
      position: { lat: 0.075, lng: 0.075 },
      direction: 45,
      timestamp: Date.now()
    });
    
    logger.info('Moving player1 within range of new flag', {
      success: moveResult.success,
      error: moveResult.error
    });
  }
  
  // List all flags
  const flags = await flagSystem.getAllFlags();
  logger.info('All flags after test', {
    count: flags.length,
    flagIds: flags.map(f => f.id)
  });
}

/**
 * Test area queries
 */
async function testAreaQueries() {
  logger.info('Testing area queries...');
  
  // Query for a bounded area
  const boundingBox = {
    minLat: 0.0,
    minLng: 0.0,
    maxLat: 0.1,
    maxLng: 0.1
  };
  
  const areas = geospatialSystem.getAreasInBoundingBox(boundingBox);
  const players = playerStateSystem.getPlayersInArea(boundingBox);
  const flags = await flagSystem.getFlagsInBoundingBox(boundingBox);
  
  logger.info('Query results for starting area bounding box', {
    areas: areas.map(a => a.id),
    players: Array.isArray(players) ? players.map(p => p.id) : [],
    flags: flags.map(f => f.id)
  });
  
  // Test if a point is in an area
  const testPoint = { lat: 0.05, lng: 0.05 };
  const containingAreas = geospatialSystem.getAreasContainingPoint(testPoint);
  
  logger.info('Areas containing test point', {
    point: testPoint,
    areas: containingAreas.map(a => a.id)
  });
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    logger.info('Starting geospatial system tests...');
    
    await setupTestData();
    await testPlayerMovement();
    await testFlagPlacement();
    await testAreaQueries();
    
    logger.info('All tests completed successfully');
  } catch (error) {
    logger.error('Test failed', { error: error.message, stack: error.stack });
  }
}

// Run tests
runTests(); 