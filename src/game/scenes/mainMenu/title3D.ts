import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { Font } from "three/addons/loaders/FontLoader.js";
import type { ContentManager } from "@/engine/contentManager";

export const TitleConfig = {
  y: 3.5,
  bobAmp: 0.08,
  bobFreq: 1.4,
  rockFreq: 0.6,
  rockAmp: 0.04,
};

export async function buildTitle(
  contentManager: ContentManager,
  scene: THREE.Scene,
): Promise<THREE.Group | undefined> {
  let font: Font | undefined;
  try {
    font = await contentManager.loadFont(
      "/assets/fonts/Super Mario 256_Regular.json",
    );
  } catch (e) {
    console.warn("[MainMenu] Could not load Mario font, skipping 3D title.", e);
    return undefined;
  }

  const geometry = new TextGeometry("SUPER MARIO", {
    font,
    size: 0.8,
    depth: 0.2,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.025,
    bevelSegments: 4,
  });
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const centerX = bb ? (bb.max.x - bb.min.x) / 2 : 0;

  const matFill = new THREE.MeshStandardMaterial({
    color: 0xffe033,
    roughness: 0.3,
    metalness: 0.15,
  });

  const titleMesh = new THREE.Mesh(geometry, matFill);
  titleMesh.position.set(-centerX, 0, 0);

  const titleGroup = new THREE.Group();
  titleGroup.add(titleMesh);
  titleGroup.position.set(0, TitleConfig.y, -0.5);

  return titleGroup;
}
