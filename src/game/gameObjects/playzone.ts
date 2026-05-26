import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";

export type PlayZoneBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
};

export class PlayZone extends AbstractPhysicsBody {
  constructor(world: World) {
    super(
      `PlayZone_${world.gameObjects.size}`,
      world,
    );
  }

  public async start(): Promise<void> {
    await super.start();

    this.createBoxCollider(
      new THREE.Vector3(
        this.transform.scale.x * 2,
        this.transform.scale.y * 2,
        this.transform.scale.z * 2,
      ),
      new THREE.Vector3(0, 0, 0),
      true,
    );
  }

  public getBounds(): PlayZoneBounds {
    const pos = this.transform.position;
    const half = this.transform.scale;
    return {
      min: new THREE.Vector3(
        pos.x - half.x,
        pos.y - half.y,
        pos.z - half.z,
      ),
      max: new THREE.Vector3(
        pos.x + half.x,
        pos.y + half.y,
        pos.z + half.z,
      ),
    };
  }

  fixedUpdate(): void {}
}
