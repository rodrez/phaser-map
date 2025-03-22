# Database Migration Plan

This document outlines the plan for migrating the MMO game's data storage from in-memory/Redis to a more persistent PostgreSQL database.

## Current Architecture

Currently, the server uses:
- **In-memory storage**: Primary storage for all game state
- **Redis**: Optional cache for player state persistence

## Target Architecture

The target architecture will use:
- **PostgreSQL**: Primary persistent storage for all game data
- **Redis**: Real-time caching and pub/sub for game events
- **In-memory**: Temporary working storage for active game sessions

## Migration Phases

### Phase 1: Database Schema Setup ✅

- Set up PostgreSQL Docker container
- Create initial database schema (tables, indexes, etc.)
- Initialize basic sample data

### Phase 2: Implement Data Access Layer

- Create repository classes for each entity type
- Implement CRUD operations using the PostgreSQL client
- Add data validation and error handling

### Phase 3: Update Core Systems

Update the following systems to use PostgreSQL for persistence:

1. **PlayerStateSystem**:
   - Store player profiles in `players` and `player_profiles` tables
   - Store player positions in `player_positions` table
   - Use Redis for caching frequently accessed player data

2. **GeospatialAreaSystem**:
   - Store area definitions in `areas` table
   - Use PostGIS for geospatial queries
   - Cache active areas in Redis for performance

3. **FlagSystem**:
   - Store flags in `flags` table
   - Use PostGIS for spatial proximity queries
   - Cache active flags in Redis

4. **MovementSystem**:
   - Continue to use in-memory for real-time movement validation
   - Periodically update player positions in PostgreSQL
   - Use Redis pub/sub for broadcasting position updates

### Phase 4: Implement Authentication and Sessions

- Add JWT-based authentication
- Store sessions in the `sessions` table
- Implement login/logout/registration endpoints

### Phase 5: Testing and Optimization

- Write integration tests for database operations
- Performance testing with simulated player load
- Optimize queries and indexing
- Add connection pooling and retry logic

## Implementation Details

### Repository Pattern

We'll implement a Repository pattern for each entity:

```javascript
// Example PlayerRepository
class PlayerRepository {
  // Create a new player
  async createPlayer(playerData) { ... }
  
  // Get player by ID
  async getPlayerById(playerId) { ... }
  
  // Update player data
  async updatePlayer(playerId, updates) { ... }
  
  // Delete player
  async deletePlayer(playerId) { ... }
  
  // Get players by criteria
  async getPlayersByArea(areaId) { ... }
}
```

### Transactions

Use transactions for operations that affect multiple tables:

```javascript
import { transaction } from '../config/postgres.js';

// Example of a transaction
await transaction(async (client) => {
  // Create player record
  const playerResult = await client.query(
    'INSERT INTO players (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [username, email, passwordHash]
  );
  
  const playerId = playerResult.rows[0].id;
  
  // Create player profile
  await client.query(
    'INSERT INTO player_profiles (player_id, display_name) VALUES ($1, $2)',
    [playerId, displayName]
  );
  
  // Create initial player position
  await client.query(
    'INSERT INTO player_positions (player_id, position, current_area) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)',
    [playerId, startPosition.lng, startPosition.lat, 'starting-area']
  );
  
  return playerId;
});
```

### Caching Strategy

- Use Redis TTL caching for player state (5-minute expiry)
- Use publish/subscribe for real-time updates
- Implement cache invalidation on database writes

## Next Steps

1. Implement the `PlayerRepository` class
2. Update the `PlayerStateSystem` to use PostgreSQL
3. Test the player persistence with the Docker Compose setup
4. Move on to implementing the remaining repositories 