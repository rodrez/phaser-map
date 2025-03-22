import type { Scene } from "phaser";
import { LogCategory, logger } from "./Logger";

// Configuration interface for the InputSystem
interface InputSystemConfig {
  // Time window in milliseconds for considering two taps as a double tap
  doubleTapDelay: number;
  // Distance threshold in pixels for considering two taps in the same position
  positionThreshold: number;
  // Enable debug mode for verbose logging
  debug?: boolean;
}

// Input event types the system can handle
export enum InputEventType {
  SINGLE_TAP = "single-tap",
  DOUBLE_TAP = "double-tap",
  LONG_PRESS = "long-press",
  DRAG_START = "drag-start",
  DRAG_MOVE = "drag-move",
  DRAG_END = "drag-end",
}

// Input event data
export interface InputEvent {
  type: InputEventType;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  // Original Phaser pointer for advanced usage
  originalPointer?: Phaser.Input.Pointer;
  // Time elapsed since the event was triggered (for long press, etc.)
  timeElapsed?: number;
  // Target game object that was clicked (if any)
  target?: Phaser.GameObjects.GameObject;
}

/**
 * InputSystem to handle input events at world level
 * This system provides a way to detect double-taps, long presses, and other gestures
 * before individual game objects handle their own interactions.
 */
export class InputSystem {
  private scene: Scene;
  private config: InputSystemConfig;
  private lastTapTime = 0;
  private lastTapPosition: { x: number; y: number } | null = null;
  private isAwaitingSecondTap = false;
  private doubleTapTimeoutId: number | null = null;
  private isLongPressActive = false;
  private longPressTimeoutId: number | null = null;
  private priorityGameObjects = new Set<Phaser.GameObjects.GameObject>();
  private enabled = true;

  // Store the target game object during pointer events
  private currentTargetGameObject: Phaser.GameObjects.GameObject | null = null;
  // Track the last object that was interacted with (for double taps)
  private lastInteractedObject: Phaser.GameObjects.GameObject | null = null;
  // Debug flag
  private isDebugMode = false;

  /**
   * Constructor for InputSystem
   * @param scene The Phaser scene to attach this system to
   * @param config Configuration options
   */
  constructor(scene: Scene, config: Partial<InputSystemConfig> = {}) {
    this.scene = scene;
    this.config = {
      doubleTapDelay: config.doubleTapDelay || 300,
      positionThreshold: config.positionThreshold || 20,
      debug: config.debug === true,
    };

    // Set debug mode
    this.isDebugMode = this.config.debug === true;

    this.initialize();

    logger.info(LogCategory.INPUT, "InputSystem initialized");
  }

  /**
   * Initialize input handling
   */
  private initialize(): void {
    // Set up input event listeners
    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("gameobjectdown", this.handleGameObjectDown, this);
    this.scene.input.on("gameobjectup", this.handleGameObjectUp, this);

    // Add an event for when the scene is put to sleep or shutdown
    this.scene.events.once("shutdown", this.destroy, this);
    this.scene.events.once("sleep", this.disable, this);
    this.scene.events.once("wake", this.enable, this);
  }

  /**
   * Handle pointer down events
   * @param pointer The Phaser pointer object
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || pointer.button !== 0) return; // Only process left mouse button

    const currentTime = this.scene.time.now;
    const position = { x: pointer.worldX, y: pointer.worldY };

    // Save the currently targeted object as the last interacted object
    this.lastInteractedObject = this.currentTargetGameObject;

    if (this.isDebugMode) {
      logger.debug(
        LogCategory.INPUT,
        `Pointer down at (${position.x}, ${position.y}), target: ${this.currentTargetGameObject ? this.currentTargetGameObject.constructor.name : "none"}`,
      );
    }

    // Start timing for potential long press
    this.startLongPressTimer(pointer);

    // Check if this could be a double tap
    if (this.isAwaitingSecondTap && this.lastTapPosition) {
      const distance = Phaser.Math.Distance.Between(
        position.x,
        position.y,
        this.lastTapPosition.x,
        this.lastTapPosition.y,
      );

      // If second tap is close enough to first tap and within time window
      if (
        distance <= this.config.positionThreshold &&
        currentTime - this.lastTapTime <= this.config.doubleTapDelay
      ) {
        logger.info(LogCategory.INPUT, "Double click detected");
        // Clear the single tap timeout
        if (this.doubleTapTimeoutId !== null) {
          clearTimeout(this.doubleTapTimeoutId);
          this.doubleTapTimeoutId = null;
        }

        // It's a double tap!
        this.isAwaitingSecondTap = false;
        this.lastTapPosition = null;

        // Emit double tap event
        this.emitInputEvent({
          type: InputEventType.DOUBLE_TAP,
          x: pointer.x,
          y: pointer.y,
          worldX: position.x,
          worldY: position.y,
          originalPointer: pointer,
          target: this.currentTargetGameObject || undefined,
        });

        logger.debug(
          LogCategory.INPUT,
          `Double tap detected at (${position.x}, ${position.y})`,
        );
        return;
      }
    }

    // If it's not a double tap, start the process for the next potential double tap
    this.lastTapTime = currentTime;
    this.lastTapPosition = position;
    this.isAwaitingSecondTap = true;

    // Set timeout to emit single tap if no second tap comes
    if (this.doubleTapTimeoutId !== null) {
      clearTimeout(this.doubleTapTimeoutId);
    }

    this.doubleTapTimeoutId = window.setTimeout(() => {
      if (this.isAwaitingSecondTap) {
        // Emit delayed single tap event
        this.emitInputEvent({
          type: InputEventType.SINGLE_TAP,
          x: pointer.x,
          y: pointer.y,
          worldX: position.x,
          worldY: position.y,
          originalPointer: pointer,
          target: this.currentTargetGameObject || undefined,
        });

        logger.debug(
          LogCategory.INPUT,
          `Single tap detected at (${position.x}, ${position.y})`,
        );
        this.isAwaitingSecondTap = false;
      }
      this.doubleTapTimeoutId = null;
    }, this.config.doubleTapDelay);
  }

  /**
   * Handle pointer up events
   * @param pointer The Phaser pointer object
   */
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || pointer.button !== 0) return;

    // Cancel long press detection
    this.cancelLongPressTimer();
  }

  /**
   * Handle pointer move events
   * @param pointer The Phaser pointer object
   */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;

    // If moving far enough, cancel potential long press
    if (this.lastTapPosition) {
      const distance = Phaser.Math.Distance.Between(
        pointer.worldX,
        pointer.worldY,
        this.lastTapPosition.x,
        this.lastTapPosition.y,
      );

      if (distance > this.config.positionThreshold) {
        this.cancelLongPressTimer();
      }
    }
  }

  /**
   * Handle game object down events
   * @param pointer The Phaser pointer object
   * @param gameObjects Array of game objects that were clicked
   */
  private handleGameObjectDown(
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
  ): void {
    if (!this.enabled || !gameObjects) {
      logger.debug(LogCategory.INPUT, "Input disabled or no gameObjects");
      return;
    }

    if (!Array.isArray(gameObjects)) {
      logger.debug(
        LogCategory.INPUT,
        `Invalid gameObjects type: ${typeof gameObjects}`,
      );
      return;
    }

    if (gameObjects.length === 0) {
      logger.debug(LogCategory.INPUT, "Empty gameObjects array");
      return;
    }

    // Check if any of the clicked objects are priority objects
    const hasPriorityObject = gameObjects.some((obj) =>
      this.priorityGameObjects.has(obj),
    );

    // Get the clicked game object
    const gameObject = gameObjects[0];

    // Log the game object type for debugging
    const objType = gameObject ? gameObject.constructor.name : "unknown";

    // Check if this is a tree by looking for the 'isTree' data property
    let isTree = false;
    try {
      if (gameObject && typeof (gameObject as any).getData === "function") {
        isTree = !!(gameObject as any).getData("isTree");
        if (isTree && this.isDebugMode) {
          logger.debug(LogCategory.INPUT, `Tree clicked: ${isTree}`);
        }
      }
    } catch (error) {
      // Ignore errors trying to detect tree
    }

    if (this.isDebugMode) {
      logger.debug(
        LogCategory.INPUT,
        `Game object clicked: ${objType}, isTree: ${isTree}`,
      );
    }

    // Store the gameObject for potential use in future events
    this.currentTargetGameObject = gameObject;
  }

  /**
   * Handle game object up events
   * @param pointer The Phaser pointer object
   * @param gameObjects Array of game objects that were released
   */
  private handleGameObjectUp(
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
  ): void {
    if (!this.enabled || !gameObjects) {
      logger.debug(
        LogCategory.INPUT,
        "Input disabled or no gameObjects on up event",
      );
      return;
    }

    if (!Array.isArray(gameObjects)) {
      logger.debug(
        LogCategory.INPUT,
        `Invalid gameObjects type on up event: ${typeof gameObjects}`,
      );
      return;
    }

    if (gameObjects.length === 0) {
      logger.debug(LogCategory.INPUT, "Empty gameObjects array on up event");
      return;
    }

    // Log the game object type for debugging
    const objType = gameObjects[0]
      ? gameObjects[0].constructor.name
      : "unknown";
    logger.debug(LogCategory.INPUT, `Game object released: ${objType}`);

    // Handle specific game object interactions if needed
  }

  /**
   * Start timer for long press detection
   * @param pointer The Phaser pointer object
   */
  private startLongPressTimer(pointer: Phaser.Input.Pointer): void {
    // Cancel any existing long press timer
    this.cancelLongPressTimer();

    // Start a new long press timer (500ms is typical for long press)
    this.longPressTimeoutId = window.setTimeout(() => {
      this.isLongPressActive = true;

      // Emit long press event
      this.emitInputEvent({
        type: InputEventType.LONG_PRESS,
        x: pointer.x,
        y: pointer.y,
        worldX: pointer.worldX,
        worldY: pointer.worldY,
        originalPointer: pointer,
        target: this.currentTargetGameObject || undefined,
      });

      logger.debug(
        LogCategory.INPUT,
        `Long press detected at (${pointer.worldX}, ${pointer.worldY})`,
      );
      this.longPressTimeoutId = null;
    }, 500); // 500ms for long press
  }

  /**
   * Cancel the long press timer
   */
  private cancelLongPressTimer(): void {
    if (this.longPressTimeoutId !== null) {
      clearTimeout(this.longPressTimeoutId);
      this.longPressTimeoutId = null;
    }
    this.isLongPressActive = false;
  }

  /**
   * Emit an input event to the scene event system
   * @param event The input event data
   */
  private emitInputEvent(event: InputEvent): void {
    try {
      if (!this.scene || !this.scene.events) return;

      // Create a safe copy of the event to prevent reference issues
      const safeEvent = {
        type: event.type,
        x: event.x || 0,
        y: event.y || 0,
        worldX: event.worldX || 0,
        worldY: event.worldY || 0,
        timeElapsed: event.timeElapsed,
        originalPointer: event.originalPointer,
        target: event.target || null,
      };

      // For debugging in development
      if (this.isDebugMode) {
        logger.debug(LogCategory.INPUT, `Emitting ${event.type} event`, {
          coords: `(${safeEvent.x}, ${safeEvent.y})`,
          worldCoords: `(${safeEvent.worldX}, ${safeEvent.worldY})`,
          hasTarget: !!safeEvent.target,
          targetType: safeEvent.target
            ? safeEvent.target.constructor.name
            : "none",
        });

        // Extra tree-specific debugging
        if (safeEvent.target) {
          try {
            const target = safeEvent.target as any;
            if (typeof target.getData === "function") {
              const isTree = target.getData("isTree");
              if (isTree) {
                logger.debug(LogCategory.INPUT, `Target is a tree: ${isTree}`);
              }
            }
          } catch (e) {
            // Ignore errors in debug logging
          }
        }
      }

      // Emit a general input event with the type
      this.scene.events.emit("input-event", safeEvent);

      // Also emit a specific event for the type
      this.scene.events.emit(`input-${event.type}`, safeEvent);
    } catch (error) {
      logger.error(LogCategory.INPUT, `Error emitting input event: ${error}`);
    }
  }

  /**
   * Add a game object to the priority list.
   * Priority objects' input events will be processed first.
   * @param gameObject The game object to add to the priority list
   */
  public addPriorityGameObject(
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    if (!gameObject) return;
    this.priorityGameObjects.add(gameObject);
  }

  /**
   * Remove a game object from the priority list
   * @param gameObject The game object to remove from the priority list
   */
  public removePriorityGameObject(
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    if (!gameObject) return;
    this.priorityGameObjects.delete(gameObject);
  }

  /**
   * Enable the input system
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * Disable the input system
   */
  public disable(): void {
    this.enabled = false;
    this.cancelLongPressTimer();
    if (this.doubleTapTimeoutId !== null) {
      clearTimeout(this.doubleTapTimeoutId);
      this.doubleTapTimeoutId = null;
    }
  }

  /**
   * Clean up resources when destroying the system
   */
  public destroy(): void {
    this.disable();

    if (!this.scene || !this.scene.input) return;

    try {
      // Remove all event listeners
      this.scene.input.off("pointerdown", this.handlePointerDown, this);
      this.scene.input.off("pointerup", this.handlePointerUp, this);
      this.scene.input.off("pointermove", this.handlePointerMove, this);
      this.scene.input.off("gameobjectdown", this.handleGameObjectDown, this);
      this.scene.input.off("gameobjectup", this.handleGameObjectUp, this);

      if (this.scene.events) {
        this.scene.events.off("shutdown", this.destroy, this);
        this.scene.events.off("sleep", this.disable, this);
        this.scene.events.off("wake", this.enable, this);
      }
    } catch (error) {
      logger.error(
        LogCategory.INPUT,
        `Error during input system cleanup: ${error}`,
      );
    }

    this.priorityGameObjects.clear();
    this.currentTargetGameObject = null;
  }

  /**
   * Update method to be called in the scene's update method
   * Can be used for continuous input monitoring if needed
   * @param time The current time
   * @param delta The time delta
   */
  public update(time: number, delta: number): void {
    // Currently not used, but available for future extensions
  }

  /**
   * Enable or disable debug logging
   */
  public setDebug(enabled: boolean): void {
    this.isDebugMode = enabled;
    logger.info(
      LogCategory.INPUT,
      `InputSystem debug mode ${enabled ? "enabled" : "disabled"}`,
    );
  }
}

