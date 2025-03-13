import { FruitType } from '../items/item';

/**
 * System to handle fruit-related functionality
 */
export class FruitSystem {
    scene;
    environmentGroup;
    popupSystem;
    mapManager;
    
    constructor(scene, environmentGroup) {
        this.scene = scene;
        this.environmentGroup = environmentGroup;
        this.mapManager = scene.mapManager;
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
        
        // Define available fruit types
        const fruitTypes = [
            { frame: 0, type: FruitType.APPLE },
            { frame: 1, type: FruitType.ORANGE },
            { frame: 2, type: FruitType.CHERRY }
        ];
        
        // Healing spruce prefers healing fruits (apple or cherry)
        let selectedFruit;
        if (Math.random() < 0.7) {
            selectedFruit = Math.random() < 0.5 ? fruitTypes[0] : fruitTypes[2];
        } else {
            selectedFruit = fruitTypes[1];
        }
        
        // Arrays to track attached fruits and their offsets
        const attachedFruits = [];
        const offsetsX = [];
        const offsetsY = [];
        
        // Create fruits
        for (let i = 0; i < fruitCount; i++) {
            const fruit = this.createFruit(tree, selectedFruit, treeWidth, treeHeight);
            
            // Store the fruit and its offsets
            if (fruit) {
                attachedFruits.push(fruit);
                offsetsX.push(fruit.x - tree.x);
                offsetsY.push(fruit.y - tree.y);
            }
        }
        
        // Store attached fruits and their offsets on the tree
        if (attachedFruits.length > 0) {
            tree.setData('attachedObjects', attachedFruits);
            tree.setData('attachedObjectsOffsetX', offsetsX);
            tree.setData('attachedObjectsOffsetY', offsetsY);
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
        
        // Store reference to parent tree
        fruit.setData('parentTree', tree);
        
        // If tree has lat/lng coordinates, use them for the fruit too
        if (tree.getData('lat') && tree.getData('lng')) {
            fruit.setData('lat', tree.getData('lat'));
            fruit.setData('lng', tree.getData('lng'));
        }
        
        // Add healing properties
        const healingPower = this.getHealingPower(fruitData.type);
        if (healingPower > 0) {
            fruit.setData('healingPower', healingPower);
            fruit.setData('fromHealingSpruce', true);
        }
        
        // Make interactive
        this.makeFruitInteractive(fruit);
        
        // Store the offset from the tree for positioning
        fruit.setData('treeOffsetX', offsetX);
        fruit.setData('treeOffsetY', offsetY);
        
        // Create a separate object to track the sway animation
        // This prevents the tween from directly modifying the fruit's position
        const swayData = { value: 0 };
        fruit.setData('swayData', swayData);
        
        // Add gentle sway animation
        this.scene.tweens.add({
            targets: swayData,
            value: (Math.random() - 0.5) * 3,
            duration: 2000 + Math.random() * 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
        
        // Add to environment group
        this.environmentGroup.add(fruit);
        
        return fruit;
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

        const icons = {
            [FruitType.APPLE]: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M350.85 129c25.97 4.67 47.27 18.67 63.92 42 14.65 20.67 24.64 46.67 29.96 78 4.67 28.67 4.32 57.33-1 86-7.99 47.33-23.97 87-47.94 119-28.64 38.67-64.59 58-107.87 58-10.66 0-22.3-3.33-34.96-10-8.66-5.33-18.31-8-28.97-8s-20.3 2.67-28.97 8c-12.66 6.67-24.3 10-34.96 10-43.28 0-79.23-19.33-107.87-58-23.97-32-39.95-71.67-47.94-119-5.32-28.67-5.67-57.33-1-86 5.32-31.33 15.31-57.33 29.96-78 16.65-23.33 37.95-37.33 63.92-42 15.98-2.67 37.95-.33 65.92 7 23.97 6.67 44.28 14.67 60.93 24 16.65-9.33 36.96-17.33 60.93-24 27.98-7.33 49.96-9.67 65.94-7zm-54.94-41c-9.32 8.67-21.65 15-36.96 19-10.66 3.33-22.3 5-34.96 5l-14.98-1c-1.33-9.33-1.33-20 0-32 2.67-24 10.32-42.33 22.97-55 9.32-8.67 21.65-15 36.96-19 10.66-3.33 22.3-5 34.96-5l14.98 1 1 15c0 12.67-1.67 24.33-4.99 35-3.99 15.33-10.31 27.67-18.98 37z"></path></svg>`,
            [FruitType.ORANGE]: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M471.5 65.72c-10.5 4.91-21.1 9.87-31.6 14.89C481.8 196.7 438.8 314.5 358 373.4c-41.8 30.5-93.9 45.2-148.9 35.5-53.8-9.6-110.07-42.6-162.13-105.3-8.53 5.8-17.06 11.6-25.58 17.5 11.95 16.1 45.31 57.4 96.01 88.6 63.7 39.3 151.2 61.2 256.3-9.8 93.5-63.2 116.5-148.2 116.9-218.6.3-53-12.6-97.01-19.1-115.58zm-47.9 22.72c-62.3 20.36-103.9 43.76-147.3 71.06-2.4 2 .2 8.4 5.9 8.1l155.9 6.2c.2-27.7-4.4-56.5-14.5-85.36zm-39 44.36l3.4 17.6-40.3 7.9-3.4-17.6zm-98.8 53c-7.4.1-11.1 7-4.8 15.3l119.5 101c20.4-31.7 33.6-69.6 36.8-110.3zm37.8 12.6l37.1 13.8-6.2 16.8-37.1-13.8zm-115.4 4.9c-.9 0-1.9.3-3 .9-47.8 27.9-100.4 56-143.18 89.3 30.54 36.6 61.98 61.8 93.08 77.9l58.7-156.2c3-4.6-.4-12-5.6-11.9zm56.2 9.4c-5.3 0-8.7 6.7-8 8.6l44.8 162.3c16.4-6 31.9-14.4 46.2-24.8 15.9-11.6 30.3-25.8 42.6-41.9L269.1 214.5c-1.7-1.3-3.3-1.8-4.7-1.8zm-30.7 7c-1.2.1-2.5 1-3.6 3.5L171.4 379c13.8 5.7 27.5 9.7 40.9 12.1 24.9 4.4 49 3.4 71.7-2.2l-45.4-164.6c-.8-2.2-2.8-4.6-4.9-4.6zm-64.9 24.8l13.8 11.6-32.9 38.7-13.8-11.6zm130.6 17.3l21.2 26.5-14 11.2-21.2-26.5zM220.8 286l18 .6-1.6 42.5-18-.6z"></path></svg>`,
            [FruitType.CHERRY]: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M16.588 5.191l.058 .045l.078 .074l.072 .084l.013 .018a.998 .998 0 0 1 .182 .727l-.022 .111l-.03 .092c-.99 2.725 -.666 5.158 .679 7.706a4 4 0 1 1 -4.613 4.152l-.005 -.2l.005 -.2a4.002 4.002 0 0 1 2.5 -3.511c-.947 -2.03 -1.342 -4.065 -1.052 -6.207c-.166 .077 -.332 .15 -.499 .218l.094 -.064c-2.243 1.47 -3.552 3.004 -3.98 4.57a4.5 4.5 0 1 1 -7.064 3.906l-.004 -.212l.005 -.212a4.5 4.5 0 0 1 5.2 -4.233c.332 -1.073 .945 -2.096 1.83 -3.069c-1.794 -.096 -3.586 -.759 -5.355 -1.986l-.268 -.19l-.051 -.04l-.046 -.04l-.044 -.044l-.04 -.046l-.04 -.05l-.032 -.047l-.035 -.06l-.053 -.11l-.038 -.116l-.023 -.117l-.005 -.042l-.005 -.118l.01 -.118l.023 -.117l.038 -.115l.03 -.066l.023 -.045l.035 -.06l.032 -.046l.04 -.051l.04 -.046l.044 -.044l.046 -.04l.05 -.04c4.018 -2.922 8.16 -2.922 12.177 0z"></path></svg>`
        }
        
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

        
        
        
        // Create popup at fruit's screen position
        this.popupSystem.createCenteredStandardPopup(
            {
                title: fruitName,
                description: fruitDescription,
                icon: icons[fruitType],
                actions: [
                    {
                        text: 'Collect',
                        onClick: () => this.scene.events.emit('fruit-collect', fruit)
                    }
                ]
            }
        );
    }
    
    /**
     * Create collection animation for a fruit
     */
    createFruitCollectAnimation(fruit) {
        // Get the frame number from the fruit's data
        const frameNumber = fruit.getData('fruitFrame');
        
        // Create a collection animation sprite at the fruit's current position
        const collectAnim = this.scene.add.sprite(fruit.x, fruit.y, 'fruits', frameNumber);
        collectAnim.setScale(fruit.scaleX, fruit.scaleY);
        collectAnim.setDepth(100);
        
        // Animation sprites should NOT have lat/lng data so they don't move with the map
        
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
            
            // Set a high depth to ensure particles are visible
            particle.setDepth(100);
            
            // Particles should NOT have lat/lng data so they don't move with the map
            
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
        for (const fruit of fruitSprites) {
            this.scene.tweens.add({
                targets: fruit,
                y: fruit.y + 100,
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: 600,
                ease: 'Quad.easeIn',
                onComplete: () => fruit.destroy()
            });
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any remaining fruits
        for (const fruit of this.environmentGroup.getChildren()) {
            if (fruit instanceof Phaser.GameObjects.Sprite && fruit.getData('fruitType')) {
                fruit.destroy();
            }
        }
    }
} 