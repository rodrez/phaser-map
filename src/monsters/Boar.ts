import { Scene, Physics, Math as PhaserMath } from 'phaser';
import { ItemSystem } from '../items/item';
import { BaseMonster } from './BaseMonster';
import { MonsterData, MonsterState, MonsterType, MonsterBehavior } from './MonsterTypes';
import { logger, LogCategory } from '../utils/Logger';

export class Boar extends BaseMonster {
    private isEnraged: boolean = false;
    private enrageTimer: number = 0;
    private readonly ENRAGE_DURATION: number = 5000; // 5 seconds of rage
    private chargeSpeed: number = 0;
    private isCharging: boolean = false;
    private chargeTarget: PhaserMath.Vector2 | null = null;

    constructor(scene: Scene, x: number, y: number, monsterData: MonsterData, playerSprite: Physics.Arcade.Sprite, itemSystem: ItemSystem) {
        super(scene, x, y, monsterData, playerSprite, itemSystem);
    }
    
    public takeDamage(amount: number): void {
        super.takeDamage(amount);
        
        // Boars become enraged when damaged
        this.isEnraged = true;
        this.enrageTimer = 0;
        
        // 50% chance to charge at the player when damaged
        if (Math.random() < 0.5) {
            this.startCharge();
        } else {
            this.changeState(MonsterState.ATTACKING);
        }
    }
    
    private startCharge(): void {
        this.isCharging = true;
        this.chargeSpeed = this.attributes.speed * 1.8; // Faster when charging
        
        // Set charge target (player's position)
        this.chargeTarget = new PhaserMath.Vector2(
            this.playerSprite.x,
            this.playerSprite.y
        );
        
        // Change state to attacking
        this.changeState(MonsterState.ATTACKING);
    }
    
    protected handleIdleState(time: number, delta: number, distToPlayer: number): void {
        // Stand still
        this.setVelocity(0, 0);
        
        // Check if player is too close - boars are territorial
        if (distToPlayer < this.attributes.detectionRadius) {
            // 70% chance to charge, 30% chance to just chase
            if (Math.random() < 0.7) {
                this.startCharge();
            } else {
                this.changeState(MonsterState.CHASING);
            }
            return;
        }
        
        // Occasionally start wandering
        this.stateTimer += delta;
        if (this.stateTimer > 3000 && Math.random() < 0.01) {
            this.changeState(MonsterState.WANDERING);
            this.setNewWanderTarget();
        }
    }
    
    protected handleWanderingState(time: number, delta: number, distToPlayer: number): void {
        // Check if player is too close
        if (distToPlayer < this.attributes.detectionRadius) {
            // 70% chance to charge, 30% chance to just chase
            if (Math.random() < 0.7) {
                this.startCharge();
            } else {
                this.changeState(MonsterState.CHASING);
            }
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
    }
    
    protected handleFleeingState(time: number, delta: number, distToPlayer: number): void {
        // Boars don't flee, they attack! Change to chasing
        this.changeState(MonsterState.CHASING);
    }
    
    protected handleChasingState(time: number, delta: number, distToPlayer: number): void {
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
        
        // Determine speed based on enraged state
        const speed = this.isEnraged ? this.attributes.speed * 1.3 : this.attributes.speed;
        
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
        
        // Update enrage timer
        if (this.isEnraged) {
            this.enrageTimer += delta;
            if (this.enrageTimer > this.ENRAGE_DURATION) {
                this.isEnraged = false;
            }
        }
    }
    
    protected handleAttackingState(time: number, delta: number, distToPlayer: number): void {
        // If charging, handle charge attack
        if (this.isCharging && this.chargeTarget) {
            // Calculate direction to charge target
            const dx = this.chargeTarget.x - this.x;
            const dy = this.chargeTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If we've reached the target or are close to player, stop charging and attack
            if (distance < 10 || distToPlayer < this.ATTACK_RANGE) {
                this.isCharging = false;
                
                // Attack the player if in range
                if (distToPlayer < this.ATTACK_RANGE) {
                    this.attackPlayer();
                }
                
                // Go back to chasing
                this.changeState(MonsterState.CHASING);
                return;
            }
            
            // Continue charging toward target
            this.setVelocity(
                (dx / distance) * this.chargeSpeed,
                (dy / distance) * this.chargeSpeed
            );
            
            // Flip sprite based on movement direction
            if (dx < 0) {
                this.setFlipX(true);
            } else {
                this.setFlipX(false);
            }
            
            return;
        }
        
        // Regular attack behavior (not charging)
        // If player is in range, attack
        if (distToPlayer < this.ATTACK_RANGE) {
            this.attackPlayer();
            
            // After attacking, go back to chasing
            this.changeState(MonsterState.CHASING);
        } else {
            // If player is out of range, go back to chasing
            this.changeState(MonsterState.CHASING);
        }
        
        // Update enrage timer
        if (this.isEnraged) {
            this.enrageTimer += delta;
            if (this.enrageTimer > this.ENRAGE_DURATION) {
                this.isEnraged = false;
            }
        }
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
    }
    
    public destroy(fromScene?: boolean): void {
        // Clear any references
        this.chargeTarget = null;
        this.wanderTarget = null;
        
        // Call super.destroy() in a try-catch to handle potential errors
        try {
            super.destroy(fromScene);
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error destroying Boar: ${error}`);
        }
    }
} 