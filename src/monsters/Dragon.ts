import { Scene, Physics, Math as PhaserMath, GameObjects } from 'phaser';
import { ItemSystem } from '../items/item';
import { BaseMonster } from './BaseMonster';
import { MonsterData, MonsterState, MonsterType, MonsterBehavior } from './MonsterTypes';
import { logger, LogCategory } from '../utils/Logger';

export class Dragon extends BaseMonster {
    private isFlying: boolean = false;
    private flyingHeight: number = 0;
    private readonly MAX_FLYING_HEIGHT: number = 50;
    private readonly FLYING_SPEED_BONUS: number = 1.5;
    private breathAttackCooldown: number = 0;
    private readonly BREATH_ATTACK_COOLDOWN: number = 8000; // 8 seconds between breath attacks
    private breathAttackReady: boolean = true;
    private breathAttackIndicator: GameObjects.Graphics | null = null;
    private readonly BREATH_ATTACK_RANGE: number = 200; // Longer range than melee
    private readonly BREATH_ATTACK_DAMAGE: number = 25; // More damage than melee
    private fireBreathCooldown: number = 0;
    private readonly FIRE_BREATH_COOLDOWN: number = 5000; // 5 seconds between fire breath attacks
    private canUseFireBreath: boolean = true;
    private readonly FIRE_BREATH_RANGE: number = 150; // Longer range than normal attacks

    constructor(scene: Scene, x: number, y: number, monsterData: MonsterData, playerSprite: Physics.Arcade.Sprite, itemSystem: ItemSystem) {
        super(scene, x, y, monsterData, playerSprite, itemSystem);
        
        // Create breath attack indicator
        this.createBreathAttackIndicator();
    }
    
    private createBreathAttackIndicator(): void {
        this.breathAttackIndicator = this.scene.add.graphics();
        this.breathAttackIndicator.setDepth(60); // Above the monster but below the player
        this.updateBreathAttackIndicator();
    }
    
    private updateBreathAttackIndicator(): void {
        if (!this.breathAttackIndicator) return;
        
        this.breathAttackIndicator.clear();
        
        if (this.breathAttackReady && this.isAutoAttacking) {
            // Draw a cone shape to indicate breath attack area
            this.breathAttackIndicator.fillStyle(0xFF0000, 0.3);
            
            // Calculate direction to player
            const dx = this.playerSprite.x - this.x;
            const dy = this.playerSprite.y - this.y;
            const angle = Math.atan2(dy, dx);
            
            // Draw a cone/triangle shape
            this.breathAttackIndicator.beginPath();
            this.breathAttackIndicator.moveTo(this.x, this.y);
            
            // Draw arc points to create a cone
            const coneAngle = Math.PI / 4; // 45 degrees cone
            for (let i = -coneAngle; i <= coneAngle; i += 0.1) {
                const pointAngle = angle + i;
                const pointX = this.x + Math.cos(pointAngle) * this.BREATH_ATTACK_RANGE;
                const pointY = this.y + Math.sin(pointAngle) * this.BREATH_ATTACK_RANGE;
                this.breathAttackIndicator.lineTo(pointX, pointY);
            }
            
            this.breathAttackIndicator.closePath();
            this.breathAttackIndicator.fillPath();
        }
    }
    
    private hideBreathAttackIndicator(): void {
        if (this.breathAttackIndicator) {
            this.breathAttackIndicator.clear();
        }
    }
    
    public takeDamage(amount: number): void {
        super.takeDamage(amount);
        
        // Dragons take to the air when damaged
        if (!this.isFlying && this.attributes.health < this.attributes.maxHealth * 0.7) {
            this.startFlying();
        }
        
        // Always become aggressive when damaged
        this.changeState(MonsterState.CHASING);
    }
    
    private startFlying(): void {
        this.isFlying = true;
        this.flyingHeight = this.MAX_FLYING_HEIGHT;
        
        // Adjust scale to simulate height
        this.setScale(this.scaleX * 0.8, this.scaleY * 0.8);
        
        // Add shadow beneath dragon (would be implemented in a real game)
        // For now, we'll just log it
        logger.debug(LogCategory.MONSTER, 'Dragon takes to the air!');
    }
    
    private landOnGround(): void {
        this.isFlying = false;
        this.flyingHeight = 0;
        
        // Restore original scale
        this.setScale(this.scaleX / 0.8, this.scaleY / 0.8);
        
        logger.debug(LogCategory.MONSTER, 'Dragon lands on the ground');
    }
    
    private performBreathAttack(): void {
        // Calculate direction to player
        const dx = this.playerSprite.x - this.x;
        const dy = this.playerSprite.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if player is in range and in front of the dragon
        if (distance <= this.BREATH_ATTACK_RANGE) {
            // In a real game, you'd apply area damage here
            // For now, we'll just apply damage to the player
            const attackSuccessful = this.attackPlayer();
            
            // Apply extra damage for breath attack only if initial attack was successful
            if (attackSuccessful) {
                const extraDamage = this.BREATH_ATTACK_DAMAGE - this.attributes.damage;
                if (extraDamage > 0) {
                    // Use combat system if available
                    const combatSystem = (this.scene as any).combatSystem;
                    if (combatSystem) {
                        combatSystem.monsterAttackPlayer(this, extraDamage);
                    }
                }
                
                logger.debug(LogCategory.MONSTER, 'Dragon unleashes a devastating breath attack!');
            }
        }
        
        // Set cooldown
        this.breathAttackReady = false;
        this.breathAttackCooldown = 0;
    }
    
    private useFireBreath(): void {
        // Set fire breath on cooldown
        this.canUseFireBreath = false;
        this.fireBreathCooldown = 0;
        
        // Fire breath does double damage
        const originalDamage = this.attributes.damage;
        this.attributes.damage *= 2;
        this.attackPlayer();
        
        // Create a cone-shaped area of effect in front of the dragon
        // In a real game, this would use proper collision detection
        // For now, we'll just check if the player is in front of the dragon
        const dx = this.playerSprite.x - this.x;
        const dy = this.playerSprite.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If player is in the fire breath range but outside normal attack range,
        // they still take damage
        if (distance > this.ATTACK_RANGE && distance <= this.FIRE_BREATH_RANGE) {
            this.attackPlayer();
        }
        
        // Restore original damage
        this.attributes.damage = originalDamage;
        
        // Go back to chasing
        this.changeState(MonsterState.CHASING);
    }
    
    protected handleIdleState(time: number, delta: number, distToPlayer: number): void {
        // Stand still
        this.setVelocity(0, 0);
        
        // Check if player is too close
        if (distToPlayer < this.attributes.detectionRadius) {
            this.changeState(MonsterState.CHASING);
            return;
        }
        
        // Occasionally start wandering
        this.stateTimer += delta;
        if (this.stateTimer > 3000 && Math.random() < 0.01) {
            this.changeState(MonsterState.WANDERING);
            this.setNewWanderTarget();
        }
        
        // Update fire breath cooldown
        this.updateFireBreathCooldown(delta);
    }
    
    protected handleWanderingState(time: number, delta: number, distToPlayer: number): void {
        // Check if player is too close
        if (distToPlayer < this.attributes.detectionRadius) {
            this.changeState(MonsterState.CHASING);
            return;
        }
        
        // Move toward wander target
        if (this.wanderTarget) {
            // Calculate direction to target
            const dx = this.wanderTarget.x - this.x;
            const dy = this.wanderTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we've reached the target, go back to idle
            if (distance < 10) {
                this.changeState(MonsterState.IDLE);
                return;
            }
            
            // Move toward target
            const speed = this.attributes.speed;
            this.setVelocity(
                (dx / distance) * speed,
                (dy / distance) * speed
            );
            
            // Flip sprite based on movement direction
            if (dx < 0) {
                this.setFlipX(true);
            } else {
                this.setFlipX(false);
            }
            
            // Time limit on wandering
            this.stateTimer += delta;
            if (this.stateTimer > 5000) {
                this.changeState(MonsterState.IDLE);
            }
        } else {
            // No target, go back to idle
            this.changeState(MonsterState.IDLE);
        }
        
        // Update fire breath cooldown
        this.updateFireBreathCooldown(delta);
    }
    
    protected handleFleeingState(time: number, delta: number, distToPlayer: number): void {
        // Dragons don't flee, they attack! Change to chasing
        this.changeState(MonsterState.CHASING);
    }
    
    protected handleChasingState(time: number, delta: number, distToPlayer: number): void {
        // If fire breath is ready and player is in range, use it
        if (this.canUseFireBreath && distToPlayer <= this.FIRE_BREATH_RANGE) {
            this.useFireBreath();
            return;
        }
        
        // If close enough to attack, change to attacking state
        if (distToPlayer < this.ATTACK_RANGE) {
            this.changeState(MonsterState.ATTACKING);
            return;
        }
        
        // If too far from spawn, return home
        const distToSpawn = PhaserMath.Distance.Between(
            this.x, this.y, 
            this.spawnPoint.x, this.spawnPoint.y
        );
        
        if (this.attributes.returnRadius && distToSpawn > this.attributes.returnRadius) {
            this.changeState(MonsterState.RETURNING);
            return;
        }
        
        // Move toward player
        const dx = this.playerSprite.x - this.x;
        const dy = this.playerSprite.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.setVelocity(
            (dx / distance) * this.attributes.speed,
            (dy / distance) * this.attributes.speed
        );
        
        // Flip sprite based on movement direction
        if (dx < 0) {
            this.setFlipX(true);
        } else {
            this.setFlipX(false);
        }
        
        // Update fire breath cooldown
        this.updateFireBreathCooldown(delta);
    }
    
    protected handleAttackingState(time: number, delta: number, distToPlayer: number): void {
        // If fire breath is ready, use it instead of normal attack
        if (this.canUseFireBreath) {
            this.useFireBreath();
            return;
        }
        
        // If player is in range, attack
        if (distToPlayer < this.ATTACK_RANGE) {
            this.attackPlayer();
        }
        
        // After attacking, go back to chasing
        this.changeState(MonsterState.CHASING);
        
        // Update fire breath cooldown
        this.updateFireBreathCooldown(delta);
    }
    
    protected handleReturningState(time: number, delta: number): void {
        // Calculate direction to spawn point
        const dx = this.spawnPoint.x - this.x;
        const dy = this.spawnPoint.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we've reached the spawn point, go back to idle
        if (distance < 10) {
            this.changeState(MonsterState.IDLE);
            return;
        }
        
        // Move toward spawn point
        const speed = this.attributes.speed;
        this.setVelocity(
            (dx / distance) * speed,
            (dy / distance) * speed
        );
        
        // Flip sprite based on movement direction
        if (dx < 0) {
            this.setFlipX(true);
        } else {
            this.setFlipX(false);
        }
        
        // Update fire breath cooldown
        this.updateFireBreathCooldown(delta);
    }
    
    private updateFireBreathCooldown(delta: number): void {
        if (!this.canUseFireBreath) {
            this.fireBreathCooldown += delta;
            if (this.fireBreathCooldown >= this.FIRE_BREATH_COOLDOWN) {
                this.canUseFireBreath = true;
            }
        }
    }
    
    public destroy(fromScene?: boolean): void {
        // Clean up breath attack indicator
        if (this.breathAttackIndicator) {
            this.breathAttackIndicator.destroy();
            this.breathAttackIndicator = null;
        }
        
        // Clear any references
        this.wanderTarget = null;
        
        // Call super.destroy() in a try-catch to handle potential errors
        try {
            super.destroy(fromScene);
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error destroying Dragon: ${error}`);
        }
    }
} 