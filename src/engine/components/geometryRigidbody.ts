import * as THREE from "three";
import { Component } from "@/engine/component";
import { GeometryRenderer } from "@/engine/components/geometryRenderer";
import RAPIER from "@dimforge/rapier3d-compat";

export class GeometryRigidbody3D extends Component {
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
    super.start();
    const renderer = this.gameObject.getComponent(GeometryRenderer);
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
