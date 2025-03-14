import { MonsterData, MonsterType, MonsterBehavior } from '../MonsterTypes';
import { logger, LogCategory } from '../../utils/Logger';

// Central registry for all monster definitions
export class MonsterRegistry {
    private static instance: MonsterRegistry;
    private definitions: Map<string, MonsterData> = new Map();
    
    private constructor() {
        // Private constructor for singleton pattern
    }
    
    // Get the singleton instance
    public static getInstance(): MonsterRegistry {
        if (!MonsterRegistry.instance) {
            MonsterRegistry.instance = new MonsterRegistry();
        }
        return MonsterRegistry.instance;
    }
    
    // Register a single monster definition
    public registerDefinition(definition: MonsterData): void {
        if (this.definitions.has(definition.type)) {
            logger.warn(
                LogCategory.MONSTER, 
                `Monster definition with type ${definition.type} already exists, overwriting`
            );
        }
        
        this.definitions.set(definition.type, definition);
        logger.debug(LogCategory.MONSTER, `Registered monster definition: ${definition.name} (${definition.type})`);
    }
    
    // Register multiple monster definitions
    public registerDefinitions(definitions: MonsterData[]): void {
        definitions.forEach(definition => this.registerDefinition(definition));
    }
    
    // Get a monster definition by type
    public getDefinition(type: MonsterType): MonsterData | undefined {
        return this.definitions.get(type);
    }
    
    // Get all monster definitions
    public getAllDefinitions(): MonsterData[] {
        return Array.from(this.definitions.values());
    }
    
    // Check if a monster definition exists
    public hasDefinition(type: MonsterType): boolean {
        return this.definitions.has(type);
    }
    
    // Clear all definitions (useful for testing)
    public clearDefinitions(): void {
        this.definitions.clear();
    }
} 