import { Scene, Physics } from 'phaser';

declare class PlayerReferenceService {
  playerSprite: Physics.Arcade.Sprite | null;
  scene: Scene | null;
  subscribers: Set<{ subscriber: any, callback: (playerSprite: Physics.Arcade.Sprite) => void }>;
  isInitialized: boolean;

  initialize(scene: Scene): void;
  setPlayerSprite(playerSprite: Physics.Arcade.Sprite): void;
  getPlayerSprite(): Physics.Arcade.Sprite | null;
  subscribe(subscriber: any, callback: (playerSprite: Physics.Arcade.Sprite) => void): void;
  unsubscribe(subscriber: any): void;
  notifySubscribers(): void;
  reset(): void;
}

declare const playerReferenceService: PlayerReferenceService;
export default playerReferenceService; 