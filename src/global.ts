import * as THREE from "three";
import { ContentManager } from "./engine/contentManager";
import { InputManager } from "./engine/inputManager";
import { SceneManager } from "./engine/sceneManager";

export const timer = new THREE.Timer();
export const input = new InputManager();
export const sceneManager = new SceneManager();
export const contentManager = ContentManager.global;
export const renderer = new THREE.WebGLRenderer();
