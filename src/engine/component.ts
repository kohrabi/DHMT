import { GameObject } from "@/engine/gameObject";

export abstract class Component {
  gameObject!: GameObject;
  enabled = true;

  start(): void {}
  update(_deltaTime: number): void {}
  fixedUpdate(_fixedDeltaTime: number): void {}
  onDestroy(): void {}

  _attach(gameObject: GameObject): void {
    this.gameObject = gameObject;
  }
}
