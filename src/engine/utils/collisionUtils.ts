import RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsWorld } from "../physicsWorld";
import type { GameObject } from "../gameObject";

export function checkOverlap(
  physics: PhysicsWorld,
  collider: RAPIER.Collider,
  callback: (go: GameObject) => void,
  excludeSelf = true,
): void {
  physics.world.intersectionsWithShape(
    collider.translation(),
    collider.rotation(),
    collider.shape,
    (handle) => {
      if (excludeSelf && handle.handle === collider.handle) return true;
      const go = physics.getGameObjectFromCollider(handle);
      if (go) callback(go);
      return true;
    },
  );
}

export function checkControllerCollisions(
  controller: RAPIER.KinematicCharacterController,
  callback: (collision: RAPIER.CharacterCollision) => void,
): void {
  for (let i = 0; i < controller.numComputedCollisions(); i++) {
    const collision = controller.computedCollision(i);
    if (collision?.collider) callback(collision);
  }
}
