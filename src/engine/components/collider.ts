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

    // Extract the collision shape from the mesh geometry.
    const shape = this.gameObject.world.physics.getShape(renderer.instance.geometry);
    if (!shape) return;

    shape.setMass(this.mass);
    shape.setRestitution(this.restitution);

    // ── CRITICAL: use the gameObject transform's WORLD position/rotation,
    //   not the child mesh's local (0,0,0).
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.gameObject.transform.getWorldPosition(worldPos);
    this.gameObject.transform.getWorldQuaternion(worldQuat);

    const desc =
      this.mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();

    desc.setTranslation(worldPos.x, worldPos.y, worldPos.z);
    desc.setRotation({ x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w });

    const rapierWorld = this.gameObject.world.physics.world;
    this.body = rapierWorld.createRigidBody(desc);
    rapierWorld.createCollider(shape, this.body);
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
    if (this.body) {
      this.gameObject.world.physics.world.removeRigidBody(this.body);
      this.body = undefined;
    }
  }
}
