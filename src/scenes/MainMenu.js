import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Center coordinates based on the game size
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Add background
        this.add.image(centerX, centerY, 'background');

        // Add logo
        this.add.image(centerX, centerY - 100, 'logo').setScale(0.8);

        // Add game title
        this.add.text(centerX, centerY + 50, 'Map Explorer', {
            fontFamily: 'Arial Black', 
            fontSize: 38, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Add start button
        const startButton = this.add.text(centerX, centerY + 150, 'Start Exploring', {
            fontFamily: 'Arial', 
            fontSize: 26, 
            color: '#ffffff',
            backgroundColor: '#4285F4',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive();

        // Add hover effect
        startButton.on('pointerover', () => {
            startButton.setStyle({ backgroundColor: '#2A56C6' });
        });
        
        startButton.on('pointerout', () => {
            startButton.setStyle({ backgroundColor: '#4285F4' });
        });

        // Start game on click
        startButton.on('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
