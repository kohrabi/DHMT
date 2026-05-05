import { GUI } from "dat.gui";
import type { GUIController } from "dat.gui";
import type { World } from "@/engine/world";

type InspectorStats = {
  gameObjects: number;
  controllers: number;
  colliders: number;
  bodies: number;
  objectNames: string;
};

export class InspectorPanel {
  private readonly gui: GUI;
  private readonly stats: InspectorStats = {
    gameObjects: 0,
    controllers: 0,
    colliders: 0,
    bodies: 0,
    objectNames: "",
  };
  private readonly controllers: Array<GUIController> = [];

  constructor() {
    this.gui = new GUI({ name: "Scene Inspector" });
    this.gui.domElement.style.position = "fixed";
    this.gui.domElement.style.top = "16px";
    this.gui.domElement.style.left = "16px";
    this.gui.domElement.style.zIndex = "999";

    const statsFolder = this.gui.addFolder("Stats");
    this.controllers.push(
      statsFolder.add(this.stats, "gameObjects").name("GameObjects").listen(),
      statsFolder.add(this.stats, "controllers").name("Controllers").listen(),
      statsFolder.add(this.stats, "colliders").name("Colliders").listen(),
      statsFolder.add(this.stats, "bodies").name("RigidBodies").listen(),
    );
    statsFolder.open();

    const listFolder = this.gui.addFolder("Object Names");
    this.controllers.push(
      listFolder.add(this.stats, "objectNames").name("Objects").listen(),
    );
  }

  update(world?: World): void {
    if (!world) {
      this.stats.gameObjects = 0;
      this.stats.controllers = 0;
      this.stats.colliders = 0;
      this.stats.bodies = 0;
      this.stats.objectNames = "No active scene";
      this.refresh();
      return;
    }

    const gameObjects = [...world.gameObjects];
    this.stats.gameObjects = gameObjects.length;
    this.stats.controllers = world.physics.controllerCount;
    this.stats.colliders = world.physics.world.colliders.len();
    this.stats.bodies = world.physics.world.bodies.len();
    this.stats.objectNames = gameObjects
      .map((go) => go.name || "(unnamed)")
      .join(", ");

    this.refresh();
  }

  private refresh(): void {
    for (const controller of this.controllers) {
      controller.updateDisplay();
    }
  }
}
