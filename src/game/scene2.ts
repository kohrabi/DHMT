import {
  Scene,
  PhysicsWorld,
  GameObject,
} from "@/engine";
import * as THREE from "three";
import { OrbitControls, RapierHelper } from "three/examples/jsm/Addons.js";
import * as Global from "@/global";
import { Player } from "./components/player";
import { Camera } from "./components/camera";
import { Coin } from "./components/coin";
import { Ground } from "./components/ground";
import { Decorate } from "./components/decorate";
import { Brick } from "./components/brick";
import { GroundOneWay } from "./components/oneway";
import { Goomba } from "./components/goomba";

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
    console.log("Loading content for Scene2...");
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

      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );
      await this.loadLevel(levelData);
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    this.physicsHelper.update();
  }

  public async loadLevel(levelData: LevelData): Promise<void>
  {

    const camera = new Camera(this.camera, this.world, null);
    const cameraObject = this.addGameObject(camera);
    
    for (const objectData of Object.values(levelData.objects)) {
      let go: GameObject | null = null;
      switch (objectData.object_type) {
        case "Ground": {

          const model = await this.contentManager.loadGLTF(
            objectData.model_path,
          );
          const modelMesh = model.scene.clone();
          go = this.addGameObject(new Ground(this.world, modelMesh));
          break;
        }
        case "OneWay": {

          const model = await this.contentManager.loadGLTF(
            objectData.model_path,
          );
          const modelMesh = model.scene.clone();
          go = this.addGameObject(new GroundOneWay(this.world, modelMesh));
          break;
        }
        case "PlayerSpawn": {
          var player = this.addGameObject(new Player(this.world));
          player.transform.position.set(
            objectData.position[0],
            objectData.position[2] + 0.55,
            -objectData.position[1]
          );
          camera.setTarget(player);
          break;
        }
        case "Goomba": {
          var goomba = this.addGameObject(new Goomba(this.world));
          goomba.transform.position.set(
            objectData.position[0],
            objectData.position[2] + 0.55,
            -objectData.position[1]
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
          go = this.addGameObject(new Coin(this.world));
          break;
        }
        case "Brick": {
          go = this.addGameObject(new Brick(this.world));
          break;
        }

        case "": {
          const model = await this.contentManager.loadGLTF(
            objectData.model_path,
          );
          const modelMesh = model.scene.clone();
          go = this.addGameObject(new Decorate(this.world, modelMesh));
          break;
        }
      }
      
      if (!go) continue;
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
        objectData.scale[2],
        objectData.scale[1],
      );
    }
  }
}
