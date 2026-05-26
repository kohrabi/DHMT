import { Scene } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";
import { eventBus } from "@/engine/eventBus";
import { ScreenShake } from "@/engine/screenShake";
import { HudManager } from "@/game/ui/hudManager";
import { Camera } from "@/game/gameObjects/camera";
import { PlayZone } from "@/game/gameObjects/playzone";
import { LevelFactory, type LevelObjectData } from "./gameplay/levelFactory";

type LevelData = {
  objects: Record<string, LevelObjectData>;
};

export class GameplayScene extends Scene {
  private skyTexture?: THREE.Texture;
  private shake?: ScreenShake;
  private hud?: HudManager;
  private levelFactory = LevelFactory.createDefault();

  private onCoinCollected = (): void => {
    this.hud?.addCoin(1);
  };

  private onCombo = (count: number): void => {
    this.hud?.showCombo(count);
  };

  private onScreenShake = (intensity: number, duration: number): void => {
    this.shake?.trigger(intensity, duration);
  };

  constructor() {
    super("gameplay");
  }

  protected async loadContent(): Promise<void> {
    console.log("Loading GameplayScene...");
    Global.renderer.shadowMap.enabled = true;

    this.skyTexture = this.buildSkyTexture();
    this.world.scene.background = this.skyTexture;

    const sunLight = new THREE.DirectionalLight(0xfff2cc, 2);
    sunLight.position.set(6, 10, 4);
    this.world.scene.add(sunLight);

    const skyLight = new THREE.HemisphereLight(0x8ad7ff, 0x6bbf5a, 2);
    this.world.scene.add(skyLight);

    this.hud = new HudManager();

    this.shake = new ScreenShake();

    eventBus.on("coin:collected", this.onCoinCollected);
    eventBus.on("hud:combo", this.onCombo);
    eventBus.on("screen:shake", this.onScreenShake);

    try {
      const levelData = await this.contentManager.loadJSON<LevelData>(
        "/assets/scenes/level.json",
      );
      await this.loadLevel(levelData);
    } catch (error) {
      console.error("Error loading level:", error);
    }

    this.fadeIn();
  }

  public update(): void {
    super.update();

    if (this.shake) {
      this.shake.update(this.world.timer.delta, this.camera);
    }
  }

  protected async unloadContent(): Promise<void> {
    await this.fadeOut();

    eventBus.off("coin:collected", this.onCoinCollected);
    eventBus.off("hud:combo", this.onCombo);
    eventBus.off("screen:shake", this.onScreenShake);

    this.hud?.dispose();
    this.hud = undefined;
    this.shake = undefined;

    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = undefined;
      this.world.scene.background = null;
    }

    await super.unloadContent();
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

  private async loadLevel(levelData: LevelData): Promise<void> {
    const cameraGo = new Camera(this.camera, this.world, null);
    const cameraObject = this.addGameObject(cameraGo);

    for (const objectData of Object.values(levelData.objects)) {
      if (objectData.object_type === "Camera") {
        cameraObject.transform.position.set(
          objectData.position[0],
          objectData.position[2],
          -objectData.position[1],
        );
        cameraObject.transform.rotation.set(
          objectData.rotation[0] - Math.PI / 2,
          objectData.rotation[2],
          -objectData.rotation[1],
        );
        continue;
      }

      const result = await this.levelFactory.create(
        objectData,
        this.world,
        this.content,
      );
      if (!result.gameObject) continue;

      if (result.applyGenericTransform) {
        result.gameObject.transform.position.set(
          objectData.position[0],
          objectData.position[2],
          -objectData.position[1],
        );
        result.gameObject.transform.rotation.set(
          objectData.rotation[0],
          objectData.rotation[2],
          -objectData.rotation[1],
        );
        result.gameObject.transform.scale.set(
          objectData.scale[0],
          objectData.scale[2],
          objectData.scale[1],
        );
      }

      const go = this.addGameObject(result.gameObject);

      if (objectData.object_type === "PlayerSpawn") {
        cameraGo.setTarget(go);
      }
      if (objectData.object_type === "PlayZone") {
        cameraGo.setZone(go as PlayZone);
      }
    }
  }

  private fadeIn(): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: #000;
      z-index: 9999; pointer-events: none;
      opacity: 1;
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.transition = "opacity 0.5s ease-out";
      overlay.style.opacity = "0";
    });

    setTimeout(() => overlay.remove(), 600);
  }

  private fadeOut(): Promise<void> {
    return new Promise<void>((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: #000;
        z-index: 9999; pointer-events: none;
        opacity: 0;
      `;
      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.transition = "opacity 0.5s ease-in";
        overlay.style.opacity = "1";
      });

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 600);
    });
  }
}
