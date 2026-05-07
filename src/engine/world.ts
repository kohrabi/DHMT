import * as THREE from "three";
import { PhysicsWorld } from "./physicsWorld";
import { GameObject } from "./gameObject";
import { Scene } from "./scene";

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

  constructor(readonly gameScene : Scene) {
    // Wire the physics fixed-step loop to drive component fixedUpdates.
    this.physics.onFixedStep = (fdt: number) => {
      this.fixedUpdate(fdt);
    };
  }

  get gameObjects(): ReadonlySet<GameObject> {
    return this._gameObjects;
  }

  /** Add a GameObject and immediately attach its transform to the scene graph. */
  addGameObject(go: GameObject): GameObject {
    this._gameObjects.add(go);
    this.scene.add(go.transform);
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

  update(dt: number): void {

    for (const go of this._gameObjects) {
      if (!go.started) {
        go.start();
        go.started = true;
      }
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

  public isCameraVisible(boundingSphere : THREE.Sphere): boolean {

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
