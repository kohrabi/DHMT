import { GameObject, World } from "@/engine";
import * as THREE from "three";
import * as Global from "@/global";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { PlayZone } from "./playzone";

export class Camera extends GameObject {
  private target?: GameObject | null;
  private controlsEnabled = false;
  private controls?: OrbitControls;
  public isFollowingTarget = true;
  private zone?: PlayZone;

  constructor(
    private readonly camera: THREE.Camera,
    world: World,
    target: GameObject | null = null,
  ) {
    super(
      `Camera`,
      world
    );
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

    if (this.target && this.isFollowingTarget) {
      const targetX = this.target.transform.position.x;
      const targetY = this.target.transform.position.y + 2;
      this.transform.position.x = THREE.MathUtils.lerp(this.transform.position.x, targetX, 0.15);
      this.transform.position.y = THREE.MathUtils.lerp(this.transform.position.y, targetY, 0.15);
    }

    this.camera.position.copy(this.transform.position);

    if (this.zone && this.camera instanceof THREE.PerspectiveCamera) {
      const bounds = this.zone.getBounds();

      const dist = Math.abs(this.camera.position.z);

      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const halfW = halfH * this.camera.aspect;

      const zoneW = bounds.max.x - bounds.min.x;
      const zoneH = bounds.max.y - bounds.min.y;

      this.camera.position.x = zoneW >= halfW * 2
        ? THREE.MathUtils.clamp(
            this.camera.position.x,
            bounds.min.x + halfW,
            bounds.max.x - halfW,
          )
        : (bounds.min.x + bounds.max.x) / 2;

      this.camera.position.y = zoneH >= halfH * 2
        ? THREE.MathUtils.clamp(
            this.camera.position.y,
            bounds.min.y + halfH,
            bounds.max.y - halfH,
          )
        : (bounds.min.y + bounds.max.y) / 2;
    }

    this.world.updateFrustum(this.camera);
  }

  public setTarget(target: GameObject) {
    this.target = target;
  }

  public setZone(zone: PlayZone) {
    this.zone = zone;
  }
}
