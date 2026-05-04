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
    this.mesh = this.transform.add(modelMesh);
    
    this.originalY = this.transform.position.y;

    const shape = PhysicsWorld.getSphereShape(this.transform, 0.25)!;
    shape.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.physics.world.createCollider(shape);
    collider.setSensor(true);
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
    this.isStarted = true;
  }

  fixedUpdate(_fixedDeltaTime: number): void {
    if (!this.isStarted) return;
    this.transform.rotateY(0.1);
    this.transform.position.y = this.originalY + 
      Math.sin(Global.timer.getElapsed() * 5 + this.transform.position.x) * 0.1;
    
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