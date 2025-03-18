/**
 * TypeScript definitions for InteractiveGameObject.js
 */

export interface InteractiveOptions {
  objectType?: string;
  doubleClickThreshold?: number;
  hoverTint?: number;
  hitArea?: any;
  [key: string]: any;
}

export class InteractiveSprite extends Phaser.GameObjects.Sprite {
  interactiveOptions: InteractiveOptions;
  lastClickTime: number;
  doubleClickHandled: boolean;
  
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, options?: InteractiveOptions);
  
  setupInteractivity(options?: InteractiveOptions): void;
  handlePointerOver(): void;
  handlePointerOut(): void;
  handlePointerDown(pointer: Phaser.Input.Pointer): void;
  getDoubleClickData(): any;
  onSingleClick(): void;
}

export class InteractiveImage extends Phaser.GameObjects.Image {
  interactiveOptions: InteractiveOptions;
  lastClickTime: number;
  doubleClickHandled: boolean;
  
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, options?: InteractiveOptions);
  
  setupInteractivity(options?: InteractiveOptions): void;
  handlePointerOver(): void;
  handlePointerOut(): void;
  handlePointerDown(pointer: Phaser.Input.Pointer): void;
  getDoubleClickData(): any;
  onSingleClick(): void;
}

export function makeInteractiveClass<T extends new (...args: any[]) => any>(
  BaseClass: T
): T & {
  new (...args: any[]): {
    setupInteractivity(options?: InteractiveOptions): any;
    handlePointerOver(): void;
    handlePointerOut(): void;
    handlePointerDown(pointer: Phaser.Input.Pointer): void;
    getDoubleClickData(): any;
    onSingleClick(): void;
  };
}; 