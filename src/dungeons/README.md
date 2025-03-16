# Dungeon System Architecture

This directory contains the modular dungeon system for the game. The system is designed to be flexible, extensible, and reusable across different types of dungeons.

## Directory Structure

- `core/`: Core components of the dungeon system
  - `DungeonSystem.js`: Main entry point for the dungeon system
  - `DungeonFactory.js`: Factory for creating dungeon instances
  - `DungeonConfig.js`: Configuration system for dungeons
  - `DungeonEventSystem.js`: Handles all dungeon-related events
  - `DungeonPlayerManager.js`: Handles player-related functionality in dungeons
- `types/`: Different dungeon type configurations
  - `ForestDungeon.js`: Configuration for forest dungeons
  - `CaveDungeon.js`: Configuration for cave dungeons
  - `LostSwampDungeon.js`: Configuration for lost swamp dungeons
- `ui/`: UI components for dungeons
  - `DungeonUIManager.js`: Handles all dungeon UI elements
  - `DungeonBackgroundManager.js`: Handles the dungeon background and level image display
- `mechanics/`: Gameplay mechanics for dungeons
  - `DungeonRewardSystem.js`: Handles rewards in dungeons
- `levels/`: Level-specific components (to be implemented)

## System Overview

The dungeon system is built around a configuration-based architecture where each dungeon type is defined by a configuration class that extends the base configuration. The main components are:

1. **DungeonSystem**: The main entry point that coordinates all subsystems.
2. **DungeonFactory**: Creates dungeon instances, rooms, and monsters based on configurations.
3. **DungeonConfig**: Defines the structure and configuration options for different dungeon types.
4. **DungeonEventSystem**: Handles all events and communication between subsystems.
5. **DungeonPlayerManager**: Manages player movement, animations, and interactions.
6. **DungeonUIManager**: Handles UI elements, messages, and popups.
7. **DungeonBackgroundManager**: Manages the black background, level images, and visual effects.
8. **DungeonRewardSystem**: Manages rewards for defeating monsters and completing levels.

## How to Use

The DungeonScene initializes the dungeon system with a specific dungeon type and level:

```javascript
// Initialize the dungeon system
this.dungeonSystem = new DungeonSystem(
  this,                // The scene
  'forest-dungeon',    // The dungeon type ID
  3,                   // The dungeon level
  { /* additional options */ }
);

// Initialize subsystems
this.dungeonSystem.initializeSubsystems();

// Create rooms
const startRoom = this.dungeonSystem.createRoom('forest-clearing', { x: 0, y: 0 });
const bossRoom = this.dungeonSystem.createRoom('boss', { x: 1000, y: 0 });

// Set the current room
this.dungeonSystem.setCurrentRoom(startRoom.id);

// Create monsters
const wolf = this.dungeonSystem.createMonster(100, 100, 'WOLF', false);
const boss = this.dungeonSystem.createMonster(1100, 100, 'BEAR', true);
```

## Dungeon Configuration

Each dungeon type is defined by a configuration class that extends the `BaseDungeonConfig` class. The configuration defines:

- Basic dungeon properties (name, description, difficulty, etc.)
- Visual and audio themes
- Room generation parameters
- Monster configuration
- Treasure and reward configuration
- Special mechanics

Example:

```javascript
export class ForestDungeonConfig extends BaseDungeonConfig {
  constructor(options = {}) {
    const forestOptions = {
      id: 'forest-dungeon',
      name: 'Enchanted Forest',
      description: 'A mystical forest filled with wildlife and ancient magic.',
      // ... other options
    };
    
    super(forestOptions);
    
    // Forest-specific properties
    this.weatherEffects = ['rain', 'fog', 'sunbeam'];
    this.forestDensity = options.forestDensity || 0.7;
  }
  
  // Override methods to provide forest-specific behavior
  getRoomGenerationParams(level) {
    // ... forest-specific room generation
  }
  
  getMonsterConfig(level) {
    // ... forest-specific monster configuration
  }
  
  getWeatherConfig(level) {
    // ... forest-specific weather configuration
  }
}
```

## Available Dungeon Types

The system currently includes the following dungeon types:

1. **Forest Dungeon**: A lush forest with wildlife and natural hazards.
   - Special mechanics: natural healing, wildlife interaction, seasonal changes
   - Monster types: wolves, stags, boars, bears
   - Room types: forest clearings, dense woods, streams, caves, ancient trees

2. **Cave Dungeon**: A dark cave system with crystals and hazards.
   - Special mechanics: darkness, cave-ins, crystal power, echo location
   - Monster types: lizardfolk, ogres, cave bears, dragons
   - Room types: narrow passages, crystal chambers, underground lakes, mineral deposits, lava chambers

3. **Lost Swamp**: A mysterious swamp filled with dangerous creatures.
   - Special mechanics: poison resistance, slow movement, fog of war, quicksand
   - Monster types: lizardfolk, snakes, toads
   - Room types: shallow water, deep water, muddy ground, dry patches, ancient trees
   - Special level: Level 4 with Lizardfolk King boss

## Special Mechanics

The system supports various special mechanics that can be enabled for specific dungeon types:

- **Natural Healing**: Players heal slowly over time in certain areas
- **Darkness**: Limited visibility without light sources
- **Cave-ins**: Random cave-ins that can block paths or cause damage
- **Crystal Power**: Crystals that provide temporary buffs
- **Poison Resistance**: Players need poison resistance in certain areas
- **Slow Movement**: Movement is slowed in certain areas
- **Fog of War**: Limited visibility in foggy areas
- **Quicksand**: Dangerous quicksand traps

## Adding New Dungeon Types

To add a new dungeon type:

1. Create a new file in `src/dungeons/types/` (e.g., `RuinsDungeon.js`)
2. Extend the `BaseDungeonConfig` class with your specific configuration
3. Register the new dungeon type in the registry
4. Add any special mechanics or behaviors specific to that dungeon type

Example:

```javascript
// Create the configuration class
export class RuinsDungeonConfig extends BaseDungeonConfig {
  constructor(options = {}) {
    const ruinsOptions = {
      id: 'ruins-dungeon',
      name: 'Ancient Ruins',
      // ... other options
    };
    
    super(ruinsOptions);
    
    // Ruins-specific properties
    this.trapTypes = ['spike', 'arrow', 'boulder'];
  }
  
  // Override methods as needed
}

// Create and register the configuration
export const ruinsDungeonConfig = new RuinsDungeonConfig();
dungeonConfigRegistry.register(ruinsDungeonConfig);
```

## Event System

The dungeon system uses an event-based architecture for communication between components. Standard events include:

- `monsterDefeated`: Fired when a monster is defeated
- `levelCompleted`: Fired when a level is completed
- `dungeonCompleted`: Fired when the entire dungeon is completed
- `roomCleared`: Fired when a room is cleared of all monsters
- `roomEntered`: Fired when the player enters a room

Custom events can be added as needed for specific dungeon types or mechanics.

## Future Improvements

- Add more dungeon types (ruins, volcano, ice cave, etc.)
- Add support for procedural level generation
- Add support for dungeon-specific quests and objectives
- Add support for dynamic difficulty scaling
- Add support for co-op multiplayer in dungeons 