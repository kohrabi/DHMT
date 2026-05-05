import { PhysicsWorld, GameObject, World } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL, SUBSUBSUBPIXEL_DELTA_TIME } from '@/engine/constants';


const COIN_KILL_TIME = 1
const COIN_INIT_Y_VEL = 0x07A00 * SUBSUBSUBPIXEL_DELTA_TIME;
const COIN_Y_DESTROY = 0x02000 * SUBSUBSUBPIXEL;

export enum CoinState {
  INTRO, 
  BRICK, 
  NORMAL
}

export class Coin extends GameObject {
  private mesh!: THREE.Object3D;
  private collider! : RAPIER.Collider;

  private originalY = 0;
  private velocity = new THREE.Vector3();
  private killTimer = COIN_KILL_TIME;

  private currentState = CoinState.NORMAL;

  constructor(world : World) {
    super(
      `Coin_${world.gameObjects.size}`,
      world,
    );
  }

  async start() : Promise<void> {
    super.start();
    
    this.originalY = this.transform.position.y;

    const shape = PhysicsWorld.getSphereShape(this.transform, 0.5)!;
    shape.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.physics.world.createCollider(shape);
    collider.setSensor(true);
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
    const model = await this.world.gameScene.content.loadGLTF(
      "assets/platformer/coin-gold.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.mesh = this.transform.add(modelMesh);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (this.currentState === CoinState.NORMAL) {
      this.transform.rotateY(0.1);
      this.transform.position.y = this.originalY + 
        Math.sin(Global.timer.getElapsed() * 5 + this.transform.position.x) * 0.1;
    }
    else {
      this.transform.rotateY(0.25);
      console.log("Coin velocity:", this.velocity.y);
      this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL * 8.0, -OBJECT_MAX_FALL * 8.0);
      this.transform.position.y += this.velocity.y * fixedDeltaTime;

      if (this.killTimer > 0) this.killTimer -= fixedDeltaTime;
      else {
        this.destroy();
      }
    }
    
  }
  
  public setState(state: CoinState) {
    this.currentState = state;
    switch (state) {
      case CoinState.INTRO:
      {
        this.velocity.y = COIN_INIT_Y_VEL * 3;
        this.killTimer = COIN_KILL_TIME;
        this.world.physics.addDeferedCall(() => {
          this.collider.setEnabled(false);
        });
        break;
      }
    }
  }

  onDestroy(): void {
    super.onDestroy();
    try {

      this.world.physics.removeCollider(this.collider);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    } catch (error) {
      console.error("Error during coin destruction:", error);
    }
  }
}