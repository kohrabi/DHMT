import { GameObject, PhysicsWorld, World } from "../../engine";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { MESH_BOX_EXPAND } from "../../engine/constants";
import { disposeMesh } from "../../engine/utils/disposeUtils";

export abstract class AbstractPhysicsBody extends GameObject {
  protected collider!: RAPIER.Collider;
  protected mesh!: THREE.Object3D;
  protected meshBox?: THREE.Box3;
  protected meshSphere = new THREE.Sphere();

  constructor(name: string, world: World) {
    super(name, world);
  }

  protected async loadModel(path: string, offsetY = -0.5): Promise<THREE.Object3D> {
    const gltf = await this.world.gameScene.content.loadGLTF(path);
    const model = SkeletonUtils.clone(gltf.scene);
    model.position.set(0, offsetY, 0);
    this.mesh = model;
    this.transform.add(model);
    this.meshBox = new THREE.Box3().setFromObject(this.mesh);
    this.meshBox.expandByScalar(MESH_BOX_EXPAND);
    this.meshBox.getBoundingSphere(this.meshSphere);
    return model;
  }

  protected createBoxCollider(
    size: THREE.Vector3 = new THREE.Vector3(0.5, 1, 0.5),
    offset: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0),
    isSensor = false,
  ): RAPIER.Collider {
    const t = this.transform.clone();
    t.position.add(new THREE.Vector3().copy(offset).multiply(this.transform.scale));
    const shape = PhysicsWorld.getBoxShape(t, size).setSensor(isSensor);
    this.collider = this.world.physics.world.createCollider(shape);
    this.world.physics.registerCollider(this.collider, this);
    return this.collider;
  }

  protected isCameraVisible(): boolean {
    if (!this.meshBox) return true;
    return this.world.isCameraVisible(this.transform, this.meshSphere);
  }

  override onDestroy(): void {
    super.onDestroy();
    try {
      if (this.collider) this.world.physics.removeCollider(this.collider);
      if (this.mesh) disposeMesh(this.mesh);
    } catch (e) {
      console.error(`[${this.name}] Destroy error:`, e);
    }
  }

  abstract fixedUpdate(fixedDeltaTime: number): void;
}
