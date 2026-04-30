import {
  GeometryCollider3D,
  GameObject,
  GeometryRenderer,
  Scene,
  MeshRenderer,
  Collider,
  PhysicsWorld,
} from "@/engine";
import * as THREE from "three";
import { OrbitControls, RapierHelper } from "three/examples/jsm/Addons.js";
import * as Global from "@/global";
import { CharacterController } from "../engine/components/characterController";
import { PlayerController } from "./gameObjects/playerController";

type LevelObject = {
  model_path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  object_type: string;
  properties: Record<string, any>;
};

type LevelData = {
  objects: Record<string, LevelObject>;
};

export class Scene2 extends Scene {
  private controls?: OrbitControls;
  private physicsHelper!: RapierHelper;
  private controlsEnabled = false;

  public constructor() {
    super("scene2");
  }

  protected async loadContent(): Promise<void> {
    Global.renderer.shadowMap.enabled = true;

    this.world.scene.background = new THREE.Color(0x202020);

    var collider1 = this.addNewGameObject("collider1");
    collider1.addComponent(
      new GeometryRenderer(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshPhongMaterial({ color: 0x0000ff, wireframe: false }),
      ),
    );
    collider1.addComponent(new PlayerController());
    collider1.transform.position.set(0, 10, 0);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 2);
    this.world.scene.add(light);
    this.world.scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // Ignore this warning.
    this.physicsHelper = new RapierHelper(this.world.physics.world);
    this.world.scene.add(this.physicsHelper);

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

      console.log(levelData);
      for (const objectData of Object.values(levelData.objects)) {
        switch (objectData.object_type) {
          case "Ground":
            const model = await this.contentManager.loadGLTF(
              objectData.model_path,
            );
            const modelMesh = model.scene.clone();
            const go = this.addNewGameObject("ground");
            // Blender's coordinate system is different from Three.js, so we need to swap Y and Z axes.
            // Blender use Z Up, Y Forward
            // While Three.js use Y Up, Z Backward
            go.transform.position.set(
              objectData.position[0],
              objectData.position[2],
              -objectData.position[1],
            );
            // But somehow the rotation is correct
            go.transform.rotation.set(
              objectData.rotation[0],
              objectData.rotation[1],
              objectData.rotation[2],
            );
            go.transform.scale.set(
              objectData.scale[0],
              objectData.scale[1],
              objectData.scale[2],
            );
            go.addComponent(new MeshRenderer(modelMesh));
            go.addComponent(
              new Collider(
                PhysicsWorld.getBoxShape(
                  go.transform.clone().translateY(0.5),
                  new THREE.Vector3(
                    objectData.scale[0],
                    objectData.scale[1],
                    objectData.scale[2],
                  ),
                ),
              ),
            );
            break;
          case "Camera":
            this.camera.position.set(
              objectData.position[0],
              objectData.position[2],
              -objectData.position[1],
            );
            // The camera in Blender is also rotated differently, so we need to adjust the rotation as well.
            // Camera in Blender is also rotated 90 degrees on the X axis.
            this.camera.rotation.set(
              objectData.rotation[0] - Math.PI / 2,
              objectData.rotation[2],
              -objectData.rotation[1],
            );
            break;
        }
      }

      // const s = this.addNewGameObject("something");
      // s.transform.position.set(
      //   this.camera.position.x,
      //   this.camera.position.y,
      //   this.camera.position.z,
      // );
      // s.transform.rotation.set(
      //   this.camera.rotation.x,
      //   this.camera.rotation.y,
      //   this.camera.rotation.z,
      // );
      // s.addComponent(
      //   new GeometryRenderer(
      //     new THREE.CapsuleGeometry(0.5, 1, 4, 8),
      //     new THREE.MeshPhongMaterial({
      //       color: 0x00ff00,
      //       wireframe: false,
      //     }),
      //   ),
      // );
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    if (Global.input.isKeyPressed("KeyC")) {
      this.controlsEnabled = !this.controlsEnabled;
      if (!this.controls) {
        this.controls = new OrbitControls(
          this.camera,
          Global.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.target = new THREE.Vector3(0, 2, 0);
        this.controls.update();
      }
    }
    if (this.controlsEnabled) {
      this.controls?.update();
    }
    this.physicsHelper.update();

    if (Global.input.isKeyPressed("KeyR")) {
      var collider1 = this.addNewGameObject("collider1");
      collider1.addComponent(
        new GeometryRenderer(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: false }),
        ),
      );
      collider1.addComponent(new GeometryCollider3D(1, 0.1));
      collider1.transform.position.set(0, 10, 0);
    }
  }
}
