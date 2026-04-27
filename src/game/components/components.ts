import * as THREE from "three";
import { Component } from "@/engine/component";

export function getBox(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  return new THREE.Mesh(geometry, material);
}

export function getPlane(size: number) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

export class BoxMoverComponent extends Component {
  private elapsed = 0;

  update(deltaTime: number): void {
    this.elapsed += deltaTime;

    const mesh = this.gameObject.transform as THREE.Mesh;
    mesh.position.x = Math.sin(this.elapsed);
    mesh.scale.x = 1 + 0.5 * Math.sin(this.elapsed * 2);
    mesh.rotation.x += deltaTime;
  }
}

export class OrbitCameraComponent extends Component {
  private angle = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly target: THREE.Object3D,
    private readonly radius: number,
    private readonly height: number,
    private readonly speed: number,
  ) {
    super();
  }

  update(deltaTime: number): void {
    this.angle += this.speed * deltaTime;

    this.camera.position.x = this.radius * Math.sin(this.angle);
    this.camera.position.y = this.height;
    this.camera.position.z = this.radius * Math.cos(this.angle);
    this.camera.lookAt(this.target.position);
  }
}
