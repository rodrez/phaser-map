import { Game } from './Game';
import { logger, LogCategory } from '../utils/Logger';
import webSocketClient from '../utils/WebSocketClient';
import flagService from '../utils/FlagService';
import { v4 as uuidv4 } from 'uuid';

/**
 * MMOGame - A modified version of the Game scene that includes MMO functionality
 * This scene integrates with the WebSocket server to add multiplayer features
 */
export class MMOGame extends Game {
  constructor() {
    super('MMOGame');
    
    // Track remote players
    this.remotePlayers = new Map();
    
    // Store connection state
    this.isConnected = false;
    this.isAuthenticated = false;
    
    // Store player ID
    this.playerId = null;
    
    logger.info(LogCategory.NETWORK, 'MMOGame scene initialized');
  }

  /**
   * Create the MMO game scene
   * Extends the base Game scene's create method
   */
  create() {
    // Call the parent create method to set up the base game
    super.create();
    
    // Get player information
    const username = this.registry.get('username') || 'Player';
    this.playerId = this.registry.get('playerId') || uuidv4();
    
    // Store player ID in registry for future reference
    this.registry.set('playerId', this.playerId);
    
    logger.info(LogCategory.PLAYER, `Setting up MMO functionality for player: ${username} (${this.playerId})`);
    
    // Set up websocket connection
    this.setupWebSocketConnection(username);
    
    // Set up MMO-specific UI
    this.setupMMOUI();
    
    // Override flag placement to use the server
    this.setupServerFlags();
    
    // Set up remote player rendering
    this.setupRemotePlayerRendering();
    
    // Emit event that MMO setup is complete
    this.events.emit('mmo-setup-complete');
  }
  
  /**
   * Set up the WebSocket connection
   * @param {string} username - Player username
   */
  setupWebSocketConnection(username) {
    // Initialize WebSocket client with player information
    webSocketClient.playerId = this.playerId;
    webSocketClient.username = username;
    
    // Set up authentication callback
    webSocketClient.onAuthenticatedCallback = (data) => {
      this.isAuthenticated = true;
      logger.info(LogCategory.AUTH, 'Player authenticated with server:', data);
      
      // Request initial flags
      flagService.requestFlags();
      
      // Update player position on the server
      this.sendPlayerPosition();
      
      // Show notification
      this.showNotification('Connected to MMO server!', 'success');
    };
    
    // Set up disconnect callback
    webSocketClient.onDisconnectCallback = (event) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      logger.warn(LogCategory.NETWORK, 'Disconnected from server:', event);
      
      // Show notification
      this.showNotification('Disconnected from server. Reconnecting...', 'warning');
    };
    
    // Set up player movement handler
    webSocketClient.registerHandler('player-moved', (data) => {
      this.handleRemotePlayerMovement(data);
    });
    
    // Set up player disconnection handler
    webSocketClient.registerHandler('player-disconnected', (data) => {
      this.handleRemotePlayerDisconnect(data);
    });
    
    // Set up players list handler
    webSocketClient.registerHandler('players-list', (data) => {
      this.handlePlayersList(data);
    });
    
    // Connect to the server
    webSocketClient.connect()
      .then((connected) => {
        this.isConnected = connected;
        if (connected) {
          logger.info(LogCategory.NETWORK, 'Connected to MMO server');
          
          // Only authenticate if not already being handled by WebSocketClient
          if (!webSocketClient.isAuthenticated && !webSocketClient.authenticate) {
            webSocketClient.authenticate(this.playerId, username);
          }
        } else {
          logger.error(LogCategory.NETWORK, 'Failed to connect to MMO server');
          this.showNotification('Failed to connect to server', 'error');
        }
      })
      .catch((error) => {
        logger.error(LogCategory.NETWORK, 'Error connecting to MMO server:', error);
        this.showNotification('Error connecting to server', 'error');
      });
  }
  
  /**
   * Set up MMO-specific UI elements
   */
  setupMMOUI() {
    // Add online player count
    this.onlinePlayersText = this.add.text(10, 10, 'Online: 0', {
      fontFamily: 'Arial',
      fontSize: 14,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.onlinePlayersText.setScrollFactor(0);
    this.onlinePlayersText.setDepth(1000);
    
    // Add server status indicator
    this.serverStatusIndicator = this.add.circle(this.cameras.main.width - 20, 20, 8);
    this.serverStatusIndicator.setScrollFactor(0);
    this.serverStatusIndicator.setDepth(1000);
    this.updateServerStatusIndicator();
    
    // Update server status indicator on window resize
    this.scale.on('resize', () => {
      this.serverStatusIndicator.x = this.cameras.main.width - 20;
    });
  }
  
  /**
   * Set up flag functionality using the server
   */
  setupServerFlags() {
    // Listen for flag events from the server
    flagService.onFlagPlaced((flag) => {
      logger.info(LogCategory.FLAG, 'Flag placed:', flag);
      this.createServerFlag(flag);
    });
    
    flagService.onFlagRemoved((flagId) => {
      logger.info(LogCategory.FLAG, 'Flag removed:', flagId);
      this.removeServerFlag(flagId);
    });
    
    flagService.onFlagUpdate((flag) => {
      logger.info(LogCategory.FLAG, 'Flag updated:', flag);
      this.updateServerFlag(flag);
    });
    
    flagService.onTeleport((position, visualBoundary) => {
      logger.info(LogCategory.FLAG, 'Teleporting to position:', position);
      this.teleportPlayer(position, visualBoundary);
    });
    
    // Listen for initial flags loaded
    window.addEventListener('flags-loaded', (event) => {
      logger.info(LogCategory.FLAG, `Loaded ${event.detail.length} flags from server`);
      
      // Clear existing flags
      this.clearAllFlags();
      
      // Create flags from server data
      for (const flag of event.detail) {
        this.createServerFlag(flag);
      }
    });
    
    // Override the default flag placement
    if (this.playerManager) {
      const originalHandleClick = this.playerManager.handleClick.bind(this.playerManager);
      
      this.playerManager.handleClick = () => {
        // Only allow flag placement when connected to server
        if (!this.isAuthenticated) {
          this.showNotification('Not connected to server', 'error');
          return null;
        }
        
        // Get current player position
        const player = this.playerManager.getPlayer();
        const playerPos = this.mapManager.getPlayerLatLng();
        
        // Place flag using the flag service
        const flagId = flagService.placeFlag(playerPos, {
          name: `Flag of ${webSocketClient.username}`
        });
        
        logger.info(LogCategory.FLAG, `Requested flag placement at ${playerPos.lat}, ${playerPos.lng}`);
        
        // Show notification
        this.showNotification('Placing flag...', 'info');
        
        return null;
      };
    }
  }
  
  /**
   * Set up remote player rendering
   */
  setupRemotePlayerRendering() {
    // Create a group for remote players
    this.remotePlayerGroup = this.add.group();
    
    // Request players near the current position
    this.time.addEvent({
      delay: 5000, // Every 5 seconds
      callback: this.requestNearbyPlayers,
      callbackScope: this,
      loop: true
    });
  }
  
  /**
   * Create a flag from server data
   * @param {Object} flag - Flag data from server
   */
  createServerFlag(flag) {
    // Convert lat/lng to pixel coordinates
    const pixelPos = this.mapManager.latLngToPixel(flag.position.lat, flag.position.lng);
    
    // Create flag sprite
    const flagSprite = this.add.image(pixelPos.x, pixelPos.y, 'flag_texture');
    flagSprite.setOrigin(0.5, 1); // Set origin to bottom center for flag
    flagSprite.setScale(0.8); // Adjust scale as needed
    
    // Set depth to ensure it's above the map but below the player
    flagSprite.setDepth(1500);
    
    // Store flag data with the sprite
    flagSprite.flagData = flag;
    
    // Color the flag based on ownership
    this.colorFlagByOwnership(flagSprite, flag);
    
    // Add a glow effect for hardened flags
    if (flag.isHardened) {
      const glow = this.add.image(pixelPos.x, pixelPos.y, 'glow_texture');
      glow.setOrigin(0.5, 0.5);
      glow.setScale(1.2);
      glow.setDepth(1499); // Just below the flag
      glow.setAlpha(0.5);
      glow.setTint(0x00FFFF);
      
      // Store reference to the glow
      flagSprite.glow = glow;
    }
    
    // Make the sprite interactive
    flagSprite.setInteractive({ useHandCursor: true });
    
    // Add click handler
    flagSprite.on('pointerdown', (pointer) => {
      // Stop event propagation to prevent map drag
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      
      // Show flag info
      this.showFlagInfo(flag);
      
      logger.info(LogCategory.FLAG, `Flag clicked: ${flag.id} at ${flag.position.lat}, ${flag.position.lng}`);
    });
    
    // Store the flag sprite
    this.mapManager.mmoPhaserFlags = this.mapManager.mmoPhaserFlags || new Map();
    this.mapManager.mmoPhaserFlags.set(flag.id, flagSprite);
    
    // Emit flag created event
    this.events.emit('serverFlagCreated', flag);
    
    return flagSprite;
  }
  
  /**
   * Remove a server flag
   * @param {string} flagId - Flag ID
   */
  removeServerFlag(flagId) {
    // Check if we have this flag
    if (!this.mapManager.mmoPhaserFlags || !this.mapManager.mmoPhaserFlags.has(flagId)) {
      return;
    }
    
    const flagSprite = this.mapManager.mmoPhaserFlags.get(flagId);
    
    // Remove glow if present
    if (flagSprite.glow) {
      flagSprite.glow.destroy();
    }
    
    // Remove sprite
    flagSprite.destroy();
    
    // Remove from map
    this.mapManager.mmoPhaserFlags.delete(flagId);
    
    // Emit flag removed event
    this.events.emit('serverFlagRemoved', flagId);
  }
  
  /**
   * Update a server flag
   * @param {Object} flag - Flag data
   */
  updateServerFlag(flag) {
    // Remove old flag
    this.removeServerFlag(flag.id);
    
    // Create new flag
    this.createServerFlag(flag);
    
    // Emit flag updated event
    this.events.emit('serverFlagUpdated', flag);
  }
  
  /**
   * Clear all flags
   */
  clearAllFlags() {
    // Clear server flags
    if (this.mapManager.mmoPhaserFlags) {
      for (const [flagId, flagSprite] of this.mapManager.mmoPhaserFlags.entries()) {
        // Remove glow if present
        if (flagSprite.glow) {
          flagSprite.glow.destroy();
        }
        
        // Remove sprite
        flagSprite.destroy();
      }
      
      this.mapManager.mmoPhaserFlags.clear();
    }
    
    // Clear MapManager's flags
    if (this.mapManager.flags) {
      for (const flag of this.mapManager.flags) {
        if (flag.marker) {
          flag.marker.remove();
        }
        if (flag.territory) {
          flag.territory.remove();
        }
      }
      
      this.mapManager.flags = [];
      this.mapManager.territories = [];
    }
  }
  
  /**
   * Show information about a flag
   * @param {Object} flag - Flag data
   */
  showFlagInfo(flag) {
    // Create popup with flag info
    const isOwnFlag = flag.ownerId === this.playerId;
    const isSystemFlag = flag.ownerId === 'system';
    
    // Create flag info popup
    const content = document.createElement('div');
    content.className = 'flag-popup';
    
    // Flag name
    const title = document.createElement('h3');
    title.textContent = flag.name;
    content.appendChild(title);
    
    // Flag owner
    const owner = document.createElement('p');
    owner.textContent = isSystemFlag ? 'System Flag' : 
                        isOwnFlag ? 'Your Flag' : 
                        `Owner: ${flag.ownerId.substring(0, 8)}`;
    content.appendChild(owner);
    
    // Flag type
    const type = document.createElement('p');
    type.textContent = flag.isPublic ? 'Public Flag' : 'Private Flag';
    content.appendChild(type);
    
    // Flag toll if public
    if (flag.isPublic) {
      const toll = document.createElement('p');
      toll.textContent = `Toll: ${flag.toll} gold`;
      content.appendChild(toll);
    }
    
    // Flag status
    if (flag.isHardened) {
      const status = document.createElement('p');
      status.textContent = 'Hardened';
      status.style.color = '#00FFFF';
      status.style.fontWeight = 'bold';
      content.appendChild(status);
    }
    
    // Add teleport button
    const teleportBtn = document.createElement('button');
    teleportBtn.textContent = 'Teleport Here';
    teleportBtn.className = 'flag-teleport-btn';
    teleportBtn.onclick = () => {
      // Close the popup
      this.uiManager.popupSystem.closeCurrentPopup();
      
      // Teleport to flag
      flagService.teleportToFlag(flag.id);
      
      // Show notification
      this.showNotification('Teleporting...', 'info');
    };
    content.appendChild(teleportBtn);
    
    // Add harden button if player owns the flag and it's not hardened
    if (isOwnFlag && !flag.isHardened) {
      const hardenBtn = document.createElement('button');
      hardenBtn.textContent = 'Harden Flag (2 Stone)';
      hardenBtn.className = 'flag-harden-btn';
      hardenBtn.onclick = () => {
        // Close the popup
        this.uiManager.popupSystem.closeCurrentPopup();
        
        // Harden the flag
        flagService.hardenFlag(flag.id);
        
        // Show notification
        this.showNotification('Hardening flag...', 'info');
      };
      content.appendChild(hardenBtn);
    }
    
    // Add remove button if player owns the flag
    if (isOwnFlag) {
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove Flag';
      removeBtn.className = 'flag-remove-btn';
      removeBtn.onclick = () => {
        // Close the popup
        this.uiManager.popupSystem.closeCurrentPopup();
        
        // Remove the flag
        flagService.removeOwnFlag(flag.id);
        
        // Show notification
        this.showNotification('Removing flag...', 'info');
      };
      content.appendChild(removeBtn);
    }
    
    // Show the popup
    this.uiManager.popupSystem.showPopup({
      content: content,
      position: 'center',
      duration: 0, // Stay open until closed
      closeButton: true
    });
  }
  
  /**
   * Color a flag sprite based on ownership
   * @param {Phaser.GameObjects.Image} flagSprite - Flag sprite
   * @param {Object} flag - Flag data
   */
  colorFlagByOwnership(flagSprite, flag) {
    if (flag.ownerId === 'system') {
      // System flags are gold
      flagSprite.setTint(0xFFD700);
    } else if (flag.ownerId === this.playerId) {
      // Player's own flags are green
      flagSprite.setTint(0x00FF00);
    } else if (flag.isPublic) {
      // Public flags are blue
      flagSprite.setTint(0x3498DB);
    } else {
      // Other private flags are red
      flagSprite.setTint(0xFF0000);
    }
  }
  
  /**
   * Teleport the player to a position
   * @param {Object} position - Position {lat, lng}
   * @param {number} visualBoundary - Visual boundary radius
   */
  teleportPlayer(position, visualBoundary) {
    // Update map position
    this.mapManager.jumpToPosition(position.lat, position.lng);
    
    // Update player position
    if (this.playerManager) {
      this.playerManager.updatePlayerPosition();
    }
    
    // Show notification
    this.showNotification(`Teleported to ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`, 'success');
    
    // Emit teleport event
    this.events.emit('playerTeleported', position, visualBoundary);
  }
  
  /**
   * Handle remote player movement
   * @param {Object} data - Movement data
   */
  handleRemotePlayerMovement(data) {
    const { playerId, position, timestamp } = data;
    
    // Ignore self
    if (playerId === this.playerId) {
      return;
    }
    
    // Update or create remote player
    this.updateRemotePlayer(playerId, position);
  }
  
  /**
   * Handle remote player disconnect
   * @param {Object} data - Disconnect data
   */
  handleRemotePlayerDisconnect(data) {
    const { playerId } = data;
    
    // Remove remote player
    this.removeRemotePlayer(playerId);
  }
  
  /**
   * Handle players list
   * @param {Object} data - Players list data
   */
  handlePlayersList(data) {
    const { players, timestamp } = data;
    
    // Update online player count
    this.updateOnlinePlayerCount(players.length + 1); // +1 for self
    
    // Update remote players
    for (const player of players) {
      // Skip self
      if (player.id === this.playerId) {
        continue;
      }
      
      // Update or create remote player
      this.updateRemotePlayer(player.id, player.position, player);
    }
  }
  
  /**
   * Update or create a remote player
   * @param {string} playerId - Player ID
   * @param {Object} position - Position {lat, lng}
   * @param {Object} playerData - Additional player data
   */
  updateRemotePlayer(playerId, position, playerData = null) {
    // Convert lat/lng to pixel coordinates
    const pixelPos = this.mapManager.latLngToPixel(position.lat, position.lng);
    
    // Check if we already have this player
    if (this.remotePlayers.has(playerId)) {
      // Update existing player
      const remotePlayer = this.remotePlayers.get(playerId);
      
      // Tween to new position
      this.tweens.add({
        targets: remotePlayer.sprite,
        x: pixelPos.x,
        y: pixelPos.y,
        duration: 500,
        ease: 'Power2'
      });
      
      // Update player data
      if (playerData) {
        remotePlayer.data = { ...remotePlayer.data, ...playerData };
        
        // Update display name if needed
        if (remotePlayer.nameText && playerData.displayName) {
          remotePlayer.nameText.setText(playerData.displayName);
        }
      }
      
      // Update last updated time
      remotePlayer.lastUpdated = Date.now();
    } else {
      // Create new remote player
      this.createRemotePlayer(playerId, pixelPos, playerData);
    }
  }
  
  /**
   * Create a remote player
   * @param {string} playerId - Player ID
   * @param {Object} pixelPos - Pixel position {x, y}
   * @param {Object} playerData - Player data
   * @returns {Object} - Remote player object
   */
  createRemotePlayer(playerId, pixelPos, playerData = null) {
    // Create player sprite
    const sprite = this.add.sprite(pixelPos.x, pixelPos.y, 'player');
    sprite.setScale(0.5);
    sprite.setDepth(1000);
    
    // Set a different tint to distinguish from local player
    sprite.setTint(0xFF9999);
    
    // Add player name
    const displayName = playerData?.displayName || playerId.substring(0, 8);
    const nameText = this.add.text(pixelPos.x, pixelPos.y - 40, displayName, {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(1001);
    
    // Store remote player data
    const remotePlayer = {
      id: playerId,
      sprite,
      nameText,
      data: playerData || {},
      lastUpdated: Date.now()
    };
    
    // Add to map
    this.remotePlayers.set(playerId, remotePlayer);
    
    // Add to group
    this.remotePlayerGroup.add(sprite);
    
    return remotePlayer;
  }
  
  /**
   * Remove a remote player
   * @param {string} playerId - Player ID
   */
  removeRemotePlayer(playerId) {
    // Check if we have this player
    if (!this.remotePlayers.has(playerId)) {
      return;
    }
    
    // Get remote player
    const remotePlayer = this.remotePlayers.get(playerId);
    
    // Destroy sprite and text
    remotePlayer.sprite.destroy();
    if (remotePlayer.nameText) {
      remotePlayer.nameText.destroy();
    }
    
    // Remove from map
    this.remotePlayers.delete(playerId);
    
    logger.info(LogCategory.PLAYER, `Remote player removed: ${playerId}`);
  }
  
  /**
   * Update the online player count display
   * @param {number} count - Number of online players
   */
  updateOnlinePlayerCount(count) {
    if (this.onlinePlayersText) {
      this.onlinePlayersText.setText(`Online: ${count}`);
    }
  }
  
  /**
   * Update the server status indicator
   */
  updateServerStatusIndicator() {
    if (!this.serverStatusIndicator) {
      return;
    }
    
    if (this.isAuthenticated) {
      // Connected and authenticated: green
      this.serverStatusIndicator.setFillStyle(0x00FF00);
    } else if (this.isConnected) {
      // Connected but not authenticated: yellow
      this.serverStatusIndicator.setFillStyle(0xFFFF00);
    } else {
      // Not connected: red
      this.serverStatusIndicator.setFillStyle(0xFF0000);
    }
  }
  
  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   */
  showNotification(message, type = 'info') {
    if (this.uiManager?.notificationManager) {
      this.uiManager.notificationManager.showMessage(message, type, 3000);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
  
  /**
   * Request nearby players
   */
  requestNearbyPlayers() {
    // Only request when connected
    if (!this.isAuthenticated) {
      return;
    }
    
    // Get player position
    const playerPos = this.mapManager.playerPosition;
    if (!playerPos) {
      return;
    }
    
    // Create a bounding box around the player
    const boundingBox = {
      minLat: playerPos.lat - 0.01, // Approximately 1km
      maxLat: playerPos.lat + 0.01,
      minLng: playerPos.lng - 0.01,
      maxLng: playerPos.lng + 0.01
    };
    
    // Request players in this bounding box
    webSocketClient.getPlayersInBounds(boundingBox);
  }
  
  /**
   * Send player position to the server
   */
  sendPlayerPosition() {
    // Only send when connected
    if (!this.isAuthenticated) {
      return;
    }
    
    // Get player position
    const playerPos = this.mapManager.getPlayerPosition();
    if (!playerPos) {
      return;
    }
    
    // Send position update
    webSocketClient.sendPlayerMove(playerPos);
    
    // Update flagService with player position
    flagService.updatePlayerPosition(playerPos);
  }
  
  /**
   * Update method - called each frame
   * @param {number} time - Current time
   * @param {number} delta - Time since last update
   */
  update(time, delta) {
    // Call parent update
    super.update(time, delta);
    
    // Update server status indicator
    this.updateServerStatusIndicator();
    
    // Update remote player name positions
    for (const remotePlayer of this.remotePlayers.values()) {
      if (remotePlayer.nameText && remotePlayer.sprite) {
        remotePlayer.nameText.x = remotePlayer.sprite.x;
        remotePlayer.nameText.y = remotePlayer.sprite.y - 40;
      }
    }
    
    // Update server flag positions
    if (this.mapManager.mmoPhaserFlags) {
      for (const [flagId, flagSprite] of this.mapManager.mmoPhaserFlags.entries()) {
        const flag = flagSprite.flagData;
        const pixelPos = this.mapManager.latLngToPixel(flag.position.lat, flag.position.lng);
        
        // Update sprite position
        flagSprite.x = pixelPos.x;
        flagSprite.y = pixelPos.y;
        
        // Update glow position if present
        if (flagSprite.glow) {
          flagSprite.glow.x = pixelPos.x;
          flagSprite.glow.y = pixelPos.y - 10;
        }
      }
    }
    
    // Send player position at regular intervals
    if (this.isAuthenticated && this.nextPositionUpdate < time) {
      this.sendPlayerPosition();
      this.nextPositionUpdate = time + 2000; // Every 2 seconds
    }
  }
  
  /**
   * Shutdown the scene
   */
  shutdown() {
    // Disconnect from server
    if (webSocketClient.isConnected) {
      webSocketClient.disconnect();
    }
    
    // Call parent shutdown
    super.shutdown();
  }
} 