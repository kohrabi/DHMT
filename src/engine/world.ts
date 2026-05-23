import * as THREE from "three";
import { PhysicsWorld } from "./physicsWorld";
import { GameObject } from "./gameObject";
import { Scene } from "./scene";
import { GameTimer } from "./gameTimer";

/**
 * The unified runtime context for a scene.
 * Owns the Three.js scene graph, the Rapier physics world, and the
 * GameObject lifecycle — so all three systems stay in sync automatically.
 *
 * Components access everything through `this.gameObject.world`:
 *   this.gameObject.world.scene   → THREE.Scene
 *   this.gameObject.world.physics → PhysicsWorld (RAPIER)
 */
export class World {
  readonly scene = new THREE.Scene();
  readonly physics = new PhysicsWorld();
  private readonly _gameObjects = new Set<GameObject>();
  readonly pendingRemovals: Set<GameObject> = new Set();
  readonly frustum = new THREE.Frustum();
  readonly projView = new THREE.Matrix4();
  public readonly timer : GameTimer = new GameTimer();
  private physicsAccumulator = 0;

  constructor(readonly gameScene : Scene) {
    // Wire the physics fixed-step loop to drive component fixedUpdates.
    this.physics.onFixedStep = (fdt: number) => {
      this.fixedUpdate(fdt);
    };
  }

  get gameObjects(): ReadonlySet<GameObject> {
    return this._gameObjects;
  }

  /**
   * Add a GameObject, attach its transform to the scene graph, and kick off
   * its async start() in the background. Update/fixedUpdate will be skipped
   * until isReady flips true.
   */
  addGameObject(go: GameObject): GameObject {
    this._gameObjects.add(go);
    this.scene.add(go.transform);
    // Fire-and-forget: start() may be async (model/physics loading).
    // isReady gates update() calls so no logic runs on a half-built object.
    go.start().then(() => {
      go.isReady = true;
    }).catch((err) => {
      console.error(`[World] Error starting GameObject "${go.name}":`, err);
    });
    return go;
  }

  /** Remove a GameObject, detach its transform, and call destroy() on it. */
  removeGameObject(go: GameObject): boolean {
    const removed = this._gameObjects.delete(go);
    if (removed) {
      this.scene.remove(go.transform);
      // go.destroy();
      this.pendingRemovals.add(go);
    }
    return removed;
  }

  findGameObjectByName(name: string): GameObject | undefined {
    for (const go of this._gameObjects) {
      if (go.name === name) {
        return go;
      }
    }
    return undefined;
  }

  update(): void {
    this.timer.update();

    if (this.timer.timescale === 0) {
      this.physics.fixedStep(0);
    } else {
      this.physicsAccumulator += this.timer.delta;
      const fixedDt = 1 / 60;
      while (this.physicsAccumulator >= fixedDt) {
        this.physicsAccumulator -= fixedDt;
        this.physics.step(fixedDt);
      }
    }

    const dt = this.timer.delta;

    for (const go of this._gameObjects) {
      // Skip objects still loading (async start() hasn't resolved yet).
      if (!go.isReady) continue;
      go.update(dt);
    }

    for (const go of this.pendingRemovals) {
      if (!go.started) {
        continue; // Skip destroy() for GameObjects that never started.
      }
      go.onDestroy();
    }
    this.pendingRemovals.clear();
  }

  fixedUpdate(fdt: number): void {
    for (const go of this._gameObjects) {
      // Skip objects still loading.
      if (!go.isReady) continue;
      go.fixedUpdate(fdt);
    }
  }

  public updateFrustum(camera: THREE.Camera): void {
    this.projView.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projView);
  }

  public isCameraVisible(transform : THREE.Object3D, boundingSphere : THREE.Sphere): boolean {
    boundingSphere.center = transform.position;
    return this.frustum.intersectsSphere(boundingSphere);
  }

  /** Destroy all GameObjects and dispose the physics world. */
  dispose(): void {
    // Snapshot the set before iterating so destroy() can mutate it safely.
    for (const go of [...this._gameObjects]) {
      go.onDestroy();
    }
    this._gameObjects.clear();
    this.physics.dispose();
  }
}
