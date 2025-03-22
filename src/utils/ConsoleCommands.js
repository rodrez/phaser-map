import { logger, LogCategory } from './Logger';
import configManager from './ConfigManager';

/**
 * Initialize console commands for development and testing
 * This adds helpful commands to the browser console for debugging and controlling game features
 */
export function initializeConsoleCommands(gameInstance) {
  if (!window) return; // Only run in browser environment
  
  // Store game instance for commands
  window.gameInstance = gameInstance;
  
  // Add config manager for direct access
  window.configManager = configManager;
  
  // Get the current Phaser scene
  const getCurrentScene = () => {
    if (!gameInstance || !gameInstance.scene) return null;
    
    const activeScenes = gameInstance.scene.getScenes(true);
    if (activeScenes.length === 0) return null;
    
    // Return the most relevant scene (Game scene if available)
    const gameScene = activeScenes.find(scene => scene.scene.key === 'Game');
    return gameScene || activeScenes[0];
  };
  
  // Toggle feature command
  window.toggleFeature = (featureName) => {
    try {
      if (typeof featureName !== 'string') {
        console.error('Feature name must be a string');
        return false;
      }
      
      const result = configManager.toggleFeature(featureName);
      console.log(`Feature '${featureName}' ${result ? 'enabled' : 'disabled'}`);
      return result;
    } catch (error) {
      console.error('Error toggling feature:', error);
      return false;
    }
  };
  
  // Set feature command
  window.setFeature = (featureName, enabled) => {
    try {
      if (typeof featureName !== 'string') {
        console.error('Feature name must be a string');
        return false;
      }
      
      if (typeof enabled !== 'boolean') {
        console.error('Enabled state must be a boolean');
        return false;
      }
      
      const result = configManager.toggleFeature(featureName, enabled);
      console.log(`Feature '${featureName}' set to ${result ? 'enabled' : 'disabled'}`);
      return result;
    } catch (error) {
      console.error('Error setting feature:', error);
      return false;
    }
  };
  
  // Set performance setting command
  window.setPerformance = (settingName, value) => {
    try {
      configManager.setPerformanceSetting(settingName, value);
      console.log(`Performance setting '${settingName}' set to ${value}`);
      return true;
    } catch (error) {
      console.error('Error setting performance setting:', error);
      return false;
    }
  };
  
  // Reset config command
  window.resetConfig = () => {
    try {
      configManager.resetConfig();
      console.log('Configuration reset to defaults');
      return true;
    } catch (error) {
      console.error('Error resetting config:', error);
      return false;
    }
  };
  
  // Show settings UI command
  window.showSettings = () => {
    try {
      const scene = getCurrentScene();
      if (!scene || !scene.uiManager || !scene.uiManager.settingsUI) {
        console.error('Settings UI not available');
        return false;
      }
      
      scene.uiManager.showSettings();
      console.log('Settings UI shown');
      return true;
    } catch (error) {
      console.error('Error showing settings:', error);
      return false;
    }
  };
  
  // List all features command
  window.listFeatures = () => {
    try {
      const config = configManager.getConfig();
      console.log('Available Features:');
      for (const [feature, enabled] of Object.entries(config.features)) {
        console.log(`- ${feature}: ${enabled ? 'Enabled' : 'Disabled'}`);
      }
      return config.features;
    } catch (error) {
      console.error('Error listing features:', error);
      return null;
    }
  };
  
  // List all performance settings command
  window.listPerformance = () => {
    try {
      const config = configManager.getConfig();
      console.log('Performance Settings:');
      for (const [setting, value] of Object.entries(config.performance)) {
        console.log(`- ${setting}: ${value}`);
      }
      return config.performance;
    } catch (error) {
      console.error('Error listing performance settings:', error);
      return null;
    }
  };
  
  // Log initialization
  logger.info(LogCategory.SYSTEM, 'Console commands initialized');
  console.log('✅ Game console commands initialized. Try: toggleFeature("monsters"), showSettings(), listFeatures()');
}

// Export console command initialization
export default initializeConsoleCommands; 