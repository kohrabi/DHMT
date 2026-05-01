import { GameObject } from "@/engine/gameObject";
import * as THREE from 'three';

export abstract class Component {
  gameObject!: GameObject;
  enabled = true;
  started = false;

  get transform(): THREE.Object3D {
    return this.gameObject.transform;
  }

  public start(): void {
    this.started = true;
  }
  update(_deltaTime: number): void {}
  fixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}

  _attach(gameObject: GameObject): void {
    this.gameObject = gameObject;
  }
}
