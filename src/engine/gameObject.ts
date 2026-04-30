import * as THREE from "three";
import { Component } from "@/engine/component";
import type { World } from "./world";

export class GameObject {
  readonly name: string;
  readonly transform: THREE.Object3D;

  /**
   * Reference to the unified World context.
   * Components can reach the Three.js scene and physics world through here:
   *   this.gameObject.world.scene    → THREE.Scene
   *   this.gameObject.world.physics  → PhysicsWorld
   */
  readonly world: World;

  private components: Component[] = [];
  private started = false;

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

  addComponent<T extends Component>(component: T): T {
    component._attach(this);
    this.components.push(component);
    console.log(
      `Added component ${component.constructor.name} to ${this.name}`,
    );

    if (this.started && component.enabled) {
      component.start();
    }

    return component;
  }

  getComponent<T extends Component>(
    type: new (...args: any[]) => T,
  ): T | undefined {
    return this.components.find((component) => component instanceof type) as
      | T
      | undefined;
  }

  removeComponent<T extends Component>(
    type: new (...args: any[]) => T,
  ): boolean {
    const index = this.components.findIndex(
      (component) => component instanceof type,
    );

    if (index === -1) {
      return false;
    }

    const [component] = this.components.splice(index, 1);
    component.onDestroy();
    return true;
  }

  start(): void {
    if (this.started) {
      return;
    }

    for (const component of this.components) {
      if (component.enabled && !component.started) {
        component.start();
      }
    }
    // Is this good?
    this.started = true;
  }

  update(deltaTime: number): void {
    for (const component of this.components) {
      if (component.enabled) {
        component.update(deltaTime);
      }
    }
  }

  fixedUpdate(fixedDeltaTime: number): void {
    for (const component of this.components) {
      if (component.enabled) {
        component.fixedUpdate(fixedDeltaTime);
      }
    }
  }

  destroy(): void {
    for (const component of this.components) {
      component.onDestroy();
    }

    this.components = [];

    if (this.transform.parent) {
      this.transform.parent.remove(this.transform);
    }
  }
}
