import { logger, LogCategory } from '../../utils/Logger';
import { DungeonFactory } from './DungeonFactory';
import { dungeonConfigRegistry } from './DungeonConfig';

/**
 * DungeonSystem - Main entry point for the dungeon system
 * Coordinates all dungeon-related subsystems and provides a unified API
 */
export class DungeonSystem {
  /**
   * Constructor for the DungeonSystem
   * @param {Object} scene - The dungeon scene
   * @param {string} dungeonId - The ID of the dungeon to create
   * @param {number} level - The dungeon level
   * @param {Object} options - Additional options for dungeon creation
   */
  constructor(scene, dungeonId, level, options = {}) {
    this.scene = scene;
    
    logger.info(LogCategory.DUNGEON, `DungeonSystem constructor called with dungeonId: ${dungeonId}, level: ${level}`);
    logger.info(LogCategory.DUNGEON, `Scene has currentDungeon: ${scene.currentDungeon ? 'yes' : 'no'}`);
    
    // If dungeonId and level are not provided, use the currentDungeon from the scene
    if (!dungeonId && scene.currentDungeon) {
      this.currentDungeon = scene.currentDungeon;
      this.currentLevel = scene.currentLevel || 1;
      logger.info(LogCategory.DUNGEON, `Using existing dungeon: ${this.currentDungeon.name} (Level ${this.currentLevel})`);
    } else {
      // Create the dungeon instance using the factory
      dungeonId = dungeonId || (scene.currentDungeon ? scene.currentDungeon.id : null);
      level = level || 1;
      
      if (!dungeonId) {
        logger.error(LogCategory.DUNGEON, 'No dungeonId provided and no currentDungeon in scene');
        return;
      }
      
      logger.info(LogCategory.DUNGEON, `Creating new dungeon with id: ${dungeonId}, level: ${level}`);
      this.currentDungeon = DungeonFactory.createDungeon(scene, dungeonId, level, options);
      this.currentLevel = level;
      logger.info(LogCategory.DUNGEON, `Created new dungeon: ${this.currentDungeon.name} (Level ${this.currentLevel})`);
    }
    
    // Store references to the scene's player stats
    this.playerStats = scene.playerStats;
    
    // Subsystems will be initialized by the DungeonScene
    this.backgroundManager = null;
    this.levelManager = null;
    this.playerManager = null;
    this.combatSystem = null;
    this.uiManager = null;
    this.rewardSystem = null;
    this.eventSystem = null;
    
    // Room tracking
    this.rooms = new Map();
    this.currentRoom = null;
    
    // Monster tracking
    this.monsters = new Map();
    
    logger.info(LogCategory.DUNGEON, `Dungeon system initialized for ${this.currentDungeon.name} (Level ${this.currentLevel})`);
  }
  
  /**
   * Initialize all subsystems
   * @param {Object} options - Configuration options for subsystems
   */
  initializeSubsystems(options = {}) {
    logger.info(LogCategory.DUNGEON, 'Initializing dungeon subsystems');
    
    // Each subsystem will be initialized by the DungeonScene
    // This method provides a hook for future expansion
    
    // Initialize special mechanics based on dungeon configuration
    this.initializeSpecialMechanics();
  }
  
  /**
   * Initialize special mechanics based on dungeon configuration
   */
  initializeSpecialMechanics() {
    // Get the special mechanics from the dungeon
    const specialMechanics = this.currentDungeon.specialMechanics || [];
    
    logger.info(LogCategory.DUNGEON, `Initializing special mechanics: ${specialMechanics.join(', ')}`);
    
    // Initialize each special mechanic
    specialMechanics.forEach(mechanic => {
      switch (mechanic) {
        case 'natural-healing':
          this.initializeNaturalHealing();
          break;
          
        case 'darkness':
          this.initializeDarkness();
          break;
          
        case 'cave-ins':
          this.initializeCaveIns();
          break;
          
        case 'crystal-power':
          this.initializeCrystalPower();
          break;
          
        // Add cases for other special mechanics
          
        default:
          logger.warn(LogCategory.DUNGEON, `Unknown special mechanic: ${mechanic}`);
      }
    });
  }
  
  /**
   * Initialize natural healing mechanic
   * Players heal slowly over time in forest areas
   */
  initializeNaturalHealing() {
    logger.info(LogCategory.DUNGEON, 'Initializing natural healing mechanic');
    
    // Set up a timer to heal the player periodically
    this.naturalHealingTimer = this.scene.time.addEvent({
      delay: 10000, // Heal every 10 seconds
      callback: () => {
        // Only heal if the player is not in combat
        if (this.playerManager && !this.playerManager.isInCombat) {
          const healAmount = Math.ceil(this.playerStats.maxHealth * 0.05); // Heal 5% of max health
          this.playerManager.heal(healAmount);
          
          logger.debug(LogCategory.DUNGEON, `Natural healing: +${healAmount} health`);
        }
      },
      callbackScope: this,
      loop: true
    });
  }
  
  /**
   * Initialize darkness mechanic
   * Limited visibility without light sources
   */
  initializeDarkness() {
    logger.info(LogCategory.DUNGEON, 'Initializing darkness mechanic');
    
    // Set up a darkness overlay
    this.darknessOverlay = this.scene.add.graphics();
    this.darknessOverlay.fillStyle(0x000000, 0.7);
    this.darknessOverlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
    this.darknessOverlay.setScrollFactor(0);
    this.darknessOverlay.setDepth(100);
    
    // Create a light mask around the player
    this.lightMask = this.scene.add.graphics();
    this.lightMask.fillStyle(0xffffff);
    this.lightMask.setScrollFactor(0);
    this.lightMask.setDepth(101);
    
    // Update the light mask in the update loop
    this.scene.events.on('update', this.updateLightMask, this);
  }
  
  /**
   * Update the light mask around the player
   */
  updateLightMask() {
    if (!this.lightMask || !this.playerManager) return;
    
    // Clear the previous mask
    this.lightMask.clear();
    
    // Get the player's position in screen coordinates
    const playerX = this.playerManager.sprite.x - this.scene.cameras.main.scrollX;
    const playerY = this.playerManager.sprite.y - this.scene.cameras.main.scrollY;
    
    // Draw a radial gradient for the light
    const lightRadius = 200; // Base light radius
    
    // Check if the player has a light source equipped
    const lightSourceBonus = this.playerManager.hasLightSource ? 150 : 0;
    
    // Draw the light circle
    this.lightMask.fillCircle(playerX, playerY, lightRadius + lightSourceBonus);
    
    // Use the light mask as a mask for the darkness overlay
    this.darknessOverlay.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.lightMask));
  }
  
  /**
   * Initialize cave-ins mechanic
   * Random cave-ins that can block paths or cause damage
   */
  initializeCaveIns() {
    logger.info(LogCategory.DUNGEON, 'Initializing cave-ins mechanic');
    
    // Set up a timer for random cave-ins
    this.caveInTimer = this.scene.time.addEvent({
      delay: 30000, // Check for cave-ins every 30 seconds
      callback: () => {
        // Only trigger cave-ins if the current room has the cave-in hazard
        if (this.currentRoom && 
            this.currentRoom.hazards && 
            this.currentRoom.hazards.some(h => h.type === 'falling-rocks')) {
          
          this.triggerCaveIn();
        }
      },
      callbackScope: this,
      loop: true
    });
  }
  
  /**
   * Trigger a cave-in event
   */
  triggerCaveIn() {
    logger.info(LogCategory.DUNGEON, 'Triggering cave-in event');
    
    // Get the hazard configuration
    const hazard = this.currentRoom.hazards.find(h => h.type === 'falling-rocks');
    if (!hazard || !hazard.config) return;
    
    // Create falling rocks particles
    const emitter = this.scene.add.particles(0, 0, 'rock-particle', {
      x: { min: 0, max: this.scene.cameras.main.width },
      y: -50,
      lifespan: 2000,
      speedY: { min: 200, max: 400 },
      scale: { start: 0.5, end: 0.5 },
      quantity: 20,
      emitting: false
    });
    
    // Emit the particles
    emitter.explode(20);
    
    // Play sound effect
    if (this.scene.sound.get('cave-in-sound')) {
      this.scene.sound.play('cave-in-sound');
    }
    
    // Check if the player is hit
    this.scene.time.delayedCall(1000, () => {
      // Random chance to hit the player
      if (Math.random() < hazard.config.fallingRocksFrequency) {
        // Deal damage to the player
        const damage = hazard.config.fallingRocksDamage;
        this.playerManager.takeDamage(damage);
        
        // Show damage text
        if (this.uiManager) {
          this.uiManager.showMedievalMessage(
            `Cave-in! You take ${damage} damage from falling rocks.`,
            'error',
            3000
          );
        }
        
        logger.info(LogCategory.DUNGEON, `Player hit by cave-in for ${damage} damage`);
      }
    });
  }
  
  /**
   * Initialize crystal power mechanic
   * Crystals that provide temporary buffs
   */
  initializeCrystalPower() {
    logger.info(LogCategory.DUNGEON, 'Initializing crystal power mechanic');
    
    // This mechanic is handled by the room creation and interaction
    // No initialization needed here
  }
  
  /**
   * Create a room in the dungeon
   * @param {string} roomType - The type of room to create
   * @param {Object} position - The position of the room
   * @param {Object} options - Additional options for room creation
   * @returns {Object} The created room
   */
  createRoom(roomType, position, options = {}) {
    // Create the room using the factory
    const room = DungeonFactory.createRoom(
      this.scene, 
      this.currentDungeon, 
      roomType, 
      position, 
      options
    );
    
    // Add the room to our tracking
    this.rooms.set(room.id, room);
    
    logger.info(LogCategory.DUNGEON, `Room created: ${room.id}`, {
      type: room.type,
      position: room.position
    });
    
    return room;
  }
  
  /**
   * Set the current room
   * @param {string} roomId - The ID of the room to set as current
   */
  setCurrentRoom(roomId) {
    // Get the room from our tracking
    const room = this.rooms.get(roomId);
    
    if (!room) {
      logger.error(LogCategory.DUNGEON, `Room not found: ${roomId}`);
      return;
    }
    
    // Set the current room
    this.currentRoom = room;
    
    // Update the UI manager if it exists
    if (this.uiManager) {
      this.uiManager.setCurrentRoom(roomId);
    }
    
    logger.info(LogCategory.DUNGEON, `Current room set to: ${roomId}`, {
      type: room.type,
      position: room.position
    });
    
    // Apply room-specific effects
    this.applyRoomEffects(room);
  }
  
  /**
   * Apply room-specific effects
   * @param {Object} room - The room to apply effects for
   */
  applyRoomEffects(room) {
    // Apply effects based on room type and dungeon type
    switch (this.currentDungeon.id) {
      case 'forest-dungeon':
        this.applyForestRoomEffects(room);
        break;
        
      case 'cave-dungeon':
        this.applyCaveRoomEffects(room);
        break;
        
      // Add cases for other dungeon types
    }
  }
  
  /**
   * Apply forest-specific room effects
   * @param {Object} room - The room to apply effects for
   */
  applyForestRoomEffects(room) {
    // Apply weather effects if available
    if (room.weatherEffect && this.scene.weatherSystem) {
      this.scene.weatherSystem.setWeather(room.weatherEffect);
    }
    
    // Apply forest density effects (e.g., movement speed penalties in dense forest)
    if (room.forestDensity && this.playerManager) {
      // Higher density = lower movement speed
      const speedPenalty = Math.floor(room.forestDensity * 50);
      this.playerManager.setSpeedModifier(1 - (speedPenalty / 100));
    }
  }
  
  /**
   * Apply cave-specific room effects
   * @param {Object} room - The room to apply effects for
   */
  applyCaveRoomEffects(room) {
    // Apply light level effects
    if (room.lightLevel) {
      switch (room.lightLevel) {
        case 'pitch-black':
          // Set darkness overlay to maximum
          if (this.darknessOverlay) {
            this.darknessOverlay.fillStyle(0x000000, 0.9);
            this.darknessOverlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
          }
          break;
          
        case 'dim':
          // Set darkness overlay to medium
          if (this.darknessOverlay) {
            this.darknessOverlay.fillStyle(0x000000, 0.7);
            this.darknessOverlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
          }
          break;
          
        case 'lit':
          // Set darkness overlay to minimum
          if (this.darknessOverlay) {
            this.darknessOverlay.fillStyle(0x000000, 0.3);
            this.darknessOverlay.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
          }
          break;
      }
    }
    
    // Create hazards if the room has them
    if (room.hazards && room.hazards.length > 0) {
      room.hazards.forEach(hazard => {
        this.createHazard(hazard.type, hazard.config);
      });
    }
    
    // Create crystals if the room has them
    if (room.crystals && room.crystals.length > 0) {
      room.crystals.forEach((crystal, index) => {
        this.createCrystal(crystal.type, crystal.effects, index);
      });
    }
  }
  
  /**
   * Create a hazard in the current room
   * @param {string} hazardType - The type of hazard to create
   * @param {Object} config - The hazard configuration
   */
  createHazard(hazardType, config) {
    logger.info(LogCategory.DUNGEON, `Creating hazard: ${hazardType}`);
    
    // Implementation depends on the hazard type
    switch (hazardType) {
      case 'falling-rocks':
        // Falling rocks are handled by the cave-in mechanic
        // No need to create anything here
        break;
        
      case 'poisonous-gas':
        this.createPoisonGasHazard(config);
        break;
        
      case 'lava':
        this.createLavaHazard(config);
        break;
        
      case 'thin-ice':
        this.createThinIceHazard(config);
        break;
    }
  }
  
  /**
   * Create a crystal in the current room
   * @param {string} crystalType - The type of crystal to create
   * @param {Object} effects - The crystal effects
   * @param {number} index - The index of the crystal (for positioning)
   */
  createCrystal(crystalType, effects, index) {
    logger.info(LogCategory.DUNGEON, `Creating crystal: ${crystalType}`);
    
    // Calculate a position for the crystal
    // This is a simplified example - in a real implementation,
    // you would use proper positioning logic
    const x = 200 + (index * 300);
    const y = 300;
    
    // Create the crystal sprite
    const crystal = this.scene.physics.add.sprite(x, y, `crystal-${crystalType}`);
    crystal.setScale(0.5);
    
    // Add a glow effect
    const color = this.getCrystalColor(crystalType);
    this.scene.tweens.add({
      targets: crystal,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Add collision with the player
    this.scene.physics.add.overlap(
      this.playerManager.sprite,
      crystal,
      () => this.activateCrystal(crystal, crystalType, effects),
      null,
      this
    );
    
    // Store the crystal in the room
    if (!this.currentRoom.crystalSprites) {
      this.currentRoom.crystalSprites = [];
    }
    this.currentRoom.crystalSprites.push(crystal);
  }
  
  /**
   * Get the color for a crystal type
   * @param {string} crystalType - The type of crystal
   * @returns {number} The color as a hex value
   */
  getCrystalColor(crystalType) {
    switch (crystalType) {
      case 'healing':
        return 0x00ff00; // Green
      case 'strength':
        return 0xff0000; // Red
      case 'defense':
        return 0x0000ff; // Blue
      case 'speed':
        return 0xffff00; // Yellow
      default:
        return 0xffffff; // White
    }
  }
  
  /**
   * Activate a crystal when the player touches it
   * @param {Object} crystal - The crystal sprite
   * @param {string} crystalType - The type of crystal
   * @param {Object} effects - The crystal effects
   */
  activateCrystal(crystal, crystalType, effects) {
    logger.info(LogCategory.DUNGEON, `Activating crystal: ${crystalType}`);
    
    // Apply the crystal effect
    switch (crystalType) {
      case 'healing':
        // Heal the player
        const healAmount = effects.healthRestored || 20;
        this.playerManager.heal(healAmount);
        
        // Show a message
        if (this.uiManager) {
          this.uiManager.showMedievalMessage(
            `The healing crystal restores ${healAmount} health!`,
            'success',
            3000
          );
        }
        break;
        
      case 'strength':
        // Increase player damage
        const damageBonus = effects.damageBonus || 5;
        const strengthDuration = effects.duration || 30000;
        
        this.playerManager.addDamageBonus(damageBonus, strengthDuration);
        
        // Show a message
        if (this.uiManager) {
          this.uiManager.showMedievalMessage(
            `The strength crystal increases your damage by ${damageBonus} for ${strengthDuration / 1000} seconds!`,
            'success',
            3000
          );
        }
        break;
        
      case 'defense':
        // Increase player defense
        const defenseBonus = effects.armorBonus || 10;
        const defenseDuration = effects.duration || 45000;
        
        this.playerManager.addDefenseBonus(defenseBonus, defenseDuration);
        
        // Show a message
        if (this.uiManager) {
          this.uiManager.showMedievalMessage(
            `The defense crystal increases your armor by ${defenseBonus} for ${defenseDuration / 1000} seconds!`,
            'success',
            3000
          );
        }
        break;
        
      case 'speed':
        // Increase player speed
        const speedBonus = effects.speedBonus || 50;
        const speedDuration = effects.duration || 20000;
        
        this.playerManager.addSpeedBonus(speedBonus, speedDuration);
        
        // Show a message
        if (this.uiManager) {
          this.uiManager.showMedievalMessage(
            `The speed crystal increases your movement speed for ${speedDuration / 1000} seconds!`,
            'success',
            3000
          );
        }
        break;
    }
    
    // Play a sound effect
    if (this.scene.sound.get('crystal-activate')) {
      this.scene.sound.play('crystal-activate');
    }
    
    // Create a particle effect
    const particles = this.scene.add.particles(crystal.x, crystal.y, 'particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      blendMode: 'ADD',
      tint: this.getCrystalColor(crystalType)
    });
    
    // Emit particles
    particles.explode(20);
    
    // Remove the crystal
    crystal.destroy();
    
    // Remove from the room's crystal sprites
    if (this.currentRoom.crystalSprites) {
      const index = this.currentRoom.crystalSprites.indexOf(crystal);
      if (index !== -1) {
        this.currentRoom.crystalSprites.splice(index, 1);
      }
    }
  }
  
  /**
   * Create a monster in the dungeon
   * @param {number} x - The x position
   * @param {number} y - The y position
   * @param {string} monsterType - The type of monster to create (optional)
   * @param {boolean} isBoss - Whether this is a boss monster
   * @returns {Object} The created monster
   */
  createMonster(x, y, monsterType = null, isBoss = false) {
    // Create the monster using the factory
    const monster = DungeonFactory.createMonster(
      this.scene,
      x,
      y,
      this.currentDungeon,
      monsterType,
      isBoss,
      this.playerManager.sprite,
      this.scene.itemSystem
    );
    
    // Add the monster to our tracking
    this.monsters.set(monster.id, monster);
    
    // Add the monster to the current room if we have one
    if (this.currentRoom) {
      this.currentRoom.monsters.set(monster.id, monster);
    }
    
    // Register the monster with the UI manager if it exists
    if (this.uiManager) {
      this.uiManager.registerMonster(monster);
    }
    
    logger.info(LogCategory.DUNGEON, `Monster created: ${monster.name}`, {
      type: monster.monsterType,
      isBoss: monster.isBoss,
      position: { x, y }
    });
    
    return monster;
  }
  
  /**
   * Update method called every frame
   * @param {number} time - The current time
   * @param {number} delta - The time since the last update
   */
  update(time, delta) {
    // Update all subsystems
    if (this.backgroundManager) this.backgroundManager.update(time, delta);
    if (this.levelManager) this.levelManager.update(time, delta);
    if (this.combatSystem) this.combatSystem.update(time, delta);
    if (this.playerManager) this.playerManager.update(time, delta);
    if (this.uiManager) this.uiManager.update(time, delta);
    if (this.eventSystem) this.eventSystem.update(time, delta);
    
    // Update the light mask if we have darkness
    if (this.currentDungeon.specialMechanics.includes('darkness')) {
      this.updateLightMask();
    }
  }
  
  /**
   * Clean up resources when the system is destroyed
   */
  destroy() {
    logger.info(LogCategory.DUNGEON, 'Destroying dungeon system');
    
    // Clean up special mechanics
    if (this.naturalHealingTimer) {
      this.naturalHealingTimer.destroy();
    }
    
    if (this.caveInTimer) {
      this.caveInTimer.destroy();
    }
    
    if (this.darknessOverlay) {
      this.darknessOverlay.destroy();
    }
    
    if (this.lightMask) {
      this.lightMask.destroy();
      this.scene.events.off('update', this.updateLightMask, this);
    }
    
    // Destroy all monsters
    this.monsters.forEach(monster => {
      if (monster.destroy) {
        monster.destroy();
      }
    });
    this.monsters.clear();
    
    // Clear room tracking
    this.rooms.clear();
    this.currentRoom = null;
    
    // Destroy all subsystems
    if (this.backgroundManager) {
      this.backgroundManager.destroy();
      this.backgroundManager = null;
    }
    
    if (this.levelManager) {
      this.levelManager.destroy();
      this.levelManager = null;
    }
    
    if (this.playerManager) {
      this.playerManager.destroy();
      this.playerManager = null;
    }
    
    if (this.combatSystem) {
      this.combatSystem.destroy();
      this.combatSystem = null;
    }
    
    if (this.uiManager) {
      this.uiManager.destroy();
      this.uiManager = null;
    }
    
    if (this.rewardSystem) {
      this.rewardSystem.destroy();
      this.rewardSystem = null;
    }
    
    if (this.eventSystem) {
      this.eventSystem.destroy();
      this.eventSystem = null;
    }
  }
} 