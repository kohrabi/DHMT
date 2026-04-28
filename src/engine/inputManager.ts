/**
 * InputManager — singleton that tracks keyboard and mouse state for the current frame.
 *
 * Usage (via the global instance exported from global.ts):
 *
 *   import * as Global from "@/global";
 *
 *   // Keyboard
 *   if (Global.input.isKeyDown("ArrowLeft"))   { ... }  // held
 *   if (Global.input.isKeyPressed("Space"))    { ... }  // just pressed this frame
 *   if (Global.input.isKeyReleased("KeyE"))    { ... }  // just released this frame
 *
 *   // Mouse buttons  (0 = left, 1 = middle, 2 = right)
 *   if (Global.input.isMouseButtonDown(0))     { ... }
 *   if (Global.input.isMouseButtonPressed(0))  { ... }
 *   if (Global.input.isMouseButtonReleased(0)) { ... }
 *
 *   // Mouse position & delta (in CSS pixels)
 *   const pos   = Global.input.mousePosition;   // { x, y } absolute
 *   const delta = Global.input.mouseDelta;       // { x, y } movement since last frame
 *
 *   // Scroll
 *   const scroll = Global.input.scrollDelta;    // { x, y } wheel delta this frame
 *
 * Call  Global.input.update()  once per frame AFTER all game logic so that
 * "just pressed / just released" flags are cleared for the next frame.
 * This is handled automatically when you add `Global.input.update()` to the
 * main animate loop.
 *
 * Call  Global.input.dispose()  to remove all event listeners (e.g. on teardown).
 */
export class InputManager {
  // ─── Keyboard ─────────────────────────────────────────────────────────────

  /** Keys currently held down (KeyboardEvent.code values). */
  private readonly _keysDown = new Set<string>();
  /** Keys that were pressed for the first time this frame. */
  private readonly _keysPressed = new Set<string>();
  /** Keys that were released this frame. */
  private readonly _keysReleased = new Set<string>();

  // ─── Mouse buttons ────────────────────────────────────────────────────────

  /** Mouse buttons currently held (button index 0/1/2). */
  private readonly _mouseDown = new Set<number>();
  /** Mouse buttons pressed for the first time this frame. */
  private readonly _mousePressed = new Set<number>();
  /** Mouse buttons released this frame. */
  private readonly _mouseReleased = new Set<number>();

  // ─── Mouse position & movement ────────────────────────────────────────────

  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseDeltaX = 0;
  private _mouseDeltaY = 0;
  /** Accumulated mouse movement before it is reset in update(). */
  private _rawDeltaX = 0;
  private _rawDeltaY = 0;

  // ─── Scroll ───────────────────────────────────────────────────────────────

  private _scrollX = 0;
  private _scrollY = 0;
  private _rawScrollX = 0;
  private _rawScrollY = 0;

  // ─── Event listener refs (needed for cleanup) ─────────────────────────────

  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;
  private readonly _onMouseDown: (e: MouseEvent) => void;
  private readonly _onMouseUp: (e: MouseEvent) => void;
  private readonly _onMouseMove: (e: MouseEvent) => void;
  private readonly _onWheel: (e: WheelEvent) => void;

  // ──────────────────────────────────────────────────────────────────────────

  constructor(target: EventTarget = window) {
    this._onKeyDown = (e) => {
      if (!this._keysDown.has(e.code)) {
        this._keysPressed.add(e.code);
      }
      this._keysDown.add(e.code);
    };

    this._onKeyUp = (e) => {
      this._keysDown.delete(e.code);
      this._keysReleased.add(e.code);
    };

    this._onMouseDown = (e) => {
      if (!this._mouseDown.has(e.button)) {
        this._mousePressed.add(e.button);
      }
      this._mouseDown.add(e.button);
    };

    this._onMouseUp = (e) => {
      this._mouseDown.delete(e.button);
      this._mouseReleased.add(e.button);
    };

    this._onMouseMove = (e) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
      this._rawDeltaX += e.movementX;
      this._rawDeltaY += e.movementY;
    };

    this._onWheel = (e) => {
      this._rawScrollX += e.deltaX;
      this._rawScrollY += e.deltaY;
    };

    target.addEventListener("keydown", this._onKeyDown as EventListener);
    target.addEventListener("keyup", this._onKeyUp as EventListener);
    target.addEventListener("mousedown", this._onMouseDown as EventListener);
    target.addEventListener("mouseup", this._onMouseUp as EventListener);
    target.addEventListener("mousemove", this._onMouseMove as EventListener);
    target.addEventListener("wheel", this._onWheel as EventListener, {
      passive: true,
    });

    this._target = target;
  }

  private readonly _target: EventTarget;

  // ─── Keyboard queries ─────────────────────────────────────────────────────

  /** True while the key is held down. Uses KeyboardEvent.code (e.g. "KeyW", "Space"). */
  isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  /** True only on the frame the key was first pressed. */
  isKeyPressed(code: string): boolean {
    return this._keysPressed.has(code);
  }

  /** True only on the frame the key was released. */
  isKeyReleased(code: string): boolean {
    return this._keysReleased.has(code);
  }

  // ─── Mouse button queries ─────────────────────────────────────────────────

  /** True while the mouse button is held (0=left, 1=middle, 2=right). */
  isMouseButtonDown(button: number): boolean {
    return this._mouseDown.has(button);
  }

  /** True only on the frame the mouse button was first pressed. */
  isMouseButtonPressed(button: number): boolean {
    return this._mousePressed.has(button);
  }

  /** True only on the frame the mouse button was released. */
  isMouseButtonReleased(button: number): boolean {
    return this._mouseReleased.has(button);
  }

  // ─── Mouse position / movement queries ───────────────────────────────────

  /** Current mouse position in CSS pixels. */
  get mousePosition(): Readonly<{ x: number; y: number }> {
    return { x: this._mouseX, y: this._mouseY };
  }

  /**
   * Mouse movement since the last frame (sum of all mousemove events
   * that occurred between the previous update() and this one).
   */
  get mouseDelta(): Readonly<{ x: number; y: number }> {
    return { x: this._mouseDeltaX, y: this._mouseDeltaY };
  }

  // ─── Scroll query ─────────────────────────────────────────────────────────

  /**
   * Accumulated wheel delta since the last frame.
   * Positive Y = scroll down; negative Y = scroll up (matches WheelEvent.deltaY).
   */
  get scrollDelta(): Readonly<{ x: number; y: number }> {
    return { x: this._scrollX, y: this._scrollY };
  }

  // ─── Frame lifecycle ──────────────────────────────────────────────────────

  /**
   * Clear all per-frame state.
   * Call this once per frame **after** all game code has run.
   */
  update(): void {
    this._keysPressed.clear();
    this._keysReleased.clear();
    this._mousePressed.clear();
    this._mouseReleased.clear();

    this._mouseDeltaX = this._rawDeltaX;
    this._mouseDeltaY = this._rawDeltaY;
    this._rawDeltaX = 0;
    this._rawDeltaY = 0;

    this._scrollX = this._rawScrollX;
    this._scrollY = this._rawScrollY;
    this._rawScrollX = 0;
    this._rawScrollY = 0;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  /** Remove all event listeners. Call when the game is torn down. */
  dispose(): void {
    this._target.removeEventListener("keydown", this._onKeyDown as EventListener);
    this._target.removeEventListener("keyup", this._onKeyUp as EventListener);
    this._target.removeEventListener("mousedown", this._onMouseDown as EventListener);
    this._target.removeEventListener("mouseup", this._onMouseUp as EventListener);
    this._target.removeEventListener("mousemove", this._onMouseMove as EventListener);
    this._target.removeEventListener("wheel", this._onWheel as EventListener);
  }
}
