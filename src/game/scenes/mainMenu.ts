import { Scene } from "@/engine";
import * as Global from "@/global";
import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { Font } from "three/addons/loaders/FontLoader.js";
import { Scene2 } from "./scene2";

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE-WIDE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

const SceneConfig = {
  scrollSpeed  : 2.0,   // world units / second — how fast everything moves left
  camera: {
    y : 4.0,            // camera height
    z : 8.0,            // camera distance from origin
    lookAtYFrac: 0.6,   // fraction of camera.y to look at (vertical target)
  },
  title: {
    y    : 3.5,         // world Y of the 3D title text
    bobAmp : 0.08,      // bob amplitude (units)
    bobFreq: 1.4,       // bob frequency (rad/s)
    rockFreq: 0.6,      // left-right rock frequency (rad/s)
    rockAmp: 0.04,      // rock amplitude (rad)
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GROUND STRIP CONFIG  (flat block-grass tiles)
// ═══════════════════════════════════════════════════════════════════════════════

const GroundConfig = {
  tileSize    : 2.0,   // world-space width & height of each tile
  columns     : 28,    // number of tiles to keep alive horizontally
  rows        : 2,     // how many tiles to stack below each column
  startOffsetX: -10,   // initial X offset so the strip starts behind the camera
  recycleAfter: 10,    // recycle when tile.x < -(tileSize * recycleAfter)
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DECORATION LAYER CONFIG
//  Each entry fully describes one scrolling object type.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Static description of a scrolling decoration layer.
 *
 * spacing      – spawn one object every N ground-tile-widths
 * sizeMin/Max  – uniform scale range; actual scale = random(sizeMin, sizeMax)
 * sizeYMult    – multiplied onto the Y component so you can make things taller/shorter independently
 * posY         – world Y of spawned objects
 * posZ         – world Z depth (negative = further back)
 * posZJitter   – ± random added to posZ each spawn
 * posXJitter   – ± random added to posX each spawn
 * parallax     – scroll fraction relative to scrollSpeed (1 = foreground, 0 = static)
 * recycleAfter – recycle when tile.x < -(tileSize * recycleAfter)
 * asset        – glTF path (filled in after loading)
 */
interface LayerDef {
  asset        : string;
  spacing      : number;
  sizeMin      : number;
  sizeMax      : number;
  sizeYMult    : [number, number]; // [min, max] multiplier for Y scale randomisation
  startOffsetX : number; // optional initial X offset for the first spawn in this layer
  posY         : number;
  posZ         : number;
  posZJitter   : number;
  posXJitter   : number;
  parallax     : number;
  recycleAfter : number;
  rotationYJitter: number; // optional ± random Y rotation (radians)
}

/** Runtime state per layer (tiles alive in the scene + tracking cursor). */
interface LayerState {
  def      : LayerDef;
  proto?   : THREE.Object3D;   // loaded prototype (set after loadAssets)
  tiles    : THREE.Object3D[];
  lastCol  : number;           // last column index at which a tile was spawned
}

// ─── Layer definitions ────────────────────────────────────────────────────────
// Edit anything here to tweak a layer — no other code needs changing.

const LAYERS: LayerDef[] = [
  // ── Flowers / mushrooms (foreground, on top of the grass) ──────────────────
  {
    asset       : "/assets/platformer/flowers.glb",
    spacing     : 2,
    sizeMin     : 1.0,
    sizeMax     : 1.4,
    sizeYMult   : [0.9, 1.2],
    startOffsetX : -10.0,
    posY        : 0.5,
    posZ        : 0.1,
    posZJitter  : 0.0,
    posXJitter  : 0.3,
    parallax    : 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  // ── Tall flowers (foreground, alternated with short flowers) ────────────────
  {
    asset       : "/assets/platformer/flowers-tall.glb",
    spacing     : 5,
    sizeMin     : 0.9,
    sizeMax     : 1.2,
    sizeYMult   : [1.0, 1.3],
    startOffsetX : -10.0,
    posY        : 0.5,
    posZ        : 0.05,
    posZJitter  : 0.0,
    posXJitter  : 0.5,
    parallax    : 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  // ── Mushrooms (foreground, sparse) ─────────────────────────────────────────
  {
    asset       : "/assets/platformer/mushrooms.glb",
    spacing     : 7,
    sizeMin     : 0.8,
    sizeMax     : 1.1,
    sizeYMult   : [0.9, 1.1],
    startOffsetX : -10.0,
    posY        : 0.5,
    posZ        : 0.0,
    posZJitter  : 0.0,
    posXJitter  : 0.4,
    parallax    : 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  // ── Grass-curve-low hills (mid-ground) ─────────────────────────────────────
  {
    asset       : "/assets/platformer/block-grass-curve-low.glb",
    spacing     : 5,
    sizeMin     : 6.0,
    sizeMax     : 9.0,
    sizeYMult   : [0.7, 1.1],
    startOffsetX : -20.0,
    posY        : -0.5,
    posZ        : -5.0,
    posZJitter  : 0.5,
    posXJitter  : 2.0,
    parallax    : 0.55,
    recycleAfter: 10,
    rotationYJitter: 0,
  },
  // ── Rock mountains (far background) ────────────────────────────────────────
  {
    asset       : "/assets/platformer/rocks.glb",
    spacing     : 6,
    sizeMin     : 20.0,
    sizeMax     : 30.0,
    sizeYMult   : [1.1, 2.0],
    startOffsetX : -30.0,
    posY        : -2.0,
    posZ        : -15.0,
    posZJitter  : 2.0,
    posXJitter  : 3.0,
    parallax    : 0.25,
    recycleAfter: 15,
    rotationYJitter: Math.PI / 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN MENU SCENE
// ═══════════════════════════════════════════════════════════════════════════════

export class MainMenu extends Scene {
  // ── Ground strip ────────────────────────────────────────────────────────────
  private groundProto?  : THREE.Object3D;
  private groundTiles   : THREE.Object3D[] = [];

  // ── Generic decoration layers ───────────────────────────────────────────────
  private layers        : LayerState[] = LAYERS.map((def) => ({
    def,
    proto : undefined,
    tiles : [],
    lastCol: 0,
  }));

  // ── Title & UI ──────────────────────────────────────────────────────────────
  private titleGroup?   : THREE.Group;
  private skyTexture?   : THREE.Texture;
  private animTime      = 0;
  private scrollOffset  = 0;

  constructor() {
    super("mainMenu");
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  protected async loadContent(): Promise<void> {
    this.skyTexture = this.buildSkyGradient();
    this.world.scene.background = this.skyTexture;

    // Lighting
    const sun = new THREE.DirectionalLight(0xfff5d6, 2.5);
    sun.position.set(5, 12, 4);
    this.world.scene.add(sun);
    this.world.scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x6bbf5a, 1.8));

    // Camera
    const { y, z, lookAtYFrac } = SceneConfig.camera;
    this.camera.position.set(0, y, z);
    this.camera.lookAt(0, y * lookAtYFrac, 0);

    // Load assets
    await this.loadAssets();

    // Seed ground
    for (let col = 0; col < GroundConfig.columns; col++) {
      this.spawnGroundColumn(col);
    }

    // Seed decoration layers
    for (const layer of this.layers) {
      for (let col = 0; col < GroundConfig.columns; col++) {
        this.trySpawnLayerTile(layer, col);
      }
      layer.lastCol = GroundConfig.columns - 1;
    }

    await this.buildTitle();
    this.showMenuUI();
  }

  public update(): void {
    super.update();
    const dt = this.world.timer.delta;
    this.animTime   += dt;
    this.scrollOffset += SceneConfig.scrollSpeed * dt;

    const shift = SceneConfig.scrollSpeed * dt;

    // Scroll ground tiles (full speed)
    for (const tile of this.groundTiles) tile.position.x -= shift;
    this.recycleGround();

    // Scroll & recycle each decoration layer at its own parallax speed
    for (const layer of this.layers) {
      for (const tile of layer.tiles) tile.position.x -= shift * layer.def.parallax;
      this.recycleLayer(layer);
    }

    // Animate title
    const { bobAmp, bobFreq, rockFreq, rockAmp, y: titleY } = SceneConfig.title;
    if (this.titleGroup) {
      this.titleGroup.position.y = titleY + Math.sin(this.animTime * bobFreq) * bobAmp;
      this.titleGroup.rotation.y = Math.sin(this.animTime * rockFreq) * rockAmp;
    }
  }

  public async deactivate(): Promise<void> {
    this.cleanupUI();
    await super.deactivate();
    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = undefined;
      this.world.scene.background = null;
    }
  }

  // ─── Asset loading ─────────────────────────────────────────────────────────

  private async loadAssets(): Promise<void> {
    const load = (p: string) => this.content.loadGLTF(p);

    // Ground
    const groundGltf = await load("/assets/platformer/block-grass.glb");
    this.groundProto = groundGltf.scene;

    // All decoration layers in parallel
    const gltfs = await Promise.all(
      this.layers.map((l) => load(l.def.asset))
    );
    gltfs.forEach((gltf, i) => {
      this.layers[i].proto = gltf.scene;
    });
  }

  // ─── Ground strip ──────────────────────────────────────────────────────────

  private spawnGroundColumn(col: number): void {
    if (!this.groundProto) return;
    const { tileSize, rows, startOffsetX } = GroundConfig;

    for (let row = 0; row < rows; row++) {
      const mesh = this.groundProto.clone();
      mesh.position.set(
        col * tileSize + startOffsetX,
        -row * tileSize - tileSize * 0.75,
        0,
      );
      mesh.scale.setScalar(tileSize);
      this.world.scene.add(mesh);
      this.groundTiles.push(mesh);
    }
  }

  private recycleGround(): void {
    const { tileSize, recycleAfter } = GroundConfig;
    const leftEdge = -(tileSize * recycleAfter);

    for (const tile of this.groundTiles) {
      if (tile.position.x < leftEdge) {
        // Jump to just past the rightmost tile in the same row
        let maxX = -Infinity;
        for (const t of this.groundTiles) {
          if (t.position.y === tile.position.y && t !== tile) {
            maxX = Math.max(maxX, t.position.x);
          }
        }
        tile.position.x = (maxX === -Infinity ? 0 : maxX) + tileSize;
      }
    }
  }

  // ─── Generic decoration layer ───────────────────────────────────────────────

  /**
   * Attempt to spawn one tile for `layer` at column index `col`.
   * Does nothing if `col` hasn't advanced enough past the last spawn.
   */
  private trySpawnLayerTile(layer: LayerState, col: number): void {
    if (!layer.proto) return;
    if (col - layer.lastCol < layer.def.spacing) return;
    layer.lastCol = col;

    this.spawnLayerTile(layer, col * GroundConfig.tileSize + layer.def.startOffsetX);
  }

  /** Unconditionally clone and place one tile at world X `worldX`. */
  private spawnLayerTile(layer: LayerState, worldX: number): void {
    if (!layer.proto) return;
    const { def } = layer;

    const mesh = layer.proto.clone();

    const s = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
    const sy = s * (def.sizeYMult[0] + Math.random() * (def.sizeYMult[1] - def.sizeYMult[0]));
    mesh.scale.set(s, sy, s);

    mesh.position.set(
      worldX + (Math.random() - 0.5) * def.posXJitter,
      def.posY,
      def.posZ + (Math.random() - 0.5) * def.posZJitter,
    );
    mesh.rotation.y = Math.random() * (def.rotationYJitter ?? 0);

    this.world.scene.add(mesh);
    layer.tiles.push(mesh);
  }

  /**
   * Recycle any tile in `layer` that has scrolled off the left edge.
   * The tile is teleported to just past the current rightmost tile in that layer.
   */
  private recycleLayer(layer: LayerState): void {
    const { def } = layer;
    const leftEdge = -(GroundConfig.tileSize * def.recycleAfter);

    // Find current rightmost X before mutating anything
    let maxX = -Infinity;
    for (const t of layer.tiles) maxX = Math.max(maxX, t.position.x);

    for (const tile of layer.tiles) {
      if (tile.position.x < leftEdge) {
        // Advance the cursor and teleport
        maxX += def.spacing * GroundConfig.tileSize;

        tile.position.set(
          maxX + (Math.random() - 0.5) * def.posXJitter,
          def.posY,
          def.posZ + (Math.random() - 0.5) * def.posZJitter,
        );
        const s = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
        const sy = s * (def.sizeYMult[0] + Math.random() * (def.sizeYMult[1] - def.sizeYMult[0]));
        tile.scale.set(s, sy, s);
        tile.rotation.y = Math.random() * (def.rotationYJitter ?? 0);
      }
    }
  }

  // ─── 3-D title ─────────────────────────────────────────────────────────────

  private async buildTitle(): Promise<void> {
    let font: Font | undefined;
    try {
      font = await this.content.loadFont("/assets/fonts/Super Mario 256_Regular.json");
    } catch (e) {
      console.warn("[MainMenu] Could not load Mario font, skipping 3D title.", e);
      return;
    }

    const geometry = new TextGeometry("SUPER MARIO", {
      font,
      size          : 0.8,
      depth         : 0.2,
      curveSegments : 6,
      bevelEnabled  : true,
      bevelThickness: 0.04,
      bevelSize     : 0.025,
      bevelSegments : 4,
    });
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const centerX = (bb.max.x - bb.min.x) / 2;

    const matFill = new THREE.MeshStandardMaterial({
      color    : 0xffe033,
      roughness: 0.3,
      metalness: 0.15,
    });

    const titleMesh   = new THREE.Mesh(geometry, matFill);
    titleMesh.position.set(-centerX, 0, 0);

    this.titleGroup = new THREE.Group();
    this.titleGroup.add(titleMesh);
    this.titleGroup.position.set(0, SceneConfig.title.y, -0.5);
    this.world.scene.add(this.titleGroup);
  }

  // ─── Sky gradient ──────────────────────────────────────────────────────────

  private buildSkyGradient(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 4; canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.00, "#1a87e8");
    grad.addColorStop(0.40, "#5cb8ff");
    grad.addColorStop(0.75, "#a8dfff");
    grad.addColorStop(1.00, "#d4f0ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // ─── HTML overlay UI ───────────────────────────────────────────────────────

  private showMenuUI(): void {
    const style = document.createElement("style");
    style.id = "main-menu-style";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

      #main-menu-ui {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        padding-bottom: 14vh;
        pointer-events: none;
        font-family: 'Press Start 2P', monospace;
      }

      .menu-card {
        pointer-events: all;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        background: rgba(10, 5, 30, 0.55);
        border: 3px solid rgba(255, 220, 50, 0.55);
        border-radius: 18px;
        padding: 28px 48px;
        box-shadow:
          0 0 40px rgba(255, 200, 0, 0.25),
          inset 0 0 30px rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .menu-btn {
        cursor: pointer;
        font-family: 'Press Start 2P', monospace;
        font-size: 0.75rem;
        letter-spacing: 2px;
        padding: 14px 34px;
        border-radius: 12px;
        border: 3px solid transparent;
        outline: none;
        transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
        position: relative;
        overflow: hidden;
      }

      .menu-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%);
        border-radius: inherit;
        pointer-events: none;
      }

      .menu-btn:active { transform: scale(0.95) translateY(2px); }

      #start-btn {
        background: linear-gradient(135deg, #e84a0c 0%, #ff7520 60%, #ffa040 100%);
        border-color: #ffd080;
        color: #fff8e0;
        text-shadow: 1px 2px 0 #882200;
        box-shadow: 0 6px 0 #992200, 0 8px 20px rgba(255,100,0,0.5);
        animation: btn-bounce 1.8s ease-in-out infinite;
      }

      @keyframes btn-bounce {
        0%, 100% { box-shadow: 0 6px 0 #992200, 0 8px 20px rgba(255,100,0,0.5); transform: translateY(0); }
        50%       { box-shadow: 0 9px 0 #992200, 0 12px 28px rgba(255,100,0,0.6); transform: translateY(-4px); }
      }

      #start-btn:hover {
        filter: brightness(1.15);
        animation-play-state: paused;
        transform: translateY(-3px);
        box-shadow: 0 9px 0 #992200, 0 14px 32px rgba(255,100,0,0.7);
      }

      #settings-btn {
        background: linear-gradient(135deg, #1a5fb4 0%, #3584e4 60%, #62a0ea 100%);
        border-color: #80c0ff;
        color: #e0f0ff;
        text-shadow: 1px 2px 0 #0a2a6e;
        box-shadow: 0 5px 0 #0d3070, 0 7px 16px rgba(30,90,200,0.45);
        font-size: 0.6rem;
      }

      #settings-btn:hover {
        filter: brightness(1.2);
        transform: translateY(-2px);
        box-shadow: 0 8px 0 #0d3070, 0 12px 24px rgba(30,90,200,0.55);
      }
    `;
    document.head.appendChild(style);

    const menuContainer = document.createElement("div");
    menuContainer.id = "main-menu-ui";
    menuContainer.innerHTML = `
      <div class="menu-card">
        <button id="start-btn" class="menu-btn">▶ START GAME</button>
        <button id="settings-btn" class="menu-btn">⚙ SETTINGS</button>
      </div>
    `;
    document.body.appendChild(menuContainer);

    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.cleanupUI();
      Global.sceneManager.setScene(new Scene2());
    });
  }

  private cleanupUI(): void {
    document.getElementById("main-menu-ui")?.remove();
    document.getElementById("main-menu-style")?.remove();
  }
}
