import { Collider, GameObject, MeshRenderer, Scene } from "@/engine";
import * as THREE from "three";
import { OrbitControls, RapierHelper } from "three/examples/jsm/Addons.js";
import * as Global from "@/global";

type LevelObject = {
  model_path?: string;
  position?: [number, number, number];
};

type LevelData = {
  objects: Record<string, LevelObject>;
};

export class Scene2 extends Scene {
  private controls!: OrbitControls;
  private physicsHelper!: RapierHelper;

  public constructor() {
    super("scene2");
  }

  protected async loadContent(): Promise<void> {
    Global.renderer.shadowMap.enabled = true;

    this.controls = new OrbitControls(this.camera, Global.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target = new THREE.Vector3(0, 2, 0);
    this.controls.update();

    this.world.scene.background = new THREE.Color(0x202020);

    var collider1 = this.addNewGameObject("collider1");
    collider1.addComponent(
      new MeshRenderer(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: false }),
      ),
    );
    collider1.transform.position.set(0, 10, 0);
    collider1.addComponent(new Collider(1, 0.1));

    var floor = this.addNewGameObject("floor");
    floor.addComponent(
      new MeshRenderer(
        new THREE.BoxGeometry(10, 1, 10),
        new THREE.MeshPhongMaterial({ color: 0x4cc9f0 }),
      ),
    );
    floor.addComponent(new Collider(0, 0.5));
    floor.transform.position.set(0, -0.5, 0);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 2);
    this.world.scene.add(light);
    this.world.scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // Ignore this warning.
    this.physicsHelper = new RapierHelper(this.world.physics.world);
    this.world.scene.add(this.physicsHelper);

    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(0, 0, 0);

    this.scene3D.add(new THREE.AxesHelper(1));
    this.scene3D.add(new THREE.GridHelper(10, 10));

    try {
      const player = await this.contentManager.loadGLTF(
        "/assets/platformer/character-oopi.glb",
      );
      player.scene.position.set(1, 0, 0);
      this.world.scene.add(player.scene);

      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );

      for (const objectData of Object.values(levelData.objects)) {
        if (!objectData.model_path || !objectData.position) continue;
        const model = await this.contentManager.loadGLTF(objectData.model_path);
        const instance = model.scene.clone();
        instance.position.set(...objectData.position);
        this.world.scene.add(instance);
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    this.controls.update();
    this.physicsHelper.update();

    if (Global.input.isKeyPressed("KeyR")) {
      var collider1 = this.addNewGameObject("collider1");
      collider1.addComponent(
        new MeshRenderer(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: false }),
        ),
      );
      collider1.transform.position.set(0, 10, 0);
      collider1.addComponent(new Collider(1, 0.1));
    }
  }
}
