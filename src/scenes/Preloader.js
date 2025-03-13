import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // Center coordinates based on the game size
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // We loaded this image in our Boot Scene, so we can display it here
        // this.add.image(centerX, centerY, 'background');

        // A simple progress bar. This is the outline of the bar.
        this.add.rectangle(centerX, centerY, 468, 32).setStrokeStyle(1, 0xffffff);

        // This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(centerX - 230, centerY, 4, 28, 0xffffff);

        // Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress) => {
            // Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        // Load the assets for the game
        this.load.setPath('assets');

        // Load any additional assets here
        this.load.image('logo', 'logo.png');
        this.load.svg('player', '/svg/player.svg');
        
        // Load environment assets
        this.load.image('particle', '/particles/particle.png');
        this.load.image('tree', '/environment/tree.png');
        this.load.image('spruce', '/environment/spruce.png');
        this.load.image('healing-spruce', '/environment/healing-spruce.png');
        this.load.image('fruit', '/environment/fruit.png');
    }

    create ()
    {
        // When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        // For example, you can define global animations here, so we can use them in other scenes.

        // Move to the MainMenu
        this.scene.start('Game');
    }
}
