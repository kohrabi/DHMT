import { GameObject } from "@/engine/gameObject";

export class GameWorld {
  private readonly gameObjects = new Set<GameObject>();

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
  }

  fixedUpdate(fixedDeltaTime: number): void {
    for (const gameObject of this.gameObjects) {
      gameObject.fixedUpdate(fixedDeltaTime);
    }
  }
}
