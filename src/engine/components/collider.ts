import RAPIER from "@dimforge/rapier3d-compat";
import { Component } from "../component";
import * as THREE from "three";

export class Collider extends Component {
  private collider!: RAPIER.Collider;

  constructor(
    private readonly shape: RAPIER.ColliderDesc,
    private readonly mass: number = 0,
    private readonly restitution: number = 0,
  ) {
    super();
  }

  get Collider(): RAPIER.Collider {
    return this.collider;
  }

  start(): void {
    super.start();

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.gameObject.transform.getWorldPosition(worldPos);
    this.gameObject.transform.getWorldQuaternion(worldQuat);

    this.collider = this.gameObject.world.physics.world.createCollider(
      this.shape,
    );
  }

  onDestroy(): void {
    if (this.collider) {
      this.gameObject.world.physics.world.removeCollider(this.collider, false);
    }
  }
}
