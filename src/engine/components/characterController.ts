import { Component, PhysicsWorld } from "@/engine";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { Vector3 } from "three";

export class CharacterController extends Component {
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;
  public velocity = new THREE.Vector3(0, 0, 0);

  get isGrounded(): boolean {
    return this.controller.computedGrounded();
  }

  get CharacterController(): RAPIER.KinematicCharacterController {
    return this.controller;
  }

  public constructor(private readonly colliderMesh: THREE.CapsuleGeometry) {
    super();
  }

  public start(): void {
    super.start();
    this.controller =
      this.gameObject.world.physics.world.createCharacterController(0.01)!;

    const shape = PhysicsWorld.getShape(this.colliderMesh)!;
    shape.setTranslation(
      this.gameObject.transform.position.x,
      this.gameObject.transform.position.y,
      this.gameObject.transform.position.z,
    );
    const collider = this.gameObject.world.physics.world.createCollider(shape);
    this.collider = collider;
  }

  public onDestroy(): void {
    this.gameObject.world.physics.world.removeCharacterController(
      this.controller,
    );
  }

  public moveAndCollide(vel: THREE.Vector3): THREE.Vector3 {
    this.controller.computeColliderMovement(this.collider, vel);

    let correctedMovement = this.controller.computedMovement();

    let t = this.collider.translation();
    this.collider.setTranslation({
      x: t.x + correctedMovement.x,
      y: t.y + correctedMovement.y,
      z: t.z + correctedMovement.z,
    });
    t = this.collider.translation();
    this.gameObject.transform.position.set(t.x, t.y, t.z);

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
