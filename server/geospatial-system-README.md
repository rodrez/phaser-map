# Geospatial System for MMO Game

This document outlines the geospatial system implementation for our MMO game. The system replaces the traditional zone-based approach with a more flexible geospatial system supporting real-world coordinates.

## System Components

### 1. GeospatialAreaSystem

The GeospatialAreaSystem manages the game world's geographic regions and handles player proximity calculations.

Key features:
- Area registration and management with bounding boxes
- Efficient player proximity detection
- Geographic distance calculations using the Haversine formula
- Area queries (point containment, bounding box intersection)

### 2. FlagSystem

The FlagSystem implements the territory control mechanics using player-placed flags.

Key features:
- Flag placement with ownership
- Territory control mechanics
- Movement range enforcement based on flags
- Spatial queries for flags

### 3. MovementSystem 

The MovementSystem handles player movement validation and synchronization based on the geospatial design.

Key features:
- Geospatial movement validation
- Speed-based anti-cheat
- Flag-based movement boundaries
- Position interpolation for smooth client rendering

### 4. PlayerStateSystem

The PlayerStateSystem tracks and persists player state, adapted for geospatial coordinates.

Key features:
- Redis-backed persistence with in-memory fallback
- Geospatial position tracking
- Area-based player queries

## Gameplay Mechanics

### Flag-Based Movement

Players can only move within a certain range (default 600m) of:
1. Their starting position (for new players without flags)
2. Any flag they own

This creates strategic territory control, where players must establish flags to expand their movement range.

### Area-Based Interactions

The world is divided into different areas with special properties:
- Safe zones for new players
- Cities with NPCs and services
- Wilderness areas with resources to claim
- Contested territories for PvP

## Technical Details

### Coordinate System

The system uses geospatial coordinates:
- Latitude/longitude for positions
- Distances calculated using the Haversine formula
- Bounding boxes for area definitions

### Spatial Optimization

For performance optimization:
- The world is divided into a grid for spatial indexing
- Players and flags are assigned to grid cells
- Queries use grid cells to limit the search space

### WebSocket Communication

The server uses Socket.io to:
- Broadcast position updates to nearby players only
- Notify about flag placements and removals
- Send area data based on player's viewport

## Testing

A comprehensive test suite in `tests/test-geospatial.js` verifies:
- Player movement within/beyond flag range
- Flag placement mechanics
- Area-based queries
- Proximity calculations

## Future Enhancements

Planned enhancements include:
- Flag capture/contest mechanics
- Time-based flag decay
- Resource nodes tied to geographic positions
- Weather and time-of-day effects on areas
- Dynamic map discovery 