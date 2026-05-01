import { Component } from "@/engine/component";
import * as THREE from "three";

export class MeshRenderer extends Component {
  private meshTransform!: THREE.Object3D;

  public get MeshTransform(): THREE.Object3D {
    return this.meshTransform;
  }

  constructor(private readonly geometry: THREE.Object3D) {
    super();
  }

  public start(): void {
    super.start();
    this.meshTransform = this.gameObject.transform.add(this.geometry);
  }
}
