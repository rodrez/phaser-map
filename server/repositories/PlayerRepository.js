/**

 * PlayerRepository.js
 * Handles database operations for player data
 */

import { pool, transaction } from '../config/postgres.js';
import logger from '../utils/logger.js';
import { redisClient } from '../config/redis.js';
import { useRedis } from '../config/redis.js';

class PlayerRepository {
  /**
   * Create a new player with profile and initial position
   * @param {Object} playerData - Player data including credentials and profile
   * @returns {Promise<string>} - The ID of the created player
   */
  async createPlayer(playerData) {
    const { 
      username, 
      email, 
      passwordHash, 
      displayName = username, 
      startPosition = { lat: 0, lng: 0 },
      startArea = 'starting-area'
    } = playerData;

    try {
      return await transaction(async (client) => {
        // Create player record
        const playerResult = await client.query(
          'INSERT INTO players (username, email, password_hash, last_login) VALUES ($1, $2, $3, NOW()) RETURNING id',
          [username, email, passwordHash]
        );
        
        const playerId = playerResult.rows[0].id;
        
        // Create player profile
        await client.query(
          'INSERT INTO player_profiles (player_id, display_name, experience, level) VALUES ($1, $2, 0, 1)',
          [playerId, displayName]
        );
        
        // Create initial player position
        await client.query(
          'INSERT INTO player_positions (player_id, position, current_area) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)',
          [playerId, startPosition.lng, startPosition.lat, startArea]
        );
        
        // Create initial empty inventory
        await client.query(
          'INSERT INTO player_inventories (player_id, items) VALUES ($1, $2)',
          [playerId, JSON.stringify([])]
        );
        
        logger.info(`Created new player: ${username} (${playerId})`);
        return playerId;
      });
    } catch (error) {
      logger.error(`Error creating player: ${error.message}`);
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'players_username_key') {
          throw new Error('Username already exists');
        }
        if (error.constraint === 'players_email_key') {
          throw new Error('Email already exists');
        }
      }
      throw new Error(`Failed to create player: ${error.message}`);
    }
  }

  /**
   * Get a player by ID with optional profile, position, and inventory data
   * @param {string} playerId - The player's ID
   * @param {Object} options - Options for what related data to include
   * @returns {Promise<Object>} - The player data
   */
  async getPlayerById(playerId, options = { includeProfile: true, includePosition: true, includeInventory: false }) {
    const { includeProfile, includePosition, includeInventory } = options;
    
    // Try to get from Redis cache first
    if (useRedis) {
      try {
        const cachedPlayer = await redisClient.get(`player:${playerId}`);
        if (cachedPlayer) {
          return JSON.parse(cachedPlayer);
        }
      } catch (error) {
        logger.warn(`Redis cache error for player ${playerId}: ${error.message}`);
      }
    }
    
    try {
      // Get base player data
      const playerResult = await pool.query(
        'SELECT id, username, email, created_at, last_login FROM players WHERE id = $1',
        [playerId]
      );
      
      if (playerResult.rows.length === 0) {
        return null;
      }
      
      const player = playerResult.rows[0];
      
      // Get profile data if requested
      if (includeProfile) {
        const profileResult = await pool.query(
          'SELECT display_name, experience, level FROM player_profiles WHERE player_id = $1',
          [playerId]
        );
        if (profileResult.rows.length > 0) {
          player.profile = profileResult.rows[0];
        }
      }
      
      // Get position data if requested
      if (includePosition) {
        const positionResult = await pool.query(
          'SELECT ST_X(position) as lng, ST_Y(position) as lat, current_area FROM player_positions WHERE player_id = $1',
          [playerId]
        );
        if (positionResult.rows.length > 0) {
          player.position = {
            lng: Number.parseFloat(positionResult.rows[0].lng),
            lat: Number.parseFloat(positionResult.rows[0].lat),
            currentArea: positionResult.rows[0].current_area
          };
        }
      }
      
      // Get inventory data if requested
      if (includeInventory) {
        const inventoryResult = await pool.query(
          'SELECT items FROM player_inventories WHERE player_id = $1',
          [playerId]
        );
        if (inventoryResult.rows.length > 0) {
          player.inventory = JSON.parse(inventoryResult.rows[0].items);
        }
      }
      
      // Cache the result in Redis
      if (useRedis) {
        try {
          await redisClient.set(`player:${playerId}`, JSON.stringify(player), {
            EX: 300 // 5 minute expiry
          });
        } catch (error) {
          logger.warn(`Failed to cache player ${playerId} in Redis: ${error.message}`);
        }
      }
      
      return player;
    } catch (error) {
      logger.error(`Error fetching player ${playerId}: ${error.message}`);
      throw new Error(`Failed to fetch player: ${error.message}`);
    }
  }

  /**
   * Update a player's data
   * @param {string} playerId - The player's ID
   * @param {Object} updates - The fields to update
   * @returns {Promise<boolean>} - True if successful
   */
  async updatePlayer(playerId, updates) {
    try {
      const { profile, position, inventory, ...playerFields } = updates;
      
      await transaction(async (client) => {
        // Update basic player fields if provided
        if (Object.keys(playerFields).length > 0) {
          const fields = [];
          const values = [];
          let paramIndex = 1;
          
          for (const [key, value] of Object.entries(playerFields)) {
            fields.push(`${this._snakeCase(key)} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
          
          values.push(playerId);
          
          await client.query(
            `UPDATE players SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            values
          );
        }
        
        // Update profile if provided
        if (profile && Object.keys(profile).length > 0) {
          const fields = [];
          const values = [];
          let paramIndex = 1;
          
          for (const [key, value] of Object.entries(profile)) {
            fields.push(`${this._snakeCase(key)} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
          
          values.push(playerId);
          
          await client.query(
            `UPDATE player_profiles SET ${fields.join(', ')} WHERE player_id = $${paramIndex}`,
            values
          );
        }
        
        // Update position if provided
        if (position) {
          if (position.lat !== undefined && position.lng !== undefined) {
            await client.query(
              'UPDATE player_positions SET position = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE player_id = $3',
              [position.lng, position.lat, playerId]
            );
          }
          
          if (position.currentArea !== undefined) {
            await client.query(
              'UPDATE player_positions SET current_area = $1 WHERE player_id = $2',
              [position.currentArea, playerId]
            );
          }
        }
        
        // Update inventory if provided
        if (inventory) {
          await client.query(
            'UPDATE player_inventories SET items = $1 WHERE player_id = $2',
            [JSON.stringify(inventory), playerId]
          );
        }
      });
      
      // Invalidate Redis cache
      if (useRedis) {
        try {
          await redisClient.del(`player:${playerId}`);
        } catch (error) {
          logger.warn(`Failed to invalidate Redis cache for player ${playerId}: ${error.message}`);
        }
      }
      
      logger.info(`Updated player ${playerId}`);
      return true;
    } catch (error) {
      logger.error(`Error updating player ${playerId}: ${error.message}`);
      throw new Error(`Failed to update player: ${error.message}`);
    }
  }

  /**
   * Update a player's position
   * @param {string} playerId - The player's ID
   * @param {Object} position - The new position { lat, lng, currentArea? }
   * @returns {Promise<boolean>} - True if successful
   */
  async updatePlayerPosition(playerId, position) {
    const { lat, lng, currentArea } = position;
    
    try {
      await pool.query(
        'UPDATE player_positions SET position = ST_SetSRID(ST_MakePoint($1, $2), 4326), current_area = COALESCE($3, current_area) WHERE player_id = $4',
        [lng, lat, currentArea, playerId]
      );
      
      // Invalidate position cache
      if (useRedis) {
        try {
          await redisClient.del(`player:${playerId}`);
          await redisClient.del(`player:position:${playerId}`);
        } catch (error) {
          logger.warn(`Failed to invalidate Redis cache for player position ${playerId}: ${error.message}`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Error updating position for player ${playerId}: ${error.message}`);
      throw new Error(`Failed to update player position: ${error.message}`);
    }
  }

  /**
   * Get the position of a player
   * @param {string} playerId - The player's ID
   * @returns {Promise<Object>} - The player's position { lat, lng, currentArea }
   */
  async getPlayerPosition(playerId) {
    // Try to get from Redis cache first
    if (useRedis) {
      try {
        const cachedPosition = await redisClient.get(`player:position:${playerId}`);
        if (cachedPosition) {
          return JSON.parse(cachedPosition);
        }
      } catch (error) {
        logger.warn(`Redis cache error for player position ${playerId}: ${error.message}`);
      }
    }
    
    try {
      const result = await pool.query(
        'SELECT ST_X(position) as lng, ST_Y(position) as lat, current_area FROM player_positions WHERE player_id = $1',
        [playerId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const position = {
        lng: Number.parseFloat(result.rows[0].lng),
        lat: Number.parseFloat(result.rows[0].lat),
        currentArea: result.rows[0].current_area
      };
      
      // Cache the result in Redis
      if (useRedis) {
        try {
          await redisClient.set(`player:position:${playerId}`, JSON.stringify(position), {
            EX: 60 // 1 minute expiry for position data
          });
        } catch (error) {
          logger.warn(`Failed to cache player position ${playerId} in Redis: ${error.message}`);
        }
      }
      
      return position;
    } catch (error) {
      logger.error(`Error fetching position for player ${playerId}: ${error.message}`);
      throw new Error(`Failed to fetch player position: ${error.message}`);
    }
  }

  /**
   * Get players within a geographic bounding box
   * @param {Object} bounds - Bounding box coordinates { minLat, maxLat, minLng, maxLng }
   * @returns {Promise<Array>} - Array of players with positions
   */
  async getPlayersInBounds(bounds) {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    
    try {
      // Create bounding box polygon
      const bbox = `ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`;
      
      const result = await pool.query(`
        SELECT 
          p.id, 
          p.username, 
          pp.display_name, 
          pp.level,
          ST_X(pos.position) as lng, 
          ST_Y(pos.position) as lat, 
          pos.current_area
        FROM 
          players p
        JOIN 
          player_positions pos ON p.id = pos.player_id
        JOIN 
          player_profiles pp ON p.id = pp.player_id
        WHERE 
          ST_Contains(${bbox}, pos.position)
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        level: row.level,
        position: {
          lng: Number.parseFloat(row.lng),
          lat: Number.parseFloat(row.lat),
          currentArea: row.current_area
        }
      }));
    } catch (error) {
      logger.error(`Error fetching players in bounds: ${error.message}`);
      throw new Error(`Failed to fetch players in bounds: ${error.message}`);
    }
  }

  /**
   * Get players in a specific area
   * @param {string} areaId - The area ID
   * @returns {Promise<Array>} - Array of players in the area
   */
  async getPlayersByArea(areaId) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id, 
          p.username, 
          pp.display_name, 
          pp.level,
          ST_X(pos.position) as lng, 
          ST_Y(pos.position) as lat
        FROM 
          players p
        JOIN 
          player_positions pos ON p.id = pos.player_id
        JOIN 
          player_profiles pp ON p.id = pp.player_id
        WHERE 
          pos.current_area = $1
      `, [areaId]);
      
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        level: row.level,
        position: {
          lng: Number.parseFloat(row.lng),
          lat: Number.parseFloat(row.lat),
          currentArea: areaId
        }
      }));
    } catch (error) {
      logger.error(`Error fetching players in area ${areaId}: ${error.message}`);
      throw new Error(`Failed to fetch players in area: ${error.message}`);
    }
  }

  /**
   * Delete a player and all associated data
   * @param {string} playerId - The player's ID
   * @returns {Promise<boolean>} - True if successful
   */
  async deletePlayer(playerId) {
    try {
      await transaction(async (client) => {
        // The foreign keys should be set up with CASCADE, but we'll delete everything explicitly for clarity
        await client.query('DELETE FROM player_inventories WHERE player_id = $1', [playerId]);
        await client.query('DELETE FROM player_positions WHERE player_id = $1', [playerId]);
        await client.query('DELETE FROM player_profiles WHERE player_id = $1', [playerId]);
        await client.query('DELETE FROM players WHERE id = $1', [playerId]);
      });
      
      // Clean up Redis cache
      if (useRedis) {
        try {
          await redisClient.del(`player:${playerId}`);
          await redisClient.del(`player:position:${playerId}`);
        } catch (error) {
          logger.warn(`Failed to clean up Redis cache for deleted player ${playerId}: ${error.message}`);
        }
      }
      
      logger.info(`Deleted player ${playerId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting player ${playerId}: ${error.message}`);
      throw new Error(`Failed to delete player: ${error.message}`);
    }
  }

  /**
   * Authenticate a player by username and password hash
   * @param {string} username - The player's username
   * @param {string} passwordHash - The hashed password to verify
   * @returns {Promise<Object|null>} - The player data if authentication succeeds, null otherwise
   */
  async authenticatePlayer(username, passwordHash) {
    try {
      const result = await pool.query(
        'SELECT id, username, email FROM players WHERE username = $1 AND password_hash = $2',
        [username, passwordHash]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Update last login time
      await pool.query(
        'UPDATE players SET last_login = NOW() WHERE id = $1',
        [result.rows[0].id]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Authentication error for ${username}: ${error.message}`);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Convert a camelCase string to snake_case for SQL
   * @private
   * @param {string} str - The camelCase string
   * @returns {string} - The snake_case string
   */
  _snakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export default new PlayerRepository(); 