# Working with Dual Coordinate Systems

Our game uses two different coordinate systems for different parts of the game world:

1. **Geographic Coordinates** (lat/lng) for the overworld map
2. **Cartesian Coordinates** (x,y) for dungeons and instanced areas

This document explains how these systems work together and how to properly handle transitions between them.

## Geographic Coordinates (Overworld)

The overworld uses real-world geographic coordinates based on the Leaflet map:

- **Latitude**: Ranges roughly from -90° to 90° (north-south position)
- **Longitude**: Ranges from -180° to 180° (east-west position)

### Key Characteristics

- **Non-uniform grid**: The physical distance represented by a degree of longitude varies based on latitude (narrower at poles, wider at equator)
- **Curved space**: Distance calculations require the Haversine formula to account for Earth's curvature
- **Real-world mapping**: Coordinates directly correspond to real locations on Earth

### Example Usage

```typescript
// Position in San Francisco
const position = { lat: 37.7749, lng: -122.4194 };

// Update player position
worldManager.updatePlayerPosition(playerId, position);

// Get distance in meters between two points
const distance = worldManager.overworldMap.calculateDistance(
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7833, lng: -122.4167 }
);
```

## Cartesian Coordinates (Dungeons)

Dungeons and instanced areas use a traditional 2D Cartesian coordinate system:

- **X-axis**: Horizontal position (increases to the right)
- **Y-axis**: Vertical position (increases downward, following screen coordinates)

### Key Characteristics

- **Uniform grid**: Distance is consistent throughout the coordinate space
- **Flat space**: Simple Euclidean distance calculations (√(dx² + dy²))
- **Bounded**: Each dungeon has finite boundaries (e.g., 0 ≤ x < 2000, 0 ≤ y < 2000)
- **Optimized for game mechanics**: Better suited for pathfinding, collision detection, and other game-specific features

### Example Usage

```typescript
// Position in a dungeon
const position = { x: 500, y: 320 };

// Update player position in dungeon
worldManager.updatePlayerPosition(playerId, position);

// Get nearby enemies in a dungeon
const dungeonId = 'ancient-ruins-1';
const dungeon = worldManager.getDungeonInstance(dungeonId);
const nearbyEntities = dungeon.grid.getNearbyEntities(500, 320, 100);
```

## World Transitions

The `WorldManager` handles transitions between these coordinate systems:

### Entering a Dungeon

When a player enters a dungeon, several things happen:

1. The player is removed from the geographic grid
2. A dungeon instance is created or joined
3. The player is added to the Cartesian grid at the dungeon's entry point
4. A world transition message is sent to the client to switch rendering modes

```typescript
// When player is near a dungeon entrance (automatically detected)
worldManager.enterDungeon(playerId, dungeonId);
```

### Exiting a Dungeon

When a player exits a dungeon:

1. The player is removed from the Cartesian grid
2. The player is added back to the geographic grid near the dungeon entrance
3. A world transition message is sent to the client to switch back to map rendering

```typescript
// When player reaches an exit point (or uses a menu option)
worldManager.exitDungeon(playerId);
```

## Client-Side Considerations

The client needs to handle both coordinate systems and switch between them when transitioning:

### Overworld Rendering

- Use Leaflet for map rendering
- Position player markers using latitude/longitude
- Handle zoom levels and map panning

### Dungeon Rendering

- Use Phaser for classic 2D rendering
- Position sprites using x/y coordinates
- Set camera bounds to the dungeon dimensions

### Transition Handling

The client receives a world transition message with:

```json
{
  "type": "entity_update",
  "data": {
    "type": "world_transition",
    "worldType": "dungeon", // or "overworld"
    "dungeonId": "ancient-ruins-1",
    "position": { "x": 500, "y": 320 } // or { "lat": 37.7749, "lng": -122.4194 }
  }
}
```

Upon receiving this message, the client should:

1. Switch the active scene/renderer
2. Position the player at the provided coordinates
3. Update the UI to reflect the current world type

## Best Practices

1. **Always check world type before updating positions**:
   ```typescript
   if (player.location.worldType === WorldType.OVERWORLD) {
     // Use lat/lng
   } else {
     // Use x/y
   }
   ```

2. **Handle type safety with TypeScript**:
   ```typescript
   function isGeoCoordinates(pos: any): pos is GeoCoordinates {
     return 'lat' in pos && 'lng' in pos;
   }
   
   function isVector2(pos: any): pos is Vector2 {
     return 'x' in pos && 'y' in pos;
   }
   ```

3. **Keep coordinate systems isolated**:
   Never mix or convert between systems except during world transitions.

4. **Use appropriate distance calculations**:
   - Haversine formula for overworld
   - Euclidean distance for dungeons

5. **Set appropriate grid cell sizes**:
   - Larger cells (500m+) for overworld to reduce computational overhead
   - Smaller cells (50px) for dungeons for more precise spatial queries

## Performance Considerations

- Both spatial hash systems are optimized for frequent position updates and proximity queries
- The geographic system is more computationally expensive due to trigonometric calculations
- Consider implementing client-side prediction for both systems to reduce perceived lag
- Batch position updates when possible to reduce server load 