
import { GameObject } from "@/engine/gameObject";
import { PhysicsWorld } from "@/engine/physicsWorld";
import { World } from "@/engine/world";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export class Ground extends GameObject {
  private mesh!: THREE.Mesh;
  private collider! : RAPIER.Collider;

  constructor(world : World, model: THREE.Object3D, 
    private readonly colliderSize : THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    private readonly colliderOffset : THREE.Vector3 = new THREE.Vector3(0, 0.5, 0)) {
    super(
      `Ground_${world.gameObjects.size}`,
      world,
      model
    );
  }

  async start() : Promise<void> {
    super.start();
    const t = this.transform.clone();
    t.position.add(this.colliderOffset.multiply(this.transform.scale));
    const shape = PhysicsWorld.getBoxShape(
      t,
      new THREE.Vector3(
        this.colliderSize.x * this.transform.scale.x,
        this.colliderSize.y * this.transform.scale.y,
        this.colliderSize.z,
      )
    );
    const collider = this.world.physics.world.createCollider(shape);
  
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
  }
}