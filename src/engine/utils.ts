import * as THREE from "three";

/**
 * Traverse an Object3D hierarchy and enable casting and receiving shadows
 * on every Mesh found. Call this after loading any GLB/model mesh.
 *
 * @param object    - The root Object3D (e.g. model.scene or a cloned mesh).
 * @param cast      - Whether the meshes should cast shadows (default true).
 * @param receive   - Whether the meshes should receive shadows (default true).
 */
export function enableShadows(
  object: THREE.Object3D,
  cast = true,
  receive = true
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}