# Leaderboard System

This document outlines the leaderboard system implementation for the game server.

## Leaderboard Categories

The following leaderboard categories are supported:

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

## Server Implementation

The leaderboard system is implemented with the following components:

### Models

- `models/leaderboardModel.js`: Defines the data structure for leaderboards and provides functions for initializing and saving leaderboard data.

### Controllers

- `controllers/leaderboardController.js`: Handles the business logic for leaderboard operations, including:
  - Getting all leaderboards
  - Getting a specific leaderboard
  - Updating a player's score
  - Getting a player's rank
  - Resetting a leaderboard

### Routes

- `routes/leaderboardRoutes.js`: Defines the API endpoints for leaderboard operations:
  - `GET /api/leaderboards`: Get all leaderboards
  - `GET /api/leaderboards/:category`: Get a specific leaderboard
  - `GET /api/leaderboards/:category/player/:playerId`: Get a player's rank in a leaderboard
  - `POST /api/leaderboards/:category/update`: Update a player's score in a leaderboard
  - `DELETE /api/leaderboards/:category/reset`: Reset a leaderboard (admin only)

### Socket.io Events

The server listens for the following socket.io events:

- `update-leaderboard`: Update a player's score in a leaderboard
- `get-leaderboard`: Get a specific leaderboard

The server emits the following socket.io events:

- `leaderboard-updated`: Emitted when a leaderboard is updated
- `player-rank-updated`: Emitted when a player's rank is updated
- `leaderboard-error`: Emitted when an error occurs
- `leaderboard-data`: Emitted in response to a `get-leaderboard` event

## Client Integration

The client can interact with the leaderboard system using the following methods:

### REST API

- `getAllLeaderboards()`: Get all leaderboards
- `getLeaderboard(category)`: Get a specific leaderboard
- `getPlayerRank(category, playerId)`: Get a player's rank in a leaderboard
- `updateLeaderboardScore(category, playerId, playerName, score)`: Update a player's score in a leaderboard

### Socket.io

- `setupLeaderboardSocketHandlers(socket, callbacks)`: Set up event handlers for leaderboard events
- `requestLeaderboardData(socket, category)`: Request leaderboard data
- `updateLeaderboardViaSocket(socket, playerId, playerName, category, score)`: Update a player's score in a leaderboard

## Utility Functions

The `utils/leaderboardUtils.js` file provides utility functions for working with leaderboard data:

- `formatLeaderboardEntry(entry, rank)`: Format a leaderboard entry for display
- `formatScore(score)`: Format a score based on its type
- `getCategoryDisplayName(category)`: Get the display name for a leaderboard category
- `getCategoryIcon(category)`: Get the appropriate icon for a leaderboard category
- `getRankColor(rank)`: Get the appropriate color for a rank
- `getRankMedal(rank)`: Get the appropriate medal emoji for a rank
- `filterEntriesByPeriod(entries, period)`: Filter leaderboard entries by time period
- `getTopEntries(entries, limit)`: Get the top N entries from a leaderboard

## Data Storage

Leaderboard data is stored in a JSON file at `data/leaderboards.json`. The data structure is as follows:

```json
{
  "categories": {
    "monstersKilled": [
      {
        "playerId": "player1",
        "playerName": "Player 1",
        "score": 100,
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    // Other categories...
  },
  "lastUpdated": "2023-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Updating a Player's Score

```javascript
// Using REST API
updateLeaderboardScore('monstersKilled', 'player1', 'Player 1', 100)
  .then(result => console.log(result))
  .catch(error => console.error(error));

// Using Socket.io
updateLeaderboardViaSocket(socket, 'player1', 'Player 1', 'monstersKilled', 100);
```

### Getting a Leaderboard

```javascript
// Using REST API
getLeaderboard('monstersKilled')
  .then(leaderboard => console.log(leaderboard))
  .catch(error => console.error(error));

// Using Socket.io
requestLeaderboardData(socket, 'monstersKilled');
socket.on('leaderboard-data', leaderboard => console.log(leaderboard));
```

### Getting a Player's Rank

```javascript
// Using REST API
getPlayerRank('monstersKilled', 'player1')
  .then(rank => console.log(rank))
  .catch(error => console.error(error));
```

### Setting Up Socket.io Event Handlers

```javascript
setupLeaderboardSocketHandlers(socket, {
  onLeaderboardUpdated: (data) => {
    console.log('Leaderboard updated:', data);
    // Update UI
  },
  onPlayerRankUpdated: (data) => {
    console.log('Player rank updated:', data);
    // Update UI
  },
  onLeaderboardError: (data) => {
    console.error('Leaderboard error:', data.message);
    // Show error message
  }
});
``` 