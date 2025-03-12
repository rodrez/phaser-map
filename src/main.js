import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';

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
        GameOver
    ]
};

// Create the game instance and store it in a variable
const gameInstance = new Phaser.Game(config);

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

// Export the game instance
export default gameInstance;
