import { World } from "@/engine";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { AudioManager } from "@/game/audio/audioManager";
import { Goomba } from "./goomba";
import { Koopa } from "./koopa";
import { Coin, CoinState } from "./coin";
import { Mushroom } from "./mushroom";

const QUESTION_BLOCK_ANIMATION_TIME = 0.2;
const QUESTION_BLOCK_ANIMATION_Y_VEL = 2;

export enum QuestionBlockSpawnType {
  COIN,
  LEAF,
  ONE_UP,
  P_BUTTON
}

export class QuestionBlock extends AbstractPhysicsBody {
  private hitSensor: RAPIER.Collider | null = null;
  private animationTimer: number = -1;
  private yOffset: number = 0;
  private isHit = false;
  private spawnCount = 1;
  private spawnType = QuestionBlockSpawnType.COIN;

  constructor(world: World, spawnCount: number, spawnType: QuestionBlockSpawnType) {
    super(
      `QuestionBlock_${world.gameObjects.size}`,
      world,
    );
    this.spawnCount = spawnCount;
    this.spawnType = spawnType;
  }

  async start(): Promise<void> {
    await super.start();
    this.transform.position.y += 0.5;

    await this.loadModel("assets/platformer/crate-item.glb", -0.25);

    this.createBoxCollider(
      this.transform.scale.clone().multiplyScalar(0.5),
      new THREE.Vector3(0, 0, 0),
    );

    this.hitSensor = this.world.physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        this.transform.scale.x * 0.25,
        this.transform.scale.y * 0.25,
        this.transform.scale.z * 0.25,
      )
        .setTranslation(
          this.transform.position.x,
          this.transform.position.y + 0.5,
          this.transform.position.z,
        )
        .setSensor(true),
    );
    this.world.physics.registerCollider(this.hitSensor, this);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (this.animationTimer >= 0) {
      this.animationTimer -= fixedDeltaTime;
      if (this.animationTimer >= QUESTION_BLOCK_ANIMATION_TIME / 2)
        this.yOffset += QUESTION_BLOCK_ANIMATION_Y_VEL * fixedDeltaTime;
      else
        this.yOffset -= QUESTION_BLOCK_ANIMATION_Y_VEL * fixedDeltaTime;
      this.yOffset = Math.max(this.yOffset, 0);
      if (this.mesh) this.mesh.position.y = -0.25 + this.yOffset;
    }

    if (this.isHit && this.hitSensor) {
      this.world.physics.world.intersectionsWithShape(
        this.hitSensor.translation(),
        this.hitSensor.rotation(),
        this.hitSensor.shape,
        (otherCollider) => {
          const go = this.world.physics.getGameObjectFromCollider(otherCollider);
          if (go instanceof Goomba) {
            go.deadBounce(1);
          } else if (go instanceof Koopa) {
            go.deadBounce(1);
          }
          return true;
        },
      );
      this.isHit = false;
    }
  }

  public onHit(dx: number): void {
    if (this.spawnCount <= 0)
      return;

    AudioManager.getInstance().playBump();

    switch (this.spawnType) {
      case QuestionBlockSpawnType.COIN: {
        const coin = new Coin(this.world);
        const go = this.world.addGameObject(coin);
        coin.setState(CoinState.INTRO);
        go.transform.position.set(
          this.transform.position.x,
          this.transform.position.y + 0.5,
          this.transform.position.z,
        );
        break;
      }
      case QuestionBlockSpawnType.LEAF: {
        const mushroom = new Mushroom(this.world);
        this.world.addGameObject(mushroom);
        mushroom.transform.position.set(
          this.transform.position.x,
          this.transform.position.y,
          this.transform.position.z,
        );
        mushroom.setDir(dx);
        break;
      }
      case QuestionBlockSpawnType.ONE_UP:
      case QuestionBlockSpawnType.P_BUTTON:
        break;
    }

    this.isHit = true;
    this.isActive = false;
    this.spawnCount--;
    this.animationTimer = QUESTION_BLOCK_ANIMATION_TIME;
  }

  override onDestroy(): void {
    try {
      if (this.hitSensor) {
        this.world.physics.removeCollider(this.hitSensor);
        this.hitSensor = null;
      }
    } catch (e) {
      console.error("Error during question block destruction:", e);
    }
    super.onDestroy();
  }
}
