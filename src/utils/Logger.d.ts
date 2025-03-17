/**
 * Log categories based on the systems in the game
 */
export enum LogCategory {
    BOOT = 'BOOT',
    GENERAL = 'GENERAL',
    PLAYER = 'PLAYER',
    COMBAT = 'COMBAT',
    INVENTORY = 'INVENTORY',
    EQUIPMENT = 'EQUIPMENT',
    MONSTER = 'MONSTER',
    ENVIRONMENT = 'ENVIRONMENT',
    DUNGEON = 'DUNGEON',
    UI = 'UI',
    MAP = 'MAP',
    FLAG = 'FLAG',
    SKILL = 'SKILL',
    SKILLS = 'SKILLS',
    GAME = 'GAME',
    MMO = 'MMO',
    POSITION = 'POSITION',
    NETWORK = 'NETWORK',
    DEBUG = 'DEBUG',
    MENU = 'MENU',
    CHAT = 'CHAT',
    HEALTH = 'HEALTH',
    ASSETS = 'ASSETS',
    ITEMS = 'ITEMS'
}

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Logger interface
 */
export interface ILogger {
    debug(category: LogCategory, message: string, ...args: any[]): void;
    info(category: LogCategory, message: string, ...args: any[]): void;
    warn(category: LogCategory, message: string, ...args: any[]): void;
    error(category: LogCategory, message: string, ...args: any[]): void;
    setEnabled(enabled: boolean): void;
    setLevel(level: LogLevel): void;
    setCategory(category: LogCategory, enabled: boolean): void;
    setUseColors(useColors: boolean): void;
    enableAllCategories(): void;
    disableAllCategories(): void;
    isCategoryEnabled(category: LogCategory): boolean;
    getCategories(): Array<{category: string, enabled: boolean}>;
}

/**
 * Singleton logger instance
 */
export const logger: ILogger; 