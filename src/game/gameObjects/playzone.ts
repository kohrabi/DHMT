import { GameObject, PhysicsWorld, World } from "@/engine";
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export type PlayZoneBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
};

export class PlayZone extends GameObject {
  private collider!: RAPIER.Collider;

  constructor(world: World) {
    super(
      `PlayZone_${world.gameObjects.size}`,
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
          this.transform.scale.z * 2,
        )
      ).setSensor(true),
    );

    console.log(`Created PlayZone with handle ${this.collider.handle}, bounds:`, this.getBounds());
  }

  /**
   * Returns the world-space axis-aligned bounding box of this zone.
   * The camera uses these bounds to clamp its position.
   */
  public getBounds(): PlayZoneBounds {
    const pos = this.transform.position;
    const half = this.transform.scale; // scale already represents half-extents after loadLevel sets it
    return {
      min: new THREE.Vector3(
        pos.x - half.x,
        pos.y - half.y,
        pos.z - half.z,
      ),
      max: new THREE.Vector3(
        pos.x + half.x,
        pos.y + half.y,
        pos.z + half.z,
      ),
    };
  }
}