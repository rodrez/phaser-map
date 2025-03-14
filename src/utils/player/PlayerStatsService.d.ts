import { EventEmitter } from 'events';
import { PlayerStats } from '../../skills/skill-effect-system';

/**
 * PlayerStatsService - Single source of truth for all player stats
 * This service manages all player statistics and provides methods to modify them
 */
export class PlayerStatsService extends EventEmitter {
    /**
     * The player stats object
     */
    stats: PlayerStats & {
        health: number;
        maxHealth: number;
        godMode: boolean;
    };

    /**
     * Get all player stats
     * @returns The player stats object
     */
    getStats(): PlayerStats & {
        health: number;
        maxHealth: number;
        godMode: boolean;
    };

    /**
     * Get a specific stat value
     * @param statName - The name of the stat to get
     * @returns The value of the stat
     */
    getStat(statName: string): any;

    /**
     * Set a specific stat value
     * @param statName - The name of the stat to set
     * @param value - The value to set
     * @param silent - Whether to emit the stats-changed event
     */
    setStat(statName: string, value: any, silent?: boolean): void;

    /**
     * Update multiple stats at once
     * @param statsUpdate - Object with stat names and values to update
     * @param silent - Whether to emit the stats-changed event
     */
    updateStats(statsUpdate: Partial<PlayerStats>, silent?: boolean): void;

    /**
     * Apply damage to the player
     * @param damage - The amount of damage to apply
     * @param source - The source of the damage
     * @returns The actual damage applied
     */
    takeDamage(damage: number, source?: string): number;

    /**
     * Heal the player by a specific amount
     * @param amount - The amount to heal
     * @param source - The source of healing
     * @returns The actual amount healed
     */
    heal(amount: number, source?: string): number;

    /**
     * Toggle god mode
     * @returns The new god mode state
     */
    toggleGodMode(): boolean;

    /**
     * Check if god mode should trigger healing
     * @returns The amount healed, if any
     */
    checkGodModeHealing(): number;
}

/**
 * Singleton instance of PlayerStatsService
 */
declare const playerStatsService: PlayerStatsService;

export default playerStatsService; 