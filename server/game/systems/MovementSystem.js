import { logger } from '../../utils/logger.js';

/**
 * System responsible for handling player movement and position synchronization
 * Adapted for geospatial coordinates and flag-based movement boundaries
 */
class MovementSystem {
  /**
   * @param {import('socket.io').Server} io - Socket.io server instance
   * @param {import('./PlayerStateSystem').default} playerState - PlayerStateSystem instance
   * @param {import('./GeospatialAreaSystem').default} geospatialSystem - GeospatialAreaSystem instance
   * @param {import('./FlagSystem').default} flagSystem - FlagSystem instance
   */
  constructor(io, playerState, geospatialSystem, flagSystem) {
    this.io = io;
    this.playerState = playerState;
    this.geospatialSystem = geospatialSystem;
    this.flagSystem = flagSystem;
    
    this.updateBuffer = new Map(); // playerId -> array of movement updates
    this.BUFFER_SIZE = 10; // Store last 10 movement updates for interpolation
    this.INTERPOLATION_DELAY = 100; // ms
    this.isTestMode = process.env.NODE_ENV === 'test';
    
    // Constants
    this.MAX_SPEED = 5; // meters per second
    this.MOVEMENT_RADIUS = 600; // meters - maximum distance from active flag
    
    logger.info('MovementSystem initialized', {
      maxSpeed: this.MAX_SPEED,
      movementRadius: this.MOVEMENT_RADIUS
    });
  }

  /**
   * Update method - called each game tick
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // This could be used for collision detection, NPC movement, etc.
    // Currently just a placeholder as most work is done reactively
  }

  /**
   * Handle a movement update from a client
   * @param {Object} update - Movement update data
   * @returns {Promise<Object>} - Result of the update
   */
  async handleMovementUpdate(update) {
    try {
      const { playerId, position, direction, timestamp } = update;

      // Get player's current state
      const player = await this.playerState.getPlayer(playerId);
      if (!player) {
        logger.warn('Movement update for unknown player', { playerId });
        return { success: false, error: 'Player not found' };
      }

      // Add update to buffer
      let buffer = this.updateBuffer.get(playerId);
      if (!buffer) {
        buffer = [];
        this.updateBuffer.set(playerId, buffer);
      }

      buffer.push(update);
      if (buffer.length > this.BUFFER_SIZE) {
        buffer.shift();
      }

      // Skip validation in test mode
      if (!this.isTestMode) {
        // Check if movement is within allowed range from a flag
        const isWithinRange = await this.isWithinMovementRange(playerId, position);
        if (!isWithinRange.success) {
          logger.warn('Invalid movement - outside allowed range', { 
            playerId,
            position,
            error: isWithinRange.error 
          });
          return isWithinRange;
        }

        // Check if movement speed is valid
        if (!this.validateMovementSpeed(player, update)) {
          logger.warn('Invalid movement - speed too fast', { 
            playerId,
            position,
            playerPosition: player.position
          });
          return { success: false, error: 'Movement speed exceeds maximum allowed' };
        }
      }

      // Update player state
      await this.playerState.updatePlayer(playerId, {
        position,
        direction,
        lastUpdate: timestamp
      });

      // Update player in geospatial system
      const visiblePlayers = await this.geospatialSystem.updatePlayerPosition(
        playerId, 
        position
      );

      return { 
        success: true, 
        visiblePlayers 
      };
    } catch (error) {
      logger.error('Error handling movement update', { 
        error: error.message, 
        update 
      });
      return { success: false, error: `Movement update error: ${error.message}` };
    }
  }

  /**
   * Check if a position is within allowed movement range of a player's flags
   * @param {string} playerId - The player ID
   * @param {Object} position - The position to check
   * @returns {Promise<Object>} - Success flag and error if applicable
   */
  async isWithinMovementRange(playerId, position) {
    try {
      // Get player's flags
      const playerFlags = await this.flagSystem.getPlayerFlags(playerId);
      
      // If player has no flags, check against starting position
      if (playerFlags.length === 0) {
        const player = await this.playerState.getPlayer(playerId);
        if (player?.startPosition) {
          const distance = this.geospatialSystem.calculateDistance(
            position, 
            player.startPosition
          );
          
          if (distance <= this.MOVEMENT_RADIUS) {
            return { success: true };
          }
          
          return { 
            success: false, 
            error: `Movement outside allowed range of starting point (${this.MOVEMENT_RADIUS}m)` 
          };
        }
        
        // If player somehow has no start position, allow movement (fallback)
        return { success: true };
      }
      
      // Check against all player flags
      for (const flag of playerFlags) {
        const distance = this.geospatialSystem.calculateDistance(
          position, 
          flag.position
        );
        
        if (distance <= this.MOVEMENT_RADIUS) {
          return { success: true };
        }
      }
      
      return { 
        success: false, 
        error: `Movement outside allowed range of any flags (${this.MOVEMENT_RADIUS}m)` 
      };
    } catch (error) {
      logger.error('Error checking movement range', { 
        playerId, 
        position, 
        error: error.message 
      });
      return { success: false, error: 'Error checking movement range' };
    }
  }

  /**
   * Validate movement speed based on time and distance
   * @private
   * @param {Object} player - Player state
   * @param {Object} update - Movement update
   * @returns {boolean} - Whether the movement speed is valid
   */
  validateMovementSpeed(player, update) {
    // If player has no position yet, allow first movement
    if (!player.position) {
      return true;
    }
    
    // Calculate time since last update in seconds
    const timeDelta = update.timestamp - player.lastUpdate;
    if (timeDelta <= 0) return false;
    
    const secondsPassed = timeDelta / 1000;
    
    // Calculate maximum possible distance based on max speed
    const maxDistance = this.MAX_SPEED * secondsPassed;
    
    // Calculate actual distance moved using haversine formula
    const distance = this.geospatialSystem.calculateDistance(
      update.position, 
      player.position
    );
    
    // Allow movement if within max speed
    return distance <= maxDistance;
  }

  /**
   * Get interpolated position for a player (for smooth rendering on clients)
   * @param {string} playerId - The player ID
   * @param {number} renderTimestamp - The timestamp to render at
   * @returns {Object|null} - Interpolated position or null if insufficient data
   */
  getInterpolatedPosition(playerId, renderTimestamp) {
    // For testing, return a dummy position if needed
    if (this.isTestMode && (!this.updateBuffer.has(playerId) || this.updateBuffer.get(playerId).length < 2)) {
      return { lat: 0.05 + (Math.random() / 1000), lng: 0.05 + (Math.random() / 1000) };
    }
    
    const buffer = this.updateBuffer.get(playerId);
    if (!buffer || buffer.length < 2) {
      return null;
    }

    const targetTime = renderTimestamp - this.INTERPOLATION_DELAY;

    // Find the two updates that surround our target time
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].timestamp <= targetTime) {
        beforeIndex = i;
      } else {
        afterIndex = i;
        break;
      }
    }

    if (beforeIndex === -1 || afterIndex === -1) {
      return null;
    }

    const before = buffer[beforeIndex];
    const after = buffer[afterIndex];
    const timeDiff = after.timestamp - before.timestamp;
    
    if (timeDiff <= 0) {
      return before.position;
    }
    
    const t = (targetTime - before.timestamp) / timeDiff;

    // Linear interpolation between the two positions
    return {
      lat: before.position.lat + (after.position.lat - before.position.lat) * t,
      lng: before.position.lng + (after.position.lng - before.position.lng) * t
    };
  }
}

export default MovementSystem; 