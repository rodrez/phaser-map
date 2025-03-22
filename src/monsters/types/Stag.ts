import { BaseMonster } from "../BaseMonster";
import { MonsterState } from "../MonsterTypes";
import { logger, LogCategory } from "../../utils/Logger";

export class Stag extends BaseMonster {
	private isEnraged = false;
	private enrageTimer = 0;
	private criticallyWounded = false;
	private readonly ENRAGE_DURATION = 8000; // 8 seconds of rage

	constructor(scene, x, y, monsterData, playerSprite, itemSystem) {
		super(scene, x, y, monsterData, playerSprite, itemSystem);

		// Log creation
		logger.info(
			LogCategory.MONSTER,
			`Stag created with sprite key: ${monsterData.spriteKey}`,
		);
	}

	public takeDamage(amount: number): void {
		// Call parent method to handle basic damage logic
		super.takeDamage(amount);

		// If the monster died from this damage, don't proceed with Stag-specific behavior
		if (this.attributes.health <= 0) {
			return;
		}

		// Check if critically wounded (below 30% health)
		if (this.attributes.health < this.attributes.maxHealth * 0.3) {
			this.criticallyWounded = true;
		}

		// When damaged, stag will either flee if critically wounded or enter rage mode
		if (this.criticallyWounded && Math.random() < 0.7) {
			// 70% chance to flee when critically wounded
			this.changeState(MonsterState.FLEEING);
		} else {
			// Enter rage mode
			this.isEnraged = true;
			this.enrageTimer = 0;
			this.changeState(MonsterState.ATTACKING);

			// Alert nearby stags (would be implemented through a monster manager)
			// This is a placeholder for where you'd implement herd behavior
			this.notifyNearbyStags();
		}
	}

	private notifyNearbyStags(): void {
		// This would ideally be implemented through a monster manager system
		// For now, we'll just log it (this is where you'd implement the herd behavior)
		logger.info(LogCategory.MONSTER, "Stag alerted nearby herd members!");
	}

	protected handleIdleState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// Stand still
		this.setVelocity(0, 0);

		// Check if player is too close - stags are peaceful but wary
		if (distToPlayer < this.attributes.detectionRadius) {
			this.changeState(MonsterState.FLEEING);
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
			this.changeState(MonsterState.FLEEING);
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
		// If we're far enough from the player, go back to idle
		if (
			this.attributes.fleeRadius &&
			distToPlayer > this.attributes.fleeRadius
		) {
			this.changeState(MonsterState.IDLE);
			return;
		}

		// Calculate direction away from player
		const dx = this.x - this.playerSprite.x;
		const dy = this.y - this.playerSprite.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Flee in the opposite direction with a higher speed for fleeing
		const fleeSpeed = this.attributes.speed * 1.5;
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
		// Stags don't chase unless they're enraged, they should never be in this state
		// But if they somehow are and not enraged, change to fleeing
		if (!this.isEnraged) {
			this.changeState(MonsterState.FLEEING);
			return;
		}

		// If enraged, change to attacking state when close enough
		if (distToPlayer < 50) {
			// Close attack range
			this.changeState(MonsterState.ATTACKING);
			return;
		}

		// Move toward player
		const dx = this.playerSprite.x - this.x;
		const dy = this.playerSprite.y - this.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		const rageSpeed = this.attributes.speed * 1.3; // Faster when enraged
		this.setVelocity((dx / distance) * rageSpeed, (dy / distance) * rageSpeed);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}

		// Update enrage timer
		this.enrageTimer += delta;
		if (this.enrageTimer > this.ENRAGE_DURATION) {
			this.isEnraged = false;
			this.changeState(MonsterState.FLEEING);
		}
	}

	protected handleAttackingState(
		time: number,
		delta: number,
		distToPlayer: number,
	): void {
		// Stags only attack when enraged
		if (!this.isEnraged) {
			this.isAutoAttacking = false;
			this.changeState(MonsterState.FLEEING);
			return;
		}

		// If player is too far, chase them
		if (distToPlayer > this.ATTACK_RANGE) {
			this.isAutoAttacking = false;
			this.changeState(MonsterState.CHASING);
			return;
		}

		// Set auto-attacking flag when in attack state
		this.isAutoAttacking = true;

		// Attack the player if very close and cooldown has expired
		if (distToPlayer <= this.ATTACK_RANGE && time > this.stateTimer) {
			// Attack the player and check if attack was successful
			const attackSuccessful = this.attackPlayer();

			// Only set cooldown if attack was successful (not on global cooldown)
			if (attackSuccessful) {
				// Set cooldown for next attack
				this.stateTimer = time + 3000; // Increased from 1500 to 3000 ms (3 seconds) for more turn-based combat
			}
		}

		// Generate random movement in blind rage (stags go blind in rage according to lore)
		const angle = Math.random() * Math.PI * 2;
		const rageSpeed = this.attributes.speed * 1.3;
		this.setVelocity(Math.cos(angle) * rageSpeed, Math.sin(angle) * rageSpeed);

		// Update enrage timer
		this.enrageTimer += delta;
		if (this.enrageTimer > this.ENRAGE_DURATION) {
			this.isEnraged = false;
			this.isAutoAttacking = false;
			this.changeState(MonsterState.FLEEING);
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
		this.setVelocity((dx / distance) * speed, (dy / distance) * speed);

		// Flip sprite based on movement direction
		if (dx < 0) {
			this.setFlipX(true);
		} else {
			this.setFlipX(false);
		}
	}
}
