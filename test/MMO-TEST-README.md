# MMO Testing Components

This directory contains tools and utilities for testing the multiplayer functionality of the geospatial flag-based game.

## Overview

The multiplayer testing components include:

- A WebSocket client utility for communicating with the server
- A Flag Service utility for managing flag-related operations
- A modified Game scene that integrates with the MMO functionality
- Test scripts for simulating multiple players and stress testing the system

## Getting Started

To start testing the MMO functionality, follow these steps:

1. Start the Docker containers for PostgreSQL and Redis:
   ```
   docker-compose up -d
   ```

2. Start the backend server:
   ```
   node server/server.js
   ```

3. Start the frontend development server:
   ```
   npm run dev
   ```

4. Alternatively, use the all-in-one startup script:
   ```
   ./start-test-environment.sh
   ```

5. Open your browser to http://localhost:3000 and click the "ENTER MMO MODE" button on the login screen.

## Testing Components

### Manual Testing

For manual testing, open multiple browser windows and enter MMO mode in each. This allows you to test:

- Player visibility across multiple clients
- Flag placement and syncing
- Teleportation between flags
- Flag hardening and removal

See the [mmo-test-instructions.html](./mmo-test-instructions.html) file for detailed testing procedures.

### Stress Testing

For automated stress testing, use the stress test script:

```
./test/run-stress-test.sh
```

The stress test simulates multiple concurrent users interacting with the flag system. You can customize the test with parameters:

```
./test/run-stress-test.sh --num-users=20 --duration=120
```

Available options:
- `--server-url=URL`: WebSocket server URL (default: ws://localhost:8080)
- `--num-users=N`: Number of simulated users (default: 10)
- `--duration=N`: Test duration in seconds (default: 60)
- `--log-file=FILE`: Log file path (default: stress-test-results.log)

## Project Structure

- `src/scenes/MMOGame.js`: Phaser scene that extends the base Game scene with MMO functionality
- `src/utils/WebSocketClient.js`: Client for communicating with the WebSocket server
- `src/utils/FlagService.js`: Service for managing flag operations with the server
- `test/stress-test.js`: Script for stress testing with multiple simulated users
- `test/run-stress-test.sh`: Shell script for running the stress test with configurable parameters
- `test/mmo-test-instructions.html`: Detailed instructions for manual testing
- `start-test-environment.sh`: Script to start all components for testing

## Troubleshooting

### Connection Issues

- Check if the WebSocket server is running on the expected port
- Verify that Redis and PostgreSQL are running and accessible
- Look for connection errors in the browser console
- Check server logs for any connection or authentication issues

### Flag Placement Issues

- Ensure you're placing flags within the allowed radius (600m initially)
- Check server logs for flag placement rejection reasons
- Verify that the database has properly initialized

## Performance Monitoring

During stress tests, the system logs performance metrics including:
- Messages per second
- Actions per second
- Success/failure rates
- Number of connected users
- Number of flags in the system

Review these metrics in the stress test log file to identify performance bottlenecks. 