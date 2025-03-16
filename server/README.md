# Game Communication Server

This is a real-time communication server for the Phaser game, providing chat and game state synchronization capabilities.

## Features

- Real-time chat messaging
- Room-based communication
- Player position synchronization
- REST API for messages and rooms
- WebSocket-based real-time updates
- SQLite database for persistent storage
- **Player leaderboards** for tracking achievements and competition

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

## Leaderboard System

The server includes a comprehensive leaderboard system that tracks player achievements across multiple categories:

- Most monsters killed
- Most damage done
- Most healing done
- Most gold collected
- Most experience points
- Most dungeons completed
- Most buoys attacked
- Most flags attacked
- Most players killed
- Most gold spent
- Most gold (current)

### Leaderboard API

The leaderboard system provides both REST API endpoints and Socket.io events for real-time updates.

#### REST API Endpoints

- `GET /api/leaderboards`: Get all leaderboards
- `GET /api/leaderboards/:category`: Get a specific leaderboard
- `GET /api/leaderboards/:category/player/:playerId`: Get a player's rank in a leaderboard
- `POST /api/leaderboards/:category/update`: Update a player's score in a leaderboard
- `DELETE /api/leaderboards/:category/reset`: Reset a leaderboard (admin only)

#### Socket.io Events

**Client to Server:**
- `update-leaderboard`: Update a player's score in a leaderboard
- `get-leaderboard`: Get a specific leaderboard

**Server to Client:**
- `leaderboard-updated`: Emitted when a leaderboard is updated
- `player-rank-updated`: Emitted when a player's rank is updated
- `leaderboard-error`: Emitted when an error occurs
- `leaderboard-data`: Emitted in response to a `get-leaderboard` event

### Testing the Leaderboard System

To test the leaderboard system, run:

```bash
node scripts/run-leaderboard-test.js
```

This will populate the leaderboards with test data and display the results.

For more detailed information about the leaderboard system, see [LEADERBOARD.md](LEADERBOARD.md).

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