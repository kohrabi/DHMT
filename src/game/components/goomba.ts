import { clampf, GameObject, moveTowards, PhysicsWorld, World } from "@/engine";
import * as THREE from "three";
import RAPIER from '@dimforge/rapier3d-compat';
import { OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL_DELTA_TIME } from "@/engine/constants";

const GOOMBA_X_SPEED =  0x00A00 * SUBSUBSUBPIXEL_DELTA_TIME;

export class Goomba extends GameObject {

  // Components
  private controller!: RAPIER.KinematicCharacterController;
  private collider!: RAPIER.Collider;

  private velocity = new THREE.Vector3();
  private mesh: THREE.Object3D = new THREE.Object3D();

  readonly shapeHeight = 1.0;

  constructor(world : World) {
    super(
      "Goomba",
      world
    );
    this.velocity.x = -GOOMBA_X_SPEED;
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
    model.scene.position.set(0, -0.5, 0);
    model.scene.rotation.y = Math.PI / 4;
    this.mesh = this.transform.add(model.scene);
  }

  public update(deltaTime: number): void {
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    if (this.controller) {
      this.velocity.x = GOOMBA_X_SPEED * Math.sign(this.velocity.x);
      PhysicsWorld.moveAndSlide(
        this.controller,
        this.collider,
        this.transform,
        this.velocity,
        1,
        
      )
      if (!this.controller.computedGrounded()) {
        this.velocity.y -= OBJECT_FALL;
        this.velocity.y = Math.min(this.velocity.y, OBJECT_MAX_FALL);
      }
      console.log(this.velocity);
      
    }
  }
}
