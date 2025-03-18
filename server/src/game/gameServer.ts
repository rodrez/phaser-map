import { WebSocket } from 'ws';
import { PlayerMovementMessage, NetworkMessage } from 'shared';
import { getDb } from '../database';
import { createGeoSpatialHashGrid } from './geoSpatialHashGrid';

/**
 * Player interface
 */
interface Player {
  id: string;
  username: string;
  socket: WebSocket;
  position?: { lat: number; lng: number };
  lastUpdate?: number;
}

/**
 * Game server implementation
 */
export function createGameServer() {
  // Players currently connected
  const players: Map<string, Player> = new Map();
  
  // Spatial hash grid for efficient spatial queries based on lat/lng
  const grid = createGeoSpatialHashGrid(500); // 500 meters per grid cell
  
  // Game loop variables
  let gameLoopInterval: NodeJS.Timeout | null = null;
  const TICK_RATE = parseInt(process.env.TICK_RATE || '20', 10);
  const TICK_INTERVAL = 1000 / TICK_RATE;
  
  /**
   * Start the game loop
   */
  function start() {
    if (gameLoopInterval) return;
    
    console.log(`Starting game loop with tick rate: ${TICK_RATE} ticks per second`);
    
    let lastTick = Date.now();
    
    gameLoopInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastTick) / 1000; // in seconds
      lastTick = now;
      
      // Update game state
      update(deltaTime);
      
    }, TICK_INTERVAL);
  }
  
  /**
   * Stop the game loop
   */
  function stop() {
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
      console.log('Game loop stopped');
    }
  }
  
  /**
   * Update game state
   * @param deltaTime Time since last update in seconds
   */
  function update(deltaTime: number) {
    // Process players
    for (const [playerId, player] of players.entries()) {
      // Update player state based on game logic
      // ...
    }
    
    // Process world events, NPCs, monsters, etc.
    // ...
  }
  
  /**
   * Add a player to the game
   * @param player Player to add
   */
  function addPlayer(player: Player) {
    players.set(player.id, player);
    console.log(`Player added: ${player.username} (${player.id})`);
    
    // Initialize player position if not set
    if (!player.position) {
      player.position = { lat: 51.505, lng: -0.09 }; // Default starting position (London)
    }
    
    // Add to spatial grid
    grid.addEntity(player.id, player.position.lat, player.position.lng);
    
    return player;
  }
  
  /**
   * Remove a player from the game
   * @param playerId ID of the player to remove
   */
  function removePlayer(playerId: string) {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Remove from spatial grid
    grid.removeEntity(playerId);
    
    // Remove from players map
    players.delete(playerId);
    console.log(`Player removed: ${player.username} (${playerId})`);
    
    return true;
  }
  
  /**
   * Update player position
   * @param playerId ID of the player to update
   * @param data Position data
   */
  function updatePlayerPosition(playerId: string, data: PlayerMovementMessage) {
    const player = players.get(playerId);
    if (!player) return false;
    
    // Convert from client format if needed
    const lat = typeof data.lat === 'number' ? data.lat : data.position?.lat;
    const lng = typeof data.lng === 'number' ? data.lng : data.position?.lng;
    
    if (lat === undefined || lng === undefined) {
      console.error('Invalid position data:', data);
      return false;
    }
    
    // Update player position
    player.position = { lat, lng };
    player.lastUpdate = Date.now();
    
    // Update spatial grid
    grid.updateEntity(playerId, lat, lng);
    
    return true;
  }
  
  /**
   * Get nearby players
   * @param playerId ID of the reference player
   * @param radius Radius to search in meters
   * @returns Array of player IDs
   */
  function getNearbyPlayers(playerId: string, radius: number = 1000): string[] {
    const player = players.get(playerId);
    if (!player || !player.position) return [];
    
    return grid.getNearbyEntities(player.position.lat, player.position.lng, radius);
  }
  
  /**
   * Calculate distance between two players in meters
   * @param player1Id First player ID
   * @param player2Id Second player ID
   * @returns Distance in meters or -1 if either player doesn't exist
   */
  function getDistanceBetweenPlayers(player1Id: string, player2Id: string): number {
    const player1 = players.get(player1Id);
    const player2 = players.get(player2Id);
    
    if (!player1 || !player2 || !player1.position || !player2.position) {
      return -1;
    }
    
    return grid.haversineDistance(
      player1.position.lat,
      player1.position.lng,
      player2.position.lat,
      player2.position.lng
    );
  }
  
  /**
   * Broadcast a message to all players
   * @param message Message to broadcast
   * @param excludeIds Array of player IDs to exclude
   */
  function broadcastToAll(message: NetworkMessage<any>, excludeIds: string[] = []) {
    const messageString = JSON.stringify(message);
    
    players.forEach((player, id) => {
      if (!excludeIds.includes(id) && player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(messageString);
      }
    });
  }
  
  /**
   * Broadcast a message to nearby players
   * @param originId Origin player ID
   * @param message Message to broadcast
   * @param radius Radius in which to broadcast in meters
   * @param includeOrigin Whether to include the origin player
   */
  function broadcastToNearby(
    originId: string,
    message: NetworkMessage<any>,
    radius: number = 1000,
    includeOrigin: boolean = false
  ) {
    const messageString = JSON.stringify(message);
    const nearbyIds = getNearbyPlayers(originId, radius);
    
    nearbyIds.forEach(id => {
      if ((id !== originId || includeOrigin) && players.has(id)) {
        const player = players.get(id)!;
        if (player.socket.readyState === WebSocket.OPEN) {
          player.socket.send(messageString);
        }
      }
    });
  }
  
  return {
    start,
    stop,
    addPlayer,
    removePlayer,
    updatePlayerPosition,
    getNearbyPlayers,
    getDistanceBetweenPlayers,
    broadcastToAll,
    broadcastToNearby,
    
    // Accessor methods
    getPlayerCount: () => players.size,
    getPlayers: () => Array.from(players.values()),
    getPlayerPosition: (playerId: string) => {
      const player = players.get(playerId);
      return player?.position || null;
    }
  };
} 