/**
 * Flag System Stress Test
 * 
 * This script simulates multiple concurrent users interacting with the flag system
 * to test performance and reliability under load.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  serverUrl: process.env.SERVER_URL || 'ws://localhost:8080',
  numberOfUsers: process.env.NUM_USERS ? parseInt(process.env.NUM_USERS, 10) : 10,
  testDuration: process.env.TEST_DURATION ? parseInt(process.env.TEST_DURATION, 10) : 60, // seconds
  logFilePath: process.env.LOG_FILE || path.join(__dirname, 'stress-test-results.log'),
  actionDelay: {
    min: 500,  // Minimum delay between actions (ms)
    max: 3000  // Maximum delay between actions (ms)
  },
  initialPosition: {
    lat: 51.5074, // London
    lng: -0.1278
  },
  movementRadius: 0.005, // ~500m in lat/lng
  flagPlacementChance: 0.1, // 10% chance to place a flag on each action
  teleportChance: 0.05,     // 5% chance to teleport on each action
  hardenChance: 0.02,       // 2% chance to harden a flag
  movementChance: 0.3,      // 30% chance to move
  queryPlayersChance: 0.05   // 5% chance to query players
};

// Global state
const users = [];
const flags = new Map();
let isRunning = true;
let startTime;
let totalMessages = 0;
let totalActions = 0;
let successfulActions = 0;
let failedActions = 0;

// Set up logging
const logger = fs.createWriteStream(config.logFilePath, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logger.write(logMessage + '\n');
}

/**
 * User class to simulate a player
 */
class User {
  constructor(id) {
    this.id = id;
    this.username = `TestUser${id}`;
    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    this.position = { ...config.initialPosition };
    this.myFlags = new Set();
    this.knownFlags = new Map();
    this.nearbyPlayers = new Set();
    this.messageHandlers = new Map();
    this.messageQueue = [];
    this.lastActionTime = 0;
    this.pendingAction = false;
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    return new Promise((resolve) => {
      this.socket = new WebSocket(config.serverUrl);
      
      this.socket.on('open', () => {
        this.connected = true;
        this.setupMessageHandlers();
        log(`User ${this.username} connected to server`);
        this.authenticate();
        resolve(true);
      });
      
      this.socket.on('error', (error) => {
        log(`User ${this.username} connection error: ${error.message}`);
        resolve(false);
      });
      
      this.socket.on('close', () => {
        this.connected = false;
        this.authenticated = false;
        log(`User ${this.username} disconnected from server`);
      });
      
      this.socket.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          totalMessages++;
          
          // Process the message
          this.handleMessage(message);
        } catch (error) {
          log(`User ${this.username} error parsing message: ${error.message}`);
        }
      });
    });
  }
  
  /**
   * Set up message handlers
   */
  setupMessageHandlers() {
    // Handle authentication response
    this.messageHandlers.set('auth-response', (data) => {
      if (data.success) {
        this.authenticated = true;
        log(`User ${this.username} authenticated successfully`);
        
        // Send initial position
        this.sendPlayerPosition();
        
        // Request flags in area
        this.requestFlags();
      } else {
        log(`User ${this.username} authentication failed: ${data.message}`);
      }
    });
    
    // Handle flag placement response
    this.messageHandlers.set('flag-placed', (data) => {
      log(`User ${this.username} flag placed successfully: ${data.flag.id}`);
      this.myFlags.add(data.flag.id);
      this.knownFlags.set(data.flag.id, data.flag);
      successfulActions++;
      this.pendingAction = false;
    });
    
    // Handle flag placement failure
    this.messageHandlers.set('flag-placement-failed', (data) => {
      log(`User ${this.username} flag placement failed: ${data.reason}`);
      failedActions++;
      this.pendingAction = false;
    });
    
    // Handle flag removal
    this.messageHandlers.set('flag-removed', (data) => {
      if (this.myFlags.has(data.flagId)) {
        this.myFlags.delete(data.flagId);
      }
      this.knownFlags.delete(data.flagId);
      log(`User ${this.username} received flag removal: ${data.flagId}`);
      this.pendingAction = false;
    });
    
    // Handle teleport response
    this.messageHandlers.set('teleport-success', (data) => {
      this.position = data.position;
      log(`User ${this.username} teleported to [${data.position.lat}, ${data.position.lng}]`);
      successfulActions++;
      this.pendingAction = false;
    });
    
    // Handle teleport failure
    this.messageHandlers.set('teleport-failed', (data) => {
      log(`User ${this.username} teleport failed: ${data.reason}`);
      failedActions++;
      this.pendingAction = false;
    });
    
    // Handle flag hardening response
    this.messageHandlers.set('flag-hardened', (data) => {
      log(`User ${this.username} hardened flag: ${data.flagId}`);
      successfulActions++;
      this.pendingAction = false;
    });
    
    // Handle flag hardening failure
    this.messageHandlers.set('flag-harden-failed', (data) => {
      log(`User ${this.username} flag hardening failed: ${data.reason}`);
      failedActions++;
      this.pendingAction = false;
    });
    
    // Handle flags list
    this.messageHandlers.set('flags-list', (data) => {
      log(`User ${this.username} received ${data.flags.length} flags`);
      data.flags.forEach(flag => {
        this.knownFlags.set(flag.id, flag);
        if (flag.ownerId === this.id) {
          this.myFlags.add(flag.id);
        }
      });
    });
    
    // Handle players list
    this.messageHandlers.set('players-list', (data) => {
      this.nearbyPlayers = new Set();
      data.players.forEach(player => {
        if (player.id !== this.id) {
          this.nearbyPlayers.add(player.id);
        }
      });
      log(`User ${this.username} received ${this.nearbyPlayers.size} nearby players`);
    });
    
    // Handle error message
    this.messageHandlers.set('error', (data) => {
      log(`User ${this.username} received error: ${data.message}`);
      failedActions++;
      this.pendingAction = false;
    });
  }
  
  /**
   * Handle incoming message
   * @param {Object} message - The message object
   */
  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    }
  }
  
  /**
   * Send a message to the server
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  sendMessage(type, data = {}) {
    if (!this.connected) {
      log(`User ${this.username} attempted to send message while disconnected`);
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        data
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      log(`User ${this.username} error sending message: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Authenticate with the server
   */
  authenticate() {
    this.sendMessage('authenticate', {
      playerId: this.id,
      username: this.username
    });
  }
  
  /**
   * Send player position update
   */
  sendPlayerPosition() {
    this.sendMessage('player-move', {
      position: this.position
    });
  }
  
  /**
   * Request flags in the area
   */
  requestFlags() {
    const boundingBox = {
      minLat: this.position.lat - 0.01,
      maxLat: this.position.lat + 0.01,
      minLng: this.position.lng - 0.01,
      maxLng: this.position.lng + 0.01
    };
    
    this.sendMessage('get-flags', {
      boundingBox
    });
  }
  
  /**
   * Request players in the area
   */
  requestPlayers() {
    const boundingBox = {
      minLat: this.position.lat - 0.01,
      maxLat: this.position.lat + 0.01,
      minLng: this.position.lng - 0.01,
      maxLng: this.position.lng + 0.01
    };
    
    this.sendMessage('get-players', {
      boundingBox
    });
    
    totalActions++;
  }
  
  /**
   * Move to a random position
   */
  moveRandomly() {
    if (this.pendingAction) return;
    
    const deltaLat = (Math.random() * 2 - 1) * config.movementRadius;
    const deltaLng = (Math.random() * 2 - 1) * config.movementRadius;
    
    this.position = {
      lat: this.position.lat + deltaLat,
      lng: this.position.lng + deltaLng
    };
    
    this.sendPlayerPosition();
    log(`User ${this.username} moved to [${this.position.lat.toFixed(6)}, ${this.position.lng.toFixed(6)}]`);
    
    totalActions++;
  }
  
  /**
   * Place a flag at current position
   */
  placeFlag() {
    if (this.pendingAction) return;
    
    const flagName = `Flag-${this.username}-${Date.now() % 10000}`;
    
    this.sendMessage('place-flag', {
      position: this.position,
      name: flagName,
      isPublic: Math.random() > 0.5
    });
    
    log(`User ${this.username} attempting to place flag at [${this.position.lat.toFixed(6)}, ${this.position.lng.toFixed(6)}]`);
    
    this.pendingAction = true;
    totalActions++;
  }
  
  /**
   * Teleport to a random known flag
   */
  teleportToRandomFlag() {
    if (this.pendingAction || this.knownFlags.size === 0) return;
    
    // Get a random flag
    const flagIds = Array.from(this.knownFlags.keys());
    const randomFlagId = flagIds[Math.floor(Math.random() * flagIds.length)];
    
    this.sendMessage('teleport-to-flag', {
      flagId: randomFlagId
    });
    
    log(`User ${this.username} attempting to teleport to flag ${randomFlagId}`);
    
    this.pendingAction = true;
    totalActions++;
  }
  
  /**
   * Harden a random owned flag
   */
  hardenRandomFlag() {
    if (this.pendingAction || this.myFlags.size === 0) return;
    
    // Get a random owned flag
    const flagIds = Array.from(this.myFlags);
    const randomFlagId = flagIds[Math.floor(Math.random() * flagIds.length)];
    
    this.sendMessage('harden-flag', {
      flagId: randomFlagId
    });
    
    log(`User ${this.username} attempting to harden flag ${randomFlagId}`);
    
    this.pendingAction = true;
    totalActions++;
  }
  
  /**
   * Perform a random action
   */
  performRandomAction() {
    if (!this.authenticated) return;
    
    const now = Date.now();
    if (now - this.lastActionTime < config.actionDelay.min) return;
    
    const randomValue = Math.random();
    
    if (randomValue < config.flagPlacementChance) {
      this.placeFlag();
    } else if (randomValue < config.flagPlacementChance + config.teleportChance && this.knownFlags.size > 0) {
      this.teleportToRandomFlag();
    } else if (randomValue < config.flagPlacementChance + config.teleportChance + config.hardenChance && this.myFlags.size > 0) {
      this.hardenRandomFlag();
    } else if (randomValue < config.flagPlacementChance + config.teleportChance + config.hardenChance + config.queryPlayersChance) {
      this.requestPlayers();
    } else if (randomValue < config.flagPlacementChance + config.teleportChance + config.hardenChance + config.queryPlayersChance + config.movementChance) {
      this.moveRandomly();
    }
    
    this.lastActionTime = now;
  }
  
  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.connected && this.socket) {
      this.socket.close();
      this.connected = false;
      this.authenticated = false;
    }
  }
}

/**
 * Print test progress
 */
function printProgress() {
  const elapsedTime = (Date.now() - startTime) / 1000;
  const remainingTime = config.testDuration - elapsedTime;
  
  if (remainingTime <= 0) {
    return;
  }
  
  const connectedUsers = users.filter(user => user.connected).length;
  const authenticatedUsers = users.filter(user => user.authenticated).length;
  const totalFlags = new Set([...users.flatMap(user => [...user.knownFlags.keys()])]).size;
  
  log(`=== PROGRESS ===`);
  log(`Elapsed: ${elapsedTime.toFixed(1)}s / ${config.testDuration}s (${(elapsedTime / config.testDuration * 100).toFixed(1)}%)`);
  log(`Connected users: ${connectedUsers}/${config.numberOfUsers}`);
  log(`Authenticated users: ${authenticatedUsers}/${config.numberOfUsers}`);
  log(`Total messages: ${totalMessages}`);
  log(`Total actions: ${totalActions}`);
  log(`Successful actions: ${successfulActions}`);
  log(`Failed actions: ${failedActions}`);
  log(`Success rate: ${(successfulActions / (successfulActions + failedActions) * 100).toFixed(1)}%`);
  log(`Messages per second: ${(totalMessages / elapsedTime).toFixed(1)}`);
  log(`Actions per second: ${(totalActions / elapsedTime).toFixed(1)}`);
  log(`Known flags: ${totalFlags}`);
  log(`================`);
}

/**
 * Print final test report
 */
function printFinalReport() {
  const elapsedTime = (Date.now() - startTime) / 1000;
  const connectedUsers = users.filter(user => user.connected).length;
  const authenticatedUsers = users.filter(user => user.authenticated).length;
  const totalFlags = new Set([...users.flatMap(user => [...user.knownFlags.keys()])]).size;
  
  log(`\n========== STRESS TEST REPORT ==========`);
  log(`Test duration: ${elapsedTime.toFixed(1)} seconds`);
  log(`Number of users: ${config.numberOfUsers}`);
  log(`Connected users at end: ${connectedUsers}`);
  log(`Authenticated users at end: ${authenticatedUsers}`);
  log(`Total messages: ${totalMessages}`);
  log(`Total actions: ${totalActions}`);
  log(`Successful actions: ${successfulActions}`);
  log(`Failed actions: ${failedActions}`);
  log(`Success rate: ${(successfulActions / (successfulActions + failedActions) * 100).toFixed(1)}%`);
  log(`Messages per second: ${(totalMessages / elapsedTime).toFixed(1)}`);
  log(`Actions per second: ${(totalActions / elapsedTime).toFixed(1)}`);
  log(`Total known flags: ${totalFlags}`);
  log(`Flag distribution: ${users.map(user => user.myFlags.size).join(', ')}`);
  log(`========================================\n`);
}

/**
 * Run the stress test
 */
async function runStressTest() {
  log(`Starting stress test with ${config.numberOfUsers} users for ${config.testDuration} seconds`);
  startTime = Date.now();
  
  // Create users
  for (let i = 0; i < config.numberOfUsers; i++) {
    const user = new User(`user_${i}_${uuidv4()}`);
    users.push(user);
  }
  
  // Connect all users
  const connectionPromises = users.map(user => user.connect());
  await Promise.all(connectionPromises);
  
  // Set up progress reporting
  const progressInterval = setInterval(() => {
    printProgress();
  }, 5000);
  
  // Set up random actions for each user
  const actionInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(actionInterval);
      return;
    }
    
    users.forEach(user => {
      if (user.authenticated) {
        // Add some randomness to distribute actions
        if (Math.random() < 0.2) {
          user.performRandomAction();
        }
      }
    });
  }, 100);
  
  // Set up test completion
  setTimeout(() => {
    isRunning = false;
    clearInterval(progressInterval);
    clearInterval(actionInterval);
    
    // Print final report
    printFinalReport();
    
    // Disconnect all users
    users.forEach(user => user.disconnect());
    
    // Close log file
    setTimeout(() => {
      logger.end();
      process.exit(0);
    }, 1000);
  }, config.testDuration * 1000);
}

// Handle exit signals
process.on('SIGINT', () => {
  log('Test interrupted by user');
  isRunning = false;
  users.forEach(user => user.disconnect());
  logger.end();
  process.exit(0);
});

// Start the test
runStressTest().catch(error => {
  log(`Error running stress test: ${error.message}`);
  logger.end();
  process.exit(1);
}); 