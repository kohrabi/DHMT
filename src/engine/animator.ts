import * as THREE from 'three';

export class Animator {
  private mixer?: THREE.AnimationMixer | null = null;
  private _animations: Record<number, THREE.AnimationAction> = {};
  private nextAnimationIndex: number = 0;
  private currentAnimation : THREE.AnimationAction | null = null;

  public initialize(model: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(model);
  }

  public setAnimations(animations: Record<number, THREE.AnimationClip>): void {
    Object.entries(animations).forEach(([key, clip]) => {
      const index = parseInt(key);
      this._animations[index] = this.mixer!.clipAction(clip);
      this._animations[index].setEffectiveWeight(1);
      // this._animations[index].setEffectiveTimeScale(1);
    });
  }

  public update(deltaTime: number): void {
    this.mixer?.update(deltaTime);
  }

  public playAnimation(index : number, transitionTime: number = 0.2, loop: boolean = true): void {
    if (this.mixer === null) {
      console.warn('Animator not initialized. Call initialize() with a model before playing animations.');
      return;
    }
    const nextAnimation = this._animations[index];
    if (this.currentAnimation === nextAnimation) return;
    nextAnimation.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    if (this.currentAnimation && this.currentAnimation !== nextAnimation) {
      this.currentAnimation.crossFadeTo(nextAnimation, transitionTime, false);
    }
    this.currentAnimation = nextAnimation;
    
    this.currentAnimation.reset();
    this.currentAnimation.play();
  }

  public playAnimationForce(index: number): void {
    const animation = this._animations[index];
    if (animation) {
      for (const key in this._animations) {
        if (this._animations[key] !== animation) {
          this._animations[key].stop();
        }
      }
      animation.play();
    }
  }
}