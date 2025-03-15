import express from 'express';
import roomController from '../controllers/roomController.js';

const router = express.Router();

/**
 * GET /api/rooms
 * Get all rooms (in a real app, you'd add pagination)
 */
router.get('/', (req, res) => {
  // Get all rooms
  const rooms = roomController.getAllRooms();
  
  res.status(200).json({
    success: true,
    count: rooms.length,
    data: rooms
  });
});

/**
 * GET /api/rooms/:roomId
 * Get a specific room
 */
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  const room = roomController.getRoom(roomId);
  
  if (!room) {
    return res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: room
  });
});

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', (req, res) => {
  const { roomId, name, isPrivate, password, metadata } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a room ID'
    });
  }
  
  // Validate that private rooms have a password
  if (isPrivate && !password) {
    return res.status(400).json({
      success: false,
      error: 'Private rooms must have a password'
    });
  }
  
  const room = roomController.createRoom(roomId, { name, isPrivate, password, metadata });
  
  res.status(201).json({
    success: true,
    data: room
  });
});

/**
 * POST /api/rooms/:roomId/join
 * Join a room (with password for private rooms)
 */
router.post('/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { userId, password } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a user ID'
    });
  }
  
  const result = roomController.addUserToRoom(roomId, userId, password);
  
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.message
    });
  }
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * GET /api/rooms/:roomId/users
 * Get users in a room
 */
router.get('/:roomId/users', (req, res) => {
  const { roomId } = req.params;
  
  const users = roomController.getUsersInRoom(roomId);
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

/**
 * DELETE /api/rooms/:roomId
 * Delete a room
 */
router.delete('/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  const success = roomController.deleteRoom(roomId);
  
  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

export default router; 