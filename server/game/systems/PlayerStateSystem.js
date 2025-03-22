/**
 * PlayerStateSystem.js
 * Manages global player state across the game
 */

import logger from '../../utils/logger.js';
import { useRedis, redisClient } from '../../config/redis.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

class PlayerStateSystem {
  constructor() {
    // In-memory cache of connected players
    this.players = new Map();

    // Tracking which players are in which areas
    this.playerAreas = new Map();

    // Tracking active sessions/connections
    this.activeSessions = new Map();
    
    // Track whether we're in test mode
    this.testMode = process.env.NODE_ENV === 'test';

    logger.info('PlayerStateSystem initialized');
  }

  /**
   * Register a player with the game
   * @param {String} playerId - The player's unique identifier
   * @param {Object} initialState - The player's initial state
   * @returns {Boolean} - Whether registration was successful
   */
  async registerPlayer(playerId, initialState) {
    try {
      // Check if we already have this player registered
      if (this.players.has(playerId)) {
        logger.warn(`Player ${playerId} already registered`);
        return false;
      }

      const { position, profile, sessionId } = initialState;
      
      // Store in memory
      this.players.set(playerId, {
        id: playerId,
        position,
        profile: profile || { displayName: `Player-${playerId}` },
        lastUpdated: Date.now()
      });

      // Track player's area
      if (position?.currentArea) {
        this._addPlayerToArea(playerId, position.currentArea);
      }
      
      // Track session if provided
      if (sessionId) {
        this.activeSessions.set(sessionId, playerId);
      }

      // Store in Redis if available
      if (useRedis && !this.testMode) {
        try {
          const playerData = this.players.get(playerId);
          await redisClient.hSet('players', playerId, JSON.stringify(playerData));
          
          if (position?.currentArea) {
            await redisClient.sAdd(`area:${position.currentArea}:players`, playerId);
          }
        } catch (error) {
          logger.error(`Redis error when registering player ${playerId}: ${error.message}`);
        }
      }
      
      // Store in PostgreSQL
      try {
        // Check if player already exists in the database
        const existingPlayer = await PlayerRepository.getPlayerById(playerId, { includePosition: true });
        
        if (existingPlayer) {
          // Update the player's data
          await PlayerRepository.updatePlayer(playerId, {
            position,
            profile: profile || { displayName: `Player-${playerId}` }
          });
        } else if (initialState.isNewPlayer) {
          // This is a completely new player, create full profile
          await PlayerRepository.createPlayer({
            id: playerId,
            username: initialState.username || `user${playerId.substring(0, 8)}`,
            email: initialState.email || `${playerId}@example.com`,
            passwordHash: initialState.passwordHash || 'placeholder',
            displayName: profile?.displayName || `Player-${playerId}`,
            startPosition: position || { lat: 0, lng: 0 },
            startArea: position?.currentArea || 'starting-area'
          });
        }
      } catch (error) {
        logger.error(`Database error when registering player ${playerId}: ${error.message}`);
      }

      logger.info(`Player ${playerId} registered successfully`);
      return true;
    } catch (error) {
      logger.error(`Error registering player ${playerId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Update a player's state
   * @param {String} playerId - The player's unique identifier
   * @param {Object} updates - The updates to apply
   * @returns {Boolean} - Whether the update was successful
   */
  async updatePlayer(playerId, updates) {
    try {
      if (!this.players.has(playerId)) {
        logger.warn(`Attempted to update non-existent player ${playerId}`);
        return false;
      }

      const player = this.players.get(playerId);
      
      // Handle area changes
      if (updates.position?.currentArea && 
          updates.position.currentArea !== player.position?.currentArea) {
        this._movePlayerToArea(playerId, updates.position.currentArea);
      }

      // Update the player in memory
      this.players.set(playerId, {
        ...player,
        ...updates,
        lastUpdated: Date.now()
      });

      // Update in Redis if available
      if (useRedis && !this.testMode) {
        try {
          const playerData = this.players.get(playerId);
          await redisClient.hSet('players', playerId, JSON.stringify(playerData));
        } catch (error) {
          logger.error(`Redis error when updating player ${playerId}: ${error.message}`);
        }
      }
      
      // Update in PostgreSQL
      try {
        // Only persist certain fields to the database to avoid overhead
        const persistedUpdates = {};
        
        if (updates.position) {
          persistedUpdates.position = updates.position;
        }
        
        if (updates.profile) {
          persistedUpdates.profile = updates.profile;
        }
        
        if (updates.inventory) {
          persistedUpdates.inventory = updates.inventory;
        }
        
        if (Object.keys(persistedUpdates).length > 0) {
          await PlayerRepository.updatePlayer(playerId, persistedUpdates);
        }
      } catch (error) {
        logger.error(`Database error when updating player ${playerId}: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error(`Error updating player ${playerId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Update just a player's position
   * @param {String} playerId - The player's unique identifier
   * @param {Object} position - The new position
   * @returns {Boolean} - Whether the update was successful
   */
  async updatePlayerPosition(playerId, position) {
    try {
      if (!this.players.has(playerId)) {
        logger.warn(`Attempted to update position for non-existent player ${playerId}`);
        return false;
      }

      const player = this.players.get(playerId);
      
      // Handle area changes
      if (position.currentArea && position.currentArea !== player.position?.currentArea) {
        this._movePlayerToArea(playerId, position.currentArea);
      }

      // Update in memory
      player.position = position;
      player.lastUpdated = Date.now();
      this.players.set(playerId, player);

      // Update in Redis if enabled
      if (useRedis && !this.testMode) {
        try {
          await redisClient.hSet('players', playerId, JSON.stringify(player));
        } catch (error) {
          logger.error(`Redis error when updating position for ${playerId}: ${error.message}`);
        }
      }
      
      // Update position in PostgreSQL (handle less frequently for performance)
      try {
        // Only persist positions periodically to avoid database overhead
        // We'll use the player's lastPositionPersist timestamp to throttle updates
        const now = Date.now();
        const lastPersist = player.lastPositionPersist || 0;
        
        // Update DB every 5 seconds or if area changed
        if (now - lastPersist > 5000 || 
            (position.currentArea && position.currentArea !== player.lastPersistedArea)) {
          await PlayerRepository.updatePlayerPosition(playerId, position);
          
          // Update our tracking
          player.lastPositionPersist = now;
          player.lastPersistedArea = position.currentArea;
          this.players.set(playerId, player);
        }
      } catch (error) {
        logger.error(`Database error when updating position for ${playerId}: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error(`Error updating position for ${playerId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a player's state
   * @param {String} playerId - The player's unique identifier
   * @returns {Object|null} - The player's state, or null if not found
   */
  async getPlayer(playerId) {
    try {
      // Check memory cache first
      if (this.players.has(playerId)) {
        return this.players.get(playerId);
      }
      
      // Try to retrieve from database
      try {
        const playerData = await PlayerRepository.getPlayerById(playerId);
        
        if (playerData) {
          // Add to memory cache
          this.players.set(playerId, {
            id: playerId,
            position: playerData.position,
            profile: playerData.profile,
            lastUpdated: Date.now()
          });
          
          // Track player's area
          if (playerData.position?.currentArea) {
            this._addPlayerToArea(playerId, playerData.position.currentArea);
          }
          
          return this.players.get(playerId);
        }
      } catch (error) {
        logger.error(`Database error when retrieving player ${playerId}: ${error.message}`);
      }
      
      // If we're here, try Redis as a fallback
      if (useRedis && !this.testMode) {
        try {
          const playerData = await redisClient.hGet('players', playerId);
          if (playerData) {
            const player = JSON.parse(playerData);
            
            // Add to memory cache
            this.players.set(playerId, player);
            
            // Track player's area if present
            if (player.position?.currentArea) {
              this._addPlayerToArea(playerId, player.position.currentArea);
            }
            
            return player;
          }
        } catch (error) {
          logger.error(`Redis error when getting player ${playerId}: ${error.message}`);
        }
      }

      logger.warn(`Player ${playerId} not found`);
      return null;
    } catch (error) {
      logger.error(`Error getting player ${playerId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get players in a specific area
   * @param {String} areaId - The area identifier
   * @returns {Array} - Array of players in the area
   */
  async getPlayersInArea(areaId) {
    try {
      // Combine in-memory and database results
      const results = [];
      
      // Get players from memory first
      const playerIds = this.playerAreas.get(areaId) || new Set();
      for (const playerId of playerIds) {
        if (this.players.has(playerId)) {
          results.push(this.players.get(playerId));
        }
      }
      
      // Get players from database that we don't have in memory
      try {
        const dbPlayers = await PlayerRepository.getPlayersByArea(areaId);
        
        for (const dbPlayer of dbPlayers) {
          // Only add if not already in results
          if (!results.some(p => p.id === dbPlayer.id)) {
            results.push({
              id: dbPlayer.id,
              position: dbPlayer.position,
              profile: {
                displayName: dbPlayer.displayName,
                level: dbPlayer.level
              },
              fromDatabase: true // Mark as coming from database
            });
          }
        }
      } catch (error) {
        logger.error(`Database error when getting players in area ${areaId}: ${error.message}`);
      }
      
      // If Redis is available, check there as well
      if (useRedis && !this.testMode) {
        try {
          const redisPlayerIds = await redisClient.sMembers(`area:${areaId}:players`);
          
          for (const redisPlayerId of redisPlayerIds) {
            // Skip if we already have this player
            if (results.some(p => p.id === redisPlayerId)) {
              continue;
            }
            
            const playerData = await redisClient.hGet('players', redisPlayerId);
            if (playerData) {
              const player = JSON.parse(playerData);
              results.push(player);
            }
          }
        } catch (error) {
          logger.error(`Redis error when getting players in area ${areaId}: ${error.message}`);
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`Error getting players in area ${areaId}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get players in a geographic bounding box
   * @param {Object} bounds - The bounds { minLat, maxLat, minLng, maxLng }
   * @returns {Array} - Array of players in the bounding box
   */
  async getPlayersInBounds(bounds) {
    try {
      const results = [];
      
      // Get all in-memory players first and filter by bounds
      for (const player of this.players.values()) {
        if (player.position && this._isPositionInBounds(player.position, bounds)) {
          results.push(player);
        }
      }
      
      // Get players from database that match the bounds
      try {
        const dbPlayers = await PlayerRepository.getPlayersInBounds(bounds);
        
        for (const dbPlayer of dbPlayers) {
          // Only add if not already in results
          if (!results.some(p => p.id === dbPlayer.id)) {
            results.push({
              id: dbPlayer.id,
              position: dbPlayer.position,
              profile: {
                displayName: dbPlayer.displayName,
                level: dbPlayer.level
              },
              fromDatabase: true // Mark as coming from database
            });
          }
        }
      } catch (error) {
        logger.error(`Database error when getting players in bounds: ${error.message}`);
      }
      
      return results;
    } catch (error) {
      logger.error(`Error getting players in bounds: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove a player from the system
   * @param {String} playerId - The player's unique identifier
   * @returns {Boolean} - Whether removal was successful
   */
  async removePlayer(playerId) {
    try {
      // Check if player exists
      if (!this.players.has(playerId)) {
        logger.warn(`Attempted to remove non-existent player ${playerId}`);
        return false;
      }

      // Get player area before removal
      const player = this.players.get(playerId);
      const areaId = player.position?.currentArea;

      // Remove player sessions
      for (const [sessionId, pid] of this.activeSessions.entries()) {
        if (pid === playerId) {
          this.activeSessions.delete(sessionId);
        }
      }

      // Remove from in-memory storage
      this.players.delete(playerId);
      
      // Remove from area tracking
      if (areaId) {
        this._removePlayerFromArea(playerId, areaId);
      }

      // Remove from Redis if available
      if (useRedis && !this.testMode) {
        try {
          await redisClient.hDel('players', playerId);
          
          if (areaId) {
            await redisClient.sRem(`area:${areaId}:players`, playerId);
          }
        } catch (error) {
          logger.error(`Redis error when removing player ${playerId}: ${error.message}`);
        }
      }
      
      // We don't remove from PostgreSQL on disconnect
      // That data persists for the next login
      
      logger.info(`Player ${playerId} removed successfully`);
      return true;
    } catch (error) {
      logger.error(`Error removing player ${playerId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get a player ID from a session ID
   * @param {String} sessionId - The session identifier
   * @returns {String|null} - The player ID, or null if not found
   */
  getPlayerIdFromSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }
  
  /**
   * Check if a position is within a bounding box
   * @private
   * @param {Object} position - The position { lat, lng }
   * @param {Object} bounds - The bounds { minLat, maxLat, minLng, maxLng }
   * @returns {Boolean} - Whether the position is in bounds
   */
  _isPositionInBounds(position, bounds) {
    const { lat, lng } = position;
    const { minLat, maxLat, minLng, maxLng } = bounds;
    
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }
  
  /**
   * Add a player to an area
   * @private
   * @param {String} playerId - The player's ID
   * @param {String} areaId - The area's ID 
   */
  _addPlayerToArea(playerId, areaId) {
    if (!this.playerAreas.has(areaId)) {
      this.playerAreas.set(areaId, new Set());
    }
    
    this.playerAreas.get(areaId).add(playerId);
  }
  
  /**
   * Remove a player from an area
   * @private
   * @param {String} playerId - The player's ID
   * @param {String} areaId - The area's ID
   */
  _removePlayerFromArea(playerId, areaId) {
    if (this.playerAreas.has(areaId)) {
      this.playerAreas.get(areaId).delete(playerId);
      
      // Clean up empty areas
      if (this.playerAreas.get(areaId).size === 0) {
        this.playerAreas.delete(areaId);
      }
    }
  }
  
  /**
   * Move a player from one area to another
   * @private
   * @param {String} playerId - The player's ID
   * @param {String} newAreaId - The new area's ID
   */
  _movePlayerToArea(playerId, newAreaId) {
    // Find and remove from old area
    for (const [areaId, players] of this.playerAreas.entries()) {
      if (players.has(playerId)) {
        this._removePlayerFromArea(playerId, areaId);
        break;
      }
    }
    
    // Add to new area
    this._addPlayerToArea(playerId, newAreaId);
    
    // Update Redis if available
    if (useRedis && !this.testMode) {
      try {
        const player = this.players.get(playerId);
        if (player?.position?.currentArea) {
          redisClient.sRem(`area:${player.position.currentArea}:players`, playerId)
            .catch(err => logger.error(`Redis error removing player from area: ${err.message}`));
        }
        
        redisClient.sAdd(`area:${newAreaId}:players`, playerId)
          .catch(err => logger.error(`Redis error adding player to area: ${err.message}`));
      } catch (error) {
        logger.error(`Redis error when moving player ${playerId} to area ${newAreaId}: ${error.message}`);
      }
    }
  }
}

export default new PlayerStateSystem(); 