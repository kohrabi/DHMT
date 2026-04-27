import { GameObject } from "@/engine/gameObject";
import { RapierPhysics } from "./physics";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export class GameWorld {
  readonly gravity = new THREE.Vector3(0.0, -9.81, 0.0);
  private readonly gameObjects = new Set<GameObject>();
  public readonly physicsWorld = new RAPIER.World(this.gravity);

  add(gameObject: GameObject): GameObject {
    this.gameObjects.add(gameObject);
    return gameObject;
  }

  remove(gameObject: GameObject): boolean {
    const removed = this.gameObjects.delete(gameObject);
    if (removed) {
      gameObject.destroy();
    }
    return removed;
  }

  update(deltaTime: number): void {
    for (const gameObject of this.gameObjects) {
      gameObject.start();
      gameObject.update(deltaTime);
    }
    this.physicsWorld.step();
  }

  fixedUpdate(fixedDeltaTime: number): void {
    for (const gameObject of this.gameObjects) {
      gameObject.fixedUpdate(fixedDeltaTime);
    }
  }
}
