import { clampf, GameObject, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import RAPIER from '@dimforge/rapier3d-compat';
import { OBJECT_DEAD_BOUNCE, OBJECT_DEAD_X_VEL, OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { Animator } from "@/engine/animator";

const GOOMBA_X_SPEED =  0x00A00 * SUBSUBSUBPIXEL_DELTA_TIME;
const GOOMBA_KILL_TIME = 2;
const GOOMA_IGNORE_DAMAGE_TIME = 200;

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

export class Goomba extends GameObject {

  // Components
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;

  private velocity = new THREE.Vector3();
  private mesh: THREE.Object3D = new THREE.Object3D();

  readonly shapeHeight = 1.0;
  private _currentState = GoombaState.NORMAL;
  private dir = -1;
  
  private animator : Animator = new Animator();
  private ignoreDamageTimer = 0;
  private killTimer = 0;

  constructor(world : World) {
    super(
      "Goomba",
      world
    );
    this.velocity.x = this.dir * GOOMBA_X_SPEED;
  }

  public async start(): Promise<void> {
    super.start();
    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      new THREE.BoxGeometry(0.5, this.shapeHeight, 0.5)
    );
    this.controller = controller;
    this.collider = collider;
    
    const model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oobi.glb");
    const mesh = SkeletonUtils.clone(model.scene);
    mesh.position.set(0, -0.5, 0);
    mesh.rotation.y = Math.PI / 4;
    this.mesh = this.transform.add(mesh);
    this.animator.initialize(this.mesh);
    this.animator.setAnimations({
      [AnimationState.IDLE]: model.animations[1],
      [AnimationState.WALK]: model.animations[2],
      [AnimationState.RUN]: model.animations[3],
      [AnimationState.JUMP]: model.animations[4],
      [AnimationState.FALL]: model.animations[5],
    });
  }

  public onDestroy(): void {
    super.onDestroy();
    try {
      this.world.physics.removeCharacterController(this.controller);
      this.world.physics.removeCollider(this.collider);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    } catch (error) {
      console.error("Error during goomba destruction:", error);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    this.animator.update(deltaTime);
  }

  private animationCode(fixedDeltaTime: number): void {
    if (this._currentState === GoombaState.DEAD) {
      this.animator.playAnimation(AnimationState.FALL, 0.1);
    }
    else {
      this.animator.playAnimation(AnimationState.WALK, 0.3);
    }
    if (this.dir !== 0) {
      this.mesh.scale.x = this.dir * Math.abs(this.mesh.scale.x);
    }

    if (this._currentState === GoombaState.DEAD_BOUNCE) {
      this.mesh.rotation.x += 0.1;
    }
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    if (!this.controller) return;
    switch (this._currentState)
    {
      case GoombaState.NORMAL: {

        this.velocity.x = GOOMBA_X_SPEED * this.dir;
        if (!this.controller.computedGrounded()) {
          this.velocity.y -= OBJECT_FALL;
          this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL, -OBJECT_MAX_FALL);
        }
        this.velocity.z = 0;
        PhysicsWorld.moveAndSlide(
          this.controller,
          this.collider,
          this.transform,
          this.velocity,
          1,
        )

        for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
          const collision = this.controller.computedCollision(i);
          if (!collision) continue;
          if (Math.abs(collision.normal1.x) > 0.5) {
            this.dir *= -1;
          }
        }
        break;
      }
      case GoombaState.DEAD: {
        if (this.killTimer > 0) {
          this.killTimer -= fixedDeltaTime;
        }
        else {
          this.destroy();
        }
        break;
      }
      case GoombaState.DEAD_BOUNCE: {
        this.velocity.y -= OBJECT_FALL;
        this.velocity.y = Math.max(this.velocity.y, -OBJECT_MAX_FALL);

        this.transform.position.x += this.velocity.x;
        this.transform.position.y += this.velocity.y;
        if (this.transform.position.y < -10) {
          this.destroy();
        }
        break;
      }
      
    }
    this.animationCode(fixedDeltaTime);
  }

  public setState(state: GoombaState): void {
    
    switch (state)
    {
      case GoombaState.DEAD: {
        if (this.ignoreDamageTimer > 0) return;
        // game->GetCurrentScene()->AddObject(new CScorePopup(position.x, position.y, ScoreCombo));
        this.killTimer = GOOMBA_KILL_TIME;
        this.world.physics.addDeferedCall(() => {
          this.collider.setEnabled(false);
        });
        this.mesh.scale.y = 0.5;
        this.mesh.position.y -= 0.25;
        break;
      }
      case GoombaState.DEAD_BOUNCE: {
        if (this.ignoreDamageTimer > 0) return;
        if (this._currentState == GoombaState.DEAD)
            return;
        // game->GetCurrentScene()->AddObject(new CScorePopup(position.x, position.y, ScoreCombo));
        // layer = SortingLayer::CORPSE;
        this.velocity.y = OBJECT_DEAD_BOUNCE;
        this.velocity.x = OBJECT_DEAD_X_VEL * this.dir;
        this.world.physics.addDeferedCall(() => {
          this.collider.setEnabled(false);
        });
        break;
      }
      default: break;
    }
    this._currentState = state;
  }

  public deadBounce(dir : number) : void {
    this.dir = dir;
    this.setState(GoombaState.DEAD_BOUNCE);
  }

  public onHit() : void {
    this.setState(GoombaState.DEAD);
  }
}
