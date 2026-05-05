import * as Global from "./global";
import { Scene2 } from "./game/scene2";
import { InspectorPanel } from "./engine/inspector";
import RAPIER from "@dimforge/rapier3d-compat";

await RAPIER.init();

Global.renderer.setSize(window.innerWidth, window.innerHeight);
Global.renderer.setClearColor(0x202020);
document.getElementById("webgl")!.appendChild(Global.renderer.domElement);

Global.sceneManager.setScene(new Scene2());

Global.renderer.setAnimationLoop(animate);

function animate() {
  Global.timer.update();
  const deltaTime = Global.timer.getDelta();
  Global.sceneManager.update(deltaTime);
  Global.sceneManager.draw(Global.renderer);
  Global.inspector.update(Global.sceneManager.currentScene?.world);
  Global.input.update(); // clear per-frame input state last
}
