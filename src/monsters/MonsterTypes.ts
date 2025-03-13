export enum MonsterType {
    STAG = 'stag',
    WOLF = 'wolf',
    BEAR = 'bear',
    BOAR = 'boar',
}

export enum MonsterBehavior {
    PASSIVE = 'passive',     // Runs away when attacked, never attacks
    NEUTRAL = 'neutral',     // Only attacks when provoked
    AGGRESSIVE = 'aggressive', // Attacks player on sight
    TERRITORIAL = 'territorial' // Attacks when player enters territory
}

export interface MonsterAttributes {
    health: number;
    maxHealth: number;
    damage: number;
    defense: number;
    speed: number;
    detectionRadius: number; // How far the monster can detect the player
    fleeRadius?: number;     // How far the monster flees when scared
    aggroRadius?: number;    // How far the monster will chase the player
    returnRadius?: number;   // How far from spawn point before returning
}

export interface MonsterLoot {
    itemId: string;
    minQuantity: number;
    maxQuantity: number;
    dropChance: number; // 0-1 probability
}

export interface MonsterData {
    type: MonsterType;
    name: string;
    behavior: MonsterBehavior;
    attributes: MonsterAttributes;
    lootTable: MonsterLoot[];
    spriteKey: string;
    scale?: number;
    goldReward?: number;
    xpReward?: number;
}

export enum MonsterState {
    IDLE = 'idle',
    WANDERING = 'wandering',
    FLEEING = 'fleeing',
    CHASING = 'chasing',
    ATTACKING = 'attacking',
    RETURNING = 'returning',
    DEAD = 'dead'
} 