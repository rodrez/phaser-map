import { Scene } from 'phaser';

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        // Center coordinates based on the game size
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Add background
        this.add.image(centerX, centerY, 'background');

        // Add game over text
        this.add.text(centerX, centerY - 50, 'Game Over', {
            fontFamily: 'Arial Black', 
            fontSize: 48, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Add score text (placeholder)
        this.add.text(centerX, centerY + 50, 'You placed 5 flags!', {
            fontFamily: 'Arial', 
            fontSize: 24, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        // Add play again button
        const playAgainButton = this.add.text(centerX, centerY + 150, 'Play Again', {
            fontFamily: 'Arial', 
            fontSize: 26, 
            color: '#ffffff',
            backgroundColor: '#4285F4',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive();

        // Add hover effect
        playAgainButton.on('pointerover', () => {
            playAgainButton.setStyle({ backgroundColor: '#2A56C6' });
        });
        
        playAgainButton.on('pointerout', () => {
            playAgainButton.setStyle({ backgroundColor: '#4285F4' });
        });

        // Start game on click
        playAgainButton.on('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
