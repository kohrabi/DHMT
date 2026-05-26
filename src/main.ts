// NOTE: Scene import for gameplay was migrated to GameplayScene (see src/game/scenes/gameplayScene.ts).
// The old Scene2 remains at src/game/scenes/scene2.ts as a backup reference.
import * as Global from "./global";
import { GameplayScene } from "./game/scenes/gameplayScene";
import RAPIER from "@dimforge/rapier3d-compat";
import { MainMenu } from "./game/scenes/mainMenu";
import { AudioManager } from "./game/audio/audioManager";
import { eventBus } from "./engine/eventBus";
import { ServiceLocator } from "./engine/serviceLocator";

await RAPIER.init();

const renderer = Global.renderer;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x202020);
document.getElementById("webgl")!.appendChild(renderer.domElement);

AudioManager.getInstance().init();

ServiceLocator.getInstance().input = Global.input;
ServiceLocator.getInstance().sceneManager = Global.sceneManager;
ServiceLocator.getInstance().contentManager = Global.contentManager;
ServiceLocator.getInstance().renderer = Global.renderer;

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = Global.sceneManager.currentScene;
  if (scene) {
    scene.camera.aspect = window.innerWidth / window.innerHeight;
    scene.camera.updateProjectionMatrix();
  }
});

await Global.sceneManager.setScene(new MainMenu());

renderer.setAnimationLoop(animate);

function animate() {
  Global.sceneManager.update();
  Global.sceneManager.draw(Global.renderer);
  if (import.meta.env.DEV) {
    Global.inspector.update(Global.sceneManager.currentScene?.world);
  }
  Global.input.update();
}
