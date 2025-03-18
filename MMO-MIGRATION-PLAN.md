# MMO Migration Plan: Refactoring for Scalable Multiplayer

## Overview

This document outlines the plan to migrate our current game into a scalable MMO RPG capable of supporting 1,000+ concurrent players. We'll approach this incrementally, starting with supporting 5-10 players for alpha testing, then scaling up as we progress.

## Goals

1. Refactor the codebase to TypeScript for better type safety and maintainability
2. Implement a scalable server architecture that can grow with our player base
3. Create a proper separation between client and server code
4. Establish efficient networking protocols for real-time gameplay
5. Design database models that support persistence and can scale horizontally
6. Build a foundation that allows for continuous development and iteration

## Technology Stack

- **Language**: TypeScript
- **Client Framework**: Phaser (existing)
- **Server Runtime**: Node.js
- **API Framework**: Fastify (replacing Express for better performance)
- **Real-time Communication**: WebSocket API or ws (replacing Socket.IO for better performance)
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Caching Layer**: Redis for real-time data and session management
- **Build System**: Vite (existing)
- **Containerization**: Docker
- **Orchestration**: Kubernetes (future)

### Socket.IO Alternatives

Socket.IO provides convenient abstractions but can introduce overhead that impacts performance at scale. For our MMO, we'll consider the following alternatives:

1. **Raw WebSockets**: Using the native WebSocket API on the client and the 'ws' library on the server provides optimal performance with minimal overhead.

2. **uWebSockets.js**: A highly optimized WebSocket library that can handle more concurrent connections with lower latency.

3. **Colyseus**: A game-focused WebSocket framework with built-in room management and state synchronization.

Performance comparison:
- **Socket.IO**: Good developer experience, but higher overhead due to fallbacks and additional features
- **Raw WebSockets**: Excellent performance, minimal overhead, but requires more manual implementation
- **uWebSockets.js**: Superior performance for high-concurrency scenarios, but slightly more complex API
- **Colyseus**: Game-oriented abstractions with reasonable performance, easier to implement game-specific features

Our approach will be to implement the core networking layer using raw WebSockets with the 'ws' library, which provides the best balance of performance and simplicity for our needs.

## Project Structure

```
/
├── client/                  # Client-side code
│   ├── src/
│   │   ├── assets/          # Game assets (sprites, audio, etc.)
│   │   ├── components/      # Game components (UI, entities, etc.)
│   │   ├── core/            # Core game logic
│   │   ├── network/         # Network communication
│   │   ├── scenes/          # Phaser scenes
│   │   ├── state/           # Game state management
│   │   ├── utils/           # Utility functions
│   │   └── main.ts          # Entry point
│   └── index.html           # HTML entry point
│
├── server/                  # Server-side code
│   ├── src/
│   │   ├── api/             # API endpoints
│   │   ├── auth/            # Authentication logic
│   │   ├── config/          # Server configuration
│   │   ├── database/        # Database models and connections
│   │   ├── game/            # Game logic
│   │   │   ├── entities/    # Game entities
│   │   │   ├── systems/     # Game systems (movement, combat, etc.)
│   │   │   ├── world/       # World management
│   │   │   └── loop.ts      # Game loop
│   │   ├── network/         # Network communication
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Entry point
│   └── tsconfig.json        # TypeScript configuration
│
├── shared/                  # Shared code between client and server
│   ├── src/
│   │   ├── constants/       # Shared constants
│   │   ├── models/          # Shared data models
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Shared utility functions
│   └── tsconfig.json        # TypeScript configuration
│
├── tools/                   # Development and build tools
│   ├── scripts/             # Utility scripts
│   ├── config/              # Tool configuration
│   └── templates/           # Code templates
│
├── package.json             # Project dependencies and scripts
├── tsconfig.json            # Root TypeScript configuration
├── docker-compose.yml       # Development environment setup
└── README.md                # Project documentation
```

## Migration Phases

### Phase 1: Technology Stack Modernization (2-3 weeks)

1. **Setup Project Structure**
   - Create monorepo setup with client, server, and shared packages
   - Configure TypeScript for each package
   - Set up build processes

2. **Convert Codebase to TypeScript**
   - Start with shared types and interfaces
   - Progressively convert client-side files
   - Create server-side structure with TypeScript

3. **Update Dependencies**
   - Update Phaser and Socket.IO to latest versions
   - Add necessary dependencies for TypeScript/Node.js

### Phase 2: Server-Side Architecture (3-4 weeks)

1. **Implement Core Server Infrastructure**
   - Create server entry point with proper error handling
   - Set up authentication system
   - Implement API endpoints for game data

2. **Develop Game State Management**
   - Create a robust game loop
   - Implement entity management system
   - Develop spatial partitioning for efficient entity lookups

3. **Build Networking Layer**
   - Implement Socket.IO server with proper room management
   - Create message handlers for game events
   - Develop efficient state synchronization protocols

4. **Create Persistence Layer**
   - Design database schemas for player data
   - Implement data access layer with proper abstractions
   - Set up caching mechanisms for frequently accessed data

### Phase 3: Client-Side Refactoring (2-3 weeks)

1. **Network Integration**
   - Implement client-side Socket.IO integration
   - Create message handlers for server events
   - Develop reconnection and error handling logic

2. **Game State Management**
   - Implement client-side state store
   - Add client-side prediction for responsive gameplay
   - Create interpolation system for smooth rendering

3. **UI Enhancements**
   - Add multiplayer-specific UI elements
   - Implement chat system
   - Create player interaction interfaces

### Phase 4: Integration and Testing (2-3 weeks)

1. **End-to-End Testing**
   - Test client-server communication
   - Verify game state synchronization
   - Test authentication flow

2. **Performance Optimization**
   - Profile server performance
   - Optimize network message size and frequency
   - Improve client-side rendering performance

3. **Deployment Infrastructure**
   - Set up Docker containers for development and production
   - Create deployment scripts for server
   - Configure environment-specific settings

### Phase 5: Alpha Preparation (1-2 weeks)

1. **Alpha Environment Setup**
   - Configure production-like environment for alpha testing
   - Set up monitoring and logging
   - Prepare database for alpha testers

2. **Testing and Debugging**
   - Conduct internal playtests
   - Fix critical bugs
   - Optimize for initial small-scale multiplayer

3. **Documentation and Onboarding**
   - Create documentation for alpha testers
   - Prepare feedback collection mechanisms
   - Set up support channels

## Technical Approach Details

### Entity Component System (ECS)

We'll implement a hybrid approach using ECS principles:

```typescript
// Entity: Just an ID
type Entity = string;

// Component: Pure data
interface PositionComponent {
  x: number;
  y: number;
}

interface HealthComponent {
  current: number;
  max: number;
}

// System: Logic that operates on components
function movementSystem(entities, deltaTime) {
  // Update positions based on velocity
}

function combatSystem(entities, deltaTime) {
  // Handle combat calculations
}
```

### Network Protocol

We'll use a message-based protocol with Socket.IO:

```typescript
// Message types
enum MessageType {
  PLAYER_MOVEMENT = 'player_movement',
  PLAYER_ACTION = 'player_action',
  WORLD_STATE = 'world_state',
  CHAT_MESSAGE = 'chat_message',
}

// Message format
interface NetworkMessage<T> {
  type: MessageType;
  data: T;
  timestamp: number;
}

// Example message
interface PlayerMovementMessage {
  playerId: string;
  position: { x: number, y: number };
  velocity: { x: number, y: number };
  sequence: number; // For client-side prediction
}
```

### World Chunking

We'll divide the world into chunks to optimize network traffic:

```typescript
const CHUNK_SIZE = 500; // Size in world units

function getChunkId(x: number, y: number): string {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);
  return `${chunkX}:${chunkY}`;
}

function getAdjacentChunks(chunkId: string): string[] {
  const [x, y] = chunkId.split(':').map(Number);
  const adjacent = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      adjacent.push(`${x + dx}:${y + dy}`);
    }
  }
  
  return adjacent;
}
```

### Database Schema

Basic player schema:

```typescript
interface PlayerDocument {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  created: Date;
  lastLogin: Date;
  
  // Game data
  position: { x: number, y: number };
  stats: {
    health: number;
    mana: number;
    level: number;
    experience: number;
    // Other stats
  };
  inventory: Array<{
    itemId: string;
    quantity: number;
    // Other item properties
  }>;
  equipment: Record<string, string>; // Slot -> itemId
  skills: Record<string, number>; // Skill -> level
}
```

## Coding Standards

1. **TypeScript Best Practices**
   - Use strict mode
   - Define interfaces and types for all data structures
   - Use enums for constants and type unions
   - Leverage TypeScript's advanced types when appropriate

2. **Code Organization**
   - Follow the single responsibility principle
   - Use a consistent module pattern
   - Comment complex logic and algorithms
   - Write unit tests for critical systems

3. **Performance Considerations**
   - Minimize object creation in hot paths
   - Use efficient data structures
   - Profile and optimize critical code paths
   - Consider memory usage, especially for mobile clients

## Rollout Strategy

1. **Internal Testing** - Team members only
2. **Closed Alpha** - 5-10 invited players
3. **Open Alpha** - Up to 50 players
4. **Closed Beta** - Up to 200 players
5. **Open Beta** - Up to 500 players
6. **Limited Launch** - Up to 1,000 players
7. **Full Launch** - Unlimited

## Success Metrics

1. **Technical Metrics**
   - Server response time < 100ms
   - Client frame rate > 30 FPS on target devices
   - Network bandwidth < 20KB/s per client
   - Server CPU usage < 70%

2. **Player Experience Metrics**
   - Session length > 30 minutes
   - Daily active users > 50% of registered users
   - Crash-free sessions > 95%
   - Player retention after 7 days > 40%

## Conclusion

This migration plan provides a roadmap for transforming our current game into a scalable MMO RPG. By following these steps and adhering to the technical approaches outlined, we can build a solid foundation that will support both our immediate needs for alpha testing and our long-term goals of supporting 1,000+ concurrent players.

The plan is flexible and can be adjusted as we progress through each phase, allowing us to adapt to challenges and opportunities that arise during development. 