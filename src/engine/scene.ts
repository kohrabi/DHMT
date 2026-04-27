import * as THREE from "three";
import { GameObject } from "@/engine/gameObject";
import { GameWorld } from "@/engine/gameWorld";

export abstract class Scene {
  readonly name: string;

  protected readonly world = new GameWorld();
  protected readonly scene = new THREE.Scene();
  protected readonly gameObjects = new Set<GameObject>();
  protected readonly camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  private initialized = false;
  private contentLoaded = false;

  protected constructor(name: string) {
    this.name = name;
  }

  protected initialize(): void {}

  protected loadContent(): void {}

  protected unloadContent(): void {
    this.clearGameObjects();
  }

  protected get scene3D(): THREE.Scene {
    return this.scene;
  }

  protected addGameObject(gameObject: GameObject): GameObject {
    this.gameObjects.add(gameObject);
    this.world.add(gameObject);
    this.scene.add(gameObject.transform);
    return gameObject;
  }

  protected removeGameObject(gameObject: GameObject): boolean {
    this.scene.remove(gameObject.transform);
    this.gameObjects.delete(gameObject);
    return this.world.remove(gameObject);
  }

  protected clearGameObjects(): void {
    for (const gameObject of this.gameObjects) {
      this.scene.remove(gameObject.transform);
      this.world.remove(gameObject);
    }

    this.gameObjects.clear();
  }

  activate(): void {
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }

    if (!this.contentLoaded) {
      this.loadContent();
      this.contentLoaded = true;
    }
  }

  deactivate(): void {
    if (!this.contentLoaded) {
      return;
    }

    this.unloadContent();
    this.contentLoaded = false;
  }

  protected update(deltaTime: number): void {
    this.world.update(deltaTime);
  }

  protected fixedUpdate(fixedDeltaTime: number): void {
    this.world.fixedUpdate(fixedDeltaTime);
  }

  protected draw(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }
}
