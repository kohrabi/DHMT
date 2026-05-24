import { GameObject, PhysicsWorld, World } from "@/engine";
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Player } from "./player";
import { ScorePopup, ScoreType } from "./scorePopup";

export class LevelEnd extends GameObject {
  private collider!: RAPIER.Collider;
  private mesh !: THREE.Object3D;

  constructor(world: World) {
    super(
      `LevelEnd_${world.gameObjects.size}`,
      world,
    );
  }

  public async start(): Promise<void> {
    await super.start();

    this.collider = this.world.physics.world.createCollider(
      PhysicsWorld.getBoxShape(
        this.transform,
        new THREE.Vector3(1, 1, 1)
      ),
    );
    this.collider.setSensor(true);

    const loadedModel = await this.world.gameScene.content.loadGLTF("/assets/platformer/star.glb");
    const modelMesh = loadedModel.scene.clone();
    modelMesh.translateY(-0.1);
    this.mesh = modelMesh;
    this.transform.add(this.mesh);
  }

  onDestroy(): void {
    super.onDestroy();
    this.world.addGameObject(new ScorePopup(ScoreType.Score1000, this.world))
      .transform.position.copy(this.transform.position);
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

  fixedUpdate(fixedDeltaTime: number): void {
    this.transform.rotateY(0.1);
    this.mesh.position.y = -0.1 + Math.sin(this.world.timer.elapsed * 2) * 0.2;
    
    this.world.physics.world.intersectionsWithShape(
      this.collider.translation(), 
      this.collider.rotation(), 
      this.collider.shape,
      (handle) => {
        if (handle.handle === this.collider.handle) {
          return true;
        }
        console.log("Checking collision with handle:", handle.handle);
        const other = this.world.physics.getGameObjectFromCollider(handle);
        console.log("Mushroom collision with", other?.name);
        if (other instanceof Player) {
          other.endLevel();
          this.destroy();
        }
        return true;
      },
    );
  }
}