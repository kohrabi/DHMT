import { World } from "@/engine";
import { SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";

export enum ScoreType {
  Score100 = 100,
  Score200 = 200,
  Score400 = 400,
  Score800 = 800,
  Score1000 = 1000,
}

const SCORE_POPUP_RISE_VELOCITY = 0x02000 * SUBSUBSUBPIXEL_DELTA_TIME;
const SCORE_POPUP_GRAVITY = 0x00100 * SUBSUBSUBPIXEL_DELTA_TIME;
const SCORE_POPUP_DESTROY_TIMER = 0.8;

const SCORE_COLORS: Record<number, number> = {
  [ScoreType.Score100]: 0xffffff,
  [ScoreType.Score200]: 0x00ff00,
  [ScoreType.Score400]: 0x4488ff,
  [ScoreType.Score800]: 0xff4444,
  [ScoreType.Score1000]: 0xffd700,
};

export class ScorePopup extends AbstractPhysicsBody {
  private outlineMesh!: THREE.Mesh;

  private scoreType: ScoreType;
  private velocity = new THREE.Vector3(0, SCORE_POPUP_RISE_VELOCITY, 0);
  private destroyTimer = SCORE_POPUP_DESTROY_TIMER;

  constructor(scoreType: ScoreType, world: World) {
    super(
      `ScorePopup_${world.gameObjects.size}`,
      world,
    );
    this.scoreType = scoreType;
  }

  async start(): Promise<void> {
    await super.start();

    const font = await this.world.gameScene.content.loadFont("assets/fonts/Super Mario 256_Regular.json");
    const text = this.scoreType.toString();
    const color = SCORE_COLORS[this.scoreType] ?? 0xffffff;
    const hasOutline = this.scoreType > ScoreType.Score100;

    const geometry = new TextGeometry(text, {
      font,
      size: 0.3,
      depth: hasOutline ? 0.05 : 0.01,
      curveSegments: 8,
    });

    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.transform.add(this.mesh);

    if (hasOutline) {
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const outlineGeometry = new TextGeometry(text, {
        font,
        size: 0.35,
        depth: 0.01,
        curveSegments: 8,
      });
      this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
      this.outlineMesh.position.z -= 0.02;
      this.outlineMesh.position.x -= 0.05;
      this.transform.add(this.outlineMesh);
    }

    this.transform.position.sub(new THREE.Vector3(0.3, 0.15, 0));
  }

  fixedUpdate(fixedDeltaTime: number): void {
    this.velocity.y = Math.max(this.velocity.y + SCORE_POPUP_GRAVITY, 0.0);
    this.transform.position.y += this.velocity.y * fixedDeltaTime;
    if (this.destroyTimer <= 0) {
      this.destroy();
    }
    this.destroyTimer -= fixedDeltaTime;
  }

  override onDestroy(): void {
    if (this.outlineMesh) {
      this.outlineMesh.geometry?.dispose();
      const mat = this.outlineMesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat?.dispose();
      }
    }
    super.onDestroy();
  }
}
