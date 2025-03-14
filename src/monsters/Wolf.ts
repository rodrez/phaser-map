import { Scene, Physics} from 'phaser';
import { ItemSystem } from '../items/item';
import { BaseMonster } from './BaseMonster';
import { MonsterData, MonsterState,  MonsterBehavior } from './MonsterTypes';
import { logger, LogCategory } from '../utils/Logger';

export class Wolf extends BaseMonster {
    private attackCooldown = 0;
    
    constructor(scene: Scene, x: number, y: number, monsterData: MonsterData, playerSprite: Physics.Arcade.Sprite, itemSystem: ItemSystem) {
        super(scene, x, y, monsterData, playerSprite, itemSystem);
        
        // Check if the wolf texture exists
        if (!this.scene.textures.exists('wolf')) {
            logger.error(LogCategory.MONSTER, 'Wolf texture not found! Using fallback texture.');
            // Set a fallback texture if available
            if (this.scene.textures.exists('deer')) {
                this.setTexture('deer');
            }
            return;
        }
        
        try {
            // Ensure animations exist (this is now a no-op since we're using a single image)
            this.ensureAnimationsExist();
            
            // Skip playing animations for now since we're using a single image
            // this.safePlayAnimation('wolf_idle');
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error in Wolf constructor: ${error}`);
            // If animation creation fails, just use the static texture
        }
    }
    
    protected handleIdleState(time: number, delta: number, distToPlayer: number): void {
        // Skip animations for now
        // if ((!this.anims.isPlaying || this.anims.currentAnim?.key !== 'wolf_idle')) {
        //     this.safePlayAnimation('wolf_idle');
        // }
        
        // Stand still
        this.setVelocity(0, 0);
        
        // Check if player is within detection radius - wolves are aggressive
        if (this.behavior === MonsterBehavior.AGGRESSIVE && distToPlayer < this.attributes.detectionRadius) {
            this.changeState(MonsterState.CHASING);
            return;
        }
        
        // Occasionally start wandering
        this.stateTimer += delta;
        if (this.stateTimer > 3000 && Math.random() < 0.02) {
            this.changeState(MonsterState.WANDERING);
            this.setNewWanderTarget();
        }
    }
    
    protected handleWanderingState(time: number, delta: number, distToPlayer: number): void {
        // Skip animations for now
        // if ((!this.anims.isPlaying || this.anims.currentAnim?.key !== 'wolf_walk')) {
        //     this.safePlayAnimation('wolf_walk');
        // }
        
        // Check if player is within detection radius
        if (this.behavior === MonsterBehavior.AGGRESSIVE && distToPlayer < this.attributes.detectionRadius) {
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
            if (this.stateTimer > 8000) {
                this.changeState(MonsterState.IDLE);
            }
        } else {
            // No target, go back to idle
            this.changeState(MonsterState.IDLE);
        }
    }
    
    protected handleFleeingState(time: number, delta: number, distToPlayer: number): void {
        // Wolves don't typically flee, but we'll implement it anyway
        
        // Skip animations for now
        // if ((!this.anims.isPlaying || this.anims.currentAnim?.key !== 'wolf_walk')) {
        //     this.safePlayAnimation('wolf_walk');
        // }
        
        // If we're far enough from the player, go back to idle
        if (distToPlayer > (this.attributes.fleeRadius || 200)) {
            this.changeState(MonsterState.IDLE);
            return;
        }
        
        // Calculate direction away from player
        const dx = this.x - this.playerSprite.x;
        const dy = this.y - this.playerSprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Flee in the opposite direction
        const fleeSpeed = this.attributes.speed * 1.2;
        this.setVelocity(
            (dx / distance) * fleeSpeed,
            (dy / distance) * fleeSpeed
        );
        
        // Flip sprite based on movement direction
        if (dx < 0) {
            this.setFlipX(true);
        } else {
            this.setFlipX(false);
        }
    }
    
    protected handleChasingState(time: number, delta: number, distToPlayer: number): void {
        // Skip animations for now
        // if ((!this.anims.isPlaying || this.anims.currentAnim?.key !== 'wolf_walk')) {
        //     this.safePlayAnimation('wolf_walk');
        // }
        
        // Check if we're far from spawn point - wolves have a territory
        const distToSpawn = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.spawnPoint.x, this.spawnPoint.y
        );
        
        if (distToSpawn > (this.attributes.returnRadius || 300)) {
            this.changeState(MonsterState.RETURNING);
            return;
        }
        
        // If player has run too far away, give up chase
        if (distToPlayer > this.attributes.detectionRadius * 1.5) {
            this.changeState(MonsterState.RETURNING);
            return;
        }
        
        // If we're close enough to attack
        if (distToPlayer < this.ATTACK_RANGE) {
            this.changeState(MonsterState.ATTACKING);
            return;
        }
        
        // Chase the player
        const dx = this.playerSprite.x - this.x;
        const dy = this.playerSprite.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const chaseSpeed = this.attributes.speed * 1.1;
        this.setVelocity(
            (dx / distance) * chaseSpeed,
            (dy / distance) * chaseSpeed
        );
        
        // Flip sprite based on movement direction
        if (dx < 0) {
            this.setFlipX(true);
        } else {
            this.setFlipX(false);
        }
    }
    
    protected handleAttackingState(time: number, delta: number, distToPlayer: number): void {
        // Set auto-attacking flag when in attack state
        this.isAutoAttacking = true;
        
        // If we haven't set up the attack cooldown yet
        if (this.attackCooldown <= 0) {
            // Attack the player and check if attack was successful
            const attackSuccessful = this.attackPlayer();
            
            // Only set cooldown if attack was successful (not on global cooldown)
            if (attackSuccessful) {
                // Set cooldown for next attack
                this.attackCooldown = 3000; // Increased from 1000 to 3000 ms (3 seconds) for more turn-based combat
            }
        }
        
        // Stop moving while attacking
        this.setVelocity(0, 0);
        
        // Decrement attack cooldown
        this.attackCooldown -= delta;
        
        // If player moves out of attack range, chase them
        if (distToPlayer > this.ATTACK_RANGE) {
            this.isAutoAttacking = false;
            this.changeState(MonsterState.CHASING);
            return;
        }
        
        // If cooldown is done, go back to chasing (which will immediately attack again if in range)
        if (this.attackCooldown <= 0) {
            this.changeState(MonsterState.CHASING);
            return;
        }
    }
    
    protected handleReturningState(time: number, delta: number): void {
        // Skip animations for now
        // if ((!this.anims.isPlaying || this.anims.currentAnim?.key !== 'wolf_walk')) {
        //     this.safePlayAnimation('wolf_walk');
        // }
        
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

    // Helper method to check if animations exist and create them if they don't
    private ensureAnimationsExist(): void {
        // Check if the wolf texture exists
        if (!this.scene.textures.exists('wolf')) {
            logger.error(LogCategory.MONSTER, 'Wolf texture not found! Cannot create animations.');
            return;
        }
        
        try {
            // For now, we're using a single image instead of a spritesheet
            // So we'll skip creating animations to avoid errors
            logger.info(LogCategory.MONSTER, 'Wolf texture found, but animations are disabled for now.');
            
            // If we want to re-enable animations later, uncomment this code:
            /*
            // Check if animations already exist
            if (!this.anims.exists('wolf_idle')) {
                this.anims.create({
                    key: 'wolf_idle',
                    frames: this.anims.generateFrameNumbers('wolf', { start: 0, end: 3 }),
                    frameRate: 5,
                    repeat: -1
                });
            }
            
            if (!this.anims.exists('wolf_walk')) {
                this.anims.create({
                    key: 'wolf_walk',
                    frames: this.anims.generateFrameNumbers('wolf', { start: 4, end: 7 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
            
            if (!this.anims.exists('wolf_attack')) {
                this.anims.create({
                    key: 'wolf_attack',
                    frames: this.anims.generateFrameNumbers('wolf', { start: 8, end: 11 }),
                    frameRate: 10,
                    repeat: 0
                });
            }
            */
        } catch (error) {
            logger.error(LogCategory.MONSTER, `Error creating wolf animations: ${error}`);
        }
    }
} 