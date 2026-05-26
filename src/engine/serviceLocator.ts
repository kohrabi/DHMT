import type { InputManager } from "./inputManager";
import type { SceneManager } from "./sceneManager";
import type { ContentManager } from "./contentManager";
import * as THREE from "three";

export class ServiceLocator {
  input!: InputManager;
  sceneManager!: SceneManager;
  contentManager!: ContentManager;
  renderer!: THREE.WebGLRenderer;
  eventBus: any;

  private static instance: ServiceLocator;
  static getInstance(): ServiceLocator {
    if (!this.instance) this.instance = new ServiceLocator();
    return this.instance;
  }
}
