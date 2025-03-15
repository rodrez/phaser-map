# Game Communication Server

This is a real-time communication server for the Phaser game, providing chat and game state synchronization capabilities.

## Features

- Real-time chat messaging
- Room-based communication
- Player position synchronization
- REST API for messages and rooms
- WebSocket-based real-time updates
- SQLite database for persistent storage

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- pnpm (or npm/yarn)

### Installation

The server dependencies are already included in the main package.json. If you haven't installed them yet, run:

```bash
pnpm install
```

### Running the Server

To start the server:

```bash
pnpm server
```

The server will start on port 3000 by default (or the port specified in your .env file).

## Database Management

The server uses SQLite for persistent storage. The database file is stored in `server/data/game.db` by default.

### Database Commands

The following commands are available for database management:

```bash
# Reset the database (delete all data and recreate tables)
pnpm db:reset

# Seed the database with sample data
pnpm db:seed

# Backup the database
pnpm db:backup

# List available backups and show restore instructions
pnpm db:restore

# Show database statistics
pnpm db:stats
```

## API Endpoints

### Messages

- `GET /api/messages/:roomId` - Get messages for a specific room
- `POST /api/messages/:roomId` - Create a new message in a room
- `DELETE /api/messages/:roomId/:messageId` - Delete a message

### Rooms

- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:roomId` - Get a specific room
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId/users` - Get users in a room
- `DELETE /api/rooms/:roomId` - Delete a room

## WebSocket Events

### Client to Server

- `join-room` - Join a specific room
- `leave-room` - Leave the current room
- `send-message` - Send a message to the current room
- `update-position` - Update player position

### Server to Client

- `user-joined` - A new user joined the room
- `user-left` - A user left the room
- `receive-message` - New message received
- `player-moved` - Player position updated
- `room-history` - History of messages in a room

## Client Integration

See the `client-integration.js` file for an example of how to integrate the server with your Phaser game client.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DB_PATH=server/data/game.db
```

## Database Schema

The server uses the following database schema:

### Rooms Table

```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata TEXT
)
```

### Messages Table

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
)
```

### Room Users Table

```sql
CREATE TABLE room_users (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
)
```

## Production Considerations

For a production environment, consider:

1. Adding authentication
2. Using a more robust database (PostgreSQL, MySQL)
3. Implementing rate limiting
4. Setting up HTTPS
5. Adding proper error handling and logging 