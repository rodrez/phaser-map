import { MonsterData, MonsterType, MonsterBehavior } from '../MonsterTypes';

// Define basic monsters (common enemies)
export const basicMonsterDefinitions: MonsterData[] = [
    // Stag - peaceful but defends itself
    {
        type: MonsterType.STAG,
        name: 'Stag',
        behavior: MonsterBehavior.NEUTRAL,
        attributes: {
            health: 40,
            maxHealth: 40,
            damage: 5,
            defense: 2,
            speed: 110,
            detectionRadius: 150,
            fleeRadius: 200,
            aggroRadius: 100
        },
        lootTable: [
            {
                itemId: 'leather',
                minQuantity: 1,
                maxQuantity: 3,
                dropChance: 0.9
            }
        ],
        spriteKey: 'deer',
        scale: 1,
        goldReward: 5,
        xpReward: 10
    },
    
    // Wolf - aggressive predator
    {
        type: MonsterType.WOLF,
        name: 'Wolf',
        behavior: MonsterBehavior.AGGRESSIVE,
        attributes: {
            health: 60,
            maxHealth: 60,
            damage: 7,
            defense: 2,
            speed: 120,
            detectionRadius: 200,
            aggroRadius: 250,
            returnRadius: 300
        },
        lootTable: [
            {
                itemId: 'wolf_pelt',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.7
            },
            {
                itemId: 'wolf_fang',
                minQuantity: 1,
                maxQuantity: 2,
                dropChance: 0.5
            }
        ],
        spriteKey: 'wolf',
        scale: 1,
        goldReward: 10,
        xpReward: 20
    },
    
    // Boar - territorial and aggressive
    {
        type: MonsterType.BOAR,
        name: 'Wild Boar',
        behavior: MonsterBehavior.TERRITORIAL,
        attributes: {
            health: 80,
            maxHealth: 80,
            damage: 12,
            defense: 5,
            speed: 100,
            detectionRadius: 150,
            aggroRadius: 180,
            returnRadius: 250
        },
        lootTable: [
            {
                itemId: 'leather',
                minQuantity: 1,
                maxQuantity: 2,
                dropChance: 0.8
            },
            {
                itemId: 'meat',
                minQuantity: 2,
                maxQuantity: 4,
                dropChance: 0.9
            }
        ],
        spriteKey: 'boar',
        scale: 1,
        goldReward: 15,
        xpReward: 25
    },
    
    // Lizardfolk - tribal warrior
    {
        type: MonsterType.LIZARDFOLK,
        name: 'Lizardfolk Scout',
        behavior: MonsterBehavior.TERRITORIAL,
        attributes: {
            health: 70,
            maxHealth: 70,
            damage: 15,
            defense: 3,
            speed: 90,
            detectionRadius: 180,
            aggroRadius: 200,
            returnRadius: 280
        },
        lootTable: [
            {
                itemId: 'leather',
                minQuantity: 1,
                maxQuantity: 2,
                dropChance: 0.7
            },
            {
                itemId: 'spear',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.3
            }
        ],
        spriteKey: 'lizardfolk',
        scale: 1,
        goldReward: 20,
        xpReward: 30
    }
]; 