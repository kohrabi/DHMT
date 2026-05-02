import * as THREE from "three";
import { ContentManager } from "@/engine/contentManager";
import { GameObject } from "@/engine/gameObject";
import { World } from "@/engine/world";

/**
 * Abstract base for all game scenes.
 *
 * Each Scene owns:
 *   - world   → unified context (THREE.Scene + PhysicsWorld + GameObject lifecycle)
 *   - camera  → perspective camera used for rendering
 *   - content → scene-local asset cache
 *
 * Subclasses override loadContent() to populate the scene and
 * unloadContent() to clean up (default disposes world + content cache).
 *
 * Access the Three.js scene graph via  this.world.scene
 * Access the physics world via         this.world.physics
 */
export abstract class Scene {
  readonly name: string;
  readonly world = new World(this);
  readonly content = new ContentManager();
  readonly camera = new THREE.PerspectiveCamera(
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

  // ─── Overridable lifecycle hooks ──────────────────────────────────────────

  protected initialize(): void {}

  protected loadContent(): void {}

  protected unloadContent(): void {
    this.world.dispose();
    this.content.clear();
  }

  // ─── Helpers for subclasses ───────────────────────────────────────────────

  protected get contentManager(): ContentManager {
    return this.content;
  }

  protected get globalContentManager(): ContentManager {
    return ContentManager.global;
  }

  /** The Three.js scene graph — shorthand for this.world.scene. */
  protected get scene3D(): THREE.Scene {
    return this.world.scene;
  }

  /**
   * Add a GameObject to the world.
   * Its transform is automatically attached to the Three.js scene graph.
   */
  protected addGameObject(gameObject: GameObject): GameObject {
    return this.world.addGameObject(gameObject);
  }

  /**
   * Remove a GameObject from the world.
   * Its transform is detached and destroy() is called on it.
   */
  protected removeGameObject(gameObject: GameObject): boolean {
    return this.world.removeGameObject(gameObject);
  }

  // ─── SceneManager interface ───────────────────────────────────────────────

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

  update(deltaTime: number): void {
    this.world.update(deltaTime);
  }

  // Fixed Update will be called by PhysicsWorld.

  draw(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.world.scene, this.camera);
  }
}
