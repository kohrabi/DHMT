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
  /** True once the object has been added to the world (used by onDestroy guard). */
  public started = false;
  /** True once the async start() promise has resolved and the object is fully initialised. */
  public isReady = false;
  protected isActive = true;

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

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    // console.log(`Starting GameObject: ${this.name}`);
    this.started = true;
  }

  update(deltaTime: number): void {}
  fixedUpdate(fixedDeltaTime: number): void {}

  destroy() : void {
    this.world.removeGameObject(this);
  }
  
  onDestroy(): void {
    // if (this.transform.parent) {
    //   this.transform.parent.remove(this.transform);
    // }
    this.transform.remove(this.transform);
  }
}
