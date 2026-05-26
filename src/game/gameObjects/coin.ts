import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { eventBus } from "@/engine/eventBus";
import { AudioManager } from "@/game/audio/audioManager";
import { OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { Player } from "./player";
import { ScorePopup, ScoreType } from "./scorePopup";

const COIN_KILL_TIME = 0.5;
const COIN_INIT_Y_VEL = 0x07A00 * SUBSUBSUBPIXEL_DELTA_TIME;
const COIN_FALL_MULTIPLIER = 20.0;

export enum CoinState {
  INTRO,
  BRICK,
  NORMAL
}

export class Coin extends AbstractPhysicsBody {
  private velocity = new THREE.Vector3();
  private originalY = 0;
  private killTimer = COIN_KILL_TIME;

  private currentState = CoinState.NORMAL;

  constructor(world: World) {
    super(
      `Coin_${world.gameObjects.size}`,
      world,
    );
  }

  async start(): Promise<void> {
    await super.start();

    this.originalY = this.transform.position.y;

    this.createBoxCollider(
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(0, 0, 0),
      true,
    );

    await this.loadModel("assets/platformer/coin-gold.glb", -0.25);

    if (this.currentState === CoinState.INTRO) {
      this.collider?.setEnabled(false);
    }
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (this.currentState === CoinState.NORMAL) {
      if (this.meshSphere && !this.world.isCameraVisible(this.transform, this.meshSphere)) {
        return;
      }
      this.transform.rotateY(0.1);
      this.transform.position.y = this.originalY +
        Math.sin(this.world.timer.elapsed * 5 + this.transform.position.x) * 0.1;

      if (this.collider) {
        this.world.physics.world.intersectionsWithShape(
          this.collider.translation(),
          this.collider.rotation(),
          this.collider.shape,
          (handle) => {
            const other = this.world.physics.getGameObjectFromCollider(handle);
            if (other instanceof Player) {
              this.collect();
            }
            return false;
          },
        );
      }
    } else {
      this.transform.rotateY(0.25);
      this.velocity.y = Math.max(
        this.velocity.y - OBJECT_FALL * COIN_FALL_MULTIPLIER,
        -OBJECT_MAX_FALL * COIN_FALL_MULTIPLIER,
      );
      this.transform.position.y += this.velocity.y * fixedDeltaTime;

      if (this.killTimer > 0) this.killTimer -= fixedDeltaTime;
      else {
        this.destroy();
      }
    }
  }

  public setState(state: CoinState) {
    this.currentState = state;
    switch (state) {
      case CoinState.INTRO: {
        this.velocity.y = COIN_INIT_Y_VEL * 10;
        this.killTimer = COIN_KILL_TIME;
        if (this.collider) {
          this.collider.setEnabled(false);
        }
        break;
      }
    }
  }

  private collect(): void {
    eventBus.emit("coin:collected");
    AudioManager.getInstance().playCoin();
    this.destroy();
  }

  override onDestroy(): void {
    const scorePopup = new ScorePopup(ScoreType.Score100, this.world);
    scorePopup.transform.position.copy(this.transform.position);
    this.world.addGameObject(scorePopup);
    super.onDestroy();
  }
}
