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
  add(go: GameObject): GameObject {
    this._gameObjects.add(go);
    this.scene.add(go.transform);
    return go;
  }

  /** Remove a GameObject, detach its transform, and call destroy() on it. */
  remove(go: GameObject): boolean {
    const removed = this._gameObjects.delete(go);
    if (removed) {
      this.scene.remove(go.transform);
      go.destroy();
    }
    return removed;
  }

  update(dt: number): void {
    for (const go of this._gameObjects) {
      go.start();
      go.update(dt);
    }
  }

  fixedUpdate(fdt: number): void {
    for (const go of this._gameObjects) {
      go.fixedUpdate(fdt);
    }
  }

  /** Destroy all GameObjects and dispose the physics world. */
  dispose(): void {
    // Snapshot the set before iterating so destroy() can mutate it safely.
    for (const go of [...this._gameObjects]) {
      go.destroy();
    }
    this._gameObjects.clear();
    this.physics.dispose();
  }
}
