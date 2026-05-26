import { AbstractPhysicsBody } from "./abstractPhysicsBody";
import { PhysicsWorld, World } from "../../engine";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { OBJECT_FALL, OBJECT_MAX_FALL } from "../../engine/constants";

export abstract class CharacterEnemy extends AbstractPhysicsBody {
  protected controller!: RAPIER.KinematicCharacterController;
  protected velocity = new THREE.Vector3();
  protected dir = -1;
  readonly shapeHeight = 1.0;

  constructor(name: string, world: World) {
    super(name, world);
  }

  protected async startCharacter(
    modelPath: string,
    controllerGeometry = new THREE.BoxGeometry(0.5, this.shapeHeight, 0.5),
  ): Promise<void> {
    await super.start();

    const { controller, collider } = this.world.physics.createCharacterController(this, controllerGeometry);
    this.controller = controller;
    this.collider = collider;

    await this.loadModel(modelPath);
  }

  protected applyGravity(fixedDeltaTime: number): void {
    if (!this.controller.computedGrounded()) {
      this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL * fixedDeltaTime, -OBJECT_MAX_FALL);
    }
  }

  protected moveAndCheckWalls(): void {
    this.velocity.z = 0;
    const dt = this.world.timer.timescale === 0 ? 0 : 1;
    PhysicsWorld.moveAndSlide(this.controller, this.collider, this.transform, this.velocity, dt);

    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const collision = this.controller.computedCollision(i);
      if (collision && Math.abs(collision.normal1.x) > 0.5) {
        this.dir *= -1;
      }
    }
  }

  override onDestroy(): void {
    try {
      if (this.controller) this.world.physics.removeCharacterController(this.controller);
    } catch (e) {
      console.error(`[${this.name}] Destroy controller error:`, e);
    }
    super.onDestroy();
  }
}
