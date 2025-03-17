/**
 * Run dungeon tests from the Game scene
 */

import { testLostSwampDungeon } from './DungeonTester';
import { logger, LogCategory } from '../Logger';
import { dungeonConfigRegistry } from '../../dungeons/core/DungeonConfig';
import { DungeonFactory } from '../../dungeons/core/DungeonFactory';

/**
 * Run tests for the Lost Swamp dungeon
 * @param {Phaser.Scene} scene - The current scene (Game scene)
 */
export function runLostSwampTest(scene) {
  logger.info(LogCategory.DUNGEON, 'Running Lost Swamp dungeon test');
  
  // Test each level of the Lost Swamp dungeon
  for (let level = 1; level <= 4; level++) {
    const dungeon = testLostSwampDungeon(scene, level);
    
    if (dungeon) {
      logger.info(LogCategory.DUNGEON, `Lost Swamp level ${level} test successful`);
      
      // For level 4, verify the Lizardfolk King configuration
      if (level === 4) {
        if (dungeon.isSpecialLevel && dungeon.specialLevelConfig) {
          logger.info(LogCategory.DUNGEON, 'Lizardfolk King configuration verified');
        } else {
          logger.error(LogCategory.DUNGEON, 'Lizardfolk King configuration missing!');
        }
      }
    } else {
      logger.error(LogCategory.DUNGEON, `Lost Swamp level ${level} test failed`);
    }
  }
  
  logger.info(LogCategory.DUNGEON, 'Lost Swamp dungeon test completed');
}

/**
 * Create a Lost Swamp dungeon entrance on the map
 * @param {Phaser.Scene} scene - The current scene (Game scene)
 * @param {Object} mapManager - The map manager instance
 * @param {number} lat - Latitude for the entrance
 * @param {number} lng - Longitude for the entrance
 * @returns {Phaser.GameObjects.Container} The created entrance container
 */
export function createLostSwampEntrance(scene, mapManager, lat, lng) {
  logger.info(LogCategory.DUNGEON, `=== TESTING: Creating Lost Swamp entrance at coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)} ===`);
  logger.info(LogCategory.DUNGEON, `Scene: ${scene ? 'valid' : 'null'}, MapManager: ${mapManager ? 'valid' : 'null'}`);
  
  try {
    // Convert lat/lng to pixel coordinates
    logger.info(LogCategory.DUNGEON, 'Converting lat/lng to pixel coordinates');
    const pixelPos = mapManager.latLngToPixel(lat, lng);
    if (!pixelPos) {
      logger.error(LogCategory.DUNGEON, `Failed to convert coordinates to pixels: ${lat}, ${lng}`);
      return null;
    }
    
    logger.info(LogCategory.DUNGEON, `Converted to pixel coordinates: x=${pixelPos.x}, y=${pixelPos.y}`);
    
    // Define the circle size
    const circleRadius = 60;
    logger.info(LogCategory.DUNGEON, `Using circle radius: ${circleRadius}px`);
    
    // Add a circular background first
    logger.info(LogCategory.DUNGEON, 'Creating circular background');
    const circle = scene.add.graphics();
    circle.fillStyle(0x004400, 0.6); // Dark green semi-transparent
    circle.fillCircle(pixelPos.x, pixelPos.y, circleRadius);
    circle.setDepth(9);
    
    // Create a mask to ensure the image stays within the circle
    logger.info(LogCategory.DUNGEON, 'Creating mask for entrance sprite');
    const mask = scene.add.graphics();
    mask.fillStyle(0xffffff);
    mask.fillCircle(pixelPos.x, pixelPos.y, circleRadius - 2); // Slightly smaller than the background circle
    
    // Create a portal sprite using the entrance image
    logger.info(LogCategory.DUNGEON, 'Creating portal sprite with texture: lost-swamp-entrance');
    
    // Check if the texture exists
    if (!scene.textures.exists('lost-swamp-entrance')) {
      logger.error(LogCategory.DUNGEON, 'Texture not found: lost-swamp-entrance');
      
      // Log available textures for debugging
      const availableTextures = Object.keys(scene.textures.list);
      logger.info(LogCategory.DUNGEON, `Available textures (${availableTextures.length}): ${availableTextures.join(', ')}`);
      
      return null;
    }
    
    const portal = scene.add.sprite(pixelPos.x, pixelPos.y, 'lost-swamp-entrance');
    
    // Apply the mask to the portal sprite
    logger.info(LogCategory.DUNGEON, 'Applying mask to portal sprite');
    portal.setMask(mask.createGeometryMask());
    
    // Scale the image to fit nicely within the circle
    portal.setScale(0.25);
    portal.setAlpha(1.0);
    portal.setDepth(10);
    
    // Store dungeon info and coordinates in the portal
    logger.info(LogCategory.DUNGEON, 'Storing dungeon info in portal sprite');
    portal.setData('dungeonId', 'lost-swamp');
    portal.setData('dungeonName', 'Lost Swamp');
    portal.setData('dungeonDescription', 'A mysterious swamp filled with dangerous creatures and hidden treasures.');
    portal.setData('lat', lat);
    portal.setData('lng', lng);
    
    // Make the portal interactive
    logger.info(LogCategory.DUNGEON, 'Making portal sprite interactive');
    portal.setInteractive({ useHandCursor: true });
    
    // Add click handler
    portal.on('pointerdown', () => {
      logger.info(LogCategory.DUNGEON, 'Lost Swamp entrance clicked, entering dungeon');
      
      try {
        // Get the dungeon config from the registry
        const dungeonConfig = dungeonConfigRegistry.get('lost-swamp');
        
        if (!dungeonConfig) {
          logger.error(LogCategory.DUNGEON, 'Lost Swamp dungeon configuration not found in registry');
          // Show error message to the player
          if (scene.uiManager) {
            scene.uiManager.showMedievalMessage(
              'Cannot enter the Lost Swamp: dungeon configuration not found.',
              'error',
              3000
            );
          }
          return;
        }
        
        // Create a proper dungeon object using the DungeonFactory
        const dungeonLevel = 1;
        const dungeon = DungeonFactory.createDungeon(scene, 'lost-swamp', dungeonLevel);
        
        if (!dungeon) {
          logger.error(LogCategory.DUNGEON, 'Failed to create Lost Swamp dungeon object');
          // Show error message to the player
          if (scene.uiManager) {
            scene.uiManager.showMedievalMessage(
              'Cannot enter the Lost Swamp: failed to create dungeon.',
              'error',
              3000
            );
          }
          return;
        }
        
        // Ensure the dungeon has all required properties
        if (!dungeon.levels) {
          logger.warn(LogCategory.DUNGEON, 'Dungeon object missing levels property, setting default value');
          dungeon.levels = 4;
        }
        
        if (!dungeon.currentLevel) {
          logger.warn(LogCategory.DUNGEON, 'Dungeon object missing currentLevel property, setting default value');
          dungeon.currentLevel = dungeonLevel;
        }
        
        // Store the dungeon in the registry for the DungeonScene to access
        scene.registry.set('currentDungeon', dungeon);
        
        logger.info(LogCategory.DUNGEON, `Created dungeon object: ${dungeon.name}, levels: ${dungeon.levels}`);
        
        // Start the dungeon scene with the dungeonId and level
        scene.scene.start('DungeonScene', { 
          dungeonId: 'lost-swamp', 
          level: dungeonLevel
        });
      } catch (error) {
        logger.error(LogCategory.DUNGEON, `Error entering Lost Swamp dungeon: ${error}`);
        // Show error message to the player
        if (scene.uiManager) {
          scene.uiManager.showMedievalMessage(
            'Cannot enter the Lost Swamp: an error occurred.',
            'error',
            3000
          );
        }
      }
    });
    
    // Add a swamp mist effect around the entrance
    try {
      // Create the particle emitter for swamp mist
      const emitter = scene.add.particles(pixelPos.x, pixelPos.y, 'particle', {
        speed: { min: 3, max: 10 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 2000,
        tint: 0x00aa77, // Swampy green
        frequency: 300,
        quantity: 1,
        radius: circleRadius - 5 // Emit within the circle
      });
      
      // Store the emitter with the portal for cleanup
      portal.particleEmitter = emitter;
    } catch (error) {
      logger.warn(LogCategory.DUNGEON, `Failed to create swamp mist particles: ${error.message}`);
      
      // Create a simple animation instead as fallback
      scene.tweens.add({
        targets: portal,
        scale: { from: 0.23, to: 0.27 },
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Add a pulsing effect to the circle
    scene.tweens.add({
      targets: circle,
      alpha: { from: 0.6, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add a subtle rotation to the portal image
    scene.tweens.add({
      targets: portal,
      angle: { from: -2, to: 2 },
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Create a container for all the elements
    const container = scene.add.container(0, 0, [circle, mask, portal]);
    container.setDepth(10);
    
    // Add a label above the entrance
    const label = scene.add.text(pixelPos.x, pixelPos.y - circleRadius - 15, 'Lost Swamp', {
      fontSize: '16px',
      fontFamily: 'Cinzel, serif',
      color: '#00ff88',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    label.setDepth(10);
    
    // Add the label to the container
    container.add(label);
    
    // Store the coordinates in the container for map updates
    container.setData = (key, value) => {
      portal.setData(key, value);
      return container;
    };
    container.setData('lat', lat);
    container.setData('lng', lng);
    
    // Register with map manager for position updates
    if (mapManager.registerMapObject) {
      mapManager.registerMapObject(container, lat, lng);
    }
    
    // Add a method to update the position based on map changes
    container.updatePosition = () => {
      const newPixelPos = mapManager.latLngToPixel(lat, lng);
      if (newPixelPos) {
        // Update all elements' positions
        circle.setPosition(newPixelPos.x, newPixelPos.y);
        mask.setPosition(newPixelPos.x, newPixelPos.y);
        portal.setPosition(newPixelPos.x, newPixelPos.y);
        label.setPosition(newPixelPos.x, newPixelPos.y - circleRadius - 15);
        
        // Update particle emitter position if it exists
        if (portal.particleEmitter) {
          portal.particleEmitter.setPosition(newPixelPos.x, newPixelPos.y);
        }
      }
    };
    
    logger.info(LogCategory.DUNGEON, 'Lost Swamp entrance created successfully on the map');
    
    return container;
  } catch (error) {
    logger.error(LogCategory.DUNGEON, `Error creating Lost Swamp entrance: ${error}`);
    return null;
  }
}

/**
 * Place the Lost Swamp entrance near the player
 * @param {Phaser.Scene} scene - The current scene (Game scene)
 * @param {Object} mapManager - The map manager instance
 * @param {Object} player - The player object
 * @returns {Phaser.GameObjects.Container} The created entrance container
 */
export function placeLostSwampEntranceNearPlayer(scene, mapManager, player) {
  logger.info(LogCategory.DUNGEON, '=== TESTING: Placing Lost Swamp entrance near player ===');
  logger.info(LogCategory.DUNGEON, `Player object: ${player ? 'valid' : 'null'}, position: x=${player?.x}, y=${player?.y}`);
  logger.info(LogCategory.DUNGEON, `MapManager: ${mapManager ? 'valid' : 'null'}`);
  
  try {
    // Get player's current position
    logger.info(LogCategory.DUNGEON, 'Converting player pixel position to lat/lng');
    const playerLatLng = mapManager.pixelToLatLng(player.x, player.y);
    if (!playerLatLng) {
      logger.error(LogCategory.DUNGEON, 'Failed to get player coordinates, pixelToLatLng returned null');
      return null;
    }
    
    logger.info(LogCategory.DUNGEON, `Player lat/lng: ${playerLatLng.lat.toFixed(6)}, ${playerLatLng.lng.toFixed(6)}`);
    
    // Calculate a position to the right (east) of the player
    // Using the destinationPoint method to get a point 150 meters away at 0 degrees (east)
    logger.info(LogCategory.DUNGEON, 'Calculating entrance position 150m east of player');
    const entranceLatLng = mapManager.destinationPoint(
      playerLatLng,
      0, // 0 degrees (east/right)
      150 // 150 meters away for better visibility
    );
    
    if (!entranceLatLng) {
      logger.error(LogCategory.DUNGEON, 'Failed to calculate entrance position, destinationPoint returned null');
      return null;
    }
    
    logger.info(LogCategory.DUNGEON, `Entrance lat/lng calculated: ${entranceLatLng.lat.toFixed(6)}, ${entranceLatLng.lng.toFixed(6)}`);
    
    // Create the entrance at the calculated position
    logger.info(LogCategory.DUNGEON, 'Creating Lost Swamp entrance at calculated position');
    const entrance = createLostSwampEntrance(scene, mapManager, entranceLatLng.lat, entranceLatLng.lng);
    
    if (entrance) {
      logger.info(LogCategory.DUNGEON, 'Lost Swamp entrance created successfully');
      
      // Log the entrance properties
      logger.info(LogCategory.DUNGEON, `Entrance position: x=${entrance.x}, y=${entrance.y}`);
      logger.info(LogCategory.DUNGEON, `Entrance data: dungeonId=${entrance.getData('dungeonId')}, name=${entrance.getData('dungeonName')}`);
      
      return entrance;
    }
    
    // If we get here, entrance creation failed
    logger.error(LogCategory.DUNGEON, 'Failed to create Lost Swamp entrance');
    return null;
  } catch (error) {
    logger.error(LogCategory.DUNGEON, `Error placing Lost Swamp entrance: ${error}`);
    logger.error(LogCategory.DUNGEON, `Error stack: ${error.stack}`);
    return null;
  }
} 