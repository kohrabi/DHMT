import { clampf, GameObject, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";
import RAPIER from '@dimforge/rapier3d-compat';

const SUBPIXEL = 1.0 / 16.0;
// const MAX_DELTA_TIME = 60.0 / 1000.0;
const MAX_DELTA_TIME = 60.0 / 1000.0;
const SUBSUBSUBPIXEL = SUBPIXEL * SUBPIXEL * SUBPIXEL;
const SUBSUBSUBPIXEL_DELTA_TIME = SUBSUBSUBPIXEL * MAX_DELTA_TIME;

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
  private mesh : THREE.Object3D;

  private inputVector = new THREE.Vector3(0, 0, 0);
  private running = false;
  private jumped = false;
  private runBeforeWalkTimer = 0.0;
  private accel = new THREE.Vector2();

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

    this.controller = this.world.physics.world.createCharacterController(0);
    const shape = PhysicsWorld.getShape(new THREE.BoxGeometry(0.5, 1.0, 0.5))!;
    const collider = this.world.physics.world.createCollider(shape);
    collider.setTranslation({
      x: this.transform.position.x,
      y: this.transform.position.y,
      z: this.transform.position.z,
    });
    this.collider = collider;
    const model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oopi.glb");
    const modelMesh = model.scene.clone(true);
    this.mesh = this.transform.add(modelMesh);
    this.mesh.position.set(0, -0.4, 0);
    this.mesh.rotation.y = Math.PI / 4;
    this.mesh.add(modelMesh);
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
  }

  public fixedUpdate(fixedDeltaTime: number): void {
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

    this.moveAndSlide(1);
    if (this.isGrounded) {
      this.velocity.y = 0;
    }

    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const collision = this.controller.computedCollision(i);
      // console.log(collision);
    }

    // this.gameObject.world.physics.world.intersectionPairsWith(this.Collider, (otherCollider) => {
    //   console.log(otherCollider);
    // });
    // const physicsWorld = this.gameObject.world.physics.world;
    // const collider = this.Collider;
    // physicsWorld.intersectionsWithShape(
    //   collider.translation(), 
    //   collider.rotation(), 
    //   collider.shape, 
    //   (otherCollider : RAPIER.Collider) => {
    //     console.log("Intersecting with collider:", otherCollider);
    //     return false;
    //   }
    // );

    

  }

  public moveAndCollide(vel: THREE.Vector3): THREE.Vector3 {
    this.controller.computeColliderMovement(
      this.collider, 
      vel, 
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );

    let correctedMovement = this.controller.computedMovement();

    let t = this.collider.translation();
    this.collider.setTranslation({
      x: t.x + correctedMovement.x,
      y: t.y + correctedMovement.y,
      z: t.z + correctedMovement.z,
    });
    t = this.collider.translation();
    this.transform.position.set(t.x, t.y, t.z);

    return new THREE.Vector3(
      correctedMovement.x,
      correctedMovement.y,
      correctedMovement.z,
    );
  }

  public moveAndSlide(deltaTime: number): void {
    const correctedMovement = this.moveAndCollide(
      this.velocity.multiplyScalar(deltaTime),
    );
    this.velocity = correctedMovement;
  }
}
