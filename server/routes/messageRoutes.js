import express from 'express';
import messageController from '../controllers/messageController.js';

const router = express.Router();

/**
 * GET /api/messages/:roomId
 * Get messages for a specific room
 */
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  
  const messages = messageController.getMessagesForRoom(roomId, limit);
  
  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages
  });
});

/**
 * POST /api/messages/:roomId
 * Create a new message in a room
 */
router.post('/:roomId', (req, res) => {
  const { roomId } = req.params;
  const { message, sender } = req.body;
  
  if (!message || !sender) {
    return res.status(400).json({
      success: false,
      error: 'Please provide message and sender'
    });
  }
  
  const newMessage = messageController.storeMessage(roomId, {
    message,
    sender,
    timestamp: new Date().toISOString()
  });
  
  // In a real app, you might emit this via Socket.io here
  
  res.status(201).json({
    success: true,
    data: newMessage
  });
});

/**
 * DELETE /api/messages/:roomId/:messageId
 * Delete a message
 */
router.delete('/:roomId/:messageId', (req, res) => {
  const { roomId, messageId } = req.params;
  
  const success = messageController.deleteMessage(roomId, messageId);
  
  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Message not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

export default router; 