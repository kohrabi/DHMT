import { Scene } from "@/engine/scene";
import * as THREE from "three";

export class SceneManager {
  private active?: Scene;

  get currentScene(): Scene | undefined {
    return this.active;
  }

  setScene(nextScene: Scene): void {
    if (this.active === nextScene) {
      return;
    }

    if (this.active) {
      this.active.deactivate();
    }

    this.active = nextScene;
    this.active.activate();
  }

  /**
   * Tear down the current scene and create a fresh instance of the same type.
   * This gives a completely clean reset (new World, PhysicsWorld, GameObjects).
   */
  resetScene(): void {
    if (!this.active) return;

    const SceneClass = this.active.constructor as new () => Scene;
    this.setScene(new SceneClass());
  }

  update(): void {
    // Use Scene own timer.
    this.active?.update();
  }

  draw(renderer: THREE.WebGLRenderer): void {
    this.active?.draw(renderer);
  }
}
