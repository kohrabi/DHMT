import * as THREE from "three";
import { ContentManager } from "./engine/contentManager";
import { InputManager } from "./engine/inputManager";
import { SceneManager } from "./engine/sceneManager";
import { InspectorPanel } from "./engine/inspector";
import { eventBus } from "./engine/eventBus";
import { ServiceLocator } from "./engine/serviceLocator";
import { AudioManager } from "./game/audio/audioManager";

export { eventBus };

export const input = new InputManager();
export const sceneManager = new SceneManager();
export const contentManager = ContentManager.global;
export const renderer = new THREE.WebGLRenderer({ antialias: true });
export const inspector = new InspectorPanel();

const services = ServiceLocator.getInstance();
services.input = input;
services.sceneManager = sceneManager;
services.contentManager = contentManager;
services.renderer = renderer;
services.eventBus = eventBus;

export const PhysicsGroups = {
  Player: 1 << 0,
  Enemy: 1 << 1,
  Coin: 1 << 2,
  Ground: 1 << 3,
};
