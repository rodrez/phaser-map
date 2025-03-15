/**
 * Logger System
 * 
 * A flexible logging system that allows toggling different categories of logs.
 * This helps with debugging specific systems while keeping the console clean.
 */

/**
 * @typedef {Object} LoggerConfig
 * @property {boolean} enabled - Whether logging is enabled
 * @property {number} level - Minimum log level to display
 * @property {Object.<string, boolean>} categories - Enabled/disabled state for each category
 * @property {boolean} useColors - Whether to use colors in log output
 */

/**
 * Log categories based on the systems in the game
 * @enum {string}
 */
export const LogCategory = {
    BOOT: 'BOOT',
    GENERAL: 'GENERAL',
    PLAYER: 'PLAYER',
    COMBAT: 'COMBAT',
    INVENTORY: 'INVENTORY',
    EQUIPMENT: 'EQUIPMENT',
    MONSTER: 'MONSTER',
    ENVIRONMENT: 'ENVIRONMENT',
    UI: 'UI',
    MAP: 'MAP',
    FLAG: 'FLAG',
    SKILL: 'SKILL',
    SKILLS: 'SKILLS',
    GAME: 'GAME',
    MMO: 'MMO',
    POSITION: 'POSITION',
    NETWORK: 'NETWORK',
    DEBUG: 'DEBUG',
    MENU: 'MENU',
    CHAT: 'CHAT',
    HEALTH: 'HEALTH',
    AUTH: 'AUTH',     // Authentication and login-related logs
    ASSETS: 'ASSETS', // Asset loading logs
    DUNGEON: 'DUNGEON', // Dungeon system logs

    // Add more categories as needed
};

/**
 * Log levels
 * @enum {number}
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

/**
 * Logger class for flexible logging with categories and levels
 */
export class Logger {
    /** @type {Logger} */
    static #instance;
    
    /** @type {LoggerConfig} */
    #config;
    
    /**
     * Color codes for different log levels
     * @type {Object.<number, string>}
     */
    #colors = {
        [LogLevel.DEBUG]: '#9999ff',
        [LogLevel.INFO]: '#33cc33',
        [LogLevel.WARN]: '#ffcc00',
        [LogLevel.ERROR]: '#ff3333',
    };
    
    /**
     * Category colors
     * @type {Object.<string, string>}
     */
    #categoryColors = {
        [LogCategory.PLAYER]: '#ff9966',
        [LogCategory.COMBAT]: '#ff6666',
        [LogCategory.INVENTORY]: '#66ccff',
        [LogCategory.EQUIPMENT]: '#cc99ff',
        [LogCategory.MONSTER]: '#ff6699',
        [LogCategory.MAP]: '#99cc66',
        [LogCategory.MMO]: '#ffcc66',
        [LogCategory.UI]: '#66ffcc',
        [LogCategory.SKILL]: '#cc66ff',
        [LogCategory.ENVIRONMENT]: '#99ff99',
        [LogCategory.POSITION]: '#ffff66',
        [LogCategory.NETWORK]: '#66cccc',
        [LogCategory.GENERAL]: '#cccccc',
        [LogCategory.FLAG]: '#ff6666',
        [LogCategory.MENU]: '#ff9966',
        [LogCategory.CHAT]: '#ff6699',
    };

    /**
     * Private constructor for singleton pattern
     */
    constructor() {
        // Default configuration
        this.#config = {
            enabled: true,
            level: LogLevel.DEBUG,
            categories: Object.values(LogCategory).reduce((acc, category) => {
                acc[category] = true;
                return acc;
            }, {}),
            useColors: true,
        };

        // Try to load configuration from localStorage
        this.#loadConfig();
    }

    /**
     * Get the singleton instance of the Logger
     * @returns {Logger} The logger instance
     */
    static getInstance() {
        if (!Logger.#instance) {
            Logger.#instance = new Logger();
        }
        return Logger.#instance;
    }

    /**
     * Save the current configuration to localStorage
     * @private
     */
    #saveConfig() {
        try {
            localStorage.setItem('logger_config', JSON.stringify(this.#config));
        } catch (e) {
            console.error('Failed to save logger configuration:', e);
        }
    }

    /**
     * Load configuration from localStorage
     * @private
     */
    #loadConfig() {
        try {
            const savedConfig = localStorage.getItem('logger_config');
            if (savedConfig) {
                this.#config = { ...this.#config, ...JSON.parse(savedConfig) };
            }
        } catch (e) {
            console.error('Failed to load logger configuration:', e);
        }
    }

    /**
     * Enable or disable the entire logging system
     * @param {boolean} enabled - Whether logging should be enabled
     */
    setEnabled(enabled) {
        this.#config.enabled = enabled;
        this.#saveConfig();
    }

    /**
     * Set the minimum log level
     * @param {number} level - The minimum log level to display
     */
    setLevel(level) {
        this.#config.level = level;
        this.#saveConfig();
    }

    /**
     * Enable or disable a specific category
     * @param {string} category - The category to configure
     * @param {boolean} enabled - Whether the category should be enabled
     */
    setCategory(category, enabled) {
        this.#config.categories[category] = enabled;
        this.#saveConfig();
    }

    /**
     * Enable or disable color output
     * @param {boolean} useColors - Whether to use colors in log output
     */
    setUseColors(useColors) {
        this.#config.useColors = useColors;
        this.#saveConfig();
    }

    /**
     * Enable all categories
     */
    enableAllCategories() {
        for (const category of Object.values(LogCategory)) {
            this.#config.categories[category] = true;
        }
        this.#saveConfig();
    }

    /**
     * Disable all categories
     */
    disableAllCategories() {
        for (const category of Object.values(LogCategory)) {
            this.#config.categories[category] = false;
        }
        this.#saveConfig();
    }

    /**
     * Check if a category is enabled
     * @param {string} category - The category to check
     * @returns {boolean} Whether the category is enabled
     */
    isCategoryEnabled(category) {
        return !!this.#config.categories[category];
    }

    /**
     * Get all categories and their status
     * @returns {Array<{category: string, enabled: boolean}>} Array of categories with their enabled status
     */
    getCategories() {
        return Object.values(LogCategory).map(category => ({
            category,
            enabled: !!this.#config.categories[category]
        }));
    }

    /**
     * Format a log message with colors if enabled
     * @param {number} level - The log level
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @returns {string} The formatted message
     * @private
     */
    #formatMessage(level, category, message) {
        if (!this.#config.useColors) {
            return `[${Object.keys(LogLevel).find(key => LogLevel[key] === level)}][${category}] ${message}`;
        }
        
        return `%c[${Object.keys(LogLevel).find(key => LogLevel[key] === level)}]%c[${category}]%c ${message}`;
    }

    /**
     * Get style strings for colored output
     * @param {number} level - The log level
     * @param {string} category - The log category
     * @returns {string[]} Array of CSS style strings
     * @private
     */
    #getStyles(level, category) {
        if (!this.#config.useColors) {
            return [];
        }

        const levelColor = this.#colors[level];
        const categoryColor = this.#categoryColors[category] || '#ffffff';
        
        return [
            `color: ${levelColor}; font-weight: bold;`,
            `color: ${categoryColor}; font-weight: bold;`,
            'color: inherit;'
        ];
    }

    /**
     * Log a debug message
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     */
    debug(category, message, ...args) {
        this.#log(LogLevel.DEBUG, category, message, ...args);
    }

    /**
     * Log an info message
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     */
    info(category, message, ...args) {
        this.#log(LogLevel.INFO, category, message, ...args);
    }

    /**
     * Log a warning message
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     */
    warn(category, message, ...args) {
        this.#log(LogLevel.WARN, category, message, ...args);
    }

    /**
     * Log an error message
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     */
    error(category, message, ...args) {
        this.#log(LogLevel.ERROR, category, message, ...args);
    }

    /**
     * Main log method
     * @param {number} level - The log level
     * @param {string} category - The log category
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     * @private
     */
    #log(level, category, message, ...args) {
        // Check if logging is enabled and if the category is enabled
        if (!this.#config.enabled || !this.#config.categories[category] || level < this.#config.level) {
            return;
        }

        const formattedMessage = this.#formatMessage(level, category, message);
        const styles = this.#getStyles(level, category);

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, ...styles, ...args);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, ...styles, ...args);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, ...styles, ...args);
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, ...styles, ...args);
                break;
        }
    }

    /**
     * Create a UI panel to control logging settings
     * This can be called from a debug menu or settings screen
     * @param {HTMLElement} container - The HTML element to create the panel in
     */
    createLoggerControlPanel(container) {
        // Clear existing content
        container.innerHTML = '';
        container.style.padding = '10px';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        container.style.color = 'white';
        container.style.borderRadius = '5px';
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';

        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Logger Settings';
        title.style.marginTop = '0';
        container.appendChild(title);

        // Create global enable/disable toggle
        const globalToggle = document.createElement('div');
        globalToggle.style.marginBottom = '10px';
        
        const globalCheckbox = document.createElement('input');
        globalCheckbox.type = 'checkbox';
        globalCheckbox.id = 'logger-enabled';
        globalCheckbox.checked = this.#config.enabled;
        globalCheckbox.addEventListener('change', () => {
            this.setEnabled(globalCheckbox.checked);
        });
        
        const globalLabel = document.createElement('label');
        globalLabel.htmlFor = 'logger-enabled';
        globalLabel.textContent = 'Enable Logging';
        globalLabel.style.marginLeft = '5px';
        globalLabel.style.marginTop = '10px';
        
        globalToggle.appendChild(globalCheckbox);
        globalToggle.appendChild(globalLabel);
        container.appendChild(globalToggle);

        // Create log level selector
        const levelSelector = document.createElement('div');
        levelSelector.style.marginBottom = '10px';
        
        const levelLabel = document.createElement('label');
        levelLabel.htmlFor = 'logger-level';
        levelLabel.textContent = 'Log Level: ';
        
        const levelSelect = document.createElement('select');
        levelSelect.id = 'logger-level';
        
        const logLevelEntries = Object.entries(LogLevel)
            .filter(([key, value]) => typeof value === 'number');
            
        for (const [key, level] of logLevelEntries) {
            const option = document.createElement('option');
            option.value = level.toString();
            option.textContent = key;
            option.selected = this.#config.level === level;
            levelSelect.appendChild(option);
        }
        
        levelSelect.addEventListener('change', () => {
            this.setLevel(Number.parseInt(levelSelect.value));
        });
        
        levelSelector.appendChild(levelLabel);
        levelSelector.appendChild(levelSelect);
        container.appendChild(levelSelector);

        // Create category toggles
        const categoriesTitle = document.createElement('h4');
        categoriesTitle.textContent = 'Categories';
        categoriesTitle.style.marginBottom = '5px';
        container.appendChild(categoriesTitle);

        // Add buttons to enable/disable all
        const categoryButtons = document.createElement('div');
        categoryButtons.style.marginBottom = '10px';
        
        const enableAllBtn = document.createElement('button');
        enableAllBtn.textContent = 'Enable All';
        enableAllBtn.style.marginRight = '10px';
        enableAllBtn.addEventListener('click', () => {
            this.enableAllCategories();
            // Update checkboxes
            for (const checkbox of document.querySelectorAll('.category-checkbox')) {
                checkbox.checked = true;
            }
        });
        
        const disableAllBtn = document.createElement('button');
        disableAllBtn.textContent = 'Disable All';
        disableAllBtn.addEventListener('click', () => {
            this.disableAllCategories();
            // Update checkboxes
            for (const checkbox of document.querySelectorAll('.category-checkbox')) {
                checkbox.checked = false;
            }
        });
        
        categoryButtons.appendChild(enableAllBtn);
        categoryButtons.appendChild(disableAllBtn);
        container.appendChild(categoryButtons);

        // Create a grid for categories
        const categoryGrid = document.createElement('div');
        categoryGrid.style.display = 'grid';
        categoryGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        categoryGrid.style.gap = '5px';
        
        for (const category of Object.values(LogCategory)) {
            const categoryToggle = document.createElement('div');
            
            const categoryCheckbox = document.createElement('input');
            categoryCheckbox.type = 'checkbox';
            categoryCheckbox.id = `logger-category-${category}`;
            categoryCheckbox.className = 'category-checkbox';
            categoryCheckbox.checked = !!this.#config.categories[category];
            categoryCheckbox.addEventListener('change', () => {
                this.setCategory(category, categoryCheckbox.checked);
            });
            
            const categoryLabel = document.createElement('label');
            categoryLabel.htmlFor = `logger-category-${category}`;
            categoryLabel.textContent = category;
            categoryLabel.style.marginLeft = '5px';
            
            if (this.#config.useColors) {
                const color = this.#categoryColors[category] || '#ffffff';
                categoryLabel.style.color = color;
            }
            
            categoryToggle.appendChild(categoryCheckbox);
            categoryToggle.appendChild(categoryLabel);
            categoryGrid.appendChild(categoryToggle);
        }
        
        container.appendChild(categoryGrid);

        // Create color toggle
        const colorToggle = document.createElement('div');
        colorToggle.style.marginTop = '10px';
        
        const colorCheckbox = document.createElement('input');
        colorCheckbox.type = 'checkbox';
        colorCheckbox.id = 'logger-colors';
        colorCheckbox.checked = this.#config.useColors;
        colorCheckbox.addEventListener('change', () => {
            this.setUseColors(colorCheckbox.checked);
            // Refresh the panel to update colors
            this.createLoggerControlPanel(container);
        });
        
        const colorLabel = document.createElement('label');
        colorLabel.htmlFor = 'logger-colors';
        colorLabel.textContent = 'Use Colors';
        colorLabel.style.marginLeft = '5px';
        
        colorToggle.appendChild(colorCheckbox);
        colorToggle.appendChild(colorLabel);
        container.appendChild(colorToggle);
    }
}

// Create a singleton logger instance for easier access
export const logger = Logger.getInstance(); 