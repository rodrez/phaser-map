# Map Explorer Game

A real-world map exploration game that combines Phaser 3 and Leaflet to create an interactive experience where players can explore the world, plant flags, and claim territories.

## Features

- **Real-world Map Integration**: Uses Leaflet to display OpenStreetMap data
- **Boundary System**: Players are constrained to a 600-meter boundary circle
- **Character Movement**: Click on the map to move your character within the boundary
- **Flag-Based Travel**: Plant flags to mark territories and travel between them
- **Territory Mechanics**: Each flag creates a 500-meter territory that prevents overlapping flag placement
- **Mobile Responsive**: Designed to work across various devices and screen sizes
- **SVG Graphics**: Uses scalable vector graphics for crisp visuals at any resolution
- **Phaser Integration**: Player character is a Phaser sprite that can interact with the game world

## Game Mechanics

1. **Map Exploration**: The map can be dragged to explore different areas, but the player and boundary circle remain fixed on the screen.
2. **Character Movement**: Click anywhere within the boundary circle to move your character to that location.
3. **Flag Placement**: Click on your character or the "Place Flag" button to place a flag at your current position.
4. **Territory Claiming**: Each flag creates a territory with a 500-meter radius.
5. **Flag Travel**: Clicking on a flag will teleport the player to that location, repositioning the boundary circle.
6. **Recentering**: After traveling to a flag, new empty spots become available for planting additional flags.

## Technical Implementation

The game is built using:

- **Phaser 3**: For game mechanics, UI, and interaction handling
- **Leaflet**: For displaying and interacting with the real-world map
- **SVG Graphics**: For scalable, crisp visuals across all devices

### Key Components

- **MapManager**: Handles the integration between Phaser and Leaflet, managing the map, player position, boundary circle, and flags.
- **Game Scene**: Implements the core game mechanics and UI.
- **Player Sprite**: A Phaser sprite that represents the player and can interact with the game world.
- **Coordinate Conversion**: Converts between map coordinates (latitude/longitude) and screen coordinates (pixels).

### Integration Architecture

The game uses a hybrid approach to combine Phaser and Leaflet:

1. **Leaflet Map Layer**: Provides the real-world map background and handles geographic calculations.
2. **Phaser Game Layer**: Overlays the map and handles game mechanics, UI, and player interactions.
3. **Coordinate Synchronization**: The MapManager converts between geographic coordinates (lat/lng) and screen coordinates (x/y) to keep the layers in sync.
4. **Event Handling**: Player interactions are handled by Phaser, while map interactions are handled by Leaflet.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/map-explorer-game.git
   cd map-explorer-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

To build the game for production:

```
npm run build
```

The built files will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Phaser](https://phaser.io/) - HTML5 game framework
- [Leaflet](https://leafletjs.com/) - JavaScript library for interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
