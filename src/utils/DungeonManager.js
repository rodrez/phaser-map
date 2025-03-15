import { logger, LogCategory } from './Logger';

/**
 * DungeonManager class to handle dungeon creation, storage, and interaction
 * This class manages all dungeons in the game world
 */
export class DungeonManager {
  /**
   * Constructor for the DungeonManager
   * @param {Object} scene - The main game scene
   */
  constructor(scene) {
    this.scene = scene;
    this.dungeons = new Map(); // Map of dungeon ID to dungeon object
    this.dungeonMarkers = new Map(); // Map of dungeon ID to map marker
    
    // Register this system in the scene for other systems to access
    this.scene.dungeonManager = this;
    
    logger.info(LogCategory.DUNGEON, 'Dungeon manager initialized');
  }
  
  /**
   * Initialize dungeons on the map
   */
  initDungeons() {
    // Create the Lost Swamp dungeon
    this.createDungeon({
      id: 'lost-swamp',
      name: 'Lost Swamp',
      description: 'A mysterious swamp filled with dangerous creatures and hidden treasures.',
      position: { lat: this.scene.mapManager.getCenter().lat + 0.002, lng: this.scene.mapManager.getCenter().lng + 0.003 },
      levels: 4,
      minLevel: 5,
      boss: {
        name: 'Lizardfolk King',
        level: 10,
        health: 500,
        damage: 25,
        defense: 15,
        rewards: {
          xp: 500,
          gold: 200,
          items: ['kings-crown', 'swamp-staff']
        }
      }
    });
    
    // Add more dungeons here as needed
    
    // Create markers for all dungeons
    this.createDungeonMarkers();
  }
  
  /**
   * Create a new dungeon
   * @param {Object} config - Dungeon configuration
   * @returns {Object} - The created dungeon
   */
  createDungeon(config) {
    const dungeon = {
      id: config.id,
      name: config.name,
      description: config.description,
      position: config.position,
      levels: config.levels,
      minLevel: config.minLevel || 1,
      boss: config.boss,
      completed: false,
      currentLevel: 1
    };
    
    this.dungeons.set(dungeon.id, dungeon);
    logger.info(LogCategory.DUNGEON, `Created dungeon: ${dungeon.name}`);
    
    return dungeon;
  }
  
  /**
   * Create map markers for all dungeons
   */
  createDungeonMarkers() {
    // Clear existing markers
    this.dungeonMarkers.forEach(marker => {
      marker.remove();
    });
    this.dungeonMarkers.clear();
    
    // Create new markers for each dungeon
    this.dungeons.forEach(dungeon => {
      this.createDungeonMarker(dungeon);
    });
  }
  
  /**
   * Create a map marker for a dungeon
   * @param {Object} dungeon - The dungeon to create a marker for
   */
  createDungeonMarker(dungeon) {
    const map = this.scene.mapManager.getMap();
    if (!map) {
      logger.error(LogCategory.DUNGEON, 'Cannot create dungeon marker: map not initialized');
      return;
    }
    
    // Create a custom icon for the dungeon using the entrance image
    const dungeonIcon = L.divIcon({
      className: 'dungeon-marker',
      html: `<div class="dungeon-icon ${dungeon.completed ? 'completed' : ''}">
              <img src="assets/dungeons/${dungeon.id}/entrance.jpeg" alt="${dungeon.name}" width="48" height="48">
             </div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
    
    // Create the marker
    const marker = L.marker([dungeon.position.lat, dungeon.position.lng], {
      icon: dungeonIcon,
      title: dungeon.name
    }).addTo(map);
    
    // Add click handler
    marker.on('click', () => {
      this.handleDungeonMarkerClick(dungeon);
    });
    
    // Store the marker
    this.dungeonMarkers.set(dungeon.id, marker);
    
    logger.debug(LogCategory.DUNGEON, `Created marker for dungeon: ${dungeon.name}`);
  }
  
  /**
   * Handle click on a dungeon marker
   * @param {Object} dungeon - The dungeon that was clicked
   */
  handleDungeonMarkerClick(dungeon) {
    logger.info(LogCategory.DUNGEON, `Clicked on dungeon: ${dungeon.name}`);
    
    // Show dungeon info popup
    this.showDungeonInfoPopup(dungeon);
  }
  
  /**
   * Show dungeon info popup
   * @param {Object} dungeon - The dungeon to show info for
   */
  showDungeonInfoPopup(dungeon) {
    // Create popup content
    const html = `
      <div class="dungeon-popup">
        <h2>${dungeon.name}</h2>
        <p>${dungeon.description}</p>
        <p>Levels: ${dungeon.levels}</p>
        <p>Minimum Level: ${dungeon.minLevel}</p>
        <p>Boss: ${dungeon.boss.name}</p>
        <p>Status: ${dungeon.completed ? 'Completed' : 'Not Completed'}</p>
        <div class="dungeon-popup-buttons">
          <button id="enter-dungeon-btn" class="medieval-button">Enter Dungeon</button>
          <button id="close-popup-btn" class="medieval-button">Close</button>
        </div>
      </div>
    `;
    
    // Create popup content object
    const content = {
      html: html,
      buttons: [
        {
          selector: '#enter-dungeon-btn',
          onClick: () => {
            this.enterDungeon(dungeon);
            this.scene.uiManager.closeAllPopups();
          }
        },
        {
          selector: '#close-popup-btn',
          onClick: () => {
            this.scene.uiManager.closeAllPopups();
          }
        }
      ]
    };
    
    // Show popup using UI manager
    this.scene.uiManager.showCustomPopup(content, {
      className: 'medieval-popup',
      width: 400,
      centered: true
    });
  }
  
  /**
   * Enter a dungeon
   * @param {Object} dungeon - The dungeon to enter
   */
  enterDungeon(dungeon) {
    logger.info(LogCategory.DUNGEON, `Entering dungeon: ${dungeon.name}`);
    
    // Check if player meets minimum level requirement
    const playerLevel = this.scene.playerStats.level;
    if (playerLevel < dungeon.minLevel) {
      this.scene.uiManager.showMedievalMessage(
        `You must be at least level ${dungeon.minLevel} to enter this dungeon!`,
        'error',
        3000
      );
      return;
    }
    
    try {
      // Store current dungeon in registry for the dungeon scene to access
      this.scene.registry.set('currentDungeon', dungeon);
      
      // Use a more controlled transition to the dungeon scene
      // First, launch the dungeon scene (this keeps the current scene running)
      this.scene.scene.launch('DungeonScene');
      
      // Then, after a short delay, stop the current scene
      this.scene.time.delayedCall(100, () => {
        // Sleep the current scene instead of stopping it
        // This preserves the scene's state but makes it inactive
        this.scene.scene.sleep('Game');
      });
      
      logger.info(LogCategory.DUNGEON, `Successfully transitioned to dungeon: ${dungeon.name}`);
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error entering dungeon: ${error.message}`);
    }
  }
  
  /**
   * Exit the current dungeon
   */
  exitDungeon() {
    logger.info(LogCategory.DUNGEON, 'Exiting dungeon');
    
    try {
      // Use a more controlled transition back to the main game scene
      // First, wake up the Game scene if it's sleeping
      if (this.scene.scene.isSleeping('Game')) {
        this.scene.scene.wake('Game');
      } else {
        // If it's not sleeping, start it
        this.scene.scene.start('Game');
      }
      
      // Then, after a short delay, stop the dungeon scene
      this.scene.time.delayedCall(100, () => {
        // Stop the dungeon scene
        this.scene.scene.stop('DungeonScene');
      });
      
      logger.info(LogCategory.DUNGEON, 'Successfully exited dungeon');
    } catch (error) {
      logger.error(LogCategory.DUNGEON, `Error exiting dungeon: ${error.message}`);
      
      // Fallback to direct transition if the controlled transition fails
      this.scene.scene.start('Game');
    }
  }
  
  /**
   * Update dungeon completion status
   * @param {string} dungeonId - The ID of the dungeon to update
   * @param {boolean} completed - Whether the dungeon is completed
   */
  updateDungeonStatus(dungeonId, completed) {
    const dungeon = this.dungeons.get(dungeonId);
    if (!dungeon) {
      logger.error(LogCategory.DUNGEON, `Cannot update status: dungeon not found with ID ${dungeonId}`);
      return;
    }
    
    dungeon.completed = completed;
    logger.info(LogCategory.DUNGEON, `Updated dungeon status: ${dungeon.name} - ${completed ? 'Completed' : 'Not Completed'}`);
    
    // Update the marker to show completion status
    this.updateDungeonMarker(dungeon);
  }
  
  /**
   * Update a dungeon marker to reflect current status
   * @param {Object} dungeon - The dungeon to update the marker for
   */
  updateDungeonMarker(dungeon) {
    const marker = this.dungeonMarkers.get(dungeon.id);
    if (!marker) {
      return;
    }
    
    // Update the icon to show completion status
    const dungeonIcon = L.divIcon({
      className: 'dungeon-marker',
      html: `<div class="dungeon-icon ${dungeon.completed ? 'completed' : ''}">
              <img src="assets/dungeons/${dungeon.id}/entrance.jpeg" alt="${dungeon.name}" width="48" height="48">
             </div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
    
    marker.setIcon(dungeonIcon);
  }
  
  /**
   * Get a dungeon by ID
   * @param {string} dungeonId - The ID of the dungeon to get
   * @returns {Object} - The dungeon object
   */
  getDungeon(dungeonId) {
    return this.dungeons.get(dungeonId);
  }
  
  /**
   * Get all dungeons
   * @returns {Array} - Array of all dungeon objects
   */
  getAllDungeons() {
    return Array.from(this.dungeons.values());
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Remove all markers
    this.dungeonMarkers.forEach(marker => {
      marker.remove();
    });
    this.dungeonMarkers.clear();
    
    logger.info(LogCategory.DUNGEON, 'Dungeon manager destroyed');
  }
} 