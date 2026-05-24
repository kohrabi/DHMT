import { GameObject, World } from '@/engine';
import { SUBSUBSUBPIXEL_DELTA_TIME } from '@/engine/constants';
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


const SCORE_POPUP_RISE_VELOCITY = 0x02000 * SUBSUBSUBPIXEL_DELTA_TIME;
const SCORE_POPUP_GRAVITY = 0x00100 * SUBSUBSUBPIXEL_DELTA_TIME;
const SCORE_POPUP_DESTROY_TIMER = 0.8;

export enum ScoreType {
  Score100 = 100,
  Score200 = 200,
  Score400 = 400,
  Score800 = 800,
  Score1000 = 1000,
}

export class ScorePopup extends GameObject {
  private mesh!: THREE.Mesh;
  private outlineMesh!: THREE.Mesh;

  private scoreType: ScoreType;
  private velocity = new THREE.Vector3(0, SCORE_POPUP_RISE_VELOCITY, 0);
  private destroyTimer = SCORE_POPUP_DESTROY_TIMER;

  constructor(scoreType: ScoreType, world : World) {
    super(
      `ScorePopup_${world.gameObjects.size}`,
      world,
    );
    this.scoreType = scoreType;
  }

  async start() : Promise<void> {
    await super.start();
    
    const font = await this.world.gameScene.content.loadFont("assets/fonts/Super Mario 256_Regular.json");
    const text = this.scoreType.toString();
    const geometry = new TextGeometry(text, {
      font: font,
      size: 0.3,
      depth: 0.01,
      curveSegments: 8,
    });
    const outlineGeometry = new TextGeometry(text, {
      font: font,
      size: 0.35,
      depth: 0.01,
      curveSegments: 8,
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    this.outlineMesh.position.z -= 0.02;
    this.outlineMesh.position.x -= 0.05;
    this.transform.add(this.outlineMesh);
    this.transform.add(this.mesh);
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
  
  onDestroy(): void {
    super.onDestroy();
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(mat => mat.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.outlineMesh.geometry.dispose();
    if (Array.isArray(this.outlineMesh.material)) {
      this.outlineMesh.material.forEach(mat => mat.dispose());
    } else {
      this.outlineMesh.material.dispose();
    }
  }
}