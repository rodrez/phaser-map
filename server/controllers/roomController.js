import db from '../config/database.js';
import { safeJsonParse, toCamelCase, rowsToCamelCase } from '../utils/dbUtils.js';
import crypto from 'crypto';

/**
 * Create a new room
 * @param {string} roomId - The room ID
 * @param {object} roomData - Room metadata
 * @returns {object} - The created room
 */
export const createRoom = (roomId, roomData = {}) => {
  try {
    // Check if room already exists
    const existingRoom = getRoom(roomId);
    if (existingRoom) {
      return existingRoom;
    }
    
    const name = roomData.name || `Room ${roomId}`;
    const createdAt = new Date().toISOString();
    const metadata = roomData.metadata ? JSON.stringify(roomData.metadata) : null;
    const isPrivate = roomData.isPrivate ? 1 : 0;
    
    // Hash password if provided
    let password = null;
    if (roomData.password) {
      // Simple hash for demo purposes - in production use a proper hashing library
      password = crypto.createHash('sha256').update(roomData.password).digest('hex');
    }
    
    // Insert the room into the database
    const stmt = db.prepare(`
      INSERT INTO rooms (id, name, created_at, is_private, password, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(roomId, name, createdAt, isPrivate, password, metadata);
    
    // Return the created room (without password)
    return {
      id: roomId,
      name,
      createdAt,
      isPrivate: Boolean(isPrivate),
      metadata: roomData.metadata
    };
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

/**
 * Get room data
 * @param {string} roomId - The room ID
 * @returns {object|null} - Room data or null if not found
 */
export const getRoom = (roomId) => {
  try {
    // Get room from the database
    const stmt = db.prepare(`
      SELECT id, name, created_at, is_private, metadata
      FROM rooms
      WHERE id = ?
    `);
    
    const room = stmt.get(roomId);
    
    if (!room) {
      return null;
    }
    
    // Convert to camelCase and parse metadata
    const camelRoom = toCamelCase(room);
    camelRoom.metadata = safeJsonParse(camelRoom.metadata);
    camelRoom.isPrivate = Boolean(camelRoom.isPrivate);
    
    return camelRoom;
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
};

/**
 * Validate room password
 * @param {string} roomId - The room ID
 * @param {string} password - The password to validate
 * @returns {boolean} - Whether the password is valid
 */
export const validateRoomPassword = (roomId, password) => {
  try {
    if (!password) return false;
    
    // Get room password from database
    const stmt = db.prepare(`
      SELECT password
      FROM rooms
      WHERE id = ?
    `);
    
    const room = stmt.get(roomId);
    
    if (!room || !room.password) {
      return false;
    }
    
    // Hash the provided password and compare
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    return hashedPassword === room.password;
  } catch (error) {
    console.error('Error validating room password:', error);
    return false;
  }
};

/**
 * Add a user to a room
 * @param {string} roomId - The room ID
 * @param {string} userId - The user ID
 * @param {string} password - The password for private rooms
 * @returns {object} - Result with success status and message
 */
export const addUserToRoom = (roomId, userId, password = null) => {
  try {
    // Ensure room exists
    let room = getRoom(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }
    
    // Check if room is private and validate password
    if (room.isPrivate) {
      if (!validateRoomPassword(roomId, password)) {
        return { success: false, message: 'Invalid password' };
      }
    }
    
    // Check if user is already in the room
    const existingUser = db.prepare(`
      SELECT * FROM room_users
      WHERE room_id = ? AND user_id = ?
    `).get(roomId, userId);
    
    if (existingUser) {
      return { success: true, message: 'User already in room' }; // User already in room
    }
    
    // Add user to room
    const stmt = db.prepare(`
      INSERT INTO room_users (room_id, user_id, joined_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(roomId, userId, new Date().toISOString());
    
    return { success: true, message: 'User added to room' };
  } catch (error) {
    console.error('Error adding user to room:', error);
    return { success: false, message: 'Server error' };
  }
};

/**
 * Remove a user from a room
 * @param {string} roomId - The room ID
 * @param {string} userId - The user ID
 * @returns {boolean} - Success status
 */
export const removeUserFromRoom = (roomId, userId) => {
  try {
    // Remove user from room
    const stmt = db.prepare(`
      DELETE FROM room_users
      WHERE room_id = ? AND user_id = ?
    `);
    
    const result = stmt.run(roomId, userId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error removing user from room:', error);
    return false;
  }
};

/**
 * Get users in a room
 * @param {string} roomId - The room ID
 * @returns {array} - Array of user IDs
 */
export const getUsersInRoom = (roomId) => {
  try {
    // Get users in room
    const stmt = db.prepare(`
      SELECT user_id
      FROM room_users
      WHERE room_id = ?
    `);
    
    const users = stmt.all(roomId);
    return users.map(user => user.user_id);
  } catch (error) {
    console.error('Error getting users in room:', error);
    return [];
  }
};

/**
 * Delete a room
 * @param {string} roomId - The room ID to delete
 * @returns {boolean} - Success status
 */
export const deleteRoom = (roomId) => {
  try {
    // Delete room
    const stmt = db.prepare(`
      DELETE FROM rooms
      WHERE id = ?
    `);
    
    const result = stmt.run(roomId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting room:', error);
    return false;
  }
};

/**
 * Get all room IDs
 * @returns {array} - Array of room IDs
 */
export const getAllRoomIds = () => {
  try {
    // Get all room IDs
    const stmt = db.prepare(`
      SELECT id
      FROM rooms
    `);
    
    const rooms = stmt.all();
    return rooms.map(room => room.id);
  } catch (error) {
    console.error('Error getting all room IDs:', error);
    return [];
  }
};

/**
 * Get all rooms
 * @returns {array} - Array of room objects
 */
export const getAllRooms = () => {
  try {
    // Get all rooms
    const stmt = db.prepare(`
      SELECT id, name, created_at, is_private, metadata
      FROM rooms
    `);
    
    const rooms = stmt.all();
    
    // Convert to camelCase and parse metadata
    return rowsToCamelCase(rooms).map(room => {
      room.metadata = safeJsonParse(room.metadata);
      room.isPrivate = Boolean(room.isPrivate);
      return room;
    });
  } catch (error) {
    console.error('Error getting all rooms:', error);
    return [];
  }
};

// Export as an object for named imports
const roomController = {
  createRoom,
  getRoom,
  addUserToRoom,
  removeUserFromRoom,
  getUsersInRoom,
  deleteRoom,
  getAllRoomIds,
  getAllRooms,
  validateRoomPassword
};

export default roomController; 