import { ChatExample } from '../ui/chat-ui';

/**
 * A scene that demonstrates the chat UI
 */
export class ChatScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ChatScene' });
    }

    create() {
        // Add background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a0d05)
            .setOrigin(0, 0);
        
        // Add title text
        this.add.text(this.cameras.main.centerX, 100, 'Chat Example', {
            fontFamily: 'serif',
            fontSize: 48,
            color: '#c8a165',
            stroke: '#000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
        }).setOrigin(0.5);
        
        // Add instructions text
        this.add.text(this.cameras.main.centerX, 180, 'Click the chat button in the bottom right to open the chat', {
            fontFamily: 'serif',
            fontSize: 24,
            color: '#c8a165',
            stroke: '#000',
            strokeThickness: 2,
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 1, stroke: true, fill: true }
        }).setOrigin(0.5);
        
        // Create chat example
        this.chatExample = new ChatExample(this);
        
        // Add a button to return to the main menu
        const backButton = this.add.text(20, 20, '< Back', {
            fontFamily: 'serif',
            fontSize: 24,
            color: '#c8a165',
            stroke: '#000',
            strokeThickness: 2,
            padding: { x: 12, y: 8 },
            backgroundColor: '#2a1a0a'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => backButton.setTint(0xffcc88))
        .on('pointerout', () => backButton.clearTint())
        .on('pointerdown', () => {
            // Clean up chat example
            this.chatExample.destroy();
            
            // Go back to main menu (or whatever scene you want)
            this.scene.start('MainMenu');
        });
    }
}

export default ChatScene; 