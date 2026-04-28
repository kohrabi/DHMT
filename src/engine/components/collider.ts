import * as THREE from "three";
import { Component } from "@/engine/component";
import { MeshRenderer } from "@/engine/components/meshRenderer";
import RAPIER from "@dimforge/rapier3d-compat";

/**
 * Gives a GameObject a Rapier rigid body whose transform is synced
 * back to gameObject.transform every fixed step.
 *
 * Scene graph structure:
 *   gameObject.transform  ← Collider drives this (world position/rotation)
 *     └── mesh            ← MeshRenderer child; follows the transform for free
 *
 * Usage:
 *   go.addComponent(new MeshRenderer(geometry, material));  // add first
 *   go.addComponent(new Collider(1, 0.5));                  // mass, restitution
 *
 * MeshRenderer MUST be added before Collider so its geometry is available
 * when Collider.start() runs.
 */
export class Collider extends Component {
  private body?: RAPIER.RigidBody;
  private collider?: RAPIER.Collider;

  constructor(
    private readonly mass: number = 0,
    private readonly restitution: number = 0,
  ) {
    super();
  }

  get rigidBody(): RAPIER.RigidBody | undefined {
    return this.body;
  }

  start(): void {
    const renderer = this.gameObject.getComponent(MeshRenderer);
    if (!renderer?.instance) {
      console.warn(
        `Collider on "${this.gameObject.name}": no MeshRenderer instance found. ` +
          "Add MeshRenderer before Collider.",
      );
      return;
    }

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.gameObject.transform.getWorldPosition(worldPos);
    this.gameObject.transform.getWorldQuaternion(worldQuat);

    const { body, collider } = this.gameObject.world.physics.addMesh(
      renderer.instance,
      this.mass,
      this.restitution,
      {
        position: worldPos,
        quaternion: worldQuat,
      },
    )!;

    if (body instanceof RAPIER.RigidBody) {
      this.body = body;
    } else {
      this.body = body[0];
      console.log(
        `Collider on "${this.gameObject.name}": multiple bodies created for mesh. ` +
          "Using the first body for syncing transforms.",
      );
    }

    if (collider instanceof RAPIER.Collider) {
      this.collider = collider;
    } else {
      this.collider = collider[0];
      console.log(
        `Collider on "${this.gameObject.name}": multiple colliders created for mesh. ` +
          "Using the first collider for reference.",
      );
    }
  }

  /**
   * Called every fixed physics step (after Rapier has been stepped).
   * Writes the body's simulated world transform back to gameObject.transform.
   * The MeshRenderer's child mesh follows automatically.
   */
  fixedUpdate(_fdt: number): void {
    if (!this.body || this.mass === 0) return;

    const t = this.body.translation();
    const r = this.body.rotation();

    this.gameObject.transform.position.set(t.x, t.y, t.z);
    this.gameObject.transform.quaternion.set(r.x, r.y, r.z, r.w);
  }

  onDestroy(): void {
    if (this.body) this.gameObject.world.physics.removeBody(this.body);
  }
}
