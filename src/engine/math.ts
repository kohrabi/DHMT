function clampf(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moveTowards(value: number, end: number, delta: number): number {
  if (value > end)
    return Math.max(value - Math.abs(delta), end); // value <= end
  else return Math.min(value + Math.abs(delta), end);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

import * as THREE from "three";

function clampfV2(value: THREE.Vector2, min: number, max: number): void {
  value.x = clampf(value.x, min, max);
  value.y = clampf(value.y, min, max);
}

export { clampf, moveTowards, lerp, clampfV2 };
