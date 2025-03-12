import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        // Load SVG assets
        this.load.svg('player_svg', 'assets/svg/player.svg');
        this.load.svg('flag', 'assets/svg/flag.svg');
        this.load.svg('boundary', 'assets/svg/boundary.svg');
        this.load.svg('territory', 'assets/svg/territory.svg');
        
        // Load background for loading screen
        this.load.image('background', 'assets/bg.png');
    }

    create ()
    {
        // Create a texture from the player SVG
        this.createPlayerTexture();
        
        // Move to the next scene
        this.scene.start('Preloader');
    }
    
    createPlayerTexture() {
        try {
            // Get the SVG source image
            const svg = this.textures.get('player_svg').getSourceImage();
            
            // Create a canvas to draw the SVG
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            
            // Get the 2D context
            const ctx = canvas.getContext('2d');
            
            // Draw the SVG to the canvas
            ctx.drawImage(svg, 0, 0, 40, 40);
            
            // Create a new texture from the canvas
            this.textures.addCanvas('player', canvas);
            
            console.log('Player texture created successfully');
        } catch (error) {
            console.error('Error creating player texture:', error);
            
            // Create a fallback texture
            this.createFallbackPlayerTexture();
        }
    }
    
    createFallbackPlayerTexture() {
        // Create a graphics object
        const graphics = this.add.graphics();
        
        // Draw a circle
        graphics.fillStyle(0x4285F4, 1);
        graphics.fillCircle(20, 20, 18);
        graphics.lineStyle(2, 0x2A56C6, 1);
        graphics.strokeCircle(20, 20, 18);
        
        // Add a face
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillCircle(20, 15, 6);
        graphics.fillStyle(0x333333, 1);
        graphics.fillCircle(17, 14, 1.5);
        graphics.fillCircle(23, 14, 1.5);
        
        // Add a smile
        graphics.lineStyle(1.5, 0x333333, 1);
        graphics.beginPath();
        graphics.moveTo(15, 20);
        graphics.quadraticCurveTo(20, 25, 25, 20);
        graphics.stroke();
        
        // Generate a texture
        graphics.generateTexture('player', 40, 40);
        graphics.destroy();
        
        console.log('Fallback player texture created');
    }
}
