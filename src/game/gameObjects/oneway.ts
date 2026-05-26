import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";

export class GroundOneWay extends AbstractPhysicsBody {
  readonly shapeSize = new THREE.Vector3(1, 0.25, 1);

  get bottom() {
    return this.transform.position.y + 0.5 - this.shapeSize.y / 2.0;
  }
  get top() {
    return this.transform.position.y + 0.5 + this.shapeSize.y / 2.0;
  }

  constructor(world: World, model: THREE.Object3D) {
    super(
      `GroundOneWay_${world.gameObjects.size}`,
      world,
    );
    this.transform.add(model);
  }

  async start(): Promise<void> {
    await super.start();
    this.mesh = this.transform.children[0] as THREE.Object3D;

    this.createBoxCollider(
      new THREE.Vector3(
        this.transform.scale.x * this.shapeSize.x,
        this.transform.scale.y * this.shapeSize.y,
        this.transform.scale.z * this.shapeSize.z,
      ),
      new THREE.Vector3(0, 0.5, 0),
    );
  }

  fixedUpdate(): void {}
}
