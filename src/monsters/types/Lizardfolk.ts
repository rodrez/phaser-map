import { Scene, Physics, Math as PhaserMath } from "phaser";
import { ItemSystem } from "../../items/item";
import { BaseMonster } from "../BaseMonster";
import {
	MonsterData,
	MonsterState,
	MonsterType,
} from "../MonsterTypes";
import { logger, LogCategory } from "../../utils/Logger";

export class Lizardfolk extends BaseMonster {
	private ambushMode: boolean = false;
	private ambushTimer: number = 0;
	private readonly AMBUSH_DURATION: number = 10000; // 10 seconds of ambush mode
	private readonly AMBUSH_COOLDOWN: number = 15000; // 15 seconds cooldown
	private lastAmbushTime: number = 0;
	private hasAmbushed: boolean = false;
	private isPoisonous: boolean = false;
	private poisonChance: number = 0.3; // 30% chance to poison on attack
	private poisonDamage: number = 2;
	private poisonDuration: number = 5000; // 5 seconds
	private isKing: boolean = false;
	private isOnThrone: boolean = false;

	constructor(
		scene: Scene,
		x: number,
		y: number,
		monsterData: MonsterData,
		playerSprite: Physics.Arcade.Sprite,
		itemSystem: ItemSystem,
	) {
		super(scene, x, y, monsterData, playerSprite, itemSystem);

		// Check if this is the Lizardfolk King
		if (
			monsterData.isBoss ||
			monsterData.type === MonsterType.LIZARDFOLK_KING
		) {
			this.setupAsKing();
		} else {
			// Regular lizardfolk setup
			// Determine if this lizardfolk is poisonous (50% chance)
			this.isPoisonous = Math.random() < 0.5;

			// If poisonous, tint the sprite slightly green
			if (this.isPoisonous) {
				this.setTint(0xaaffaa);
			}
		}
	}

	/**
	 * Setup this lizardfolk as the king
	 */
	private setupAsKing(): void {
		logger.info(LogCategory.MONSTER, "Setting up Lizardfolk as King");

		// Kings are always poisonous
		this.isPoisonous = true;
		this.poisonChance = 0.5; // 50% chance to poison
		this.poisonDamage = 5; // More poison damage

		// Kings have special ambush abilities
		this.ambushMode = false;
		this.hasAmbushed = false;

		// Set a flag to identify as king
		this.isKing = true;

		// Add a property to track if the king is on the throne
		this.isOnThrone = true;

		// Override the update method to handle throne behavior
		const originalUpdate = this.update;
		this.update = (time: number, delta: number) => {
			// If the king is on the throne and the player gets too close
			if (this.isOnThrone && this.playerSprite) {
				const distanceToPlayer = PhaserMath.Distance.Between(
					this.x,
					this.y,
					this.playerSprite.x,
					this.playerSprite.y,
				);

				if (distanceToPlayer < 150) {
					// King gets off throne
					this.isOnThrone = false;

					// Show a message if the scene has a UI manager
					// @ts-ignore - We know the scene might have a uiManager
					if (this.scene.uiManager) {
						// @ts-ignore - Access the uiManager's showMedievalMessage method
						this.scene.uiManager.showMedievalMessage(
							"How dare you approach my throne, mortal!",
							"error",
							3000,
						);
					}
				} else {
					// While on throne, king doesn't move
					this.setVelocity(0, 0);
					return;
				}
			}

			// Call the original update method if not on throne or player is close
			if (!this.isOnThrone) {
				originalUpdate.call(this, time, delta);
			}
		};
	}

	public takeDamage(amount: number): void {
		super.takeDamage(amount);

		// If in ambush mode, exit it
		if (this.ambushMode) {
			this.ambushMode = false;
		}

		// Lizardfolk are tactical - they might retreat to set up an ambush
		if (
			this.attributes.health < this.attributes.maxHealth * 0.5 &&
			!this.hasAmbushed
		) {
			// 60% chance to retreat and set up ambush
			if (Math.random() < 0.6) {
				this.changeState(MonsterState.FLEEING);
				this.hasAmbushed = true;
			} else {
				this.changeState(MonsterState.ATTACKING);
			}
		} else {
			this.changeState(MonsterState.ATTACKING);
		}
	}

	private enterAmbushMode(): void {
		this.ambushMode = true;
		this.ambushTimer = 0;
		this.lastAmbushTime = this.scene.time.now;

		// Reduce visibility (would be implemented with alpha in a real game)
		this.setAlpha(0.5);
	}

	private exitAmbushMode(): void {
		this.ambushMode = false;

		// Restore visibility
		this.setAlpha(1.0);
	}

	protected attackPlayer(): boolean {
		// Call the base attack method
		const attackSuccessful = super.attackPlayer();

		// If poisonous and attack was successful, apply poison effect
		if (
			attackSuccessful &&
			this.isPoisonous &&
			Math.random() < this.poisonChance
		) {
			this.applyPoisonToPlayer();
		}

		return attackSuccessful;
	}

	private applyPoisonToPlayer(): void {
		// Get the combat system
		const gameScene = this.scene as any;
		if (
			gameScene.combatSystem &&
			typeof gameScene.combatSystem.applyPoisonToPlayer === "function"
		) {
			// Apply poison using the combat system
			gameScene.combatSystem.applyPoisonToPlayer(
				this,
				this.poisonDamage,
				this.poisonDuration,
			);
		} else {
			// Fallback for backward compatibility
			console.log(`Player has been poisoned by ${this.monsterName}!`);

			// Get the player system
			if (
				gameScene.playerSystem &&
				typeof gameScene.playerSystem.applyStatusEffect === "function"
			) {
				gameScene.playerSystem.applyStatusEffect("poison", {
					damage: this.poisonDamage,
					duration: this.poisonDuration,
					source: this,
				});
			}
		}
	}

	protected handleIdleState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// Stand still
		this.setVelocity(0, 0);

		// Check if player is too close - lizardfolk are territorial
		if (distToPlayer < this.attributes.detectionRadius) {
			// If we haven't ambushed recently and player is not too close, set up ambush
			const timeSinceLastAmbush = time - this.lastAmbushTime;
			if (
				timeSinceLastAmbush > this.AMBUSH_COOLDOWN &&
				distToPlayer > 100 &&
				Math.random() < 0.7
			) {
				this.enterAmbushMode();
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

	protected handleWanderingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// Check if player is too close
		if (distToPlayer < this.attributes.detectionRadius) {
			// If we haven't ambushed recently and player is not too close, set up ambush
			const timeSinceLastAmbush = time - this.lastAmbushTime;
			if (
				timeSinceLastAmbush > this.AMBUSH_COOLDOWN &&
				distToPlayer > 100 &&
				Math.random() < 0.7
			) {
				this.enterAmbushMode();
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
			this.setVelocity((dx / distance) * speed, (dy / distance) * speed);

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

	protected handleFleeingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// If we're far enough from the player, enter ambush mode
		if (distToPlayer > 200) {
			this.enterAmbushMode();
			this.changeState(MonsterState.IDLE);
			return;
		}

		// Calculate direction away from player
		const dx = this.x - this.playerSprite.x;
		const dy = this.y - this.playerSprite.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Flee in the opposite direction with a higher speed for fleeing
		const fleeSpeed = this.attributes.speed * 1.2;
		this.setVelocity((dx / distance) * fleeSpeed, (dy / distance) * fleeSpeed);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}
	}

	protected handleChasingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// If in ambush mode, stay still and wait for player to get closer
		if (this.ambushMode) {
			this.setVelocity(0, 0);

			// If player gets close enough, ambush them!
			if (distToPlayer < 80) {
				this.exitAmbushMode();
				this.changeState(MonsterState.ATTACKING);
			}

			// Update ambush timer
			this.ambushTimer += delta;
			if (this.ambushTimer > this.AMBUSH_DURATION) {
				this.exitAmbushMode();
			}

			return;
		}

		// If close enough to attack, change to attacking state
		if (distToPlayer < this.ATTACK_RANGE) {
			this.changeState(MonsterState.ATTACKING);
			return;
		}

		// If too far from spawn, return home
		const distToSpawn = PhaserMath.Distance.Between(
			this.x,
			this.y,
			this.spawnPoint.x,
			this.spawnPoint.y,
		);

		if (
			this.attributes.returnRadius &&
			distToSpawn > this.attributes.returnRadius
		) {
			this.changeState(MonsterState.RETURNING);
			return;
		}

		// Move toward player
		const dx = this.playerSprite.x - this.x;
		const dy = this.playerSprite.y - this.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		this.setVelocity(
			(dx / distance) * this.attributes.speed,
			(dy / distance) * this.attributes.speed,
		);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}
	}

	protected handleAttackingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// If we were in ambush mode, get an attack bonus (would be implemented in a real game)
		const wasAmbush = this.ambushMode;
		if (this.ambushMode) {
			this.exitAmbushMode();
		}

		// Apply ambush bonus damage if applicable
		if (wasAmbush) {
			// In a real game, you'd apply bonus damage here
			this.attackPlayer(); // Extra attack for ambush
		}

		// If player is in range, attack
		if (distToPlayer < this.ATTACK_RANGE) {
			this.attackPlayer();
		}

		// After attacking, go back to chasing
		this.changeState(MonsterState.CHASING);
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
		this.setVelocity((dx / distance) * speed, (dy / distance) * speed);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}
	}

	public destroy(fromScene?: boolean): void {
		// Make sure we exit ambush mode before destroying
		if (this.ambushMode) {
			this.exitAmbushMode();
		}

		// Clear any references
		this.wanderTarget = null;

		// Call super.destroy() in a try-catch to handle potential errors
		try {
			super.destroy(fromScene);
		} catch (error) {
			logger.error(
				LogCategory.MONSTER,
				`Error destroying Lizardfolk: ${error}`,
			);
		}
	}
}
