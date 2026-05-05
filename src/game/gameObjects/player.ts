import { clampf, GameObject, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { Coin } from "./coin";
import { Brick } from "./brick";
import { GroundOneWay } from "./oneway";
import { MAX_DELTA_TIME, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { instance } from "three/tsl";
import { Goomba } from "./goomba";
import { Animator } from "@/engine/animator";
import { Koopa } from "./koopa";
import { QuestionBlock } from "./questionBlock";


const MULTIPLIER = 1;

const MINIMUM_WALK_VELOCITY = 0x00098 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;
const WALKING_ACCELERATION = 0x00098 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;
const RUNNING_ACCELERATION = 0x000e4 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;

const MAXIMUM_WALK_SPEED = 0x01800 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;
const MAXIMUM_RUNNING_SPEED = 0x02800 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;
const MAXIMUM_POWER_SPEED = 0x03800 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;

const RELEASE_DECELERATION = 0x000d0 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;
const SKIDDING_DECELERATION = 0x001a0 * SUBSUBSUBPIXEL_DELTA_TIME * MULTIPLIER;

const RUN_TIME_BEFORE_WALK = 10.0 * MAX_DELTA_TIME;

const JUMP_INIT_VEL = 0x03800 * SUBSUBSUBPIXEL_DELTA_TIME;
const JUMP_HELD_GRAVITY = 0x00100 * SUBSUBSUBPIXEL_DELTA_TIME;
const JUMP_GRAVITY = 0x00500 * SUBSUBSUBPIXEL_DELTA_TIME;

const JUMP_HANG = 0x02000 * SUBSUBSUBPIXEL_DELTA_TIME;

const MAX_FALL_SPEED = 0x04000 * SUBSUBSUBPIXEL_DELTA_TIME;
const MAX_TAILWAG_FALL_SPDED = 0x01000 * SUBSUBSUBPIXEL_DELTA_TIME;

const FLY_Y_VELOCITY = -0x01800 * SUBSUBSUBPIXEL_DELTA_TIME;
const TELEPORT_Y_VELOCITY = 0x00b00 * SUBSUBSUBPIXEL_DELTA_TIME;

const ENEMY_BOUNCE = 0x04000 * SUBSUBSUBPIXEL_DELTA_TIME;
enum PlayerState {
  NORMAL,
  POWER_UP,
  DEAD,
}

enum AnimationState {
  IDLE,
  WALK,
  RUN,
  JUMP,
  FALL
}

export class Player extends GameObject {


  // Constants
  readonly keyLeft = "KeyA";
  readonly keyRight = "KeyD";
  readonly keyJump = "Space";
  readonly keyRun = "KeyJ";

  // Components
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;

  private velocity = new THREE.Vector3();
  private mesh: THREE.Object3D = new THREE.Object3D();

  private inputVector = new THREE.Vector3(0, 0, 0);
  private running = false;
  private jumped = false;
  private runBeforeWalkTimer = 0.0;
  private accel = new THREE.Vector2();
  private _currentState = PlayerState.NORMAL;
  
  private animator : Animator = new Animator();

  get currentState() {
    return this._currentState;
  }
  set currentState(state: PlayerState) {
    this._currentState = state;
    switch (this._currentState){

    }
  }

  readonly shapeHeight = 1.0;

  get bottom() {
    return this.transform.position.y - this.shapeHeight / 2.0;
  }

  get isGrounded(): boolean {
    return this.controller.computedGrounded();
  }

  constructor(world : World) {
    super(
      "Player",
      world
    );
  }

  public async start(): Promise<void> {
    super.start();

    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      new THREE.BoxGeometry(0.5, this.shapeHeight, 0.5)
    );
    this.controller = controller;
    this.collider = collider;

    const model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oopi.glb");
    model.scene.position.set(0, -0.5, 0);
    model.scene.rotation.y = Math.PI / 4;
    this.mesh = this.transform.add(model.scene);
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
      // Mesh will be cleaned by the scene's cleanup.
    }
    catch (error) {
      console.error("Error during player destruction:", error);
    }
  }

  public update(deltaTime: number): void {
    this.inputVector.set(0, 0, 0);
    if (Global.input.isKeyDown(this.keyLeft)) {
      this.inputVector.x += -1;
    }
    if (Global.input.isKeyDown(this.keyRight)) {
      this.inputVector.x += 1;
    }
    if (Global.input.isKeyReleased(this.keyRun)) {
      this.runBeforeWalkTimer = RUN_TIME_BEFORE_WALK;
    }
    this.running = Global.input.isKeyDown(this.keyRun);

    if (Global.input.isKeyPressed(this.keyJump)) {
      this.jumped = true;
    }
    this.animator.update(deltaTime);
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    switch (this.currentState) {
      case PlayerState.NORMAL: this._normalState(fixedDeltaTime); break;
    }
    this.animationCode(fixedDeltaTime);
  }

  private animationCode(fixedDeltaTime: number): void {
    if (!this.isGrounded) {
      if (this.velocity.y > 0) {
        this.animator.playAnimation(AnimationState.JUMP, 0.1);
      }
      else {
        this.animator.playAnimation(AnimationState.FALL, 0.1);
      }
    }
    else {
      if (this.inputVector.x === 0) {
        this.animator.playAnimation(AnimationState.IDLE, 0.3);
      }
      else if (this.running) {
        this.animator.playAnimation(AnimationState.RUN, 0.3);
      }
      else {
        this.animator.playAnimation(AnimationState.WALK, 0.3);
      }
    }
  }

  private _normalState(fixedDeltaTime: number): void {
    
    this.accel.x = 0.0;
    this.accel.x =
      this.inputVector.x *
      (this.running ? RUNNING_ACCELERATION : WALKING_ACCELERATION);

    if (this.accel.x !== 0.0) {
      if (this.velocity.x === 0.0)
        this.accel.x = Math.sign(this.accel.x) * MINIMUM_WALK_VELOCITY;
    }

    let skidding = false;
    if (this.accel.x === 0.0) {
      this.velocity.x = 
        moveTowards(this.velocity.x, 0, RELEASE_DECELERATION);
    } 
    else if (
      Math.sign(this.accel.x) !== Math.sign(this.velocity.x) &&
      this.velocity.x !== 0
    ) {
      if (this.isGrounded) 
        skidding = true;
      
      this.velocity.x = 
        moveTowards(this.velocity.x, 0, SKIDDING_DECELERATION);
    }

    if (this.runBeforeWalkTimer > 0) 
      this.runBeforeWalkTimer -= fixedDeltaTime;

    if (
      this.running ||
      (Math.abs(this.velocity.x) > MAXIMUM_WALK_SPEED + WALKING_ACCELERATION && this.runBeforeWalkTimer > 0)
    ) {
      this.velocity.x = 
        clampf(this.velocity.x, -MAXIMUM_RUNNING_SPEED, MAXIMUM_RUNNING_SPEED);
    } 
    else {
      this.velocity.x = 
        clampf(this.velocity.x, -MAXIMUM_WALK_SPEED, MAXIMUM_WALK_SPEED);
    }

    // Y Movement
    let gravity = 0.0;
    if (!this.isGrounded) {
      if (Global.input.isKeyDown(this.keyJump) && this.velocity.y <= JUMP_HANG) 
        gravity = -JUMP_HELD_GRAVITY;
      else
        gravity = -JUMP_GRAVITY;
    }
    this.accel.y = gravity;

    
    if (this.jumped && this.isGrounded) {
      let initVel = JUMP_INIT_VEL;
      let absVelX = Math.abs(this.velocity.x);
      if (absVelX < MAXIMUM_WALK_SPEED)
        initVel += 0x00200 * SUBSUBSUBPIXEL_DELTA_TIME;
      else if (absVelX < MAXIMUM_RUNNING_SPEED)
        initVel += 0x00400 * SUBSUBSUBPIXEL_DELTA_TIME;
      else if (absVelX < MAXIMUM_POWER_SPEED)
        initVel += 0x00800 * SUBSUBSUBPIXEL_DELTA_TIME;

      this.accel.y = initVel;
      this.jumped = false;
    }

    this.velocity.x += this.accel.x;
    this.velocity.y += this.accel.y;

    this.velocity.y = Math.max(this.velocity.y, -MAX_FALL_SPEED);

    this.velocity.z = 0;

    if (this.velocity.x !== 0) {
      this.mesh.scale.x = Math.sign(this.velocity.x) * Math.abs(this.mesh.scale.x);
    }

    const corrected = PhysicsWorld.moveAndSlide(
      this.controller, 
      this.collider, 
      this.transform, 
      this.velocity, 
      1, 
      (collider) => this.canCollideWith(collider)
    );

    if (this.isGrounded) {
      this.velocity.y = 0;
    } 
    else if (this.velocity.y > 0 && corrected.y <= 0) {
      this.velocity.y = 0;
    }

    const t = this.collider.translation();
    // t.y += 0.75;
    this.world.physics.world.intersectionsWithShape(
      t, 
      this.collider.rotation(), 
      this.collider.shape,
      (handle) => {
        const other = this.world.physics.getGameObjectFromCollider(handle);
        if (other)
          this.onIntersection(other);
        return false;
      }
    );

    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const collision = this.controller.computedCollision(i);
      if (!collision) continue;
      if (!collision.collider) continue;
      this.onControllerEnter(collision);
    }
  }

  private onIntersection(other: GameObject): void {
    if (other instanceof Coin) {
      this.world.removeGameObject(other);
    }
  }

  private onControllerEnter(collision : RAPIER.CharacterCollision): void {
    if (!collision.collider) return;
    const other = this.world.physics.getGameObjectFromCollider(collision.collider);
    if (other instanceof Brick) {
      if (collision.normal1.y < -0.5) {
        this.velocity.y = 0;
        other.onHit();
      }
    }
    else if (other instanceof Goomba) {
      console.log("Collided with Goomba ", this.collider);
      if (collision.normal1.y > 0.5 || 
        (collision.collider.translation().y + collision.collider.halfHeight() / 2
          < this.transform.position.y)
      ) {
        this.velocity.y = ENEMY_BOUNCE;
        other.onHit();
      }
    }
    else if (other instanceof Koopa) {
      if (collision.normal1.y > 0.5) {
        this.velocity.y = ENEMY_BOUNCE;
        other.onHit(-Math.sign(collision.collider.translation().x - this.collider.translation().x));
      }
    }
    else if (other instanceof QuestionBlock) {
      if (collision.normal1.y < -0.5) {
        this.velocity.y = 0;
        other.Hit(-Math.sign(collision.collider.translation().x - this.collider.translation().x));
      }
    }
    else if (other instanceof Coin) {
      other.destroy();
    }
  }

  private canCollideWith(collider: RAPIER.Collider): boolean {
    const other = this.world.physics.getGameObjectFromCollider(collider);
    if (other instanceof GroundOneWay) {
      const playerBottom = this.bottom;
      const groundTop = other.top;
      if (playerBottom <= groundTop + 0.05) {
        return false;
      }
    }
    return true;
  }
}
