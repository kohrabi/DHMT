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

  update(deltaTime: number): void {
    this.active?.update(deltaTime);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    this.active?.fixedUpdate(fixedDeltaTime);
  }

  draw(renderer: THREE.WebGLRenderer): void {
    this.active?.draw(renderer);
  }
}
