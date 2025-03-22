// Set environment to test mode
process.env.NODE_ENV = 'test';

import PlayerStateSystem from '../game/systems/PlayerStateSystem.js';
import MovementSystem from '../game/systems/MovementSystem.js';
import ZoneSystem from './game/systems/ZoneSystem.js';
import { connectRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Mock Socket.io server
const mockIo = {
  to: (room) => ({
    emit: (event, data) => {
      logger.info('Emitting event', { room, event, data });
    }
  })
};

const testPlayerSync = async () => {
  try {
    logger.info('Starting player sync test');
    
    // Connect to Redis
    await connectRedis();
    
    // Initialize systems
    const playerState = new PlayerStateSystem();
    const zoneSystem = new ZoneSystem(mockIo, playerState);
    const movementSystem = new MovementSystem(mockIo, playerState);
    
    // Setup test zone
    zoneSystem.registerZone({
      id: 'test-zone',
      name: 'Test Zone',
      maxPlayers: 10,
      spawnPoints: [{ x: 100, y: 100 }]
    });
    
    // Create test players
    const player1Id = 'player1';
    const player2Id = 'player2';
    
    // Initialize player states
    await playerState.updatePlayer(player1Id, {
      id: player1Id,
      username: 'Test Player 1',
      position: { x: 0, y: 0 },
      rotation: 0,
      animation: 'idle',
      zone: null,
      stats: {
        health: 100,
        maxHealth: 100
      }
    });
    
    await playerState.updatePlayer(player2Id, {
      id: player2Id,
      username: 'Test Player 2',
      position: { x: 10, y: 10 },
      rotation: 0,
      animation: 'idle',
      zone: null,
      stats: {
        health: 100,
        maxHealth: 100
      }
    });
    
    // Add players to zone
    logger.info('Adding players to zone');
    await zoneSystem.addPlayerToZone(player1Id, 'test-zone');
    await zoneSystem.addPlayerToZone(player2Id, 'test-zone');
    
    // Test movement updates
    logger.info('Testing movement updates');
    await movementSystem.handleMovementUpdate({
      playerId: player1Id,
      position: { x: 5, y: 5 },
      velocity: { x: 1, y: 1 },
      timestamp: Date.now()
    });
    
    // Wait a short time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await movementSystem.handleMovementUpdate({
      playerId: player1Id,
      position: { x: 6, y: 6 },
      velocity: { x: 1, y: 1 },
      timestamp: Date.now()
    });
    
    // Get updated player state
    const updatedPlayer1 = await playerState.getPlayer(player1Id);
    logger.info('Updated player state', { player: updatedPlayer1 });
    
    // Get players in zone
    const playersInZone = await playerState.getPlayersInZone('test-zone');
    logger.info('Players in zone', { count: playersInZone.length });
    
    // Test interpolation
    const interpolatedPosition = movementSystem.getInterpolatedPosition(
      player1Id, 
      Date.now()
    );
    logger.info('Interpolated position', { position: interpolatedPosition });
    
    // Clean up
    logger.info('Cleaning up test data');
    await zoneSystem.removePlayerFromZone(player1Id, 'test-zone');
    await zoneSystem.removePlayerFromZone(player2Id, 'test-zone');
    await playerState.removePlayer(player1Id);
    await playerState.removePlayer(player2Id);
    
    logger.info('Player sync test completed successfully');
  } catch (error) {
    logger.error('Test failed', { error: error.message });
  } finally {
    // Exit the process
    process.exit(0);
  }
};

// Run the test
testPlayerSync(); 