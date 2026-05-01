
import { GameObject } from "@/engine/gameObject";
import { PhysicsWorld } from "@/engine/physicsWorld";
import { World } from "@/engine/world";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export class Ground extends GameObject {
  private mesh!: THREE.Mesh;
  private collider! : RAPIER.Collider;

  constructor(world : World, model: THREE.Object3D) {
    super(
      `Ground_${world.gameObjects.size}`,
      world,
      model
    );
  }

  async start() : Promise<void> {
    super.start();
    const shape = PhysicsWorld.getBoxShape(
      this.transform.clone().translateY(0.5),
      new THREE.Vector3(
        this.transform.scale.x,
        this.transform.scale.y,
        this.transform.scale.z,
      )
    );
    const collider = this.world.physics.world.createCollider(shape);
    this.collider = collider;
  }
}