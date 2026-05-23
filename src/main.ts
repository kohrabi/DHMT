import * as Global from "./global";
import { Scene2 } from "./game/scenes/scene2";
import RAPIER from "@dimforge/rapier3d-compat";
import { MainMenu } from "./game/scenes/mainMenu";

await RAPIER.init();

Global.renderer.setSize(window.innerWidth, window.innerHeight);
Global.renderer.setClearColor(0x202020);
document.getElementById("webgl")!.appendChild(Global.renderer.domElement);

await Global.sceneManager.setScene(new MainMenu());

Global.renderer.setAnimationLoop(animate);

function animate() {
  Global.sceneManager.update();
  Global.sceneManager.draw(Global.renderer);
  Global.inspector.update(Global.sceneManager.currentScene?.world);
  Global.input.update(); // clear per-frame input state last
}
