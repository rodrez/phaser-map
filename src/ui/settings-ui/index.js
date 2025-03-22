import { logger, LogCategory } from '../../utils/Logger';
import configManager from '../../utils/ConfigManager';
import './settings-ui.css';

/**
 * Settings UI class to manage game configuration settings
 * Provides a user interface for toggling features and adjusting performance settings
 */
export class SettingsUI {
  /**
   * Constructor for SettingsUI
   * @param {Phaser.Scene} scene - The Phaser scene this UI belongs to
   */
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.visible = false;
    this.config = configManager.getConfig();
    
    // Initialize UI elements
    this.init();
    
    // Subscribe to events
    this.setupEvents();
  }
  
  /**
   * Initialize UI elements
   */
  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'settings-ui';
    this.container.className = 'settings-ui';
    
    // Initially hide the container
    this.container.style.display = 'none';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'settings-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Game Settings';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.hide());
    
    header.appendChild(title);
    header.appendChild(closeButton);
    this.container.appendChild(header);
    
    // Create feature toggles section
    const featuresSection = document.createElement('div');
    featuresSection.className = 'settings-section';
    
    const featuresTitle = document.createElement('h3');
    featuresTitle.textContent = 'Game Features';
    featuresSection.appendChild(featuresTitle);
    
    // Create feature toggle switches
    const featureToggles = [
      { id: 'monsters', label: 'Monsters', description: 'Show monsters in the game world' },
      { id: 'environment', label: 'Environment', description: 'Show trees, fruits, and other environment objects' },
      { id: 'flags', label: 'Flags', description: 'Show territory flags' },
      { id: 'combat', label: 'Combat', description: 'Enable combat system' },
      { id: 'itemDrops', label: 'Item Drops', description: 'Allow monsters to drop items' },
      { id: 'healingAuras', label: 'Healing Auras', description: 'Enable healing auras around trees' },
      { id: 'statusEffects', label: 'Status Effects', description: 'Enable status effects (burning, poison, etc.)' }
    ];
    
    // Create toggle switches for each feature
    for (const feature of featureToggles) {
      const toggleRow = this.createToggleRow(
        feature.id, 
        feature.label, 
        feature.description, 
        this.config.features[feature.id],
        'features'
      );
      featuresSection.appendChild(toggleRow);
    }
    
    this.container.appendChild(featuresSection);
    
    // Create performance settings section
    const performanceSection = document.createElement('div');
    performanceSection.className = 'settings-section';
    
    const performanceTitle = document.createElement('h3');
    performanceTitle.textContent = 'Performance Settings';
    performanceSection.appendChild(performanceTitle);
    
    // Create performance settings
    const performanceSettings = [
      { 
        id: 'maxMonsters', 
        label: 'Max Monsters', 
        description: 'Maximum number of monsters in the game world',
        type: 'range',
        min: 0,
        max: 30,
        step: 1
      },
      { 
        id: 'maxEnvironmentObjects', 
        label: 'Environment Density', 
        description: 'Number of environment objects (trees, etc.)',
        type: 'range',
        min: 0,
        max: 100,
        step: 5
      },
      { 
        id: 'renderDistance', 
        label: 'Render Distance', 
        description: 'Distance at which objects are visible',
        type: 'range',
        min: 100,
        max: 1000,
        step: 100
      },
      { 
        id: 'particleEffects', 
        label: 'Particle Effects', 
        description: 'Show particle effects for spells, healing, etc.',
        type: 'toggle'
      }
    ];
    
    // Create settings controls
    for (const setting of performanceSettings) {
      if (setting.type === 'toggle') {
        const toggleRow = this.createToggleRow(
          setting.id, 
          setting.label, 
          setting.description, 
          this.config.performance[setting.id],
          'performance'
        );
        performanceSection.appendChild(toggleRow);
      } else if (setting.type === 'range') {
        const rangeRow = this.createRangeRow(
          setting.id,
          setting.label,
          setting.description,
          this.config.performance[setting.id],
          setting.min,
          setting.max,
          setting.step
        );
        performanceSection.appendChild(rangeRow);
      }
    }
    
    this.container.appendChild(performanceSection);
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'reset-button';
    resetButton.textContent = 'Reset to Defaults';
    resetButton.addEventListener('click', () => {
      configManager.resetConfig();
      this.refreshSettings();
    });
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.appendChild(resetButton);
    this.container.appendChild(buttonContainer);
    
    // Add to DOM
    document.body.appendChild(this.container);
    
    logger.info(LogCategory.UI, 'Settings UI initialized');
  }
  
  /**
   * Create a toggle row for boolean settings
   * @param {string} id - Setting ID
   * @param {string} label - Display label
   * @param {string} description - Setting description
   * @param {boolean} value - Current value
   * @param {string} category - Setting category (features or performance)
   * @returns {HTMLElement} The toggle row element
   */
  createToggleRow(id, label, description, value, category) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    
    const labelContainer = document.createElement('div');
    labelContainer.className = 'setting-label';
    
    const labelText = document.createElement('div');
    labelText.className = 'label-text';
    labelText.textContent = label;
    
    const descriptionText = document.createElement('div');
    descriptionText.className = 'description-text';
    descriptionText.textContent = description;
    
    labelContainer.appendChild(labelText);
    labelContainer.appendChild(descriptionText);
    
    const toggleContainer = document.createElement('label');
    toggleContainer.className = 'toggle-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value;
    checkbox.id = `setting-${id}`;
    checkbox.addEventListener('change', (e) => {
      if (category === 'features') {
        configManager.toggleFeature(id, e.target.checked);
      } else if (category === 'performance') {
        configManager.setPerformanceSetting(id, e.target.checked);
      }
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(slider);
    
    row.appendChild(labelContainer);
    row.appendChild(toggleContainer);
    
    return row;
  }
  
  /**
   * Create a range slider for numeric settings
   * @param {string} id - Setting ID
   * @param {string} label - Display label
   * @param {string} description - Setting description
   * @param {number} value - Current value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} step - Step increment
   * @returns {HTMLElement} The range row element
   */
  createRangeRow(id, label, description, value, min, max, step) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    
    const labelContainer = document.createElement('div');
    labelContainer.className = 'setting-label';
    
    const labelText = document.createElement('div');
    labelText.className = 'label-text';
    labelText.textContent = label;
    
    const descriptionText = document.createElement('div');
    descriptionText.className = 'description-text';
    descriptionText.textContent = description;
    
    labelContainer.appendChild(labelText);
    labelContainer.appendChild(descriptionText);
    
    const rangeContainer = document.createElement('div');
    rangeContainer.className = 'range-container';
    
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.min = min;
    rangeInput.max = max;
    rangeInput.step = step;
    rangeInput.value = value;
    rangeInput.id = `setting-${id}`;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'range-value';
    valueDisplay.textContent = value;
    
    rangeInput.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value, 10);
      valueDisplay.textContent = newValue;
      configManager.setPerformanceSetting(id, newValue);
    });
    
    rangeContainer.appendChild(rangeInput);
    rangeContainer.appendChild(valueDisplay);
    
    row.appendChild(labelContainer);
    row.appendChild(rangeContainer);
    
    return row;
  }
  
  /**
   * Set up event listeners
   */
  setupEvents() {
    // Add keyboard shortcut (Esc to close)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.hide();
      }
    });
  }
  
  /**
   * Show the settings UI
   */
  show() {
    if (this.container) {
      this.refreshSettings();
      this.container.style.display = 'flex';
      this.visible = true;
      logger.info(LogCategory.UI, 'Settings UI shown');
    }
  }
  
  /**
   * Hide the settings UI
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.visible = false;
      // Save settings when closing
      configManager.saveConfig();
      logger.info(LogCategory.UI, 'Settings UI hidden');
    }
  }
  
  /**
   * Toggle the visibility of the settings UI
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Refresh UI with current settings
   */
  refreshSettings() {
    this.config = configManager.getConfig();
    
    // Update feature toggles
    for (const feature in this.config.features) {
      const checkbox = document.getElementById(`setting-${feature}`);
      if (checkbox) {
        checkbox.checked = this.config.features[feature];
      }
    }
    
    // Update performance settings
    for (const setting in this.config.performance) {
      const input = document.getElementById(`setting-${setting}`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = this.config.performance[setting];
        } else if (input.type === 'range') {
          input.value = this.config.performance[setting];
          // Update value display
          const valueDisplay = input.parentNode.querySelector('.range-value');
          if (valueDisplay) {
            valueDisplay.textContent = this.config.performance[setting];
          }
        }
      }
    }
  }
  
  /**
   * Clean up resources when destroying the UI
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    logger.info(LogCategory.UI, 'Settings UI destroyed');
  }
}

// Export a create function to simplify instantiation
export function createSettingsUI(scene) {
  return new SettingsUI(scene);
} 