/**
 * Global combat configuration parameters
 * This file centralizes all combat-related settings for easy balancing
 */

export const CombatConfig = {
    // Monster attack settings
    MONSTER_ATTACK: {
        BASE_COOLDOWN: 2000,         // Base cooldown for all monster attacks (2 seconds)
        BOSS_COOLDOWN_MODIFIER: 0.8,  // Bosses attack 20% faster than regular monsters
        MIN_COOLDOWN: 1000,          // Minimum cooldown for any monster attack (1 second)
        TELEGRAPH_TIME: 500,         // Time in ms to telegraph an attack before it hits
    },
    
    // Player attack settings
    PLAYER_ATTACK: {
        BASE_COOLDOWN: 1000,         // Base cooldown for player attacks (1 second)
        CRITICAL_CHANCE: 0.1,        // 10% chance for critical hit
        CRITICAL_MULTIPLIER: 2.0,    // Critical hits do double damage
    },
    
    // Combat mechanics
    MECHANICS: {
        DODGE_CHANCE_BASE: 0.05,     // Base 5% chance to dodge attacks
        BLOCK_CHANCE_BASE: 0.05,     // Base 5% chance to block attacks
        DEFENSE_EFFECTIVENESS: 0.5,  // How effective defense stat is (0.5 = 50% damage reduction at equal defense/damage)
    },
    
    // Retaliation system
    RETALIATION: {
        COOLDOWN: 1500,              // Cooldown for retaliation attacks (1.5 seconds)
        RANGE: 100,                  // Range at which player can retaliate
        DAMAGE_MODIFIER: 0.8,        // Retaliation attacks do 80% of normal damage
    },
    
    // Combat balance by monster type
    MONSTER_TYPE_MODIFIERS: {
        // Format: [attack_speed_mod, damage_mod, defense_mod]
        'stag': [1.2, 0.8, 0.7],     // Fast but weak
        'wolf': [1.1, 1.0, 0.8],     // Fast, average damage
        'bear': [0.7, 1.3, 1.2],     // Slow, high damage, tanky
        'boar': [0.9, 1.1, 1.0],     // Average
        'dragon': [0.6, 1.5, 1.3],   // Very slow, very high damage, very tanky
        'ogre': [0.5, 1.4, 1.4],     // Very slow, high damage, very tanky
        'lizardfolk': [1.0, 1.0, 1.0] // Average all around
    }
}; 