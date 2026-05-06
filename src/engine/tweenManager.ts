import { Tween } from "@tweenjs/tween.js";

export class TweenManager {
  private tweens: Set<Tween> = new Set();

  public add(tween: Tween) {
    tween.onComplete(() => {
      this.tweens.delete(tween);
    });
    this.tweens.add(tween);
  }

  public remove(tween: Tween) {
    this.tweens.delete(tween);
  }

  public update(deltaTime: number) {
    for (const tween of this.tweens) {
      tween.update(deltaTime);
    }
  }
}