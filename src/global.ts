import * as THREE from "three";
import { ContentManager } from "./engine/contentManager";
import { InputManager } from "./engine/inputManager";
import { SceneManager } from "./engine/sceneManager";
import { Coin } from "./game/components/coin";

export const timer = new THREE.Timer();
export const input = new InputManager();
export const sceneManager = new SceneManager();
export const contentManager = ContentManager.global;
export const renderer = new THREE.WebGLRenderer();


export const PhysicsGroups = {
  Player: 1 << 0,
  Enemy: 1 << 1,
  Coin: 1 << 2,
  Ground: 1 << 3,
}

