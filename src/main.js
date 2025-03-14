import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { loggerPanel } from './ui/logger-panel'; // Import the logger panel
import { testSkillsUI } from './test-skills-ui'; // Import the skills UI test
import { getSkillInitializer } from './skills'; // Import the skill initializer

// Import Leaflet
import 'leaflet';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    transparent: true,
    clearBeforeRender: false,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        GameOver,
    ]
};

// Create the game instance and store it in a variable
const gameInstance = new Phaser.Game(config);

// Initialize the logger panel
// The panel is already created as a singleton in the import
// The toggle button will appear at the top left of the screen

// Handle window resize
window.addEventListener('resize', () => {
    if (gameInstance) {
        gameInstance.scale.resize(window.innerWidth, window.innerHeight);
    }
});

// Add a global debug function to help with troubleshooting
window.debugGame = () => {
    console.log('Game instance:', gameInstance);
    console.log('Current scene:', gameInstance.scene.scenes[gameInstance.scene.getScenes(true)[0].scene.key]);
    console.log('Canvas element:', document.querySelector('canvas'));
    console.log('Map element:', document.getElementById('map'));
};

// Function to safely initialize the skills UI test
function safelyInitializeSkillsUI() {
    try {
        // Get the current active scene
        const activeScenes = gameInstance.scene.getScenes(true);
        
        if (activeScenes && activeScenes.length > 0) {
            const currentScene = activeScenes[0];
            
            // Check if the scene is ready (has events)
            if (!currentScene || !currentScene.events) {
                console.warn('Scene is not fully initialized yet, will retry later');
                return false;
            }
            
            // Initialize the skill system
            getSkillInitializer().initialize();
            
            // Initialize the skills UI test
            const testObject = testSkillsUI(currentScene);
            
            if (testObject && testObject.menu) {
                window.skillsUITest = testObject;
                console.log('Skills UI test initialized. Access it via window.skillsUITest');
                return true;
            } else {
                console.warn('Skills UI test could not be initialized, will retry later');
                return false;
            }
        } else {
            console.warn('No active scenes found, will retry initializing skills UI test later');
            return false;
        }
    } catch (error) {
        console.error('Error initializing skills UI test:', error);
        return false;
    }
}

// Initialize the skills UI test when the game is ready
gameInstance.events.once('ready', () => {
    // Try to initialize the skills UI test
    const initialized = safelyInitializeSkillsUI();
    
    // If initialization failed, retry after a short delay
    if (!initialized) {
        console.log('Retrying skills UI initialization in 500ms...');
        setTimeout(safelyInitializeSkillsUI, 500);
    }
    
    // Set up a scene manager event listener to clean up the skills UI when scenes change
    gameInstance.events.on('scenestart', (scene) => {
        const key = scene.scene.key;
        console.log(`Scene started: ${key}`);
        
        // Clean up previous skills UI if it exists
        if (window.skillsUITest) {
            // Store a reference to the old test
            const oldTest = window.skillsUITest;
            
            // Create a new test for the new scene after a short delay
            // This ensures the scene is fully initialized
            setTimeout(() => {
                try {
                    const newScene = gameInstance.scene.getScenes(true)[0];
                    if (newScene) {
                        window.skillsUITest = testSkillsUI(newScene);
                        console.log('New skills UI test initialized for scene:', key);
                    }
                } catch (error) {
                    console.error('Error creating new skills UI test:', error);
                }
                
                // Clean up the old test
                try {
                    if (oldTest && typeof oldTest.destroy === 'function') {
                        oldTest.destroy();
                        console.log('Old skills UI test cleaned up');
                    }
                } catch (error) {
                    console.error('Error cleaning up old skills UI test:', error);
                }
            }, 200);
        } else {
            // If no skills UI test exists, try to create one
            setTimeout(() => {
                try {
                    const newScene = gameInstance.scene.getScenes(true)[0];
                    if (newScene) {
                        window.skillsUITest = testSkillsUI(newScene);
                        console.log('Skills UI test initialized for scene:', key);
                    }
                } catch (error) {
                    console.error('Error creating skills UI test:', error);
                }
            }, 200);
        }
    });
});

// Export the game instance
export default gameInstance;
