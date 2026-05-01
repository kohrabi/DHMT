import { PhysicsWorld, GameObject, World } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class Coin extends GameObject {
  private mesh!: THREE.Object3D;
  private collider! : RAPIER.Collider;

  private originalY = 0;
  private isStarted = false;

  constructor(world : World) {
    super(
      `Coin_${world.gameObjects.size}`,
      world,
    );
  }

  async start() : Promise<void> {
    super.start();
    const model = await this.world.gameScene.content.loadGLTF(
      "assets/platformer/coin-gold.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.transform.add(modelMesh);
    
    this.originalY = this.transform.position.y;

    const shape = PhysicsWorld.getSphereShape(this.transform, 0.25)!;
    const collider = this.world.physics.world.createCollider(shape);
    collider.setSensor(true);
    this.collider = collider;
    this.isStarted = true;
  }

  fixedUpdate(_fixedDeltaTime: number): void {
    if (!this.isStarted) return;
    this.transform.rotateY(0.1);
    this.transform.position.y = this.originalY + 
      Math.sin(Global.timer.getElapsed() * 5 + this.transform.position.x) * 0.1;
    
    // Check intersection with any object
    // const physicsWorld = this.world.physics.world;
    // let playerCollected = false;
    
    // physicsWorld.intersectionPairsWith(this.collider, (otherCollider) => {
    //   // Find the GameObject with this collider
      
    //   console.log("Coin intersecting with collider:", otherCollider);
    // });

    // if (playerCollected) {
    //   console.log("Coin collected by player!");
    //   this.world.remove(this);
    // }
  }
}