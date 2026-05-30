import { GameObject, World } from "@/engine";
import { enableShadows } from "@/engine/utils";
import * as THREE from "three";

export class Decorate extends GameObject {
  constructor(world : World, model: THREE.Object3D) {
    super(
      `Decorate_${world.gameObjects.size}`,
      world,
      model
    );
    enableShadows(model);
  }
}