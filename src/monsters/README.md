# Monster System Documentation

This document provides an overview of the monster system, how it works, and how to use it in your game.

## Overview

The monster system is designed to be flexible, maintainable, and easy to extend. It consists of several key components:

1. **Monster Registry**: A central repository for all monster definitions
2. **Monster System**: Manages monster creation and lifecycle
3. **Monster Factory**: Creates monster instances based on type
4. **Base Monster**: Abstract base class for all monsters
5. **Monster Types**: Specific monster implementations with unique behaviors

## Directory Structure

```
src/monsters/
├── definitions/            # Monster definitions
│   ├── basic-monsters.ts   # Common monster definitions
│   ├── boss-monsters.ts    # Boss monster definitions
│   ├── monster-registry.ts # Monster registry class
│   └── index.ts            # Exports all definitions
├── BaseMonster.ts          # Abstract base monster class
├── MonsterFactory.ts       # Factory for creating monsters
├── MonsterSystem.ts        # Monster management system
├── MonsterTypes.ts         # Type definitions and enums
├── Stag.ts                 # Stag monster implementation
├── Wolf.ts                 # Wolf monster implementation
├── Boar.ts                 # Boar monster implementation
├── Lizardfolk.ts           # Lizardfolk monster implementation
├── Dragon.ts               # Dragon monster implementation
├── Ogre.ts                 # Ogre monster implementation
└── index.ts                # Exports all monster components
```

## Monster Registry

The Monster Registry is the central source of truth for all monster definitions. It provides methods for registering, retrieving, and creating monsters from definitions.

### Key Features

- **Single Source of Truth**: All monster definitions are stored in one place
- **Type Safety**: TypeScript interfaces ensure correct monster definitions
- **Easy Registration**: Simple methods for registering new monsters
- **Monster Creation**: Methods for creating monster instances from definitions

### Usage

```typescript
// Get the registry instance
const registry = MonsterRegistry.getInstance();

// Get a monster definition by type
const stagDefinition = registry.getDefinition(MonsterType.STAG);

// Check if a monster definition exists
const hasDragon = registry.hasDefinition(MonsterType.DRAGON);

// Get all monster definitions
const allMonsters = registry.getAllDefinitions();
```

## Monster System

The Monster System manages the creation, updating, and destruction of monsters in the game. It uses the Monster Registry to create monsters and the Monster Factory to instantiate them.

### Key Features

- **Dynamic Loading**: Loads monster definitions from the registry
- **Fallback Mechanism**: Falls back to legacy methods if loading fails
- **Spawn Management**: Controls monster spawning and population
- **Update Loop**: Updates all monsters each frame

### Usage

```typescript
// Create a monster system in a Phaser scene
this.monsterSystem = new MonsterSystem(
    this,
    this.mapManager,
    this.playerManager,
    this.itemSystem
);

// Spawn a specific monster
const dragon = this.monsterSystem.spawnMonster(
    MonsterType.DRAGON,
    x,
    y
);

// Spawn random monsters
this.monsterSystem.spawnRandomMonsters(5, 500);

// Update all monsters (called in scene update)
this.monsterSystem.update(time, delta);

// Get all monsters
const monsters = this.monsterSystem.getMonsters();
```

## Monster Factory

The Monster Factory creates monster instances based on their type. It acts as a bridge between the Monster System and the specific monster implementations.

### Key Features

- **Type-Based Creation**: Creates the appropriate monster class based on type
- **Fallback Handling**: Provides fallbacks for unimplemented monster types
- **Centralized Creation**: Single point for monster instantiation

### Usage

```typescript
// Create a monster using the factory
const monster = MonsterFactory.createMonster(
    scene,
    x,
    y,
    monsterData,
    playerSprite,
    itemSystem
);
```

## Base Monster

The Base Monster is an abstract class that all monster implementations extend. It provides common functionality and defines the interface that all monsters must implement.

### Key Features

- **State Machine**: Handles monster states (idle, wandering, chasing, etc.)
- **Health System**: Manages monster health and damage
- **Animation System**: Handles monster animations
- **Loot System**: Drops items when monster dies
- **Abstract Methods**: Defines methods that must be implemented by subclasses

### Usage

```typescript
// Extend BaseMonster to create a new monster type
export class MyCustomMonster extends BaseMonster {
    constructor(scene, x, y, monsterData, playerSprite, itemSystem) {
        super(scene, x, y, monsterData, playerSprite, itemSystem);
        
        // Custom setup code here
    }
    
    // Implement required abstract methods
    protected handleIdleState(time, delta, distToPlayer) {
        // Custom idle behavior
    }
    
    protected handleWanderingState(time, delta, distToPlayer) {
        // Custom wandering behavior
    }
    
    // ... other required methods
}
```

## Monster Types

Each monster type is implemented as a separate class that extends the Base Monster. These classes define the unique behaviors and abilities of each monster.

### Available Monster Types

- **Stag**: Peaceful herbivore that flees when threatened
- **Wolf**: Aggressive predator that hunts in packs
- **Boar**: Territorial beast with a charging attack
- **Lizardfolk**: Tactical fighter with ambush abilities
- **Dragon**: Powerful flying monster with breath attacks
- **Ogre**: Strong brute with slam attacks and rage mode

### Adding a New Monster Type

To add a new monster type:

1. Add the type to the `MonsterType` enum in `MonsterTypes.ts`
2. Create a new class that extends `BaseMonster`
3. Implement all required abstract methods
4. Add the monster definition to the appropriate definition file
5. Update the `MonsterFactory` to create instances of your new monster

Example:

```typescript
// 1. Add to MonsterType enum
export enum MonsterType {
    // ... existing types
    MY_MONSTER = 'my_monster'
}

// 2 & 3. Create class and implement methods
export class MyMonster extends BaseMonster {
    // ... implementation
}

// 4. Add definition
const myMonsterDefinition: MonsterData = {
    type: MonsterType.MY_MONSTER,
    name: 'My Monster',
    // ... other properties
};

// 5. Update factory
case MonsterType.MY_MONSTER:
    return new MyMonster(scene, x, y, monsterData, playerSprite, itemSystem);
```

## Monster Behaviors

Monsters can have different behaviors that determine how they interact with the player:

- **Passive**: Never attacks, always runs away when threatened
- **Neutral**: Only attacks when provoked
- **Aggressive**: Attacks player on sight
- **Territorial**: Attacks when player enters its territory

These behaviors are defined in the `MonsterBehavior` enum and set in the monster definition.

## Monster States

Monsters use a state machine to manage their behavior. The available states are:

- **Idle**: Monster is standing still
- **Wandering**: Monster is moving randomly
- **Fleeing**: Monster is running away from the player
- **Chasing**: Monster is pursuing the player
- **Returning**: Monster is returning to its spawn point
- **Dead**: Monster is dead

Each monster type implements its own handling for these states in the required abstract methods.

## Conclusion

The monster system provides a flexible and extensible framework for creating and managing monsters in your game. By using the registry pattern and object-oriented design, it's easy to add new monster types and behaviors without modifying existing code. 