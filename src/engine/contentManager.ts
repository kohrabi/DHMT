import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type LoadingCallbacks = {
  onStart?: (url: string, itemsLoaded: number, itemsTotal: number) => void;
  onProgress?: (url: string, itemsLoaded: number, itemsTotal: number) => void;
  onLoad?: () => void;
  onError?: (url: string) => void;
};

export class ContentManager {
  static readonly global = new ContentManager();

  private readonly loadingManager = new THREE.LoadingManager();
  private readonly gltfLoader = new GLTFLoader(this.loadingManager);
  private readonly textureLoader = new THREE.TextureLoader(this.loadingManager);

  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly gltfCache = new Map<string, GLTF>();
  private readonly jsonCache = new Map<string, unknown>();
  private readonly textCache = new Map<string, string>();

  constructor(callbacks?: LoadingCallbacks) {
    this.setLoadingCallbacks(callbacks);
  }

  get manager(): THREE.LoadingManager {
    return this.loadingManager;
  }

  setLoadingCallbacks(callbacks?: LoadingCallbacks): void {
    this.loadingManager.onStart = callbacks?.onStart ?? (() => {});
    this.loadingManager.onProgress = callbacks?.onProgress ?? (() => {});
    this.loadingManager.onLoad = callbacks?.onLoad ?? (() => {});
    this.loadingManager.onError = callbacks?.onError ?? (() => {});
  }

  async loadTexture(path: string): Promise<THREE.Texture> {
    const normalizedPath = this.normalizePath(path);

    let pending = this.textureCache.get(normalizedPath);
    if (!pending) {
      pending = await this.textureLoader.loadAsync(normalizedPath);
      this.textureCache.set(normalizedPath, pending);
    }

    return pending;
  }

  async loadGLTF(path: string): Promise<GLTF> {
    const normalizedPath = this.normalizePath(path);

    let pending = this.gltfCache.get(normalizedPath);
    if (!pending) {
      pending = await this.gltfLoader.loadAsync(normalizedPath);
      this.gltfCache.set(normalizedPath, pending);
    }

    return pending;
  }

  async loadJSON<T>(path: string, method: HttpMethod = "GET"): Promise<T> {
    const normalizedPath = this.normalizePath(path);
    const key = `${method}:${normalizedPath}`;

    let pending = this.jsonCache.get(key);
    if (!pending) {
      pending = await this.fetchJson(normalizedPath, method);
      this.jsonCache.set(key, pending);
    }

    return pending as Promise<T>;
  }

  async loadText(path: string, method: HttpMethod = "GET"): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    const key = `${method}:${normalizedPath}`;

    let pending = this.textCache.get(key);
    if (!pending) {
      pending = await this.fetchText(normalizedPath, method);
      this.textCache.set(key, pending);
    }

    return pending;
  }

  unload(path: string): void {
    const normalizedPath = this.normalizePath(path);

    this.textureCache.delete(normalizedPath);
    this.gltfCache.delete(normalizedPath);
    this.jsonCache.delete(`GET:${normalizedPath}`);
    this.textCache.delete(`GET:${normalizedPath}`);
  }

  clear(): void {
    this.textureCache.forEach((texture) => texture.dispose());
    this.gltfCache.forEach((gltf) => {
      gltf.scenes.forEach((scene) =>
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }),
      );
    });

    this.textureCache.clear();
    this.gltfCache.clear();
    this.jsonCache.clear();
    this.textCache.clear();
  }

  private normalizePath(path: string): string {
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("/")
    ) {
      return path;
    }

    return `/${path}`;
  }

  private async fetchJson(path: string, method: HttpMethod): Promise<unknown> {
    this.loadingManager.itemStart(path);

    try {
      const response = await fetch(path, { method });

      if (!response.ok) {
        this.loadingManager.itemError(path);
        throw new Error(
          `Failed to load JSON from '${path}': ${response.status} ${response.statusText}`,
        );
      }

      return response.json();
    } catch (error) {
      this.loadingManager.itemError(path);
      throw error;
    } finally {
      this.loadingManager.itemEnd(path);
    }
  }

  private async fetchText(path: string, method: HttpMethod): Promise<string> {
    this.loadingManager.itemStart(path);

    try {
      const response = await fetch(path, { method });

      if (!response.ok) {
        this.loadingManager.itemError(path);
        throw new Error(
          `Failed to load text from '${path}': ${response.status} ${response.statusText}`,
        );
      }

      return response.text();
    } catch (error) {
      this.loadingManager.itemError(path);
      throw error;
    } finally {
      this.loadingManager.itemEnd(path);
    }
  }
}
