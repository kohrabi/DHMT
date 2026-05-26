import { GameObject, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { OBJECT_DEAD_BOUNCE, OBJECT_DEAD_X_VEL, OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { CharacterEnemy } from "@/game/common/characterEnemy";
import { Animator } from "@/engine/animator";
import { eventBus } from "@/engine/eventBus";
import { AudioManager } from "@/game/audio/audioManager";
import { Ground } from "./ground";
import { GroundOneWay } from "./oneway";
import { Goomba } from "./goomba";
import { Brick } from "./brick";
import { QuestionBlock } from "./questionBlock";
import { ScorePopup, ScoreType } from "./scorePopup";

const GREEN_KOOPA_X_SPEED = 0x00800 * SUBSUBSUBPIXEL_DELTA_TIME;
const GREEN_KOOPA_SHELL_X_SPEED = 0x02700 * SUBSUBSUBPIXEL_DELTA_TIME;
const GREEN_KOOPA_KILL_TIME = 500;
const GREEN_KOOPA_SPAWN_TIME = 0xff * 1000.0 / 60.0;
const KOOPA_RESPAWNING_TIME = 2000;
const KOOPA_IGNORE_DAMAGE_TIME = 200;

enum KoopaState {
  NORMAL,
  IN_SHELL,
  RESPAWNING,
  DEAD_BOUNCE
}

enum AnimationState {
  IDLE,
  WALK,
  RUN,
  JUMP,
  FALL
}

export class Koopa extends CharacterEnemy {
  private readonly normalColliderHeight = 1.0;
  private readonly shellColliderHeight = 0.5;

  private flipCollider: RAPIER.Collider | null = null;
  private colliderHeight = this.normalColliderHeight;

  private currentState = KoopaState.NORMAL;
  private animator = new Animator();
  private ignoreDamageTimer = 0;
  private killTimer = 0;
  private respawnTimer = 0;

  get isDead() {
    return this.currentState === KoopaState.DEAD_BOUNCE;
  }

  get isInShell() {
    return this.currentState === KoopaState.IN_SHELL;
  }

  get vel(): THREE.Vector3 {
    return this.velocity;
  }

  public setDir(value: number) {
    this.dir = value;
  }

  constructor(world: World, private readonly isRed = true) {
    super("Koopa", world);
  }

  public async start(): Promise<void> {
    await this.startCharacter(
      this.isRed ? "/assets/platformer/character-oodi.glb" : "/assets/platformer/character-ooli.glb",
    );

    this.flipCollider = this.world.physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.125, 0.125, 0.125)
        .setTranslation(
          this.transform.position.x + 0.5 * this.dir,
          this.transform.position.y - 0.5,
          this.transform.position.z,
        )
        .setSensor(true),
    );

    this.mesh.rotation.y = Math.PI / 4;
    this.animator.initialize(this.mesh);

    const model = await this.world.gameScene.content.loadGLTF(
      this.isRed ? "/assets/platformer/character-oodi.glb" : "/assets/platformer/character-ooli.glb",
    );
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
    if (this.currentState === KoopaState.DEAD_BOUNCE) {
      this.animator.playAnimation(AnimationState.FALL, 0.1);
    } else {
      this.animator.playAnimation(AnimationState.WALK, 0.3);
    }
    if (this.dir !== 0) {
      this.transform.scale.x = this.dir * Math.abs(this.transform.scale.x);
    }

    if (this.currentState === KoopaState.IN_SHELL) {
      this.transform.scale.y = 0.5;
      this.transform.position.y -= 0.25;
      if (this.velocity.x !== 0)
        this.transform.rotation.y += 0.5;
    }

    if (this.currentState === KoopaState.DEAD_BOUNCE) {
      this.transform.rotation.x += 0.1;
    }
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    if (!this.isCameraVisible()) {
      if (this.currentState === KoopaState.DEAD_BOUNCE) {
        this.destroy();
      }
      return;
    }
    if (!this.controller) return;

    if (this.ignoreDamageTimer > 0) {
      this.ignoreDamageTimer -= fixedDeltaTime;
    }

    this.applyGravity(fixedDeltaTime);
    if (this.currentState === KoopaState.IN_SHELL) {
      this.velocity.y *= 0.85;
    }

    switch (this.currentState) {
      case KoopaState.NORMAL: {
        if (this.isRed && this.flipCollider) {
          let shouldFlip = true;
          this.flipCollider.setTranslation({
            x: this.transform.position.x + 0.5 * this.dir,
            y: this.transform.position.y - 0.5,
            z: this.transform.position.z,
          });
          this.world.physics.world.intersectionsWithShape(
            this.flipCollider.translation(),
            this.flipCollider.rotation(),
            this.flipCollider.shape,
            () => {
              shouldFlip = false;
              return false;
            },
            RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
          );
          if (shouldFlip) {
            this.dir *= -1;
          }
        }
        this.velocity.x = GREEN_KOOPA_X_SPEED * this.dir;
        break;
      }
      case KoopaState.IN_SHELL: {
        if (this.velocity.x == 0) {
          if (this.respawnTimer > 0) this.respawnTimer -= fixedDeltaTime;
          else {
            this.respawnTimer = KOOPA_RESPAWNING_TIME;
            this.currentState = KoopaState.RESPAWNING;
          }
        }
        this.velocity.x = GREEN_KOOPA_SHELL_X_SPEED * this.dir;
        break;
      }
      case KoopaState.DEAD_BOUNCE: {
        if (this.collider) this.collider.setEnabled(false);
        this.velocity.y -= OBJECT_FALL * fixedDeltaTime;
        this.velocity.y = Math.max(this.velocity.y, -OBJECT_MAX_FALL);
        this.transform.position.x += this.velocity.x;
        this.transform.position.y += this.velocity.y;
        break;
      }
    }

    if (this.currentState !== KoopaState.DEAD_BOUNCE) {
      this.velocity.z = 0;
      const moveDt = this.world.timer.timescale === 0 ? 0 : 1;
      PhysicsWorld.moveAndSlide(
        this.controller,
        this.collider!,
        this.transform,
        this.velocity,
        moveDt,
      );
      for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
        const collision = this.controller.computedCollision(i);
        if (!collision) continue;
        if (!collision.collider) continue;
        const go = this.world.physics.getGameObjectFromCollider(collision.collider);
        if ((go instanceof Ground || go instanceof GroundOneWay) && Math.abs(collision.normal1.x) > 0.5) {
          this.dir *= -1;
        } else if (go) {
          this.onColliderEnter(collision, go);
        }
      }
    }

    this.animationCode();
  }

  private setState(newState: KoopaState): void {
    switch (newState) {
      case KoopaState.NORMAL:
        this.rebuildCollider(this.normalColliderHeight);
        break;
      case KoopaState.DEAD_BOUNCE: {
        if (this.ignoreDamageTimer > 0) return;

        eventBus.emit("enemy:killed", this.transform.position);
        AudioManager.getInstance().playEnemyKill();

        this.velocity.y = OBJECT_DEAD_BOUNCE;
        this.velocity.x = OBJECT_DEAD_X_VEL * this.dir;
        this.world.physics.addDeferedCall(() => {
          this.collider?.setEnabled(false);
        });

        const scorePopup = new ScorePopup(ScoreType.Score100, this.world);
        scorePopup.transform.position.copy(this.transform.position);
        this.world.addGameObject(scorePopup);
        break;
      }
      case KoopaState.IN_SHELL:
        this.rebuildCollider(this.shellColliderHeight);
        break;
      default:
        break;
    }
    this.currentState = newState;
  }

  private rebuildCollider(newHeight: number): void {
    if (!this.collider || this.colliderHeight === newHeight) return;

    const oldHeight = this.colliderHeight;
    this.colliderHeight = newHeight;

    const current = this.collider.translation();
    const yOffset = (oldHeight - newHeight) * 0.5;
    const shape = RAPIER.ColliderDesc.cuboid(0.25, newHeight * 0.5, 0.25)
      .setTranslation(current.x, current.y - yOffset, current.z)
      .setRotation(this.collider.rotation());

    const newCollider = this.world.physics.world.createCollider(shape);
    this.world.physics.registerCollider(newCollider, this);
    this.world.physics.removeCollider(this.collider);
    this.collider = newCollider;
    this.mesh.translateY(0.5);

    this.transform.position.set(current.x, current.y - yOffset, current.z);
  }

  public deadBounce(dir: number): void {
    this.dir = dir;
    this.setState(KoopaState.DEAD_BOUNCE);
  }

  public onHit(dir: number): void {
    if (this.currentState != KoopaState.IN_SHELL) {
      this.velocity.x = 0;
      this.setState(KoopaState.IN_SHELL);
      this.respawnTimer = GREEN_KOOPA_SPAWN_TIME;
      this.dir = 0;
    } else {
      if (this.dir != 0)
        this.dir = 0;
      else {
        this.dir = -dir;
      }
    }
  }

  private onColliderEnter(collision: RAPIER.CharacterCollision, go: GameObject): void {
    if (this.currentState !== KoopaState.IN_SHELL) return;
    if (go instanceof Goomba) {
      go.deadBounce(-Math.sign(this.transform.position.x - go.transform.position.x));
    } else if (go instanceof Koopa) {
      go.setState(KoopaState.DEAD_BOUNCE);
    } else if (go instanceof Brick) {
      if (Math.abs(collision.normal1.x) > 0.5) {
        go.onHit();
        this.dir *= -1;
      }
    } else if (go instanceof QuestionBlock) {
      if (Math.abs(collision.normal1.x) > 0.5) {
        go.onHit(Math.sign(this.transform.position.x - go.transform.position.x));
        this.dir *= -1;
      }
    }
  }

  override onDestroy(): void {
    try {
      if (this.flipCollider) {
        this.world.physics.removeCollider(this.flipCollider);
        this.flipCollider = null;
      }
    } catch (error) {
      console.error("Error during koopa destruction:", error);
    }
    super.onDestroy();
  }
}
