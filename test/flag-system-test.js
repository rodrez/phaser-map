/**
 * Flag System Test Script
 * 
 * This script tests the MMO flag system by connecting to the server
 * and performing various flag-related operations.
 */

// Import required modules
import webSocketClient from '../src/utils/WebSocketClient.js';
import flagService from '../src/utils/FlagService.js';
import { logger, LogCategory } from '../src/utils/Logger.js';
import { v4 as uuidv4 } from 'uuid';

// Test config
const config = {
  serverUrl: 'ws://localhost:3000',
  numberOfPlayers: 3,
  testDuration: 60000, // 60 seconds
  flagPlacementInterval: 5000, // 5 seconds
  movementInterval: 2000, // 2 seconds
};

// Test players
const players = [];

// Test state
let running = false;
let startTime = null;

/**
 * Generate a random position near another position
 * @param {Object} position - Base position {lat, lng}
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {Object} - New position {lat, lng}
 */
function generateRandomPosition(position = null, maxDistance = 500) {
  if (!position) {
    // If no base position, generate a random position near the origin
    return {
      lat: (Math.random() * 0.01) - 0.005, // Random latitude ±0.005° from 0
      lng: (Math.random() * 0.01) - 0.005  // Random longitude ±0.005° from 0
    };
  }
  
  // Convert distance to degrees (approximate)
  // 0.00001 degrees ≈ 1.11 meters at the equator
  const distanceDegrees = maxDistance * 0.00001;
  
  // Generate a random angle
  const angle = Math.random() * 2 * Math.PI;
  
  // Random distance (0 to maxDistance)
  const distance = Math.random() * distanceDegrees;
  
  // Calculate new position using simple approximation
  // This is not accurate for large distances or near poles, but works for testing
  return {
    lat: position.lat + distance * Math.sin(angle),
    lng: position.lng + distance * Math.cos(angle)
  };
}

/**
 * Create and connect a simulated player
 * @returns {Promise<Object>} - The connected player
 */
async function createPlayer() {
  const playerId = uuidv4();
  const username = `TestPlayer_${playerId.substring(0, 6)}`;
  
  // Create a new WebSocket client instance
  const client = new webSocketClient.constructor({
    serverUrl: config.serverUrl,
    playerId: playerId,
    username: username,
    onAuthenticated: (data) => {
      console.log(`Player ${username} authenticated`);
    },
    onDisconnect: () => {
      console.log(`Player ${username} disconnected`);
    }
  });
  
  // Connect to the server
  try {
    await client.connect();
    
    // Create a player object
    const player = {
      id: playerId,
      username: username,
      client: client,
      position: generateRandomPosition(null, 0),
      flags: [],
      lastMoved: Date.now(),
      lastPlacedFlag: 0,
    };
    
    // Authenticate the player
    client.authenticate(playerId, username);
    
    // Wait for authentication
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Created player ${username} at position:`, player.position);
    
    return player;
  } catch (error) {
    console.error(`Error creating player: ${error.message}`);
    throw error;
  }
}

/**
 * Move a player to a random position
 * @param {Object} player - Player object
 */
function movePlayer(player) {
  // Generate a new position near the current position
  const newPosition = generateRandomPosition(player.position, 100);
  
  // Update player's position
  player.position = newPosition;
  player.lastMoved = Date.now();
  
  // Send movement update to server
  player.client.sendPlayerMove(newPosition);
  
  console.log(`Player ${player.username} moved to:`, newPosition);
}

/**
 * Place a flag for a player
 * @param {Object} player - Player object
 */
function placeFlag(player) {
  // Only place flags at a certain interval
  if (Date.now() - player.lastPlacedFlag < config.flagPlacementInterval) {
    return;
  }
  
  // Update timestamp
  player.lastPlacedFlag = Date.now();
  
  // Generate flag options
  const flagOptions = {
    name: `Flag of ${player.username}`,
    isPublic: Math.random() > 0.5, // 50% chance of being public
    toll: Math.floor(Math.random() * 50) // Random toll between 0 and 49
  };
  
  // Place flag at the player's current position
  player.client.send('place-flag', {
    position: player.position,
    options: flagOptions
  });
  
  console.log(`Player ${player.username} placed a flag at:`, player.position);
}

/**
 * Teleport a player to a random flag
 * @param {Object} player - Player object
 * @param {Array} availableFlags - Array of available flags
 */
function teleportToFlag(player, availableFlags) {
  // Filter out flags that the player can teleport to
  const teleportableFlags = availableFlags.filter(flag => 
    flag.ownerId === player.id || // Player's own flags
    flag.ownerId === 'system' ||  // System flags
    flag.isPublic                 // Public flags
  );
  
  if (teleportableFlags.length === 0) {
    console.log(`No flags available for ${player.username} to teleport to`);
    return;
  }
  
  // Choose a random flag
  const randomFlag = teleportableFlags[Math.floor(Math.random() * teleportableFlags.length)];
  
  // Send teleport request
  player.client.send('teleport-to-flag', { flagId: randomFlag.id });
  
  console.log(`Player ${player.username} teleporting to flag ${randomFlag.id}`);
}

/**
 * Harden a random flag owned by the player
 * @param {Object} player - Player object
 * @param {Array} allFlags - Array of all flags
 */
function hardenFlag(player, allFlags) {
  // Filter flags owned by this player
  const ownedFlags = allFlags.filter(flag => 
    flag.ownerId === player.id && !flag.isHardened
  );
  
  if (ownedFlags.length === 0) {
    return;
  }
  
  // Choose a random flag
  const randomFlag = ownedFlags[Math.floor(Math.random() * ownedFlags.length)];
  
  // Send harden request
  player.client.send('harden-flag', { flagId: randomFlag.id });
  
  console.log(`Player ${player.username} hardening flag ${randomFlag.id}`);
}

/**
 * Request nearby players
 * @param {Object} player - Player object
 */
function requestNearbyPlayers(player) {
  // Create a bounding box around the player
  const boundingBox = {
    minLat: player.position.lat - 0.01,
    maxLat: player.position.lat + 0.01,
    minLng: player.position.lng - 0.01,
    maxLng: player.position.lng + 0.01
  };
  
  // Request players in this bounding box
  player.client.getPlayersInBounds(boundingBox);
}

/**
 * Main test function
 */
async function runTest() {
  console.log('=== Starting Flag System Test ===');
  
  startTime = Date.now();
  running = true;
  
  try {
    // Create test players
    console.log(`Creating ${config.numberOfPlayers} test players...`);
    for (let i = 0; i < config.numberOfPlayers; i++) {
      const player = await createPlayer();
      players.push(player);
      
      // Add some delay between creating players
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Created ${players.length} test players successfully`);
    
    // Request initial flags from server
    players[0].client.send('get-flags', {});
    
    // Wait for flags to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Set up flag handlers for the first player for logging
    players[0].client.registerHandler('flag-placed', data => {
      console.log(`Server confirmed flag placed:`, data.flag);
    });
    
    players[0].client.registerHandler('flag-placed-by-other', data => {
      console.log(`Flag placed by other player:`, data.flag);
    });
    
    players[0].client.registerHandler('flag-removed', data => {
      console.log(`Flag removed:`, data.flagId);
    });
    
    players[0].client.registerHandler('initial-flags', data => {
      console.log(`Initial flags loaded: ${data.flags.length} flags`);
    });
    
    // Main test loop
    while (running && (Date.now() - startTime < config.testDuration)) {
      // Get all available flags
      const allFlags = []; // TODO: Get flags from server
      
      // Process each player
      for (const player of players) {
        // Move player
        if (Date.now() - player.lastMoved > config.movementInterval) {
          movePlayer(player);
        }
        
        // Choose a random action based on probability
        const action = Math.random();
        
        if (action < 0.3) {
          // 30% chance to place a flag
          placeFlag(player);
        } else if (action < 0.5 && allFlags.length > 0) {
          // 20% chance to teleport to a flag
          teleportToFlag(player, allFlags);
        } else if (action < 0.6 && allFlags.length > 0) {
          // 10% chance to harden a flag
          hardenFlag(player, allFlags);
        } else if (action < 0.7) {
          // 10% chance to request nearby players
          requestNearbyPlayers(player);
        }
      }
      
      // Wait a bit before the next iteration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show test progress
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor(config.testDuration / 1000) - elapsed;
      console.log(`Test running for ${elapsed}s, ${remaining}s remaining...`);
    }
    
    console.log('Test completed');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Clean up
    running = false;
    
    // Disconnect all players
    for (const player of players) {
      if (player.client && player.client.isConnected) {
        player.client.disconnect();
      }
    }
    
    console.log('=== Flag System Test Completed ===');
  }
}

// Run the test
runTest().catch(console.error);

// Handle process interruption
process.on('SIGINT', async () => {
  console.log('Test interrupted, cleaning up...');
  running = false;
  
  // Disconnect all players
  for (const player of players) {
    if (player.client && player.client.isConnected) {
      player.client.disconnect();
    }
  }
  
  // Exit after a short delay
  setTimeout(() => process.exit(0), 1000);
}); 