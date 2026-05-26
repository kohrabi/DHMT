import { World } from "@/engine";
import * as THREE from "three";
import { AbstractPhysicsBody } from "@/game/common/abstractPhysicsBody";

export class Decorate extends AbstractPhysicsBody {
  constructor(world: World, model: THREE.Object3D) {
    super(
      `Decorate_${world.gameObjects.size}`,
      world,
    );
    this.transform.add(model);
  }

  fixedUpdate(): void {}
}
