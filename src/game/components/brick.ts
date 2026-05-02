import { PhysicsWorld, GameObject, World } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class Brick extends GameObject {
  private mesh!: THREE.Object3D;
  private collider! : RAPIER.Collider;

  constructor(world : World) {
    super(
      `Brick_${world.gameObjects.size}`,
      world,
    );
  }

  async start() : Promise<void> {
    super.start();
    const model = await this.world.gameScene.content.loadGLTF(
      "assets/platformer/brick.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.mesh = this.transform.add(modelMesh);
    const shape = 
      PhysicsWorld.getBoxShape(this.transform, 
        this.transform.scale.clone().multiplyScalar(0.5))!;
    shape.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.physics.world.createCollider(shape);
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
  }
  
  destroy(): void {
    super.destroy();
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
      console.error("Error during brick destruction:", error);
    }
  }

  public onHit(): void {
    console.log("Brick hit!");
    this.world.removeGameObject(this);
  }
}