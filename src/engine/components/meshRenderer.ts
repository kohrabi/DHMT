import { Component } from "@/engine/component";
import * as THREE from "three";

export class MeshRenderer extends Component {
  constructor(private readonly geometry: THREE.Object3D) {
    super();
  }

  public start(): void {
    super.start();
    this.gameObject.transform.add(this.geometry);
  }
}
