import { Scene, Physics, Math as PhaserMath } from "phaser";
import { ItemSystem } from "../../items/item";
import { BaseMonster } from "../BaseMonster";
import { MonsterData, MonsterState } from "../MonsterTypes";
import { logger, LogCategory } from "../../utils/Logger";

export class Ogre extends BaseMonster {
	private isEnraged: boolean = false;
	private enrageTimer: number = 0;
	private readonly ENRAGE_DURATION: number = 8000; // 8 seconds of rage
	private readonly SMASH_COOLDOWN: number = 5000; // 5 seconds between smash attacks
	private smashCooldownTimer: number = 0;
	private canSmash: boolean = true;

	constructor(
		scene: Scene,
		x: number,
		y: number,
		monsterData: MonsterData,
		playerSprite: Physics.Arcade.Sprite,
		itemSystem: ItemSystem,
	) {
		super(scene, x, y, monsterData, playerSprite, itemSystem);
	}

	public takeDamage(amount: number): void {
		super.takeDamage(amount);

		// Ogres become enraged when damaged below 50% health
		if (this.attributes.health < this.attributes.maxHealth * 0.5) {
			this.isEnraged = true;
			this.enrageTimer = 0;
		}
	}

	protected handleIdleState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
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

	protected handleWanderingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
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
			const speed = this.attributes.speed * 0.7; // Ogres move slower when wandering
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
		// Ogres don't flee, they attack! Change to chasing
		this.changeState(MonsterState.CHASING);
	}

	protected handleChasingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
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

		// Determine speed based on enraged state
		const speed = this.isEnraged
			? this.attributes.speed * 1.2
			: this.attributes.speed;

		this.setVelocity((dx / distance) * speed, (dy / distance) * speed);

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

		// Update smash cooldown
		if (!this.canSmash) {
			this.smashCooldownTimer += delta;
			if (this.smashCooldownTimer > this.SMASH_COOLDOWN) {
				this.canSmash = true;
				this.smashCooldownTimer = 0;
			}
		}
	}

	protected handleAttackingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// Stop moving
		this.setVelocity(0, 0);

		// If player is in range, attack
		if (distToPlayer < this.ATTACK_RANGE) {
			// Decide between regular attack and smash attack
			if (this.canSmash && (this.isEnraged || Math.random() < 0.3)) {
				this.smashAttack();
			} else {
				this.regularAttack();
			}
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

		// Update smash cooldown
		if (!this.canSmash) {
			this.smashCooldownTimer += delta;
			if (this.smashCooldownTimer > this.SMASH_COOLDOWN) {
				this.canSmash = true;
				this.smashCooldownTimer = 0;
			}
		}
	}

	private regularAttack(): void {
		// Perform regular attack
		this.attackPlayer();
		this.changeState(MonsterState.CHASING);
	}

	private smashAttack(): void {
		// Set smash on cooldown
		this.canSmash = false;
		this.smashCooldownTimer = 0;

		// Smash attack does double damage
		const originalDamage = this.attributes.damage;
		this.attributes.damage *= 2;
		this.attackPlayer();

		// Create a small area of effect
		const aoeRadius = this.ATTACK_RANGE * 1.5;
		const distToPlayer = PhaserMath.Distance.Between(
			this.x,
			this.y,
			this.playerSprite.x,
			this.playerSprite.y,
		);

		// If player is in the AoE radius but outside normal attack range,
		// they still take half damage
		if (distToPlayer > this.ATTACK_RANGE && distToPlayer <= aoeRadius) {
			this.attributes.damage = originalDamage;
			this.attackPlayer();
		}

		// Restore original damage
		this.attributes.damage = originalDamage;

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
		const speed = this.attributes.speed * 0.8; // Slower when returning
		this.setVelocity((dx / distance) * speed, (dy / distance) * speed);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}
	}

	public destroy(fromScene?: boolean): void {
		// Clear any references
		this.wanderTarget = null;

		// Call super.destroy() in a try-catch to handle potential errors
		try {
			super.destroy(fromScene);
		} catch (error) {
			logger.error(LogCategory.MONSTER, `Error destroying Ogre: ${error}`);
		}
	}
}
