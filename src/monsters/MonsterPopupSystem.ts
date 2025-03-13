import type { Scene } from 'phaser';
import { BaseMonster } from './BaseMonster';
import type { PopupSystem, PopupContent, PopupOptions, StandardPopupOptions } from '../ui/popup';
import { MonsterBehavior } from './MonsterTypes';
import { logger, LogCategory } from '../utils/Logger';

/**
 * MonsterPopupSystem - Handles displaying information popups for monsters
 */
export class MonsterPopupSystem {
    private scene: Scene;
    private popupSystem: PopupSystem;
    private activeMonsterPopup: HTMLElement | null = null;
    private clickTarget: BaseMonster | null = null;
    private lastHealth = 0;
    private lastState = '';

    constructor(scene: Scene, popupSystem: PopupSystem) {
        this.scene = scene;
        this.popupSystem = popupSystem;
        
        // Set up click interaction on monsters
        this.setupMonsterInteraction();
    }
    
    /**
     * Sets up input handling for monster interactions
     */
    private setupMonsterInteraction(): void {
        logger.info(LogCategory.MONSTER, "Setting up monster interaction in MonsterPopupSystem");
        
        // Add pointer down event to the scene's input manager
        this.scene.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: unknown) => {
            logger.info(LogCategory.MONSTER, `Clicked on object: ${gameObject}`);
            
            // Check if the clicked object is a monster
            if (gameObject instanceof BaseMonster) {
                logger.info(LogCategory.MONSTER, `Clicked on monster: ${gameObject.monsterName}`);
                this.showMonsterPopup(gameObject, pointer.worldX, pointer.worldY);
            }
        });
        
        // Alternative approach: add direct click handlers to all monsters
        const scene = this.scene as Scene & {
            monsterSystem?: {
                getMonsters: () => BaseMonster[]
            }
        };
        if (scene.monsterSystem?.getMonsters) {
            const monsters = scene.monsterSystem.getMonsters();
            logger.info(LogCategory.MONSTER, `Adding click handlers to ${monsters.length} monsters`);
            
            for (const monster of monsters) {
                monster.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    logger.info(LogCategory.MONSTER, `Direct click on monster: ${monster.monsterName}`);
                    this.showMonsterPopup(monster, pointer.worldX, pointer.worldY);
                });
            }
        }
    }
    
    /**
     * Shows a popup with monster information and interaction options
     */
    public showMonsterPopup(monster: BaseMonster, x: number, y: number): void {
        // Close any existing popup
        this.closeMonsterPopup();
        
        // Store reference to clicked monster
        this.clickTarget = monster;
        
        // Get behavior description
        const behaviorDescription = this.getBehaviorDescription(monster.behavior);
        
        // Create a health bar HTML
        const healthPercentage = Math.floor((monster.attributes.health / monster.attributes.maxHealth) * 100);
        const healthBarHtml = `
            <div class="health-bar-container">
                <div class="health-bar" style="width: ${healthPercentage}%"></div>
                <div class="health-text">${monster.attributes.health}/${monster.attributes.maxHealth}</div>
            </div>
        `;
        
        // Create description with monster stats
        const description = `
            <div class="monster-stats">
                ${healthBarHtml}
                <div class="stat-row">
                    <span class="stat-label">Behavior:</span>
                    <span class="stat-value">${behaviorDescription}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">State:</span>
                    <span class="stat-value">${this.formatState(monster.currentState)}</span>
                </div>
            </div>
        `;
        
        // Configure standard popup options
        const options: StandardPopupOptions = {
            title: monster.monsterName,
            description: description,
            className: 'monster-popup-container',
            closeButton: true,
            width: 280,
            offset: { x: 10, y: 10 },
            zIndex: 1000,
            actions: [
                {
                    text: 'Attack',
                    onClick: () => this.attackMonster(monster),
                    className: 'danger-btn'
                },
                {
                    text: 'More Info',
                    onClick: () => this.showDetailedMonsterInfo(monster),
                    className: 'info-btn'
                }
            ]
        };
        
        // Create the popup
        this.activeMonsterPopup = this.popupSystem.createStandardPopup(x, y, options);
    }
    
    /**
     * Closes the active monster popup
     */
    public closeMonsterPopup(): void {
        if (this.activeMonsterPopup) {
            this.popupSystem.closePopup(this.activeMonsterPopup);
            this.activeMonsterPopup = null;
            this.clickTarget = null;
        }
    }
    
    /**
     * Handles attacking the monster
     */
    private attackMonster(monster: BaseMonster): void {
        // Close the popup
        this.closeMonsterPopup();
        
        // Use combat system if available
        const scene = this.scene as Scene & {
            combatSystem?: {
                playerAttackMonster: (monster: BaseMonster) => void
            },
            playerSystem?: {
                setTarget: (target: BaseMonster) => void
            },
            uiSystem?: {
                showMessage: (message: string, type: string, duration: number) => void
            }
        };
        if (scene.combatSystem) {
            scene.combatSystem.playerAttackMonster(monster);
        } else {
            // Fallback for backward compatibility
            monster.takeDamage(10); // Deal 10 damage to the monster
            
            // Set the monster as the current target for auto-attacking
            if (scene.playerSystem) {
                scene.playerSystem.setTarget(monster);
            }
        }
        
        // Show feedback
        if (scene.uiSystem) {
            scene.uiSystem.showMessage(`Attacking ${monster.monsterName}!`, 'info', 2000);
        }
    }
    
    /**
     * Shows detailed monster information
     */
    private showDetailedMonsterInfo(monster: BaseMonster): void {
        // We'll replace the current popup content with more detailed information
        if (!this.activeMonsterPopup) return;
        
        // Get loot table as formatted string
        const lootTableHtml = monster.lootTable.map(loot => 
            `<tr>
                <td>${loot.itemId}</td>
                <td>${loot.minQuantity}-${loot.maxQuantity}</td>
                <td>${Math.round(loot.dropChance * 100)}%</td>
            </tr>`
        ).join('');
        
        // Create detailed description
        const detailedDescription = `
            <div class="monster-details">
                <div class="stat-section">
                    <h4>Combat Stats</h4>
                    <div class="stat-row">
                        <span class="stat-label">Health:</span>
                        <span class="stat-value">${monster.attributes.health}/${monster.attributes.maxHealth}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Damage:</span>
                        <span class="stat-value">${monster.attributes.damage}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Defense:</span>
                        <span class="stat-value">${monster.attributes.defense}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Speed:</span>
                        <span class="stat-value">${monster.attributes.speed}</span>
                    </div>
                </div>
                <div class="stat-section">
                    <h4>Potential Loot</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Chance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lootTableHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Configure standard popup options for detailed view
        const options: StandardPopupOptions = {
            title: `${monster.monsterName} Details`,
            description: detailedDescription,
            className: 'monster-popup-container detailed',
            closeButton: true,
            width: 320,
            offset: { x: 10, y: 10 },
            zIndex: 1000,
            actions: [
                {
                    text: 'Attack',
                    onClick: () => this.attackMonster(monster),
                    className: 'danger-btn'
                },
                {
                    text: 'Back',
                    onClick: () => {
                        // Go back to the basic info view
                        if (this.clickTarget) {
                            const position = this.clickTarget.getCenter();
                            this.showMonsterPopup(this.clickTarget, position.x, position.y);
                        }
                    },
                    className: 'secondary-btn'
                }
            ]
        };
        
        // Close the current popup and create a new one with detailed info
        this.closeMonsterPopup();
        this.activeMonsterPopup = this.popupSystem.createStandardPopup(
            monster.x, 
            monster.y, 
            options
        );
    }
    
    /**
     * Gets a human-readable description of the monster's behavior
     */
    private getBehaviorDescription(behavior: MonsterBehavior): string {
        switch (behavior) {
            case MonsterBehavior.PASSIVE:
                return "Peaceful, flees when attacked";
            case MonsterBehavior.NEUTRAL:
                return "Peaceful, will defend itself";
            case MonsterBehavior.AGGRESSIVE:
                return "Aggressive, attacks on sight";
            case MonsterBehavior.TERRITORIAL:
                return "Defends territory";
            default:
                return "Unknown";
        }
    }
    
    /**
     * Formats the monster state for display
     */
    private formatState(state: string): string {
        // Convert snake_case to Title Case
        return state.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    /**
     * Updates the monster popup if the monster is still visible and selected
     */
    public update(): void {
        // If we have an active popup and monster, check if we need to update it
        if (this.activeMonsterPopup && this.clickTarget && this.clickTarget.active) {
            // For standard popups, we need to recreate the popup with updated information
            // Only do this if health or state has changed
            const currentHealth = this.clickTarget.attributes.health;
            const currentState = this.clickTarget.currentState;
            
            // Check if health or state has changed since last update
            if (this.lastHealth !== currentHealth || this.lastState !== currentState) {
                // Store current values for next comparison
                this.lastHealth = currentHealth;
                this.lastState = currentState;
                
                // Get monster position
                const position = this.clickTarget.getCenter();
                
                // Recreate the popup with updated information
                this.showMonsterPopup(this.clickTarget, position.x, position.y);
            }
        } else if (this.activeMonsterPopup && (!this.clickTarget || !this.clickTarget.active)) {
            // If the monster is no longer active, close the popup
            this.closeMonsterPopup();
        }
    }
}