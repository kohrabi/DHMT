import * as THREE from "three";
import { DemoScene } from "./game/scene1";
import { SceneManager } from "./engine/sceneManager";
import { RapierPhysics } from "./engine/physics";
import * as Global from "./global";
import { Scene2 } from "./game/scene2";

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
}
