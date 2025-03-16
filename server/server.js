import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import messageRoutes from './routes/messageRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

// Import controllers
import messageController from './controllers/messageController.js';
import roomController from './controllers/roomController.js';
import leaderboardController from './controllers/leaderboardController.js';

// Load environment variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:8080'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/messages', messageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboards', leaderboardRoutes);

// Basic route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join a room (could be a game session, chat room, etc.)
  socket.on('join-room', async (data) => {
    // Handle both string roomId and object with roomId and password
    let roomId, password;
    
    if (typeof data === 'string') {
      roomId = data;
    } else {
      roomId = data.roomId;
      password = data.password;
    }
    
    // Get room info
    const room = roomController.getRoom(roomId);
    
    // Check if room exists
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }
    
    // Check if room is private and validate password
    if (room.isPrivate) {
      if (!roomController.validateRoomPassword(roomId, password)) {
        socket.emit('room-error', { message: 'Invalid password' });
        return;
      }
    }
    
    // Join the room
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
    
    // Add user to room in our controller
    const result = roomController.addUserToRoom(roomId, socket.id, password);
    
    if (!result.success) {
      socket.emit('room-error', { message: result.message });
      return;
    }
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId: socket.id });
    
    // Send room history to the user
    const messages = messageController.getMessagesForRoom(roomId);
    socket.emit('room-history', messages);
  });
  
  // Handle chat messages
  socket.on('send-message', (data) => {
    const { roomId, message, sender } = data;
    
    // Store the message
    const storedMessage = messageController.storeMessage(roomId, {
      message,
      sender,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast to everyone in the room including sender
    io.to(roomId).emit('receive-message', storedMessage);
  });
  
  // Handle game state updates
  socket.on('update-position', (data) => {
    const { roomId, playerId, position, direction } = data;
    
    // Broadcast player position to others in the room
    socket.to(roomId).emit('player-moved', {
      playerId,
      position,
      direction
    });
  });
  
  // Handle leaderboard updates
  socket.on('update-leaderboard', (data) => {
    const { playerId, playerName, category, score } = data;
    
    // Update the leaderboard
    const result = leaderboardController.updatePlayerScore(
      playerId,
      playerName,
      category,
      score
    );
    
    if (result.success) {
      // Get the updated leaderboard
      const updatedLeaderboard = leaderboardController.getLeaderboard(category);
      
      // Broadcast the updated leaderboard to all connected clients
      io.emit('leaderboard-updated', updatedLeaderboard);
      
      // Send player's rank information back to them
      const playerRank = leaderboardController.getPlayerRank(playerId, category);
      socket.emit('player-rank-updated', playerRank);
    } else {
      // Send error back to the client
      socket.emit('leaderboard-error', { message: result.message });
    }
  });
  
  // Get leaderboard data
  socket.on('get-leaderboard', (category) => {
    const leaderboard = leaderboardController.getLeaderboard(category);
    
    if (leaderboard.error) {
      socket.emit('leaderboard-error', { message: leaderboard.error });
    } else {
      socket.emit('leaderboard-data', leaderboard);
    }
  });
  
  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    roomController.removeUserFromRoom(roomId, socket.id);
    socket.to(roomId).emit('user-left', { userId: socket.id });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find all rooms this user was in and remove them
    roomController.getAllRoomIds().forEach(roomId => {
      if (roomController.removeUserFromRoom(roomId, socket.id)) {
        socket.to(roomId).emit('user-left', { userId: socket.id });
      }
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default server; 