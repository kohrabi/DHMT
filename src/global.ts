import * as THREE from "three";
import { ContentManager } from "./engine/contentManager";
import { SceneManager } from "./engine/sceneManager";

export const timer = new THREE.Timer();
export const sceneManager = new SceneManager();
export const contentManager = ContentManager.global;
export const renderer = new THREE.WebGLRenderer();
