import * as THREE from "three";
import { Component } from "@/engine/component";

export class GeometryRenderer extends Component {
  private mesh?: THREE.Mesh;

  constructor(
    private readonly geometry: THREE.BufferGeometry,
    private readonly material: THREE.Material,
  ) {
    super();
  }

  get instance(): THREE.Mesh | undefined {
    return this.mesh;
  }

  start(): void {
    super.start();
    if (this.mesh) {
      return;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.gameObject.transform.add(this.mesh);
  }

  onDestroy(): void {
    if (!this.mesh) {
      return;
    }

    this.gameObject.transform.remove(this.mesh);
    this.mesh.geometry.dispose();

    if (Array.isArray(this.mesh.material)) {
      for (const material of this.mesh.material) {
        material.dispose();
      }
    } else {
      this.mesh.material.dispose();
    }

    this.mesh = undefined;
  }
}
