import { World } from "@/engine";
import RAPIER from "@dimforge/rapier3d-compat";
import { OBJECT_DEAD_BOUNCE, OBJECT_DEAD_X_VEL, OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { CharacterEnemy } from "@/game/common/characterEnemy";
import { Animator } from "@/engine/animator";
import { eventBus } from "@/engine/eventBus";
import { AudioManager } from "@/game/audio/audioManager";
import { ScorePopup, ScoreType } from "./scorePopup";

const GOOMBA_X_SPEED = 0x00A00 * SUBSUBSUBPIXEL_DELTA_TIME;
const GOOMBA_KILL_TIME = 2;
const GOOMBA_IGNORE_DAMAGE_TIME = 200;

export enum GoombaState {
  NORMAL,
  DEAD,
  DEAD_BOUNCE,
}

enum AnimationState {
  IDLE,
  WALK,
  RUN,
  JUMP,
  FALL
}

export class Goomba extends CharacterEnemy {
  private _currentState = GoombaState.NORMAL;
  private animator = new Animator();
  private ignoreDamageTimer = 0;
  private killTimer = 0;

  public get isDead(): boolean {
    return this._currentState === GoombaState.DEAD || this._currentState === GoombaState.DEAD_BOUNCE;
  }

  constructor(world: World) {
    super("Goomba", world);
  }

  public async start(): Promise<void> {
    await this.startCharacter("/assets/platformer/character-oobi.glb");
    this.velocity.x = this.dir * GOOMBA_X_SPEED;

    this.mesh.rotation.y = Math.PI / 4;
    this.animator.initialize(this.mesh);
    const model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oobi.glb");
    this.animator.setAnimations({
      [AnimationState.IDLE]: model.animations[1],
      [AnimationState.WALK]: model.animations[2],
      [AnimationState.RUN]: model.animations[3],
      [AnimationState.JUMP]: model.animations[4],
      [AnimationState.FALL]: model.animations[5],
    });
  }

  public update(deltaTime: number): void {
    this.animator.update(deltaTime);
  }

  private animationCode(): void {
    if (this._currentState === GoombaState.DEAD) {
      this.animator.playAnimation(AnimationState.FALL, 0.1);
    } else {
      this.animator.playAnimation(AnimationState.WALK, 0.3);
    }
    if (this.dir !== 0) {
      this.transform.scale.x = this.dir * Math.abs(this.transform.scale.x);
    }
    if (this._currentState === GoombaState.DEAD_BOUNCE) {
      this.transform.rotation.x += 0.1;
    }
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    if (!this.isCameraVisible()) {
      if (this._currentState === GoombaState.DEAD_BOUNCE) {
        this.destroy();
      }
      return;
    }
    if (!this.controller) return;

    switch (this._currentState) {
      case GoombaState.NORMAL: {
        this.velocity.x = GOOMBA_X_SPEED * this.dir;
        this.applyGravity();
        this.moveAndCheckWalls();
        break;
      }
      case GoombaState.DEAD: {
        if (this.killTimer > 0) {
          this.killTimer -= fixedDeltaTime;
        } else {
          this.destroy();
        }
        break;
      }
      case GoombaState.DEAD_BOUNCE: {
        this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL, -OBJECT_MAX_FALL);
        this.transform.position.x += this.velocity.x;
        this.transform.position.y += this.velocity.y;
        break;
      }
    }
    this.animationCode();
  }

  public setState(state: GoombaState): void {
    switch (state) {
      case GoombaState.DEAD: {
        if (this.ignoreDamageTimer > 0) return;

        eventBus.emit("enemy:killed", this.transform.position);
        AudioManager.getInstance().playEnemyKill();

        const scorePopup = new ScorePopup(ScoreType.Score100, this.world);
        scorePopup.transform.position.copy(this.transform.position);
        this.world.addGameObject(scorePopup);
        this.killTimer = GOOMBA_KILL_TIME;
        this.world.physics.addDeferedCall(() => {
          this.collider?.setEnabled(false);
        });
        this.mesh.scale.y = 0.5;
        this.mesh.position.y -= 0.25;
        break;
      }
      case GoombaState.DEAD_BOUNCE: {
        if (this.ignoreDamageTimer > 0) return;
        if (this._currentState == GoombaState.DEAD)
          return;

        eventBus.emit("enemy:killed", this.transform.position);
        AudioManager.getInstance().playEnemyKill();

        const scorePopup = new ScorePopup(ScoreType.Score100, this.world);
        scorePopup.transform.position.copy(this.transform.position);
        this.world.addGameObject(scorePopup);
        this.velocity.y = OBJECT_DEAD_BOUNCE;
        this.velocity.x = OBJECT_DEAD_X_VEL * this.dir;
        this.world.physics.addDeferedCall(() => {
          this.collider?.setEnabled(false);
        });
        break;
      }
      default: break;
    }
    this._currentState = state;
  }

  public deadBounce(dir: number): void {
    this.dir = dir;
    this.setState(GoombaState.DEAD_BOUNCE);
  }

  public onHit(): void {
    this.setState(GoombaState.DEAD);
  }
}
