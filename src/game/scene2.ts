import { GameObject, MeshRenderer, Scene } from "@/engine";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as Global from "@/global";

export class Scene2 extends Scene {
  private controls!: OrbitControls;
  public constructor() {
    super("scene2");
  }

  protected loadContent() {
    this.controls = new OrbitControls(this.camera, Global.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target = new THREE.Vector3(0, 2, 0);
    this.controls.update();

    this.scene.background = new THREE.Color(0x202020);

    const object = new GameObject("object1", this);

    object.transform.position.set(0, 0, -5);
    object.transform.rotation.y = Math.PI * 0.25;
    object.transform.scale.setScalar(1.5);

    object.addComponent(
      new MeshRenderer(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x4cc9f0 }),
      ),
    );

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 2);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(object.transform.position);

    this.addGameObject(object);
    this.scene3D.add(new THREE.AxesHelper(1));
    this.scene3D.add(new THREE.GridHelper(10, 10));
  }
}
