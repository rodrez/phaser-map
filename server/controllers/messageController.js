import db from '../config/database.js';
import { rowsToCamelCase } from '../utils/dbUtils.js';

/**
 * Store a new message
 * @param {string} roomId - The room ID
 * @param {object} message - The message object
 * @returns {object} - The stored message with ID
 */
export const storeMessage = (roomId, message) => {
  const id = Date.now().toString();
  const timestamp = message.timestamp || new Date().toISOString();
  
  try {
    // Insert the message into the database
    const stmt = db.prepare(`
      INSERT INTO messages (id, room_id, sender, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, roomId, message.sender, message.message, timestamp);
    
    // Return the stored message
    return {
      id,
      roomId,
      sender: message.sender,
      message: message.message,
      timestamp
    };
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
};

/**
 * Get messages for a room
 * @param {string} roomId - The room ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {array} - Array of messages
 */
export const getMessagesForRoom = (roomId, limit = 50) => {
  try {
    // Get messages from the database
    const stmt = db.prepare(`
      SELECT id, room_id, sender, message, timestamp
      FROM messages
      WHERE room_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const messages = stmt.all(roomId, limit);
    
    // Convert to camelCase and reverse for chronological order
    return rowsToCamelCase(messages).reverse();
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

/**
 * Delete a message
 * @param {string} roomId - The room ID
 * @param {string} messageId - The message ID to delete
 * @returns {boolean} - Success status
 */
export const deleteMessage = (roomId, messageId) => {
  try {
    // Delete the message from the database
    const stmt = db.prepare(`
      DELETE FROM messages
      WHERE id = ? AND room_id = ?
    `);
    
    const result = stmt.run(messageId, roomId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};

// Export as an object for named imports
const messageController = {
  storeMessage,
  getMessagesForRoom,
  deleteMessage
};

export default messageController; 