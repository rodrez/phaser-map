import { logger, LogCategory } from './Logger';

/**
 * ConfigManager class to handle game configuration including toggle features
 * This class is implemented as a singleton to ensure consistent access across the game
 */
export class ConfigManager {
  constructor() {
    // Ensure singleton pattern
    if (ConfigManager.instance) {
      // Instead of returning the instance (which causes a linter error),
      // we'll set 'this' to reference the existing instance
      Object.assign(this, ConfigManager.instance);
      return;
    }
    
    ConfigManager.instance = this;
    
    // Initialize default configuration
    this.config = {
      // Feature toggles
      features: {
        monsters: true,       // Toggle monsters on/off
        environment: true,    // Toggle environment elements on/off
        flags: true,          // Toggle flags on/off
        combat: true,         // Toggle combat system on/off
        itemDrops: true,      // Toggle item drops on/off
        healingAuras: true,   // Toggle healing auras on/off
        statusEffects: true   // Toggle status effects on/off
      },
      
      // Performance settings
      performance: {
        maxMonsters: 15,           // Maximum number of monsters in the world
        maxEnvironmentObjects: 50, // Maximum number of environment objects
        renderDistance: 600,       // Distance at which objects are rendered
        particleEffects: true      // Toggle particle effects on/off
      }
    };
    
    // Initialize observers for config changes
    this.observers = {};
    
    logger.info(LogCategory.SYSTEM, 'ConfigManager initialized');
  }
  
  /**
   * Get the singleton instance of ConfigManager
   * @returns {ConfigManager} The ConfigManager instance
   */
  static getInstance() {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Get the current configuration
   * @returns {Object} The current configuration object
   */
  getConfig() {
    return this.config;
  }
  
  /**
   * Check if a feature is enabled
   * @param {string} featureName - The name of the feature to check
   * @returns {boolean} Whether the feature is enabled
   */
  isFeatureEnabled(featureName) {
    if (Object.prototype.hasOwnProperty.call(this.config.features, featureName)) {
      return this.config.features[featureName];
    }
    logger.warn(LogCategory.SYSTEM, `Feature '${featureName}' not found in config`);
    return true; // Default to enabled if feature not found
  }
  
  /**
   * Toggle a feature on/off
   * @param {string} featureName - The name of the feature to toggle
   * @param {boolean} [state] - Optional explicit state to set (true/false)
   * @returns {boolean} The new state of the feature
   */
  toggleFeature(featureName, state) {
    if (!Object.prototype.hasOwnProperty.call(this.config.features, featureName)) {
      logger.warn(LogCategory.SYSTEM, `Cannot toggle unknown feature: ${featureName}`);
      return false;
    }
    
    // If state is provided, set it directly; otherwise toggle current state
    if (typeof state === 'boolean') {
      this.config.features[featureName] = state;
    } else {
      this.config.features[featureName] = !this.config.features[featureName];
    }
    
    // Notify observers about this change
    this.notifyObservers(featureName, this.config.features[featureName]);
    
    logger.info(
      LogCategory.SYSTEM, 
      `Feature '${featureName}' ${this.config.features[featureName] ? 'enabled' : 'disabled'}`
    );
    
    return this.config.features[featureName];
  }
  
  /**
   * Set a performance setting
   * @param {string} settingName - The name of the setting to change
   * @param {any} value - The new value for the setting
   */
  setPerformanceSetting(settingName, value) {
    if (!Object.prototype.hasOwnProperty.call(this.config.performance, settingName)) {
      logger.warn(LogCategory.SYSTEM, `Unknown performance setting: ${settingName}`);
      return;
    }
    
    this.config.performance[settingName] = value;
    
    // Notify observers about this change
    this.notifyObservers(settingName, value);
    
    logger.info(LogCategory.SYSTEM, `Performance setting '${settingName}' set to ${value}`);
  }
  
  /**
   * Get a performance setting
   * @param {string} settingName - The name of the setting to get
   * @returns {any} The value of the setting
   */
  getPerformanceSetting(settingName) {
    if (!Object.prototype.hasOwnProperty.call(this.config.performance, settingName)) {
      logger.warn(LogCategory.SYSTEM, `Unknown performance setting: ${settingName}`);
      return null;
    }
    
    return this.config.performance[settingName];
  }
  
  /**
   * Subscribe to configuration changes
   * @param {string} key - The config key to observe
   * @param {Function} callback - The callback function to execute when the config changes
   * @returns {string} A subscription ID that can be used to unsubscribe
   */
  subscribe(key, callback) {
    if (!this.observers[key]) {
      this.observers[key] = [];
    }
    
    const subscriptionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    this.observers[key].push({
      id: subscriptionId,
      callback: callback
    });
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from configuration changes
   * @param {string} key - The config key that was observed
   * @param {string} subscriptionId - The subscription ID returned from subscribe
   */
  unsubscribe(key, subscriptionId) {
    if (!this.observers[key]) {
      return;
    }
    
    this.observers[key] = this.observers[key].filter(observer => observer.id !== subscriptionId);
    
    if (this.observers[key].length === 0) {
      delete this.observers[key];
    }
  }
  
  /**
   * Notify all observers of a configuration change
   * @param {string} key - The config key that changed
   * @param {any} value - The new value
   */
  notifyObservers(key, value) {
    if (!this.observers[key]) {
      return;
    }
    
    for (const observer of this.observers[key]) {
      try {
        observer.callback(value);
      } catch (error) {
        logger.error(LogCategory.SYSTEM, `Error in config observer callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Save the current configuration to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('gameConfig', JSON.stringify(this.config));
      logger.info(LogCategory.SYSTEM, 'Configuration saved to localStorage');
    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Failed to save config: ${error.message}`);
    }
  }
  
  /**
   * Load configuration from localStorage
   * @returns {boolean} Whether the configuration was successfully loaded
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem('gameConfig');
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
        logger.info(LogCategory.SYSTEM, 'Configuration loaded from localStorage');
        return true;
      }
    } catch (error) {
      logger.error(LogCategory.SYSTEM, `Failed to load config: ${error.message}`);
    }
    
    return false;
  }
  
  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    this.config = {
      features: {
        monsters: true,
        environment: true,
        flags: true,
        combat: true,
        itemDrops: true,
        healingAuras: true,
        statusEffects: true
      },
      performance: {
        maxMonsters: 15,
        maxEnvironmentObjects: 50,
        renderDistance: 600,
        particleEffects: true
      }
    };
    
    logger.info(LogCategory.SYSTEM, 'Configuration reset to defaults');
    
    // Notify all observers of the reset
    for (const key of Object.keys(this.config.features)) {
      this.notifyObservers(key, this.config.features[key]);
    }
    
    for (const key of Object.keys(this.config.performance)) {
      this.notifyObservers(key, this.config.performance[key]);
    }
  }
}

// Create a singleton instance
const configManager = new ConfigManager();

// Export the singleton instance
export default configManager; 