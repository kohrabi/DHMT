import * as THREE from "three";
import { RapierPhysics } from "./engine/physics";
import { SceneManager } from "./engine/sceneManager";

export const timer = new THREE.Timer();
export const sceneManager = new SceneManager();
export const renderer = new THREE.WebGLRenderer();
