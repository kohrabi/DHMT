import type { GameObject, World } from "@/engine";
import type { ContentManager } from "@/engine/contentManager";
import * as THREE from "three";
import { Ground } from "@/game/gameObjects/ground";
import { GroundOneWay } from "@/game/gameObjects/oneway";
import { Decorate } from "@/game/gameObjects/decorate";
import { Player } from "@/game/gameObjects/player";
import { Goomba } from "@/game/gameObjects/goomba";
import { Koopa } from "@/game/gameObjects/koopa";
import { Coin } from "@/game/gameObjects/coin";
import { Brick } from "@/game/gameObjects/brick";
import { LevelEnd } from "@/game/gameObjects/levelEnd";
import { KillZone } from "@/game/gameObjects/killzone";
import { PlayZone } from "@/game/gameObjects/playzone";
import { QuestionBlock, QuestionBlockSpawnType } from "@/game/gameObjects/questionBlock";

export type LevelObjectData = {
  model_path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  object_type: string;
  properties: Record<string, unknown>;
};

export type LevelObjectResult = {
  gameObject: GameObject | null;
  applyGenericTransform: boolean;
};

type ObjectFactory = (
  data: LevelObjectData,
  world: World,
  content: ContentManager,
) => Promise<LevelObjectResult>;

export class LevelFactory {
  private registry = new Map<string, ObjectFactory>();

  register(type: string, factory: ObjectFactory): void {
    this.registry.set(type, factory);
  }

  async create(
    data: LevelObjectData,
    world: World,
    content: ContentManager,
  ): Promise<LevelObjectResult> {
    const factory = this.registry.get(data.object_type);
    if (!factory) {
      if (data.object_type) {
        console.warn(`Unknown object type: ${data.object_type}`);
      }
      return { gameObject: null, applyGenericTransform: false };
    }
    return factory(data, world, content);
  }

  static createDefault(): LevelFactory {
    const factory = new LevelFactory();

    factory.register("Ground", createGround);
    factory.register("OneWay", createOneWay);
    factory.register("PlayerSpawn", createPlayerSpawn);
    factory.register("Goomba", createGoomba);
    factory.register("RedKoopa", createRedKoopa);
    factory.register("Koopa", createKoopa);
    factory.register("Coin", createCoin);
    factory.register("Brick", createBrick);
    factory.register("LevelEnd", createLevelEnd);
    factory.register("KillZone", createKillZone);
    factory.register("PlayZone", createPlayZone);
    factory.register("QuestionBlock", createQuestionBlock);
    factory.register("", createDecorate);

    return factory;
  }
}

async function createGround(
  data: LevelObjectData,
  world: World,
  content: ContentManager,
): Promise<LevelObjectResult> {
  const model = await content.loadGLTF(data.model_path);
  const modelMesh = model.scene.clone();

  const colliderSizeData = data.properties?.["collider_size"] as
    | [number, number, number]
    | undefined;
  const colliderSize = new THREE.Vector3(
    colliderSizeData?.[0] ?? 1,
    colliderSizeData?.[2] ?? 1,
    colliderSizeData?.[1] ?? 1,
  );

  const colliderOffsetData = data.properties?.["collider_offset"] as
    | [number, number, number]
    | undefined;
  const colliderOffset = new THREE.Vector3(
    colliderOffsetData?.[0] ?? 0,
    colliderOffsetData?.[2] ?? 0.5,
    colliderOffsetData?.[1] ?? 0,
  );

  const go = new Ground(world, modelMesh, colliderSize, colliderOffset);
  return { gameObject: go, applyGenericTransform: true };
}

async function createOneWay(
  data: LevelObjectData,
  world: World,
  content: ContentManager,
): Promise<LevelObjectResult> {
  const model = await content.loadGLTF(data.model_path);
  const modelMesh = model.scene.clone();
  const go = new GroundOneWay(world, modelMesh);
  return { gameObject: go, applyGenericTransform: true };
}

async function createPlayerSpawn(
  data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const player = new Player(world);
  player.transform.position.set(
    data.position[0],
    data.position[2] + 0.55,
    -data.position[1],
  );
  return { gameObject: player, applyGenericTransform: false };
}

async function createGoomba(
  data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const goomba = new Goomba(world);
  goomba.transform.position.set(
    data.position[0],
    data.position[2] + 0.55,
    -data.position[1],
  );
  return { gameObject: goomba, applyGenericTransform: false };
}

async function createRedKoopa(
  data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const koopa = new Koopa(world, true);
  koopa.transform.position.set(
    data.position[0],
    data.position[2] + 0.6,
    -data.position[1],
  );
  return { gameObject: koopa, applyGenericTransform: false };
}

async function createKoopa(
  data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const koopa = new Koopa(world, false);
  koopa.transform.position.set(
    data.position[0],
    data.position[2] + 0.6,
    -data.position[1],
  );
  return { gameObject: koopa, applyGenericTransform: false };
}

async function createCoin(
  _data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const go = new Coin(world);
  return { gameObject: go, applyGenericTransform: true };
}

async function createBrick(
  _data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const go = new Brick(world);
  return { gameObject: go, applyGenericTransform: true };
}

async function createLevelEnd(
  _data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const go = new LevelEnd(world);
  return { gameObject: go, applyGenericTransform: true };
}

async function createKillZone(
  _data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const go = new KillZone(world);
  return { gameObject: go, applyGenericTransform: true };
}

async function createPlayZone(
  _data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const go = new PlayZone(world);
  return { gameObject: go, applyGenericTransform: true };
}

async function createQuestionBlock(
  data: LevelObjectData,
  world: World,
  _content: ContentManager,
): Promise<LevelObjectResult> {
  const props = data.properties ?? {};
  let coinType = QuestionBlockSpawnType.COIN;
  switch (props["spawn_type"]) {
    case "COIN":
      coinType = QuestionBlockSpawnType.COIN;
      break;
    case "LEAF":
      coinType = QuestionBlockSpawnType.LEAF;
      break;
    default:
      if (props["spawn_type"]) {
        console.warn("Unknown spawn type for Question Block:", props["spawn_type"]);
      }
  }
  const spawnCount = props["spawn_count"] as number | undefined ?? 1;
  const go = new QuestionBlock(world, spawnCount, coinType);
  return { gameObject: go, applyGenericTransform: true };
}

async function createDecorate(
  data: LevelObjectData,
  world: World,
  content: ContentManager,
): Promise<LevelObjectResult> {
  const model = await content.loadGLTF(data.model_path);
  const modelMesh = model.scene.clone();
  const go = new Decorate(world, modelMesh);
  return { gameObject: go, applyGenericTransform: true };
}
