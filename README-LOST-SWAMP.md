# Lost Swamp Dungeon

## Overview
The Lost Swamp is a mysterious dungeon filled with dangerous Lizardfolk creatures and ruled by the powerful Lizardfolk King. This dungeon consists of 4 levels, with the final level containing the boss encounter against the Lizardfolk King.

## Features
- 4 progressively difficult levels
- Unique swamp environment with hazards like quicksand and poison gas
- Special boss encounter with the Lizardfolk King on level 4
- Unique rewards including the legendary "Crown of the Lizard King"

## Accessing the Dungeon
The Lost Swamp entrance appears as a geographic feature on the game map, similar to trees and monsters. When you start the game, the entrance will be placed near your character's starting position.

### How to Enter
1. Launch the game
2. Look for the swamp entrance on the map - it appears as a circular area with a swamp image and green mist
3. Approach the entrance and click on it to enter the dungeon

### Dungeon Progression
- **Level 1**: Introductory level with basic Lizardfolk enemies
- **Level 2**: More challenging with ambushing enemies
- **Level 3**: Advanced level with poisonous enemies and pack tactics
- **Level 4**: Boss level with the Lizardfolk King and his guards

### Boss Fight (Level 4)
The Lizardfolk King is a powerful boss with the following characteristics:
- High health (500 HP)
- Strong attacks (25 damage)
- Poison attacks (50% chance to poison)
- Protected by 4 elite Lizardfolk Guards

### Rewards
Defeating the Lizardfolk King will reward you with:
- Crown of the Lizard King (legendary item)
- Royal Lizard Scale (rare item)
- Significant gold and experience

## Development Notes
The Lost Swamp dungeon is implemented with the following key files:
- `src/dungeons/types/LostSwampDungeon.js` - Main dungeon configuration
- `src/monsters/Lizardfolk.ts` - Lizardfolk enemy implementation
- `src/scenes/DungeonScene.js` - Handles dungeon gameplay and boss fight
- `src/utils/testing/runDungeonTest.js` - Creates the swamp entrance on the map

### Map Integration
The Lost Swamp entrance is fully integrated with the map system:
- It has proper geographic coordinates (latitude/longitude)
- It moves with the map when the player navigates
- It's registered with the environment system like other map features
- It appears with a distinctive visual style to make it easy to spot

### Recent Fixes
The following improvements have been made to ensure the dungeon works correctly:
1. Fixed dungeon creation to properly use the DungeonFactory
2. Added error handling to gracefully handle missing properties
3. Improved the entrance click handler to provide better error messages
4. Added fallback values for critical dungeon properties
5. Enhanced the DungeonScene preload method to handle potential issues

## Troubleshooting
If you encounter any issues with the Lost Swamp dungeon:
1. Check the browser console for error messages
2. Verify that all assets are properly loaded, especially the entrance image at `/assets/dungeons/lost-swamp/entrance.jpeg`
3. Ensure the dungeon configuration is registered correctly
4. If the entrance doesn't appear on the map, try restarting the game
5. If you see an error about missing properties, make sure the dungeon registry is properly initialized

## Future Enhancements
- Add more unique swamp hazards
- Implement special swamp-themed puzzles
- Add more variety to Lizardfolk enemies
- Expand the dungeon with additional levels
- Add multiple entrances to the Lost Swamp in different map locations 