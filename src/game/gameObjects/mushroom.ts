import { PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";
import { eventBus } from "@/engine/eventBus";
import { OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";
import { GroundOneWay } from "./oneway";
import { Ground } from "./ground";
import { QuestionBlock } from "./questionBlock";
import { Player } from "./player";

const MUSHROOM_X_SPEED = 0x01000 * SUBSUBSUBPIXEL_DELTA_TIME;
const MUSHROOM_INTRO_Y_VELOCITY = 1.5;

enum State {
  NORMAL,
  INTRO,
}

export class Mushroom extends AbstractPhysicsBody {
  private controller: RAPIER.KinematicCharacterController | null = null;

  private maxYPos = 0;
  private velocity = new THREE.Vector3();
  private dir = 1;

  readonly shapeHeight = 0.25;

  get bottom() {
    return this.transform.position.y - this.shapeHeight / 2.0;
  }

  private currentState = State.NORMAL;

  public setDir(dir: number) {
    this.dir = dir;
  }

  constructor(world: World) {
    super(
      `Mushroom_${world.gameObjects.size}`,
      world,
    );

    this.currentState = State.INTRO;
    this.dir = 1;
    this.transform.scale.set(2, 2, 2);
  }

  async start(): Promise<void> {
    await super.start();

    this.maxYPos = this.transform.position.y + 0.9;

    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      new THREE.BoxGeometry(
        0.25 * this.transform.scale.x,
        this.shapeHeight * this.transform.scale.y,
        0.25 * this.transform.scale.z,
      ),
    );
    this.controller = controller;
    this.collider = collider;
    this.collider.setSensor(true);
    this.collider.setEnabled(false);

    await this.loadModel("assets/platformer/heart.glb", -0.1);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (!this.isCameraVisible()) {
      return;
    }

    if (this.currentState === State.NORMAL) {
      if (!this.controller || !this.collider) return;

      this.velocity.x = MUSHROOM_X_SPEED * this.dir;
      this.velocity.y = Math.max(
        this.velocity.y - OBJECT_FALL * fixedDeltaTime * 5.0,
        -OBJECT_MAX_FALL,
      );

      PhysicsWorld.moveAndSlide(
        this.controller,
        this.collider,
        this.transform,
        this.velocity,
        this.world.timer.timescale === 0 ? 0 : 1,
        (cl) => {
          const go = this.world.physics.getGameObjectFromCollider(cl);
          if (!go) return false;
          if (go instanceof GroundOneWay) {
            const bottom = this.bottom;
            const groundTop = go.top;
            if (bottom <= groundTop + 0.05) {
              return false;
            }
            return true;
          }
          return go instanceof Ground || go instanceof QuestionBlock;
        },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      );

      for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
        const collision = this.controller.computedCollision(i);
        if (!collision) continue;
        if (!collision.collider) continue;
        const go = this.world.physics.getGameObjectFromCollider(collision.collider);
        if (!go) continue;
        if ((go instanceof Ground || go instanceof GroundOneWay) &&
          Math.abs(collision.normal1.x) > 0.5) {
          this.dir *= -1;
        }
      }

      this.world.physics.world.intersectionsWithShape(
        this.collider.translation(),
        this.collider.rotation(),
        this.collider.shape,
        (handle) => {
          if (handle.handle === this.collider?.handle) {
            return true;
          }
          const other = this.world.physics.getGameObjectFromCollider(handle);
          if (other instanceof Player) {
            other.powerUp();
            eventBus.emit("item:collected", "mushroom", this.transform.position);
            this.destroy();
          }
          return true;
        },
      );
    } else {
      this.transform.position.y += MUSHROOM_INTRO_Y_VELOCITY * fixedDeltaTime;
      this.transform.position.y = Math.min(this.transform.position.y, this.maxYPos);
      if (Math.abs(this.transform.position.y - this.maxYPos) <= 0.01) {
        this.currentState = State.NORMAL;
        if (this.collider) {
          this.collider.setEnabled(true);
          this.collider.setTranslation({
            x: this.transform.position.x,
            y: this.transform.position.y,
            z: this.transform.position.z,
          });
        }
      }
    }
  }

  isCameraVisible(): boolean {
    if (!this.meshBox) return true;
    return this.world.isCameraVisible(this.transform, this.meshSphere);
  }

  override onDestroy(): void {
    try {
      if (this.controller) {
        this.world.physics.removeCharacterController(this.controller);
      }
    } catch (error) {
      console.error("Error during mushroom destruction:", error);
    }
    super.onDestroy();
  }
}
