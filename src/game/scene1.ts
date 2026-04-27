import * as THREE from "three";
import {
  OrbitControls,
  RapierHelper,
  RoundedBoxGeometry,
} from "three/examples/jsm/Addons.js";
import { RapierPhysics, Scene } from "@/engine";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as Global from "@/global";

type LevelObject = {
  model_path?: string;
  position?: [number, number, number];
};

type LevelData = {
  objects: Record<string, LevelObject>;
};

export class DemoScene extends Scene {
  private physics: any;
  private physicsHelper: any;
  private controls: OrbitControls | undefined;
  private stats: Stats = new Stats();

  readonly geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5),
    new RoundedBoxGeometry(1, 1, 1, 2, 0.25),
  ];
  constructor() {
    super("demo");
    document.body.appendChild(this.stats.dom);
    this.scene.background = new THREE.Color(0xbfd1e5);
  }

  protected async loadContent(): Promise<void> {
    this.physics = await RapierPhysics();
    const ambient = new THREE.HemisphereLight(0x555555, 0xffffff);

    this.scene.add(ambient);

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
    this.scene.add(light);
    Global.renderer.shadowMap.enabled = true;

    this.controls = new OrbitControls(this.camera, Global.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target = new THREE.Vector3(0, 2, 0);
    this.controls.update();

    this.physics.addScene(this.scene);
    this.physicsHelper = new RapierHelper(this.physics.world);
    this.scene.add(this.physicsHelper);

    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);
    this.scene3D.add(new THREE.AxesHelper(1));
    this.scene3D.add(new THREE.GridHelper(10, 10));

    try {
      const player = await this.contentManager.loadGLTF(
        "/assets/platformer/character-oopi.glb",
      );
      player.scene.position.set(1, 0, 0);
      this.scene.add(player.scene);

      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );
      for (const objectData of Object.values(levelData.objects)) {
        if (!objectData.model_path || !objectData.position) {
          continue;
        }
        const model = await this.contentManager.loadGLTF(objectData.model_path);
        const instance = model.scene.clone();
        instance.position.set(
          objectData.position[0],
          objectData.position[1],
          objectData.position[2],
        );
        this.scene.add(instance);
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  private addBody() {
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

    this.scene.add(mesh);

    //parameter 2 - mass, parameter 3 - restitution ( how bouncy )
    this.physics.addMesh(mesh, 1, 0.5);
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);

    for (const object of this.scene.children) {
      if (object instanceof THREE.Mesh) {
        if (object.position.y < -10) {
          this.scene.remove(object);
          this.physics.removeMesh(object);
        }
      }
    }

    if (this.physicsHelper) this.physicsHelper.update();

    this.controls?.update();
    this.stats.update();
  }
}
