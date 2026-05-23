import * as THREE from "three";

/**
 * Wraps THREE.Timer to provide both scaled and unscaled timing.
 * 
 * - delta / elapsed        → affected by timescale (for gameplay)
 * - unscaledDelta / unscaledElapsed → real wall-clock (for UI, death, etc.)
 */
export class GameTimer {
  private readonly _timer = new THREE.Timer();
  private _timescale = 1.0;
  private _scaledElapsed = 0;
  private _delta = 0;
  private _unscaledDelta = 0;

  /** Call once per frame / tick. */
  update(): void {
    this._timer.update();
    this._unscaledDelta = this._timer.getDelta();
    this._delta = this._unscaledDelta * this._timescale;
    this._scaledElapsed += this._delta;
  }

  get delta(): number {
    return this._delta;
  }

  get elapsed(): number {
    return this._scaledElapsed;
  }

  get unscaledDelta(): number {
    return this._unscaledDelta;
  }

  get unscaledElapsed(): number {
    return this._timer.getElapsed();
  }

  get timescale(): number {
    return this._timescale;
  }

  set timescale(value: number) {
    this._timescale = Math.max(0, value);
  }
}
