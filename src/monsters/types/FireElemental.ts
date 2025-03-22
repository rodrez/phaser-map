import { Scene, Physics, Math as PhaserMath, GameObjects } from 'phaser';
import { ItemSystem } from '../../items/item';
import { BaseMonster } from '../BaseMonster';
import { MonsterData, MonsterState, MonsterType, MonsterBehavior } from '../MonsterTypes';
import { logger, LogCategory } from '../../utils/Logger';

export class FireElemental extends BaseMonster {
    private isBurning: boolean = true; // Fire elementals always burn
    private burnChance: number = 0.5; // 50% chance to burn on attack
    private burnDamage: number = 3;
    private burnDuration: number = 3000; // 3 seconds
    private fireAura: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private readonly FIRE_AURA_RANGE: number = 60; // Range of fire aura damage
    private readonly FIRE_AURA_DAMAGE: number = 1; // Damage per tick from fire aura
    private fireAuraTimer: number = 0;
    private readonly FIRE_AURA_TICK: number = 1000; // Fire aura damage tick interval (1 second)

    constructor(scene: Scene, x: number, y: number, monsterData: MonsterData, playerSprite: Physics.Arcade.Sprite, itemSystem: ItemSystem) {
        super(scene, x, y, monsterData, playerSprite, itemSystem);
        
        // Add fire particle effect
        this.createFireParticles();
        
        // Tint the sprite orange/red
        this.setTint(0xFF6600);
    }
    
    private createFireParticles(): void {
        try {
            // Check if the scene has a particle manager
            if ((this.scene as any).particles) {
                // Create fire particles
                this.fireAura = (this.scene as any).particles.createEmitter({
                    x: this.x,
                    y: this.y,
                    frame: ['red', 'yellow', 'orange'], // Particle frames (would be defined in your game)
                    lifespan: 600,
                    speed: { min: 20, max: 50 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    quantity: 2,
                    blendMode: 'ADD'
                });
            }
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error creating fire particles: ${error}`);
        }
    }
    
    protected attackPlayer(): boolean {
        // Call the base attack method
        const attackSuccessful = super.attackPlayer();
        
        // If attack was successful, apply burn effect
        if (attackSuccessful && Math.random() < this.burnChance) {
            this.applyBurnToPlayer();
        }
        
        return attackSuccessful;
    }
    
    private applyBurnToPlayer(): void {
        // Get the combat system
        const gameScene = this.scene as any;
        if (gameScene.combatSystem && typeof gameScene.combatSystem.applyBurnToPlayer === 'function') {
            // Apply burn using the combat system
            gameScene.combatSystem.applyBurnToPlayer(
                this,
                this.burnDamage,
                this.burnDuration
            );
            
            logger.info(LogCategory.COMBAT, `${this.monsterName} set player on fire!`);
        } else {
            // Fallback for backward compatibility
            console.log(`Player has been burned by ${this.monsterName}!`);
            
            // Get the player system
            if (gameScene.playerSystem && typeof gameScene.playerSystem.applyStatusEffect === 'function') {
                gameScene.playerSystem.applyStatusEffect('burn', {
                    damage: this.burnDamage,
                    duration: this.burnDuration,
                    source: this
                });
            }
        }
    }
    
    public update(time: number, delta: number): void {
        // Call the parent update method
        super.update(time, delta);
        
        // Update fire particles position
        if (this.fireAura) {
            this.fireAura.setPosition(this.x, this.y);
        }
        
        // Check for fire aura damage
        this.fireAuraTimer += delta;
        if (this.fireAuraTimer >= this.FIRE_AURA_TICK) {
            this.fireAuraTimer -= this.FIRE_AURA_TICK;
            this.applyFireAuraDamage();
        }
    }
    
    private applyFireAuraDamage(): void {
        // Calculate distance to player
        const distToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.playerSprite.x, this.playerSprite.y
        );
        
        // If player is within fire aura range, apply damage
        if (distToPlayer <= this.FIRE_AURA_RANGE) {
            // Get the combat system
            const gameScene = this.scene as any;
            if (gameScene.combatSystem) {
                // Apply fire aura damage
                gameScene.combatSystem.monsterAttackPlayer(this, this.FIRE_AURA_DAMAGE);
                
                // Also apply burn effect with a lower chance
                if (Math.random() < 0.2) { // 20% chance
                    this.applyBurnToPlayer();
                }
                
                logger.info(LogCategory.COMBAT, `${this.monsterName}'s fire aura burned player for ${this.FIRE_AURA_DAMAGE} damage`);
            }
        }
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
    }
    
    protected handleFleeingState(time: number, delta: number, distToPlayer: number): void {
        // Fire elementals don't flee, they attack!
        this.changeState(MonsterState.ATTACKING);
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
    }
    
    protected handleAttackingState(time: number, delta: number, distToPlayer: number): void {
        // If player is in range, attack
        if (distToPlayer < this.ATTACK_RANGE) {
            this.attackPlayer();
            
            // After attacking, go back to chasing
            this.changeState(MonsterState.CHASING);
        } else {
            // If player is out of range, go back to chasing
            this.changeState(MonsterState.CHASING);
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
        const speed = this.attributes.speed * 0.8; // Slower when returning
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
        // Clean up fire particles
        if (this.fireAura) {
            this.fireAura.stop();
            this.fireAura = null;
        }
        
        // Call the parent destroy method
        super.destroy(fromScene);
    }
} 