import { clampf, enableShadows, GameObject, lerp, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";
import RAPIER from '@dimforge/rapier3d-compat';
import { Coin } from "./coin";
import { Brick } from "./brick";
import { GroundOneWay } from "./oneway";
import { MAX_DELTA_TIME, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { Goomba } from "./goomba";
import { Animator } from "@/engine/animator";
import { Koopa } from "./koopa";
import { QuestionBlock } from "./questionBlock";
import { spawnJumpingParticles, spawnLandingParticles, spawnRunningParticles, spawnWalkingParticles } from "./playerParticles";
import { Camera } from "./camera";
import { ScorePopup, ScoreType } from "./scorePopup";


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

const POWER_TIME = 8 / 60.0 * 1.0;
const POWER_REDUCE_TIME = 23 / 60.0;
const MAX_POWER_COUNT = 7;
const FLY_P_TIMER = 0x80 / 60.0;

const POWER_UP_ANIMATION_TIME = 0.7;
const KICK_ANIMATION_TIME = 0.5;

const DEAD_STAY_TIME = 1;
const DEAD_RESET_TIME = 1;

const INVINCIBLE_TIME = 1;
const WAG_TIME = 0x10 * 1 / 60.0;

const SPIN_TIME = 6 * 0.05;

const STAY_OUTRO_TIME = 1.0;
const SWITCH_LEVEL_TIME = 3.0;

const COMBO_TIME = 1.0;

enum PlayerState {
  NORMAL,
  POWER_UP,
  DEAD,
  TELEPORT,
  OUTRO,
  SIT
}

enum AnimationState {
  IDLE,
  WALK,
  RUN,
  JUMP,
  FALL,
  KICK
}

enum PowerUpState {
  SMALL,
  BIG,
  RACOON
}

export class Player extends GameObject {

  
  // Constants
  readonly DEBUG_INVINCIBLE = false;
  readonly keyLeft = "KeyA";
  readonly keyRight = "KeyD";
  readonly keyDown = "KeyS";
  readonly keyJump = "Space";
  readonly keyRun = "KeyJ";
  readonly bigScale = 1.5;

  readonly modelOffsetY = -0.5;

  readonly shapeHeight = 1.0;

  // Components
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;
  private camera!: Camera;

  private velocity = new THREE.Vector3();
  private mesh: THREE.Object3D = new THREE.Object3D();
  private _currentState = PlayerState.NORMAL;

  private inputVector = new THREE.Vector3(0, 0, 0);
  private running = false;
  private jumped = false;
  private runBeforeWalkTimer = 0.0;
  private accel = new THREE.Vector2();

  private powerUpStartTimer = 0.0;
  private invincibleTimer = 0.0;
  private powerUp = 0;
  private nextPowerUp = 0;
  private deadTimer = 0.0;

  private enterPipe = false;
  private beforeTeleportY = 0.0;

  private dir = 1;
  private skidding = false;

  private comboTimer = 0.0;
  private comboCounter = 0;
  private kickTimer = 0.0;
  private spinTimer = 0.0;
  private hitParticleTimer = 0.0;
  private deadJump = false;
  private isResetting = false
  private levelResetTimer = 0.0;

  private wasGrounded = false;
  private particleTimer = 0.0;

  private outroStayTimer = 0.0;
  private switchLevelTimer = 0.0;

  private animator : Animator = new Animator();

  public endLevel(): void {
    this.setCurrentState(PlayerState.OUTRO);
  }

  public kill(): void {
    if (this.currentState == PlayerState.DEAD || 
      this.currentState == PlayerState.POWER_UP || 
      this.currentState == PlayerState.TELEPORT ||
      this.currentState == PlayerState.OUTRO) 
      return;
    this.powerUp = PowerUpState.SMALL;
    this.mesh.position.y = this.modelOffsetY;
    this.transform.scale.set(1.0, 1.0, 1.0);
    this.setCurrentState(PlayerState.DEAD);
  }

  get currentState() {
    return this._currentState;
  }

  setCurrentState(state: PlayerState) {
    console.log("PLAYER: Transitioning to state", PlayerState[state]);
    switch (state) {
      case PlayerState.POWER_UP:
      {
        this.world.timer.timescale = 0.0;
        this.powerUpStartTimer = POWER_UP_ANIMATION_TIME
        break;
      }
      case PlayerState.DEAD:
      {
        if (this.DEBUG_INVINCIBLE)
            return;
        if (this.invincibleTimer > 0)
            return;
        if (this.powerUp != PowerUpState.SMALL)
        {
          state = (PlayerState.POWER_UP);
          this.nextPowerUp = PowerUpState.SMALL;
          // this.transform.position.y += 8.0;
          this.powerUpStartTimer = POWER_UP_ANIMATION_TIME;
          this.world.timer.timescale = 0.0;
        }
        else 
        {
          this.camera.isFollowingTarget = false;
          this.deadTimer = DEAD_STAY_TIME;
          this.velocity = new THREE.Vector3(0, 0, 0);
        }
        break;
      }
      case PlayerState.TELEPORT:
      {
        this.enterPipe = false;
        this.beforeTeleportY = this.transform.position.y;
        this.velocity.x = 0.0;
        break;
      }
      case PlayerState.OUTRO: 
      {
          // CGame* const game = CGame::GetInstance();
          // LPPLAYSCENE scene = dynamic_cast<LPPLAYSCENE>(game->GetCurrentScene());
          // ASSERT(scene != NULL, "HEY");
          // scene->SetStopTimer(true);
          this.velocity.x = 0.0; 
          this.velocity.y /= 2.0;
          this.outroStayTimer = STAY_OUTRO_TIME;
          // this.powerCounter = 0;
          this.skidding = false;
          this.kickTimer = 0.0;
          this.dir = 1;
          break;
      }   
    }
    this._currentState = state;
  }

  get bottom() {
    return this.transform.position.y - this.shapeHeight / 2.0;
  }

  get isGrounded(): boolean {
    return this.controller.computedGrounded();
  }

  public PowerUp() : void {
    this.nextPowerUp = PowerUpState.BIG;
    this.setCurrentState(PlayerState.POWER_UP);
    console.log("Power up!");
  }

  constructor(world : World) {
    super(
      "Player",
      world
    );
  }

  public async start(): Promise<void> {
    await super.start();

    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      new THREE.BoxGeometry(0.5, this.shapeHeight, 0.5)
    );
    this.controller = controller;
    this.collider = collider;

    this.camera = this.world.findGameObjectByName("Camera") as Camera;

    const model = await this.world.gameScene.content.loadGLTF("/assets/platformer/character-oopi.glb");
    model.scene.position.set(0, this.modelOffsetY, 0);
    model.scene.rotation.y = Math.PI / 4;
    this.mesh = model.scene;
    enableShadows(this.mesh);
    this.transform.add(model.scene);

    this.animator.initialize(this.mesh);
    console.log("Loaded player model and animations", model.animations);
    this.animator.setAnimations({
      [AnimationState.IDLE]: model.animations[1],
      [AnimationState.WALK]: model.animations[2],
      [AnimationState.RUN]: model.animations[3],
      [AnimationState.JUMP]: model.animations[4],
      [AnimationState.FALL]: model.animations[5],
      [AnimationState.KICK]: model.animations[21]
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
    if (this.currentState == PlayerState.DEAD || this.currentState == PlayerState.OUTRO) {
      this.animator.update(deltaTime);
      return;
    }
    this.inputVector.set(0, 0, 0);
    if (Global.input.isKeyDown(this.keyLeft)) {
      this.inputVector.x += -1;
      this.dir = -1;
    }
    if (Global.input.isKeyDown(this.keyRight)) {
      this.inputVector.x += 1;
      this.dir = 1;
    }
    if (Global.input.isKeyReleased(this.keyRun)) {
      this.runBeforeWalkTimer = RUN_TIME_BEFORE_WALK;
    }
    this.running = Global.input.isKeyDown(this.keyRun);

    if (Global.input.isKeyPressed(this.keyJump)) {
      this.jumped = true;
    }
    if (Global.input.isKeyDown("KeyI")) {
      this.world.timer.timescale = 0.5;
    }
    this.animator.update(deltaTime);
  }

  public fixedUpdate(fixedDeltaTime: number): void {

    
    if (this.kickTimer > 0) this.kickTimer -= fixedDeltaTime;
    if (this.invincibleTimer > 0) this.invincibleTimer -= fixedDeltaTime;
    if (this.spinTimer > 0) this.spinTimer -= fixedDeltaTime;
    if (this.hitParticleTimer > 0.0) this.hitParticleTimer -= fixedDeltaTime;
    if (this.particleTimer > 0.0) this.particleTimer -= fixedDeltaTime;

    if (this.comboTimer > 0) this.comboTimer -= fixedDeltaTime;
    else this.comboCounter = 0;

    switch (this.currentState) {
      case PlayerState.NORMAL: this._normalState(fixedDeltaTime); break; 
      case PlayerState.POWER_UP: this._powerupUpdate(fixedDeltaTime); break;
      case PlayerState.DEAD: 
      {
        const unscaledDt = this.world.timer.unscaledDelta;
        if (this.deadTimer > 0) this.deadTimer -= unscaledDt;
        else
        {
            if (!this.deadJump)
            {
                this.velocity.y = 30 * unscaledDt;
                this.deadJump = true;
            }
            this.transform.rotation.x += 0.1;
            this.velocity.y = this.velocity.y - JUMP_GRAVITY * 30 * unscaledDt;
            this.transform.position.y += this.velocity.y;
        }

        // Camera visible
        if (this.transform.position.y <= -3.0)
        {
            if (!this.isResetting)
            {
                this.isResetting = true;
                this.levelResetTimer = DEAD_RESET_TIME;
            }

            if (this.levelResetTimer > 0) this.levelResetTimer -= unscaledDt;
            else
            {
              console.log("Resetting level");
              this.world.timer.timescale = 1.0;
              Global.sceneManager.resetScene();
            }
        }
        break;
      }
      case PlayerState.SIT:
      {
        if (!Global.input.isKeyDown(this.keyDown))
            this.setCurrentState(PlayerState.NORMAL);
        this.velocity.x = moveTowards(this.velocity.x, 0, RELEASE_DECELERATION);
        this.velocity.y = Math.max(this.velocity.y - JUMP_GRAVITY, -MAX_FALL_SPEED);

        this.move();
        break;
      }
      case PlayerState.OUTRO:
      {
        if (this.outroStayTimer > 0.0)
        {
            this.outroStayTimer -= fixedDeltaTime;
            this.velocity.y = Math.max(this.velocity.y - JUMP_GRAVITY, -MAX_FALL_SPEED);
            
            this.move();

            this.switchLevelTimer = SWITCH_LEVEL_TIME;
        }
        else
        {
            if (this.switchLevelTimer > 0) this.switchLevelTimer -= fixedDeltaTime;
            else
            {
              Global.sceneManager.resetScene();
            }
            this.velocity = new THREE.Vector3(MAXIMUM_WALK_SPEED, 0.0, 0.0);
            this.move();
        }
        break;
      }
    }
    this.animationCode(fixedDeltaTime);

    const grounded = this.isGrounded;
    if (!this.wasGrounded && grounded) {
      spawnLandingParticles(this.world, this.transform.position);
    }
    this.wasGrounded = grounded;
  }

  private animationCode(fixedDeltaTime: number): void {
    if (this.currentState == PlayerState.POWER_UP) {
      const blink = 0.1;
      if (this.world.timer.unscaledElapsed % blink < blink / this.bigScale) {
        this.transform.scale.set(this.bigScale, this.bigScale, this.bigScale);
        this.mesh.position.y = this.modelOffsetY + (0.15);
      }
      else {
        this.transform.scale.set(1.0, 1.0, 1.0);
        this.mesh.position.y = this.modelOffsetY;
      }
    }
    else if (this.currentState == PlayerState.DEAD) {
      this.animator.playAnimation(AnimationState.IDLE, 0.3);
    }
    else {
      if (!this.isGrounded) {
        if (this.velocity.y > 0) {
          this.animator.playAnimation(AnimationState.JUMP, 0.1);
        }
        else {
          this.animator.playAnimation(AnimationState.FALL, 0.1);
        }
      }
      else {
        if (this.kickTimer > 0) {
          this.animator.playAnimation(AnimationState.KICK, 0);
        }
        else if (this.inputVector.x === 0) {
          this.animator.playAnimation(AnimationState.IDLE, 0.3);
        }
        else if (this.running) {
          this.animator.playAnimation(AnimationState.RUN, 0.3);
        }
        else {
          this.animator.playAnimation(AnimationState.WALK, 0.3);
        }
      }
      
      const scaleX = this.powerUp == PowerUpState.BIG ? this.bigScale : 1.0;
      
      let scale = this.transform.scale;
      let velSign =  Math.sign(this.dir);
      
      
      scale.x = lerp(Math.abs(scale.x), scaleX, 0.2);
      scale.y = lerp(Math.abs(scale.y), scaleX, 0.2);
      if (!this.isGrounded && Math.abs(this.velocity.y) > MAX_FALL_SPEED * 0.75) {
        scale.x = lerp(Math.abs(scale.x), scaleX * 0.7, Math.abs(this.velocity.x) / (MAXIMUM_RUNNING_SPEED));
        scale.y = lerp(Math.abs(scale.y), scaleX * 1.5, Math.abs(this.velocity.y) / (MAX_FALL_SPEED));
      }
      scale.x = Math.abs(scale.x) * Math.sign(velSign);
      this.transform.scale.set(scale.x, scale.y, scale.z);
    }
  }

  private move() {

    PhysicsWorld.moveAndSlide(
      this.controller, 
      this.collider, 
      this.transform, 
      this.velocity, 
      1, 
      (collider) => this.canCollideWith(collider)
    );

    this.world.physics.world.intersectionsWithShape(
      this.collider.translation(), 
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

  private _normalState(fixedDeltaTime: number): void {
    
    this.accel.x = 0.0;
    this.accel.x =
      this.inputVector.x *
      (this.running ? RUNNING_ACCELERATION : WALKING_ACCELERATION);

    if (this.accel.x !== 0.0) {
      if (this.velocity.x === 0.0)
        this.accel.x = Math.sign(this.accel.x) * MINIMUM_WALK_VELOCITY;
    }

    this.skidding = false;
    if (this.accel.x === 0.0) {
      this.velocity.x = 
        moveTowards(this.velocity.x, 0, RELEASE_DECELERATION);
    } 
    else if (
      Math.sign(this.accel.x) !== Math.sign(this.velocity.x) &&
      this.velocity.x !== 0
    ) {
      if (this.isGrounded) 
        this.skidding = true;
      
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

    if (this.isGrounded && Math.abs(this.velocity.x) > MINIMUM_WALK_VELOCITY) {
      if (this.particleTimer <= 0) {
        if (this.running) {
          spawnRunningParticles(this.world, this.transform.position, Math.sign(this.velocity.x));
          this.particleTimer = 0.1;
        } else {
          spawnWalkingParticles(this.world, this.transform.position, Math.sign(this.velocity.x));
          this.particleTimer = 0.2;
        }
      }
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

      this.accel.y = 0;
      this.velocity.y = initVel;
      this.jumped = false;
      spawnJumpingParticles(this.world, this.transform.position);
    }

    this.velocity.x += this.accel.x;
    this.velocity.y += this.accel.y;

    this.velocity.y = Math.max(this.velocity.y, -MAX_FALL_SPEED);

    this.velocity.z = 0;

    this.move();
  }

  private _powerupUpdate(fixedDeltaTime: number): void {
    
    this.powerUpStartTimer -= this.world.timer.unscaledDelta;
    if (this.powerUpStartTimer <= 0)
    {
      this.world.timer.timescale = 1.0;
      this.powerUp = this.nextPowerUp;
      this.setCurrentState(PlayerState.NORMAL);
      if (this.powerUp == PowerUpState.BIG) {
        this.mesh.position.y = this.modelOffsetY + (0.15);
        this.transform.scale.set(this.bigScale, this.bigScale, this.bigScale);
      }
      else {
        this.mesh.position.y = this.modelOffsetY;
        this.transform.scale.set(1.0, 1.0, 1.0);
      }
      // if (this.nextPowerUp != PowerUpState.SMALL) {
      //   this.transform.position.y += 1.0;
      // }
      this.invincibleTimer = INVINCIBLE_TIME;
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
      if (other.isDead) {
        return;
      }
      if (collision.normal1.y > 0.5) {
        this.velocity.y = ENEMY_BOUNCE;
        other.onHit();
      }
      else {
        this.setCurrentState(PlayerState.DEAD);
      }
    }
    else if (other instanceof Koopa) {
      if (other.isDead) {
        return;
      }
      if (collision.normal1.y > 0.5) {
        this.world.addGameObject(new ScorePopup(ScoreType.Score100, this.world))
          .transform.position.copy(this.transform.position);
        this.velocity.y = ENEMY_BOUNCE;
        other.onHit(-Math.sign(collision.collider.translation().x - this.collider.translation().x));
      }
      else {
        if (other.IsInShell && Math.abs(other.Velocity.x) < 0.05) {
          this.kickTimer = KICK_ANIMATION_TIME;

          this.world.addGameObject(new ScorePopup(ScoreType.Score100, this.world))
            .transform.position.copy(this.transform.position);
          other.setDir(Math.sign(collision.collider.translation().x - this.collider.translation().x));
        }
        else {
          this.setCurrentState(PlayerState.DEAD);
        }
      }
    }
    else if (other instanceof QuestionBlock) {
      if (collision.normal1.y < -0.5) {
        this.velocity.y = 0;
        other.Hit(Math.sign(collision.collider.translation().x - this.collider.translation().x));
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
