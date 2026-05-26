import * as THREE from "three";

export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  private originalPosition = new THREE.Vector3();

  trigger(intensity: number, duration: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(deltaTime: number, camera: THREE.Camera): void {
    if (this.intensity <= 0 || this.elapsed >= this.duration) return;
    this.elapsed += deltaTime;
    const progress = this.elapsed / this.duration;
    const decay = 1 - progress;
    const currentIntensity = this.intensity * decay;
    camera.position.x += (Math.random() - 0.5) * currentIntensity;
    camera.position.y += (Math.random() - 0.5) * currentIntensity;
  }
}
