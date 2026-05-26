import { Scene } from "@/engine";
import * as THREE from "three";
import { ParallaxSystem } from "./parallaxSystem";
import { buildTitle, TitleConfig } from "./title3D";
import { showMenuUI, cleanupUI } from "./menuUI";

const SceneConfig = {
  scrollSpeed: 2.0,
  camera: {
    y: 4.0,
    z: 8.0,
    lookAtYFrac: 0.6,
  },
};

export class MainMenu extends Scene {
  private parallax?: ParallaxSystem;
  private titleGroup?: THREE.Group;
  private skyTexture?: THREE.Texture;
  private animTime = 0;

  constructor() {
    super("mainMenu");
  }

  protected async loadContent(): Promise<void> {
    this.skyTexture = this.buildSkyGradient();
    this.world.scene.background = this.skyTexture;

    const sun = new THREE.DirectionalLight(0xfff5d6, 2.5);
    sun.position.set(5, 12, 4);
    this.world.scene.add(sun);
    this.world.scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x6bbf5a, 1.8));

    const { y, z, lookAtYFrac } = SceneConfig.camera;
    this.camera.position.set(0, y, z);
    this.camera.lookAt(0, y * lookAtYFrac, 0);

    this.parallax = new ParallaxSystem(this.world.scene, this.content);
    this.parallax.scrollSpeed = SceneConfig.scrollSpeed;
    await this.parallax.loadAssets();
    this.parallax.seedTiles();

    this.titleGroup = await buildTitle(this.content, this.world.scene);
    if (this.titleGroup) {
      this.world.scene.add(this.titleGroup);
    }

    showMenuUI();
  }

  public update(): void {
    super.update();
    const dt = this.world.timer.delta;
    this.animTime += dt;

    this.parallax?.update(dt);

    if (this.titleGroup) {
      const { bobAmp, bobFreq, rockFreq, rockAmp, y } = TitleConfig;
      this.titleGroup.position.y =
        y + Math.sin(this.animTime * bobFreq) * bobAmp;
      this.titleGroup.rotation.y =
        Math.sin(this.animTime * rockFreq) * rockAmp;
    }
  }

  public async deactivate(): Promise<void> {
    cleanupUI();
    this.parallax?.dispose();
    await super.deactivate();
    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = undefined;
      this.world.scene.background = null;
    }
  }

  private buildSkyGradient(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Texture();

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.0, "#1a87e8");
    grad.addColorStop(0.4, "#5cb8ff");
    grad.addColorStop(0.75, "#a8dfff");
    grad.addColorStop(1.0, "#d4f0ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
}
