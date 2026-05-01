import {
  GeometryRigidbody3D,
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
import { Player } from "./components/player";
import { Camera } from "./components/camera";
import { Coin } from "./components/coin";

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
      const playerModel = await this.contentManager.loadGLTF(
        "/assets/platformer/character-oopi.glb",
      );
      playerModel.scene.translateY(-0.4);
      playerModel.scene.rotateY(Math.PI / 4);
      
      var player = this.addNewGameObject("Player");
      player.transform.position.set(0, 2, 0);
      player.addComponent(new MeshRenderer(playerModel.scene));
      player.addComponent(new Player());

      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );

      const cameraObject = this.addNewGameObject("Camera");
      cameraObject.addComponent(new Camera(this.camera, player));

      for (const objectData of Object.values(levelData.objects)) {
        switch (objectData.object_type) {
          case "Ground": {

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
          }

          case "Camera": {

            cameraObject.transform.position.set(
              objectData.position[0],
              objectData.position[2],
              -objectData.position[1],
            );
            // The camera in Blender is also rotated differently, so we need to adjust the rotation as well.
            // Camera in Blender is also rotated 90 degrees on the X axis.
            cameraObject.transform.rotation.set(
              objectData.rotation[0] - Math.PI / 2,
              objectData.rotation[2],
              -objectData.rotation[1],
            );
            break;
          }
          case "Coin": {

            const go = this.addNewGameObject("Coin");
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
            go.addComponent(new Coin());
            break;
            
          }

          case "": {
            const model = await this.contentManager.loadGLTF(
              objectData.model_path,
            );
            const modelMesh = model.scene.clone();
            const go = this.addNewGameObject("background");
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
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    this.physicsHelper.update();
  }
}
