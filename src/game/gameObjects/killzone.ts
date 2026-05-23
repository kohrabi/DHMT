import { GameObject, PhysicsWorld, World } from "@/engine";
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Player } from "./player";
import { Koopa } from "./koopa";
import { Goomba } from "./goomba";
import { Mushroom } from "./mushroom";

export class KillZone extends GameObject {
  private collider!: RAPIER.Collider;
  
  constructor(world : World) {
    super(
      `KillZone_${world.gameObjects.size}`,
      world,
    );
  }

  public async start(): Promise<void> {
    await super.start();
    this.collider = this.world.physics.world.createCollider(
      PhysicsWorld.getBoxShape(
        this.transform,
        new THREE.Vector3(
          this.transform.scale.x * 2, 
          this.transform.scale.y * 2, 
          this.transform.scale.z * 2
        )
      ).setSensor(true),
    );
    console.log(`Created KillZone with handle ${this.collider.handle}`);
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    this.world.physics.world.intersectionsWithShape(
      this.collider.translation(), 
      this.collider.rotation(), 
      this.collider.shape,
      (handle) => {
        if (handle.handle === this.collider.handle) {
          return true;
        }
        const other = this.world.physics.getGameObjectFromCollider(handle);
        if (other instanceof Player) {
          other?.kill();
        }
        else if (other instanceof Koopa || other instanceof Goomba || other instanceof Mushroom) {
          other?.destroy();
        }
        return true;
      },
    );
  }
}