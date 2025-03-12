import { Scene } from "phaser";

/**
 * FlagManager class to handle all flag-related functionality
 * This class manages flag generation, placement, and interactions
 */
export class FlagManager {
  /**
   * Constructor for the FlagManager
   * @param {Scene} scene - The Phaser scene this manager belongs to
   * @param {Object} mapManager - The MapManager instance
   */
  constructor(scene, mapManager) {
    this.scene = scene;
    this.mapManager = mapManager;

    // Generate initial flag positions
    this.generateFlags();
  }

  /**
   * Generate flags at random positions
   * @param {number} count - Number of flags to generate
   */
  generateFlags(count = 5) {
    // Get available flag positions
    const positions = this.mapManager.getAvailableFlagPositions(count);

    // Add flags
    for (const position of positions) {
      this.mapManager.addFlag(position.lat, position.lng);
    }
  }

  /**
   * Place a flag at the player's current position
   * @returns {Object|null} - The flag object if successful, null otherwise
   */
  placeFlag() {
    // Try to add a flag at the player's current position
    return this.mapManager.addFlagAtPlayerPosition();
  }

  /**
   * Get the current number of flags
   * @returns {number} - The number of flags
   */
  getFlagCount() {
    return this.mapManager.flags.length;
  }
}

