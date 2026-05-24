import { clampf, GameObject, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import RAPIER from '@dimforge/rapier3d-compat';
import { MESH_BOX_EXPAND, OBJECT_DEAD_BOUNCE, OBJECT_DEAD_X_VEL, OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { Ground } from "./ground";
import { GroundOneWay } from "./oneway";
import { Animator } from "@/engine/animator";
import { Goomba, GoombaState } from "./goomba";
import { Brick } from "./brick";
import { QuestionBlock } from "./questionBlock";
import { ScorePopup, ScoreType } from "./scorePopup";

const GREEN_KOOPA_X_SPEED = 0x00800 * SUBSUBSUBPIXEL_DELTA_TIME;
const GREEN_KOOPA_SHELL_X_SPEED = 0x02700 * SUBSUBSUBPIXEL_DELTA_TIME;
const GREEN_KOOPA_KILL_TIME = 500;
const GREEN_KOOPA_SPAWN_TIME = 0xff * 1000.0 / 60.0;
const KOOPA_RESPAWNING_TIME = 2000;

const KOOPA_WING_HOP = 0x01000 * SUBSUBSUBPIXEL_DELTA_TIME;
const KOOPA_WING_BIG_HOP = 0x03000 * SUBSUBSUBPIXEL_DELTA_TIME;
const KOOPA_WING_ACTIVATE_TIME = 2400;
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

export class Koopa extends GameObject {


  readonly shapeHeight = 1.0;
  private readonly normalColliderHeight = 1.0;
  private readonly shellColliderHeight = 0.5;
  // Components
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;
  private flipCollider!: RAPIER.Collider;
  private shape = new THREE.BoxGeometry(0.5, this.shapeHeight, 0.5);
  private colliderHeight = this.normalColliderHeight;

  private velocity = new THREE.Vector3();
  private mesh: THREE.Object3D = new THREE.Object3D();
  private dir = -1;

  private currentState = KoopaState.NORMAL;
  private animator : Animator = new Animator();
  private ignoreDamageTimer = 0;
  private killTimer = 0;
  private respawnTimer = 0;
  private meshBox?: THREE.Box3;
  private meshSphere: THREE.Sphere = new THREE.Sphere();

  get isDead() {
    return this.currentState === KoopaState.DEAD_BOUNCE;
  }

  get IsInShell() {
    return this.currentState === KoopaState.IN_SHELL;
  }

  public setDir(value: number) {
    this.dir = value;
  }
  
  get Velocity() {
    return this.velocity;
  }

  constructor(world : World, private readonly isRed = true) {
    super(
      "Koopa",
      world
    );
  }

  public async start(): Promise<void> {
    await super.start();
    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      this.shape
    );
    this.controller = controller;
    this.collider = collider;

    this.flipCollider = this.world.physics.world.createCollider(
      PhysicsWorld.getBoxShape(
          this.transform, 
          new THREE.Vector3(0.25, 0.25, 0.25)
        )
        .setSensor(true)
    );
    // this.world.physics.registerCollider(this.flipCollider, this);

    let model;
    if (this.isRed) {
      model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oodi.glb");
    }
    else {
      model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-ooli.glb");
    }
    const mesh = SkeletonUtils.clone(model.scene);
    mesh.position.set(0, -0.5, 0);
    mesh.rotation.y = Math.PI / 4;
    this.mesh = mesh;
    this.transform.add(this.mesh);
    this.meshBox = new THREE.Box3().setFromObject(this.mesh);
    this.meshBox.expandByScalar(MESH_BOX_EXPAND);
    this.meshBox.getBoundingSphere(this.meshSphere);

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
      this.world.physics.removeCollider(this.flipCollider);
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
      console.error("Error during koopa destruction:", error);
    }
  }

  public update(deltaTime: number): void {
    this.animator.update(deltaTime);
  }

  private animationCode(fixedDeltaTime: number): void {
    if (this.currentState === KoopaState.DEAD_BOUNCE) {
      this.animator.playAnimation(AnimationState.FALL, 0.1);
    }
    else {
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
    if (this.meshBox && !this.world.isCameraVisible(this.transform, this.meshSphere)) {
      if (this.currentState === KoopaState.DEAD_BOUNCE) {
        this.destroy();
      }
      return;
    }
    if (!this.controller) return;

    if (this.ignoreDamageTimer > 0) {
      this.ignoreDamageTimer -= fixedDeltaTime;
    }

    if (!this.controller.computedGrounded()) {
      this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL, -OBJECT_MAX_FALL);
      if (this.currentState === KoopaState.IN_SHELL) {
        this.velocity.y *= 0.85
      }
    }
    
    switch (this.currentState)
    {
      case KoopaState.NORMAL:
      {
        // Check for wall collisions to flip direction
        if (this.isRed) {
          let ShouldFlip = true;
          this.flipCollider.setTranslation({
            x: this.transform.position.x + 0.5 * this.dir,
            y: this.transform.position.y - 0.5,
            z: this.transform.position.z
          });
          this.world.physics.world.intersectionsWithShape(
            this.flipCollider.translation(),
            this.flipCollider.rotation(),
            this.flipCollider.shape,
            (otherCollider) => {
              ShouldFlip = false;
              return false;
            },
            RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC
          )
          if (ShouldFlip) {
            this.dir *= -1;
          }
        }

        this.velocity.x = GREEN_KOOPA_X_SPEED * this.dir;
        break;
      }
      case KoopaState.IN_SHELL:
      {
        if (this.velocity.x == 0)
        {
            if (this.respawnTimer > 0) this.respawnTimer -= fixedDeltaTime;
            else
            {
                this.respawnTimer = KOOPA_RESPAWNING_TIME;
                this.currentState = KoopaState.RESPAWNING;
            }
        }
        this.velocity.x = GREEN_KOOPA_SHELL_X_SPEED * this.dir;
        break;
      }
      
      case KoopaState.DEAD_BOUNCE: 
      {
        this.collider.setEnabled(false);
        this.velocity.y -= OBJECT_FALL;
        this.velocity.y = Math.max(this.velocity.y, -OBJECT_MAX_FALL);

        this.transform.position.x += this.velocity.x;
        this.transform.position.y += this.velocity.y;
        break;
      }
    // case KoopaState.RESPAWNING:
    // {
    //     if (this.respawnTimer > 0) this.respawnTimer -= fixedDeltaTime;
    //     else
    //     {
    //         DetachHold();
    //         this.dir = -1;
    //         insideWallCast.SetBoundingBox(this.transform.position, new THREE.Vector2(5.0f, 5.0f));
    //         insideWallCast.CheckOverlap(this.world.gameObjects);
    //         if (insideWallCast.collision.size() > 0)
    //         {
    //             SetState(KOOPA_STATE_DEAD_BOUNCE);
    //         }
    //         else
    //         {
    //             respawnTimer = KOOPA_RESPAWNING_TIME;
    //             state = KOOPA_STATE_NORMAL;
    //         }
    //     }
    // }
    // break;
    }

    if (this.currentState !== KoopaState.DEAD_BOUNCE) {
      this.velocity.z = 0;
      PhysicsWorld.moveAndSlide(
        this.controller,
        this.collider,
        this.transform,
        this.velocity,
        (this.world.timer.timescale == 1) ? 1 : 0,
      )
      for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
        const collision = this.controller.computedCollision(i);
        if (!collision) continue;
        const go = this.world.physics.getGameObjectFromCollider(collision.collider!)!;
        if ((go instanceof Ground || go instanceof GroundOneWay) && Math.abs(collision.normal1.x) > 0.5) {
          this.dir *= -1;
        }
        else {
          this.onColliderEnter(collision, go as GameObject);
        }
        
      }
    }
      
    this.animationCode(fixedDeltaTime);
  }

  private setState(newState: KoopaState): void {
    switch (newState) {
    case KoopaState.NORMAL:
      {
        this.rebuildCollider(this.normalColliderHeight);
        break;
      }
    case KoopaState.DEAD_BOUNCE:
    {
      if (this.ignoreDamageTimer > 0) return;
      this.velocity.y = OBJECT_DEAD_BOUNCE;
      this.velocity.x = OBJECT_DEAD_X_VEL * this.dir;
      this.world.physics.addDeferedCall(() => {
        this.collider.setEnabled(false);
      });
      
      const scorePopup = new ScorePopup(ScoreType.Score100, this.world);
      scorePopup.transform.position.copy(this.transform.position);
      this.world.addGameObject(scorePopup);
      break;
    }
    case KoopaState.IN_SHELL:
    {
      console.log("Koopa in shell");
      this.rebuildCollider(this.shellColliderHeight);
    }
    default: break;
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

  public deadBounce(dir : number): void {
    this.dir = dir;
    this.setState(KoopaState.DEAD_BOUNCE);
  }

  public onHit(dir : number) : void {
    if (this.currentState != KoopaState.IN_SHELL)
    {
        this.velocity.x = 0;
        this.setState(KoopaState.IN_SHELL);
        this.respawnTimer = GREEN_KOOPA_SPAWN_TIME;
        this.dir = 0;
    }
    else
    {
      console.log(dir);
        if (this.dir != 0)
          this.dir = 0;
        else
          this.dir = -dir;
    }
  }

  private onColliderEnter(collision : RAPIER.CharacterCollision, go : GameObject) : void {
    if (this.currentState !== KoopaState.IN_SHELL) return;
    if (go instanceof Goomba) {
      go.deadBounce(-Math.sign(this.transform.position.x - go.transform.position.x));
    }
    else if (go instanceof Koopa) {
      go.setState(KoopaState.DEAD_BOUNCE);
    }
    else if (go instanceof Brick) {
      if (Math.abs(collision.normal1.x) > 0.5) {
        go.onHit();
        this.dir *= -1;
      }
    }
    else if (go instanceof QuestionBlock) {
      if (Math.abs(collision.normal1.x) > 0.5) {
        go.Hit(Math.sign(this.transform.position.x - go.transform.position.x));
        this.dir *= -1;
      }
    }
  }
}
