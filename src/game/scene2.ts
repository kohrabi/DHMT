import {
  Scene,
  PhysicsWorld,
  GameObject,
} from "@/engine";
import * as THREE from "three";
import { OrbitControls, RapierHelper } from "three/examples/jsm/Addons.js";
import * as Global from "@/global";
import { Player } from "./gameObjects/player";
import { Camera } from "./gameObjects/camera";
import { Coin } from "./gameObjects/coin";
import { Ground } from "./gameObjects/ground";
import { Decorate } from "./gameObjects/decorate";
import { Brick } from "./gameObjects/brick";
import { GroundOneWay } from "./gameObjects/oneway";
import { Goomba } from "./gameObjects/goomba";
import { Koopa } from "./gameObjects/koopa";
import { QuestionBlock, QuestionBlockSpawnType } from "./gameObjects/questionBlock";

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
  private skyTexture?: THREE.Texture;

  public constructor() {
    super("scene2");
  }

  protected async loadContent(): Promise<void> {
    console.log("Loading content for Scene2...");
    Global.renderer.shadowMap.enabled = true;

    this.skyTexture = this.buildSkyTexture();
    this.world.scene.background = this.skyTexture;

    const sunLight = new THREE.DirectionalLight(0xfff2cc, 2);
    sunLight.position.set(6, 10, 4);
    this.world.scene.add(sunLight);

    const skyLight = new THREE.HemisphereLight(0x8ad7ff, 0x6bbf5a, 2);
    this.world.scene.add(skyLight);

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

  protected unloadContent(): void {

    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = undefined;
      this.world.scene.background = null;
    }

    super.unloadContent();
  }

  private buildSkyTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext("2d");
    if (!context) {
      const fallback = new THREE.Texture();
      fallback.needsUpdate = true;
      return fallback;
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#7fd4ff");
    gradient.addColorStop(0.6, "#6ec6ff");
    gradient.addColorStop(1, "#b8ecff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
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
        case "Koopa": {
          var koopa = this.addGameObject(new Koopa(this.world));
          koopa.transform.position.set(
            objectData.position[0],
            objectData.position[2] + 0.6,
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
        case "QuestionBlock": {
          console.log("Spawning Question Block with properties:", objectData.properties);
          let coinType = QuestionBlockSpawnType.COIN;
          switch (objectData.properties["spawn_type"]) {
            case "COIN" : coinType = QuestionBlockSpawnType.COIN; break;
            case "LEAF" : coinType = QuestionBlockSpawnType.LEAF; break;
            default: console.warn("Unknown spawn type for Question Block:", objectData.properties["spawn_type"]);
          }
          go = this.addGameObject(new QuestionBlock(
            this.world, 
            objectData.properties["spawn_count"], 
            coinType)
          );
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
