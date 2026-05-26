import * as THREE from "three";
import type { ContentManager } from "@/engine/contentManager";

export interface LayerDef {
  asset: string;
  spacing: number;
  sizeMin: number;
  sizeMax: number;
  sizeYMult: [number, number];
  startOffsetX: number;
  posY: number;
  posZ: number;
  posZJitter: number;
  posXJitter: number;
  parallax: number;
  recycleAfter: number;
  rotationYJitter: number;
}

interface LayerState {
  def: LayerDef;
  proto?: THREE.Object3D;
  tiles: THREE.Object3D[];
  lastCol: number;
}

export const GroundConfig = {
  tileSize: 2.0,
  columns: 28,
  rows: 2,
  startOffsetX: -10,
  recycleAfter: 10,
};

export const DEFAULT_LAYERS: LayerDef[] = [
  {
    asset: "/assets/platformer/flowers.glb",
    spacing: 2,
    sizeMin: 1.0,
    sizeMax: 1.4,
    sizeYMult: [0.9, 1.2],
    startOffsetX: -10.0,
    posY: 0.5,
    posZ: 0.1,
    posZJitter: 0.0,
    posXJitter: 0.3,
    parallax: 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  {
    asset: "/assets/platformer/flowers-tall.glb",
    spacing: 5,
    sizeMin: 0.9,
    sizeMax: 1.2,
    sizeYMult: [1.0, 1.3],
    startOffsetX: -10.0,
    posY: 0.5,
    posZ: 0.05,
    posZJitter: 0.0,
    posXJitter: 0.5,
    parallax: 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  {
    asset: "/assets/platformer/mushrooms.glb",
    spacing: 7,
    sizeMin: 0.8,
    sizeMax: 1.1,
    sizeYMult: [0.9, 1.1],
    startOffsetX: -10.0,
    posY: 0.5,
    posZ: 0.0,
    posZJitter: 0.0,
    posXJitter: 0.4,
    parallax: 1.0,
    recycleAfter: 10,
    rotationYJitter: Math.PI / 8,
  },
  {
    asset: "/assets/platformer/block-grass-curve-low.glb",
    spacing: 5,
    sizeMin: 6.0,
    sizeMax: 9.0,
    sizeYMult: [0.7, 1.1],
    startOffsetX: -20.0,
    posY: -0.5,
    posZ: -5.0,
    posZJitter: 0.5,
    posXJitter: 2.0,
    parallax: 0.55,
    recycleAfter: 10,
    rotationYJitter: 0,
  },
  {
    asset: "/assets/platformer/rocks.glb",
    spacing: 6,
    sizeMin: 20.0,
    sizeMax: 30.0,
    sizeYMult: [1.1, 2.0],
    startOffsetX: -30.0,
    posY: -2.0,
    posZ: -15.0,
    posZJitter: 2.0,
    posXJitter: 3.0,
    parallax: 0.25,
    recycleAfter: 15,
    rotationYJitter: Math.PI / 8,
  },
];

export class ParallaxSystem {
  private groundProto?: THREE.Object3D;
  private groundTiles: THREE.Object3D[] = [];
  private layers: LayerState[];

  scrollSpeed = 2.0;

  constructor(
    private scene: THREE.Scene,
    private contentManager: ContentManager,
    layersConfig: LayerDef[] = DEFAULT_LAYERS,
  ) {
    this.layers = layersConfig.map((def) => ({
      def,
      proto: undefined,
      tiles: [],
      lastCol: 0,
    }));
  }

  async loadAssets(): Promise<void> {
    const load = (p: string) => this.contentManager.loadGLTF(p);

    const groundGltf = await load("/assets/platformer/block-grass.glb");
    this.groundProto = groundGltf.scene;

    const gltfs = await Promise.all(
      this.layers.map((l) => load(l.def.asset)),
    );
    gltfs.forEach((gltf, i) => {
      this.layers[i].proto = gltf.scene;
    });
  }

  seedTiles(): void {
    for (let col = 0; col < GroundConfig.columns; col++) {
      this.spawnGroundColumn(col);
    }

    for (const layer of this.layers) {
      for (let col = 0; col < GroundConfig.columns; col++) {
        this.trySpawnLayerTile(layer, col);
      }
      layer.lastCol = GroundConfig.columns - 1;
    }
  }

  update(dt: number): void {
    const shift = this.scrollSpeed * dt;

    for (const tile of this.groundTiles) tile.position.x -= shift;
    this.recycleGround();

    for (const layer of this.layers) {
      for (const tile of layer.tiles) tile.position.x -= shift * layer.def.parallax;
      this.recycleLayer(layer);
    }
  }

  dispose(): void {
    for (const tile of this.groundTiles) {
      this.scene.remove(tile);
      tile.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    this.groundTiles.length = 0;

    for (const layer of this.layers) {
      for (const tile of layer.tiles) {
        this.scene.remove(tile);
        tile.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
      layer.tiles.length = 0;
    }
  }

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
      this.scene.add(mesh);
      this.groundTiles.push(mesh);
    }
  }

  private recycleGround(): void {
    const { tileSize, recycleAfter } = GroundConfig;
    const leftEdge = -(tileSize * recycleAfter);

    for (const tile of this.groundTiles) {
      if (tile.position.x < leftEdge) {
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

  private trySpawnLayerTile(layer: LayerState, col: number): void {
    if (!layer.proto) return;
    if (col - layer.lastCol < layer.def.spacing) return;
    layer.lastCol = col;
    this.spawnLayerTile(layer, col * GroundConfig.tileSize + layer.def.startOffsetX);
  }

  private spawnLayerTile(layer: LayerState, worldX: number): void {
    if (!layer.proto) return;
    const { def } = layer;

    const mesh = layer.proto.clone();

    const s = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
    const sy =
      s *
      (def.sizeYMult[0] +
        Math.random() * (def.sizeYMult[1] - def.sizeYMult[0]));
    mesh.scale.set(s, sy, s);

    mesh.position.set(
      worldX + (Math.random() - 0.5) * def.posXJitter,
      def.posY,
      def.posZ + (Math.random() - 0.5) * def.posZJitter,
    );
    mesh.rotation.y = Math.random() * (def.rotationYJitter ?? 0);

    this.scene.add(mesh);
    layer.tiles.push(mesh);
  }

  private recycleLayer(layer: LayerState): void {
    const { def } = layer;
    const leftEdge = -(GroundConfig.tileSize * def.recycleAfter);

    let maxX = -Infinity;
    for (const t of layer.tiles) maxX = Math.max(maxX, t.position.x);

    for (const tile of layer.tiles) {
      if (tile.position.x < leftEdge) {
        maxX += def.spacing * GroundConfig.tileSize;

        tile.position.set(
          maxX + (Math.random() - 0.5) * def.posXJitter,
          def.posY,
          def.posZ + (Math.random() - 0.5) * def.posZJitter,
        );
        const s =
          def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
        const sy =
          s *
          (def.sizeYMult[0] +
            Math.random() * (def.sizeYMult[1] - def.sizeYMult[0]));
        tile.scale.set(s, sy, s);
        tile.rotation.y = Math.random() * (def.rotationYJitter ?? 0);
      }
    }
  }
}
