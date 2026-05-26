import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";

export class Ground extends AbstractPhysicsBody {
  constructor(
    world: World,
    model: THREE.Object3D,
    private readonly colliderSize: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    private readonly colliderOffset: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0),
  ) {
    super(
      `Ground_${world.gameObjects.size}`,
      world,
    );
    this.transform.add(model);
  }

  async start(): Promise<void> {
    await super.start();
    this.mesh = this.transform.children[0] as THREE.Object3D;

    this.createBoxCollider(
      new THREE.Vector3(
        this.colliderSize.x * this.transform.scale.x,
        this.colliderSize.y * this.transform.scale.y,
        this.colliderSize.z,
      ),
      this.colliderOffset,
    );
  }

  fixedUpdate(): void {}
}
