import { MonsterData, MonsterType, MonsterBehavior } from '../MonsterTypes';

// Define boss monsters (stronger, more challenging enemies)
export const bossMonsterDefinitions: MonsterData[] = [
    // Bear - powerful territorial beast
    {
        type: MonsterType.BEAR,
        name: 'Grizzly Bear',
        behavior: MonsterBehavior.TERRITORIAL,
        attributes: {
            health: 150,
            maxHealth: 150,
            damage: 10,
            defense: 8,
            speed: 90,
            detectionRadius: 180,
            aggroRadius: 220,
            returnRadius: 300
        },
        lootTable: [
            {
                itemId: 'bear_pelt',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.9
            },
            {
                itemId: 'bear_claw',
                minQuantity: 1,
                maxQuantity: 3,
                dropChance: 0.7
            },
            {
                itemId: 'meat',
                minQuantity: 3,
                maxQuantity: 6,
                dropChance: 0.8
            }
        ],
        spriteKey: 'grizzly',
        scale: .90,
        goldReward: 50,
        xpReward: 100,
        isBoss: true
    },
    
    // Ogre - brutish and strong
    {
        type: MonsterType.OGRE,
        name: 'Mountain Ogre',
        behavior: MonsterBehavior.AGGRESSIVE,
        attributes: {
            health: 200,
            maxHealth: 200,
            damage: 12,
            defense: 10,
            speed: 70,
            detectionRadius: 150,
            aggroRadius: 200,
            returnRadius: 250
        },
        lootTable: [
            {
                itemId: 'ogre_club',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.5
            },
            {
                itemId: 'gold_pouch',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.8
            }
        ],
        spriteKey: 'ogre',
        scale: 1,
        goldReward: 100,
        xpReward: 150,
        isBoss: true
    },
    
    // Dragon - powerful flying beast
    {
        type: MonsterType.DRAGON,
        name: 'Black Dragon',
        behavior: MonsterBehavior.AGGRESSIVE,
        attributes: {
            health: 300,
            maxHealth: 300,
            damage: 15,
            defense: 15,
            speed: 100,
            detectionRadius: 250,
            aggroRadius: 300,
            returnRadius: 400
        },
        lootTable: [
            {
                itemId: 'dragon_scale',
                minQuantity: 2,
                maxQuantity: 5,
                dropChance: 0.9
            },
            {
                itemId: 'dragon_tooth',
                minQuantity: 1,
                maxQuantity: 3,
                dropChance: 0.7
            },
            {
                itemId: 'rare_gem',
                minQuantity: 1,
                maxQuantity: 2,
                dropChance: 0.5
            }
        ],
        spriteKey: 'dragon',
        scale: 1,
        goldReward: 200,
        xpReward: 300,
        isBoss: true
    },
    
    // Lizardfolk King - ruler of the Lost Swamp
    {
        type: MonsterType.LIZARDFOLK_KING,
        name: 'Lizardfolk King',
        behavior: MonsterBehavior.AGGRESSIVE,
        attributes: {
            health: 500,
            maxHealth: 500,
            damage: 25,
            defense: 15,
            speed: 80,
            detectionRadius: 220,
            aggroRadius: 250,
            returnRadius: 300
        },
        lootTable: [
            {
                itemId: 'crown-of-the-lizard-king',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 1.0
            },
            {
                itemId: 'royal-lizard-scale',
                minQuantity: 2,
                maxQuantity: 5,
                dropChance: 0.9
            },
            {
                itemId: 'swamp-treasure',
                minQuantity: 1,
                maxQuantity: 1,
                dropChance: 0.7
            }
        ],
        spriteKey: 'lizardfolk-king',
        scale: 2.0,
        goldReward: 500,
        xpReward: 1000,
        isBoss: true
    }
]; 