import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { ChatScene } from './scenes/ChatScene'; // Import the ChatScene
import { LoginScene } from './scenes/LoginScene'; // Import the LoginScene
import { DungeonScene } from './scenes/DungeonScene'; // Import the DungeonScene
import { loggerPanel } from './ui/logger-panel'; // Import the logger panel
import { getSkillInitializer } from './skills'; // Import the skill initializer
import { MMOGame } from './scenes/MMOGame';
import initializeConsoleCommands from './utils/ConsoleCommands'; // Import console commands

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
    input: {
        activePointers: 1,
        touch: {
            capture: true,
            passive: false
        }
    },
    scene: [
        LoginScene, // Add LoginScene as the first scene
        Boot,
        Preloader,
        MainMenu,
        Game,
        MMOGame,
        DungeonScene, // Add DungeonScene
        GameOver,
        ChatScene,
    ]
};

// Create the game instance and store it in a variable
const gameInstance = new Phaser.Game(config);

// Initialize the logger panel
// The panel is already created as a singleton in the import
// The toggle button will appear at the top left of the screen
loggerPanel.initPanel();

// Initialize console commands for development
initializeConsoleCommands(gameInstance);

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

// Initialize the skill system when the game is ready
gameInstance.events.once('ready', () => {
    // Initialize the skill system
    getSkillInitializer().initialize();
});

// Export the game instance
export default gameInstance;
