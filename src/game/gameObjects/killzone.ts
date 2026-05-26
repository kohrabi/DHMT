import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { checkOverlap } from "@/engine/utils/collisionUtils";
import { Player } from "./player";
import { Koopa } from "./koopa";
import { Goomba } from "./goomba";
import { Mushroom } from "./mushroom";

export class KillZone extends AbstractPhysicsBody {
  constructor(world: World) {
    super(
      `KillZone_${world.gameObjects.size}`,
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

  public fixedUpdate(): void {
    if (!this.collider) return;

    checkOverlap(this.world.physics, this.collider, (other) => {
      if (other instanceof Player) {
        other.kill();
      } else if (other instanceof Koopa || other instanceof Goomba || other instanceof Mushroom) {
        other.destroy();
      }
    });
  }
}
