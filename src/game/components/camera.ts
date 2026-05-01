import { Component, GameObject } from "@/engine";
import * as THREE from 'three';
import * as Global from '@/global';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

export class Camera extends Component {
  private target?: GameObject;
  private controlsEnabled = false;
  private controls?: OrbitControls;

  constructor(
    private readonly camera : THREE.Camera, 
    target : GameObject
  ) {
    super();
    this.target = target;
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    if (Global.input.isKeyPressed("KeyC")) {
      this.controlsEnabled = !this.controlsEnabled;
      if (!this.controls) {
        this.controls = new OrbitControls(
          this.camera,
          Global.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.target = new THREE.Vector3(0, 2, 0);
        this.controls.update();
      }
    }
    if (this.controlsEnabled) {
      this.controls?.update();
      return;
    }

    if (this.target) {
      this.gameObject.transform.position.set(
        this.target.transform.position.x,
        this.target.transform.position.y,
        this.gameObject.transform.position.z
      );
      this.gameObject.transform.position.y += 2;
      this.gameObject.transform.rotation.copy(this.target.transform.rotation);
    }
    
    this.camera.position.copy(this.gameObject.transform.position);
    this.camera.rotation.copy(this.gameObject.transform.rotation);
  }
  
}