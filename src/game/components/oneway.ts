
import { GameObject } from "@/engine/gameObject";
import { PhysicsWorld } from "@/engine/physicsWorld";
import { World } from "@/engine/world";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export class GroundOneWay extends GameObject {
  private mesh!: THREE.Mesh;
  private collider! : RAPIER.Collider;
  readonly shapeSize = new THREE.Vector3(2, 0.5, 1);

  get bottom() {
    return this.collider.translation().y - this.collider.halfHeight();
  }
  get top() {
    return this.collider.translation().y + this.collider.halfHeight();
  }

  constructor(world : World, model: THREE.Object3D) {
    super(
      `GroundOneWay_${world.gameObjects.size}`,
      world,
      model
    );
  }

  async start() : Promise<void> {
    super.start();
    const shape = PhysicsWorld.getBoxShape(
      this.transform.clone().translateY(0.25),
      new THREE.Vector3(
        this.transform.scale.x * this.shapeSize.x,
        this.transform.scale.y * this.shapeSize.y,
        this.transform.scale.z * this.shapeSize.z,
      )
    );
    const collider = this.world.physics.world.createCollider(shape);
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
  }
}