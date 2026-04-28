import * as THREE from "three";
import {
  OrbitControls,
  RapierHelper,
  RoundedBoxGeometry,
} from "three/examples/jsm/Addons.js";
import { Scene } from "@/engine";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as Global from "@/global";

type LevelObject = {
  model_path?: string;
  position?: [number, number, number];
};

type LevelData = {
  objects: Record<string, LevelObject>;
};

/**
 * Demo scene — uses PhysicsWorld directly via this.world.physics.
 * Meshes with mass > 0 are simulated by Rapier and their transforms
 * are synced automatically each fixed step.
 */
export class DemoScene extends Scene {
  private physicsHelper?: RapierHelper;
  private controls?: OrbitControls;
  private stats: Stats = new Stats();

  readonly geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5),
    new RoundedBoxGeometry(1, 1, 1, 2, 0.25),
  ];

  constructor() {
    super("demo");
    document.body.appendChild(this.stats.dom);
    this.world.scene.background = new THREE.Color(0xbfd1e5);
  }

  protected async loadContent(): Promise<void> {
    const { physics, scene } = this.world;

    // ── Lighting ────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0x555555, 0xffffff));

    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(0, 12.5, 12.5);
    light.castShadow = true;
    light.shadow.radius = 3;
    light.shadow.blurSamples = 8;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    const size = 10;
    light.shadow.camera.left = -size;
    light.shadow.camera.bottom = -size;
    light.shadow.camera.right = size;
    light.shadow.camera.top = size;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    scene.add(light);

    Global.renderer.shadowMap.enabled = true;

    // ── Camera controls ──────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, Global.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target = new THREE.Vector3(0, 2, 0);
    this.controls.update();

    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // ── Physics debug helper ─────────────────────────────────────────────────
    this.physicsHelper = new RapierHelper(this.world.physics.world);
    scene.add(this.physicsHelper);

    // ── Helpers ──────────────────────────────────────────────────────────────
    this.scene3D.add(new THREE.AxesHelper(1));
    this.scene3D.add(new THREE.GridHelper(10, 10));

    // ── Assets ───────────────────────────────────────────────────────────────
    try {
      const player = await this.contentManager.loadGLTF(
        "/assets/platformer/character-oopi.glb",
      );
      player.scene.position.set(1, 0, 0);
      scene.add(player.scene);

      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );

      for (const objectData of Object.values(levelData.objects)) {
        if (!objectData.model_path || !objectData.position) continue;
        const model = await this.contentManager.loadGLTF(objectData.model_path);
        const instance = model.scene.clone();
        instance.position.set(...objectData.position);
        scene.add(instance);
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  private addBody(): void {
    const { physics, scene } = this.world;

    const geometry =
      this.geometries[Math.floor(Math.random() * this.geometries.length)];
    const material = new THREE.MeshStandardMaterial({
      color: Math.floor(Math.random() * 0xffffff),
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.set(
      Math.random() * 2 - 1,
      Math.random() * 3 + 6,
      Math.random() * 2 - 1,
    );

    scene.add(mesh);
    physics.addMesh(mesh, 1, 0.5);
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);

    const { physics, scene } = this.world;

    // Clean up meshes that have fallen out of bounds.
    for (const object of [...scene.children]) {
      if (object instanceof THREE.Mesh && object.position.y < -10) {
        scene.remove(object);
        physics.removeMesh(object);
      }
    }

    this.physicsHelper?.update();
    this.controls?.update();
    this.stats.update();
  }
}
