import { PhysicsWorld, GameObject, World } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { OBJECT_FALL, OBJECT_MAX_FALL, SUBSUBSUBPIXEL, SUBSUBSUBPIXEL_DELTA_TIME } from '@/engine/constants';
import { GroundOneWay } from './oneway';
import { Ground } from './ground';


const MUSHROOM_X_SPEED = 0x01000 * SUBSUBSUBPIXEL_DELTA_TIME
const MUSHROOM_INTRO_Y_VELOCITY = 0.25  ;

enum State {
  NORMAL,
  INTRO,
}

export class Mushroom extends GameObject {
  private mesh!: THREE.Object3D;
  private collider! : RAPIER.Collider;
  private controller!: RAPIER.KinematicCharacterController;

  private maxYPos = 0;
  private velocity = new THREE.Vector3();
  private dir = 1;
  readonly shapeHeight = 0.5;

  get bottom() {
    return this.transform.position.y - this.shapeHeight / 2.0;
  }


  private currentState = State.NORMAL;

  public setDir(dir: number) {
    this.dir = dir;
  }

  constructor(world : World) {
    super(
      `Mushroom_${world.gameObjects.size}`,
      world,
    );

    this.currentState = State.INTRO;
    this.dir = 1;
    this.transform.scale.set(2, 2, 2);
  }

  async start() : Promise<void> {
    super.start();
    
    console.log("Starting mushroom at", this.transform.position);
    this.maxYPos = this.transform.position.y + 1;
    const { controller, collider } = this.world.physics.createCharacterController(
      this,
      new THREE.BoxGeometry(0.25 * this.transform.scale.x, this.shapeHeight * this.transform.scale.y, 0.25 * this.transform.scale.z)
    );
    this.controller = controller;
    this.collider = collider;
    this.collider.setSensor(true);
    this.collider.setEnabled(false); // Start disabled until intro is done

    const model = await this.world.gameScene.content.loadGLTF(
      "assets/platformer/heart.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.mesh = this.transform.add(modelMesh);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (this.started === false) {
      return;
    }
    if (this.currentState === State.NORMAL) {
      this.velocity.x = MUSHROOM_X_SPEED * this.dir;
      this.velocity.y = Math.max(this.velocity.y - OBJECT_FALL * fixedDeltaTime, -OBJECT_MAX_FALL);
      PhysicsWorld.moveAndSlide(
        this.controller,
        this.collider,
        this.transform,
        this.velocity,
        1,
        (collider) => {
          const go = this.world.physics.getGameObjectFromCollider(collider)!;
          if (go instanceof Ground || go instanceof GroundOneWay) {
            if (go instanceof GroundOneWay) {
              const playerBottom = this.bottom;
              const groundTop = go.top;
              if (playerBottom <= groundTop + 0.05) {
                return false;
              }
            }
            return true;
          }
          return false;
        },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      );
      
      for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
        const collision = this.controller.computedCollision(i);
        if (!collision) continue;
        const go = this.world.physics.getGameObjectFromCollider(collision.collider!)!;
        if ((go instanceof Ground || go instanceof GroundOneWay) && 
          Math.abs(collision.normal1.x) > 0.5) {
          this.dir *= -1;
        }
      }
    }
    else {
      this.transform.position.y += MUSHROOM_INTRO_Y_VELOCITY * fixedDeltaTime;
      this.transform.position.y = Math.min(this.transform.position.y, this.maxYPos);
      if (Math.abs(this.transform.position.y - this.maxYPos) <= 0.01) {
        this.currentState = State.NORMAL;
        this.collider.setEnabled(true);
        this.collider.setTranslation({
          x: this.transform.position.x,
          y: this.transform.position.y,
          z: this.transform.position.z
        });
      }
    }
    
  }

  onDestroy(): void {
    super.onDestroy();
    try {

      this.world.physics.removeCollider(this.collider);
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
      console.error("Error during coin destruction:", error);
    }
  }
}