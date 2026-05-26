import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { checkOverlap } from "@/engine/utils/collisionUtils";
import { Player } from "./player";
import { ScorePopup, ScoreType } from "./scorePopup";

export class LevelEnd extends AbstractPhysicsBody {
  constructor(world: World) {
    super(
      `LevelEnd_${world.gameObjects.size}`,
      world,
    );
  }

  public async start(): Promise<void> {
    await super.start();

    this.createBoxCollider(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(0, 0, 0),
      true,
    );

    await this.loadModel("/assets/platformer/star.glb", -0.1);
  }

  fixedUpdate(): void {
    this.mesh.position.y = -0.1 + Math.sin(this.world.timer.elapsed * 2) * 0.2;
    this.transform.rotateY(0.1);

    if (!this.collider) return;

    checkOverlap(this.world.physics, this.collider, (other) => {
      if (other instanceof Player) {
        other.endLevel();
        this.destroy();
      }
    });
  }

  override onDestroy(): void {
    this.world.addGameObject(new ScorePopup(ScoreType.Score1000, this.world))
      .transform.position.copy(this.transform.position);
    super.onDestroy();
  }
}
