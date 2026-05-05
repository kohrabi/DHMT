
import { GameObject } from "@/engine/gameObject";
import { PhysicsWorld } from "@/engine/physicsWorld";
import { World } from "@/engine/world";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export class GroundOneWay extends GameObject {
  private mesh!: THREE.Mesh;
  private collider! : RAPIER.Collider;
  readonly shapeSize = new THREE.Vector3(1, 0.25, 1);

  get bottom() {
    return this.transform.position.y + 0.5 - this.shapeSize.y / 2.0;
  }
  get top() {
    return this.transform.position.y + 0.5 + this.shapeSize.y / 2.0;
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
      this.transform.clone().translateY(0.5),
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