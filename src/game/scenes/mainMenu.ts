import { Scene } from "@/engine";
import * as Global from "@/global";
import * as THREE from "three";
import { Scene2 } from "./scene2";

export class MainMenu extends Scene {
  constructor() {
    super("mainMenu");
  }

  protected async loadContent(): Promise<void> {
    this.world.scene.background = new THREE.Color(0x101010);

    this.showMenuUI();
  }

  private showMenuUI() {
    const menuContainer = document.createElement("div");

    menuContainer.id = "main-menu-ui";

    menuContainer.style.cssText = `

      position: absolute; top: 0; left: 0; width: 100%; height: 100%;

      display: flex; flex-direction: column; align-items: center; justify-content: center;

      background: rgba(0,0,0,0.5); color: white; font-family: sans-serif;

    `;

    menuContainer.innerHTML = `

      <h1>MY SUPER GAME</h1>

      <button id="start-btn" style="padding: 10px 20px; font-size: 20px; cursor: pointer;">START GAME</button>

      <button id="settings-btn" style="margin-top: 10px; padding: 10px 20px; cursor: pointer;">SETTINGS</button>

    `;

    document.body.appendChild(menuContainer);

    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.cleanupUI();

      // Chuyển sang Scene2

      Global.sceneManager.setScene(new Scene2());
    });
  }

  private cleanupUI() {
    const ui = document.getElementById("main-menu-ui");

    if (ui) ui.remove();
  }

  public async deactivate(): Promise<void> {
    await super.deactivate();

    this.cleanupUI();
  }
}
