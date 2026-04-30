import { CharacterController, Component } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";

export class PlayerController extends Component {
  private controller!: CharacterController;
  private inputVector = new THREE.Vector3(0, 0, 0);
  readonly SPEED = 10;
  readonly GRAVITY = 20;
  readonly JUMP = 100;
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
    if (Global.input.isKeyDown("KeyW")) {
      this.inputVector.z += -1;
    }
    if (Global.input.isKeyDown("KeyS")) {
      this.inputVector.z += 1;
    }
    if (Global.input.isKeyDown("KeyA")) {
      this.inputVector.x += -1;
    }
    if (Global.input.isKeyDown("KeyD")) {
      this.inputVector.x += 1;
    }

    if (Global.input.isKeyDown("Space")) {
      this.controller.velocity.y += this.JUMP * deltaTime;
    }
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    this.controller.velocity = this.controller.velocity.add(
      this.inputVector.multiplyScalar(this.SPEED * fixedDeltaTime),
    );

    if (!this.controller.isGrounded) {
      this.controller.velocity.y -= this.GRAVITY * fixedDeltaTime;
    }
    this.controller.moveAndSlide(fixedDeltaTime);

    this.controller.velocity = this.controller.velocity.multiplyScalar(0.9);
  }
}
