import * as THREE from "three";
import { Component } from "@/engine/component";
import { Scene } from "./scene";

export class GameObject {
  readonly name: string;
  readonly transform: THREE.Object3D;
  readonly scene: Scene;

  private components: Component[] = [];
  private started = false;

  constructor(
    name: string,
    scene: Scene,
    object3D: THREE.Object3D = new THREE.Object3D(),
  ) {
    this.name = name;
    this.scene = scene;
    this.transform = object3D;
    this.transform.name = name;
  }

  addComponent<T extends Component>(component: T): T {
    component._attach(this);
    this.components.push(component);

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

    this.started = true;
    for (const component of this.components) {
      if (component.enabled) {
        component.start();
      }
    }
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
