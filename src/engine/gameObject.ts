import * as THREE from "three";
import type { World } from "./world";

export abstract class GameObject {
  readonly name: string;
  readonly transform: THREE.Object3D;

  /**
   * Reference to the unified World context.
   * Components can reach the Three.js scene and physics world through here:
   *   this.gameObject.world.scene    → THREE.Scene
   *   this.gameObject.world.physics  → PhysicsWorld
   */
  readonly world: World;
  public started = false;

  constructor(
    name: string,
    world: World,
    object3D: THREE.Object3D = new THREE.Object3D(),
  ) {
    this.name = name;
    this.world = world;
    this.transform = object3D;
    this.transform.name = name;
  }


  // async loadContent(): Promise<void> { return Promise.resolve(); }
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
  }

  update(deltaTime: number): void {}
  fixedUpdate(fixedDeltaTime: number): void {}

  destroy(): void {
    if (this.transform.parent) {
      this.transform.parent.remove(this.transform);
    }
  }
}
