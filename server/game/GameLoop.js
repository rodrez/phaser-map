import { logger } from '../utils/logger.js';

/**
 * Game loop responsible for running game systems at a fixed rate
 */
class GameLoop {
  constructor() {
    this.isRunning = false;
    this.lastTickTime = 0;
    this.tickCount = 0;
    this.systems = []; // Will hold game systems
    this.intervalId = null;
    this.TICK_RATE = 20; // Ticks per second
    this.TICK_INTERVAL = 1000 / this.TICK_RATE; // Milliseconds per tick
    
    logger.info('GameLoop initialized', { tickRate: this.TICK_RATE });
  }

  /**
   * Register a system to be updated each tick
   * @param {Object} system - The system to register
   * @returns {GameLoop} - For method chaining
   */
  registerSystem(system) {
    this.systems.push(system);
    logger.info('System registered', { system: system.constructor.name });
    return this;
  }

  /**
   * Start the game loop
   * @returns {GameLoop} - For method chaining
   */
  start() {
    if (this.isRunning) return this;
    
    this.isRunning = true;
    this.lastTickTime = Date.now();
    this.tickCount = 0;
    
    logger.info('GameLoop started');
    
    // Start the loop with setInterval for simplicity
    this.intervalId = setInterval(() => this.tick(), this.TICK_INTERVAL);
    
    return this;
  }

  /**
   * Stop the game loop
   * @returns {GameLoop} - For method chaining
   */
  stop() {
    if (!this.isRunning) return this;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    logger.info('GameLoop stopped');
    
    return this;
  }

  /**
   * Process a single tick
   * @private
   */
  tick() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTickTime) / 1000; // Convert to seconds
    
    // Update each system
    for (const system of this.systems) {
      try {
        if (typeof system.update === 'function') {
          system.update(deltaTime);
        }
      } catch (error) {
        logger.error('Error in system update', { 
          system: system.constructor.name,
          error: error.message
        });
      }
    }
    
    this.lastTickTime = currentTime;
    this.tickCount++;
    
    // Log stats every 5 seconds
    if (this.tickCount % (this.TICK_RATE * 5) === 0) {
      logger.debug('GameLoop stats', { 
        tickCount: this.tickCount,
        uptime: Math.floor(this.tickCount / this.TICK_RATE)
      });
    }
  }
}

export default GameLoop; 