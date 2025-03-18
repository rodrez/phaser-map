# Geo-Spatial Hash Grid Implementation

This directory contains the implementation of a geo-spatial hash grid system designed to work with geographic coordinates from Leaflet maps. This system enables efficient spatial queries and entity management in a real-world map-based MMO game.

## Key Components

### 1. `geoSpatialHashGrid.ts`

This file implements a spatial partitioning system using geographic coordinates (latitude/longitude). It:

- Divides the world into grid cells based on latitude and longitude
- Efficiently tracks which entities are in which cells
- Provides fast lookup of nearby entities within a specified radius
- Includes geographic utility functions like Haversine distance calculation and destination point computation

### 2. `mapIntegration.ts`

This file provides integration between the game server and the Leaflet-based map system:

- Initializes and manages the spatial grid with appropriate cell sizes
- Handles game-specific logic for validating positions within map boundaries
- Manages territory control and capture points on the map
- Provides utility functions for working with geographic positions

## Advantages Over Traditional (x,y) Coordinates

1. **Real-world mapping**: Works directly with geographic coordinates, allowing seamless integration with real-world map data from OpenStreetMap and other providers.

2. **Consistent distance calculations**: Uses the Haversine formula to accurately calculate distances between points on the curved surface of the Earth.

3. **Variable grid cell size**: Accounts for the fact that longitude degrees vary in physical distance based on latitude (they get closer together as you move away from the equator).

4. **Seamless integration with Leaflet**: Works with the same coordinate system as the client-side Leaflet map, simplifying client-server communication.

## How It Works

### Cell Size Calculation

Unlike a traditional spatial hash grid where cells are uniform squares, our geo-spatial grid accounts for the Earth's curvature:

- At the equator, 1 degree of latitude ≈ 1 degree of longitude ≈ 111.32 km
- At higher latitudes, 1 degree of longitude becomes shorter

We calculate the appropriate grid cell based on this formula:
```typescript
const latCellSize = cellSizeMeters / 111320;
const lngCellSize = cellSizeMeters / (111320 * Math.cos(toRadians(lat)));
```

### Nearby Entity Queries

When looking for entities near a point:

1. We calculate a bounding box by finding points at the specified radius in four cardinal directions
2. We determine which grid cells this bounding box intersects
3. We collect all entities from these cells
4. We filter entities based on their exact distance from the query point

This approach provides a good balance between performance and accuracy.

## Usage Example

```typescript
// Create a spatial grid with 100-meter cells
const grid = createGeoSpatialHashGrid(100);

// Add entities to the grid
grid.addEntity('player1', 37.7749, -122.4194); // San Francisco
grid.addEntity('player2', 37.7775, -122.4166); // Nearby

// Find entities within 500 meters
const nearbyEntities = grid.getNearbyEntities(37.7749, -122.4194, 500);
```

## Performance Considerations

- The system is optimized for frequent position updates and proximity queries
- Grid cell size can be adjusted based on expected entity density and query radius
- Most operations run in O(1) time for entity lookup and update
- Nearby entity queries scale with the number of entities in the surrounding cells, not the total number of entities

By using this geo-spatial approach, our game can efficiently manage thousands of entities in a real-world map context while providing accurate distance-based gameplay mechanics. 