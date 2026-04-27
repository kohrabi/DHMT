import * as THREE from "three";
import { ContentManager } from "@/engine/contentManager";
import { GameObject } from "@/engine/gameObject";
import { GameWorld } from "@/engine/gameWorld";
import { PhysicsWorld } from "./physicsWorld";

export abstract class Scene {
  readonly name: string;

  public readonly world = new GameWorld();
  public readonly physicsWorld = new PhysicsWorld();
  public readonly scene = new THREE.Scene();
  public readonly content = new ContentManager();
  public readonly gameObjects = new Set<GameObject>();
  public readonly camera = new THREE.PerspectiveCamera(
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

  protected async initialize(): Promise<void> {
    await this.physicsWorld.initialize();
  }

  protected loadContent(): void {}

  protected unloadContent(): void {
    this.clearGameObjects();
    this.content.clear();
  }

  protected get contentManager(): ContentManager {
    return this.content;
  }

  protected get globalContentManager(): ContentManager {
    return ContentManager.global;
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

  public update(deltaTime: number): void {
    this.world.update(deltaTime);
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    this.world.fixedUpdate(fixedDeltaTime);
  }

  public draw(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }
}
