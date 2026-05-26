import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { eventBus } from "@/engine/eventBus";
import { AudioManager } from "@/game/audio/audioManager";
import { ScorePopup, ScoreType } from "./scorePopup";

export class Brick extends AbstractPhysicsBody {
  constructor(world: World) {
    super(
      `Brick_${world.gameObjects.size}`,
      world,
    );
  }

  async start(): Promise<void> {
    await super.start();
    this.transform.translateY(0.5);
    await this.loadModel("assets/platformer/brick.glb", -0.25);
    this.createBoxCollider(
      this.transform.scale.clone().multiplyScalar(0.5),
      new THREE.Vector3(0, 0, 0),
    );
  }

  public onHit(): void {
    eventBus.emit("screen:shake", 0.1, 0.15);
    AudioManager.getInstance().playBump();
    eventBus.emit("brick:broken", this.transform.position);
    this.destroy();
  }

  override onDestroy(): void {
    const popup = new ScorePopup(ScoreType.Score100, this.world);
    popup.transform.position.copy(this.transform.position);
    this.world.addGameObject(popup);
    super.onDestroy();
  }

  fixedUpdate(): void {}
}
