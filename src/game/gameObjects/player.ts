import { CharacterController, clampf, Component, moveTowards } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";

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

export class Player extends Component {
  private controller!: CharacterController;
  private inputVector = new THREE.Vector3(0, 0, 0);
  private running = false;
  private jumped = false;
  private runBeforeWalkTimer = 0.0;

  private accel = new THREE.Vector2();

  readonly keyLeft = "KeyA";
  readonly keyRight = "KeyD";
  readonly keyJump = "Space";
  readonly keyRun = "KeyJ";

  constructor() {
    super();
  }

  public start(): void {
    super.start();
    this.controller = this.gameObject.addComponent(
      new CharacterController(new THREE.CapsuleGeometry(0.5, 1, 4, 8)),
    )!;
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
      if (this.controller.velocity.x === 0.0)
        this.accel.x = Math.sign(this.accel.x) * MINIMUM_WALK_VELOCITY;
    }

    let skidding = false;
    if (this.accel.x === 0.0) {
      this.controller.velocity.x = 
        moveTowards(this.controller.velocity.x, 0, RELEASE_DECELERATION);
    } 
    else if (
      Math.sign(this.accel.x) !== Math.sign(this.controller.velocity.x) &&
      this.controller.velocity.x !== 0
    ) {
      if (this.controller.isGrounded) 
        skidding = true;
      
      this.controller.velocity.x = 
        moveTowards(this.controller.velocity.x, 0, SKIDDING_DECELERATION);
    }

    if (this.runBeforeWalkTimer > 0) 
      this.runBeforeWalkTimer -= fixedDeltaTime;

    if (
      this.running ||
      (Math.abs(this.controller.velocity.x) > MAXIMUM_WALK_SPEED + WALKING_ACCELERATION && this.runBeforeWalkTimer > 0)
    ) {
      this.controller.velocity.x = 
        clampf(this.controller.velocity.x, -MAXIMUM_RUNNING_SPEED, MAXIMUM_RUNNING_SPEED);
    } 
    else {
      this.controller.velocity.x = 
        clampf(this.controller.velocity.x, -MAXIMUM_WALK_SPEED, MAXIMUM_WALK_SPEED);
    }

    let gravity = 0.0;
    if (!this.controller.isGrounded) {
      if (Global.input.isKeyDown(this.keyJump) && this.controller.velocity.y <= JUMP_HANG) 
        gravity = -JUMP_HELD_GRAVITY;
      else
        gravity = -JUMP_GRAVITY;
    }
    this.accel.y = gravity;

    
    if (this.jumped && this.controller.isGrounded) {
      let initVel = JUMP_INIT_VEL;
      let absVelX = Math.abs(this.controller.velocity.x);
      if (absVelX < MAXIMUM_WALK_SPEED)
        initVel += 0x00200 * SUBSUBSUBPIXEL_DELTA_TIME;
      else if (absVelX < MAXIMUM_RUNNING_SPEED)
        initVel += 0x00400 * SUBSUBSUBPIXEL_DELTA_TIME;
      else if (absVelX < MAXIMUM_POWER_SPEED)
        initVel += 0x00800 * SUBSUBSUBPIXEL_DELTA_TIME;

      this.accel.y = initVel;
      this.jumped = false;
    }

    this.controller.velocity.x += this.accel.x;
    this.controller.velocity.y += this.accel.y;

    this.controller.velocity.y = Math.max(this.controller.velocity.y, -MAX_FALL_SPEED);

    console.log(this.controller.velocity.y, JUMP_HANG);
    this.controller.velocity.z = 0;

    this.controller.moveAndSlide(1);

  }
}
