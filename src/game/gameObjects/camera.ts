import { GameObject, World } from "@/engine";
import * as THREE from 'three';
import * as Global from '@/global';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { PlayZone } from './playzone';

export class Camera extends GameObject {
  private target?: GameObject | null;
  private controlsEnabled = false;
  private controls?: OrbitControls;
  public isFollowingTarget = true;
  private zone?: PlayZone;
  private sunLight?: THREE.DirectionalLight;

  /** The offset from camera position to sun light position. */
  private readonly sunOffset = new THREE.Vector3(6, 10, 4);

  constructor(
    private readonly camera : THREE.Camera, 
    world : World,
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
      this.transform.position.set(
        this.target.transform.position.x,
        this.target.transform.position.y,
        this.transform.position.z
      );
      this.transform.position.y += 2;
    }
    
    this.camera.position.copy(this.transform.position);

    // Clamp camera so its viewport edges stay inside the PlayZone —
    // like a 2D platformer camera that never shows outside the level.
    if (this.zone && this.camera instanceof THREE.PerspectiveCamera) {
      // Re-read bounds every frame so they reflect the zone's live transform.
      const bounds = this.zone.getBounds();

      // Distance from the camera to the play plane (scene objects sit at Z ≈ 0).
      const dist = Math.abs(this.camera.position.z);

      // Visible half-extents at that distance for a perspective camera:
      //   halfH = dist * tan(fov/2)
      //   halfW = halfH * aspect
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const halfW = halfH * this.camera.aspect;

      const zoneW = bounds.max.x - bounds.min.x;
      const zoneH = bounds.max.y - bounds.min.y;

      // Clamp so the left/right edges don't leave the zone.
      // If the zone is narrower than the viewport, center on the zone instead.
      this.camera.position.x = zoneW >= halfW * 2
        ? THREE.MathUtils.clamp(
            this.camera.position.x,
            bounds.min.x + halfW,
            bounds.max.x - halfW,
          )
        : (bounds.min.x + bounds.max.x) / 2;

      // Clamp so the top/bottom edges don't leave the zone.
      this.camera.position.y = zoneH >= halfH * 2
        ? THREE.MathUtils.clamp(
            this.camera.position.y,
            bounds.min.y + halfH,
            bounds.max.y - halfH,
          )
        : (bounds.min.y + bounds.max.y) / 2;
    }
    
    // Update to get the correct view-projection matrix for frustum culling.
    this.world.updateFrustum(this.camera);

    // Move the sun light so its shadow frustum always covers the visible area.
    if (this.sunLight) {
      this.sunLight.position.set(
        this.camera.position.x + this.sunOffset.x,
        this.sunOffset.y,
        this.camera.position.z + this.sunOffset.z,
      );
      this.sunLight.target.position.set(
        this.camera.position.x,
        0,
        this.camera.position.z,
      );
      this.sunLight.target.updateMatrixWorld();
    }
  }

  public setTarget(target: GameObject) {
    this.target = target;
  }

  /**
   * Attach a DirectionalLight to the camera so its shadow frustum
   * tracks the camera position and never falls off-screen.
   */
  public setSunLight(light: THREE.DirectionalLight): void {
    this.sunLight = light;
    // Ensure the target object is in the scene so updateMatrixWorld works.
    this.world.scene.add(light.target);
  }

  /**
   * Constrains the camera to stay within the given PlayZone's bounds.
   * Bounds are re-read every frame from the zone's live transform.
   */
  public setZone(zone: PlayZone) {
    this.zone = zone;
  }
  
}