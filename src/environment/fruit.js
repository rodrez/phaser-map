import { FruitType } from '../items/Item';

/**
 * System to handle fruit-related functionality
 */
export class FruitSystem {
    scene;
    environmentGroup;
    popupSystem;
    
    constructor(scene, environmentGroup) {
        this.scene = scene;
        this.environmentGroup = environmentGroup;
    }
    
    /**
     * Set the popup system reference
     */
    setPopupSystem(popupSystem) {
        this.popupSystem = popupSystem;
    }
    
    /**
     * Add fruits to a tree
     */
    addFruitsToTree(tree) {
        // Only add fruits to healing spruce trees
        if (tree.getData('treeName') !== 'Healing Spruce') {
            return;
        }
        
        // 80% chance to add fruits
        if (Math.random() >= 0.8) {
            return;
        }
        
        // Determine number of fruits (1-3)
        const fruitCount = Math.floor(Math.random() * 3) + 1;
        
        // Get tree dimensions
        const treeWidth = tree.displayWidth;
        const treeHeight = tree.displayHeight;
        
        // Select fruit type
        const fruitTypes = [
            { frame: 0, type: FruitType.APPLE },
            { frame: 1, type: FruitType.ORANGE },
            { frame: 3, type: FruitType.CHERRY }
        ];
        
        // Healing spruce prefers healing fruits (apple or cherry)
        let selectedFruit;
        if (Math.random() < 0.7) {
            selectedFruit = Math.random() < 0.5 ? fruitTypes[0] : fruitTypes[2];
        } else {
            selectedFruit = fruitTypes[1];
        }
        
        // Create fruits
        for (let i = 0; i < fruitCount; i++) {
            this.createFruit(tree, selectedFruit, treeWidth, treeHeight);
        }
    }
    
    /**
     * Create a single fruit
     */
    createFruit(
        tree,
        fruitData,
        treeWidth,
        treeHeight
    ) {
        // Position the fruit within the top 2/3 of the tree
        const offsetX = (Math.random() - 0.5) * treeWidth * 0.6;
        const offsetY = -treeHeight * (0.3 + Math.random() * 0.4);
        
        // Create fruit sprite
        const fruit = this.scene.add.sprite(
            tree.x + offsetX,
            tree.y + offsetY,
            'fruits',
            fruitData.frame
        );
        
        // Scale the fruit
        fruit.setScale(0.8 + Math.random() * 0.4);
        
        // Set depth
        fruit.setDepth(tree.depth + 1);
        
        // Store fruit data
        fruit.setData('fruitType', fruitData.type);
        fruit.setData('fruitFrame', fruitData.frame);
        
        // Add healing properties
        const healingPower = this.getHealingPower(fruitData.type);
        if (healingPower > 0) {
            fruit.setData('healingPower', healingPower);
            fruit.setData('fromHealingSpruce', true);
            this.addFruitGlow(fruit);
        }
        
        // Make interactive
        this.makeFruitInteractive(fruit);
        
        // Add gentle sway animation
        this.scene.tweens.add({
            targets: fruit,
            x: fruit.x + (Math.random() - 0.5) * 3,
            duration: 2000 + Math.random() * 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        // Add to environment group
        this.environmentGroup.add(fruit);
    }
    
    /**
     * Add a glow effect to a healing fruit
     */
    addFruitGlow(fruit) {
        const glowColor = 0x88ff88;
        const glowAlpha = 0.3;
        
        const glow = this.scene.add.circle(0, 0, fruit.width * 0.7, glowColor, glowAlpha);
        glow.setDepth(fruit.depth - 0.1);
        
        fruit.setData('glowEffect', glow);
        
        this.scene.events.on('update', () => {
            if (glow && fruit && fruit.active) {
                glow.setPosition(fruit.x, fruit.y);
            } else if (glow && glow.active) {
                glow.destroy();
            }
        });
    }
    
    /**
     * Get healing power for a fruit type
     */
    getHealingPower(fruitType) {
        switch (fruitType) {
            case FruitType.APPLE:
                return 10;
            case FruitType.CHERRY:
                return 5;
            case FruitType.ORANGE:
                return 8;
            default:
                return 0;
        }
    }
    
    /**
     * Make a fruit interactive
     */
    makeFruitInteractive(fruit) {
        fruit.setInteractive({ useHandCursor: true });
        
        const originalScale = fruit.scale;
        
        // Hover effects
        fruit.on('pointerover', () => {
            this.scene.tweens.add({
                targets: fruit,
                scaleX: originalScale * 1.2,
                scaleY: originalScale * 1.2,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
        
        fruit.on('pointerout', () => {
            this.scene.tweens.add({
                targets: fruit,
                scaleX: originalScale,
                scaleY: originalScale,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
        
        // Click to show popup
        fruit.on('pointerdown', () => {
            this.showFruitInteractionPopup(fruit);
        });
    }
    
    /**
     * Show fruit interaction popup
     */
    showFruitInteractionPopup(fruit) {
        if (!this.popupSystem) return;
        
        const fruitType = fruit.getData('fruitType');
        const isHealingFruit = fruit.getData('fromHealingSpruce') || false;
        const healingPower = fruit.getData('healingPower') || 0;
        
        // Get fruit name based on type
        let fruitName = 'Fruit';
        let fruitDescription = 'A juicy fruit.';
        
        switch (fruitType) {
            case FruitType.APPLE:
                fruitName = 'Apple';
                fruitDescription = isHealingFruit ? 
                    `A magical apple with healing properties. It restores ${healingPower} health when consumed.` : 
                    'A crisp, juicy apple.';
                break;
            case FruitType.ORANGE:
                fruitName = 'Orange';
                fruitDescription = isHealingFruit ? 
                    `A magical orange with healing properties. It restores ${healingPower} health when consumed.` : 
                    'A sweet, tangy orange.';
                break;
            case FruitType.CHERRY:
                fruitName = 'Cherry';
                fruitDescription = isHealingFruit ? 
                    `A magical cherry with healing properties. It restores ${healingPower} health when consumed.` : 
                    'A sweet, ripe cherry.';
                break;
        }
        
        // Create HTML content for the popup
        let popupContent = {
            html: `
                <div class="fruit-interaction-popup">
                    <h3>${fruitName}</h3>
                    <div class="fruit-description">
                        ${fruitDescription}
                    </div>
                    <div class="fruit-actions">
                        <button class="action-btn collect-btn">Collect</button>
                    </div>
                </div>
            `,
            buttons: [
                {
                    selector: '.collect-btn',
                    onClick: () => {
                        // Close the popup first
                        this.popupSystem?.closePopupsByClass('fruit-popup');
                        
                        // Then perform the collect action
                        this.scene.events.emit('fruit-collect', fruit);
                        this.createFruitCollectAnimation(fruit);
                        fruit.destroy();
                    }
                }
            ]
        };
        
        // Convert world position to screen position
        const camera = this.scene.cameras.main;
        const screenX = (fruit.x - camera.scrollX) * camera.zoom;
        const screenY = (fruit.y - camera.scrollY) * camera.zoom;
        
        // Create popup at fruit's screen position
        this.popupSystem.createPopupAtScreenPosition(
            screenX,
            screenY,
            popupContent,
            {
                className: 'fruit-popup',
                closeButton: true,
                width: 220,
                offset: { x: 0, y: -10 }
            }
        );
    }
    
    /**
     * Create collection animation for a fruit
     */
    createFruitCollectAnimation(fruit) {
        const collectAnim = this.scene.add.sprite(fruit.x, fruit.y, 'fruits', fruit.frame.name);
        collectAnim.setScale(fruit.scaleX, fruit.scaleY);
        collectAnim.setDepth(100);
        
        this.scene.tweens.add({
            targets: collectAnim,
            y: collectAnim.y - 50,
            alpha: 0,
            scale: collectAnim.scaleX * 1.5,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => collectAnim.destroy()
        });
        
        this.createSparkleParticles(fruit.x, fruit.y);
    }
    
    /**
     * Create sparkle particles
     */
    createSparkleParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                2,
                0xFFFFFF
            );
            
            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                scale: { from: 1, to: 2 },
                duration: 300 + Math.random() * 400,
                onComplete: () => particle.destroy()
            });
        }
    }
    
    /**
     * Handle tree destruction by removing attached fruits
     */
    handleTreeDestruction(tree) {
        // Get all fruits near the tree
        const treeImage = tree;
        const treeX = treeImage.x;
        const treeY = treeImage.y;
        const treeWidth = treeImage.displayWidth;
        
        const fruitSprites = this.environmentGroup.getChildren().filter(obj => {
            return obj instanceof Phaser.GameObjects.Sprite &&
                   obj.getData('fruitType') !== undefined &&
                   Phaser.Math.Distance.Between(obj.x, obj.y, treeX, treeY) < treeWidth * 0.6;
        }) ;
        
        // Make fruits fall
        fruitSprites.forEach(fruit => {
            this.scene.tweens.add({
                targets: fruit,
                y: fruit.y + 100,
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: 600,
                ease: 'Quad.easeIn',
                onComplete: () => fruit.destroy()
            });
        });
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any remaining fruits
        this.environmentGroup.getChildren()
            .filter(obj => obj instanceof Phaser.GameObjects.Sprite && obj.getData('fruitType'))
            .forEach(fruit => {
                const glow = fruit.getData('glowEffect');
                if (glow) {
                    glow.destroy();
                }
                fruit.destroy();
            });
    }
} 