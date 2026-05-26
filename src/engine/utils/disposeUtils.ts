import * as THREE from "three";

export function disposeMesh(mesh: THREE.Object3D): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat?.dispose();
      }
    }
  });
}

export function disposeScene(gltf: { scenes: THREE.Group[] }): void {
  gltf.scenes.forEach((scene) =>
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material?.dispose();
        }
      }
      if (object instanceof THREE.Skeleton) {
        object.dispose();
      }
    }),
  );
}
