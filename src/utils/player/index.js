/**
 * Player management module exports
 * This file exports all player-related classes for easier imports in other parts of the application
 */

export { CorePlayerManager } from './CorePlayerManager';
export { PlayerInteractionManager } from './PlayerInteractionManager';
export { PlayerStatsManager } from './PlayerStatsManager';
export { PlayerDebugManager } from './PlayerDebugManager';
export { PlayerManager } from './PlayerManager';
export { PlayerHealthSystem } from './PlayerHealthSystem';
export { PlayerStatsService, playerStatsService } from './PlayerStatsService';

// Default export for convenience
export default { PlayerManager, playerStatsService }; 