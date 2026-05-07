import { PhysicsWorld, GameObject, World } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Goomba } from './goomba';
import { Koopa } from './koopa';
import { Coin, CoinState } from './coin';
import { Mushroom } from './mushroom';

const QUESTION_BLOCK_ANIMATION_TIME = 0.5;
const QUESTION_BLOCK_ANIMATION_Y_VEL = 1;
export enum QuestionBlockSpawnType {
  COIN,
  LEAF,
  ONE_UP,
  P_BUTTON
}

export class QuestionBlock extends GameObject {
  private mesh!: THREE.Object3D;
  private collider! : RAPIER.Collider;

  private animationTimer: number = -1;
  private yOffset: number = 0
  private isHit = false;
  private hitCollider !: RAPIER.Collider;
  private spawnCount = 1;
  private spawnType = QuestionBlockSpawnType.COIN; 
  private ogY = 0;

  constructor(world : World, spawnCount : number, spawnType : QuestionBlockSpawnType) {
    super(
      `QuestionBlock_${world.gameObjects.size}`,
      world,
    );
    this.spawnCount = spawnCount;
    this.spawnType = spawnType;
  }

  async start() : Promise<void> {
    super.start();
    this.transform.position.y += 0.5;

    const shape = 
      PhysicsWorld.getBoxShape(this.transform, 
        this.transform.scale.clone().multiplyScalar(0.5))!;
    shape.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = this.world.physics.world.createCollider(shape);
    this.collider = collider;
    this.world.physics.registerCollider(collider, this);
    
    this.hitCollider = this.world.physics.world.createCollider(
      PhysicsWorld.getBoxShape(
          this.transform, 
          this.transform.scale.clone().multiplyScalar(0.5)
        )
        .setSensor(true)
    );
    this.hitCollider.setTranslation({
      x: this.transform.position.x,
      y: this.transform.position.y + 0.5,
      z: this.transform.position.z
    });
    this.world.physics.registerCollider(this.hitCollider, this);

    const model = await this.world.gameScene.content.loadGLTF(
      "assets/platformer/crate-item.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.mesh = this.transform.add(modelMesh);
    this.ogY = this.transform.position.y;
  }
  
  onDestroy(): void {
    super.onDestroy();
    try {
      this.world.physics.removeCollider(this.collider);
      this.world.physics.removeCollider(this.hitCollider);
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    } catch (error) {
      console.error("Error during brick destruction:", error);
    }
  }

  public fixedUpdate(fixedDeltaTime: number): void {
    
    if (this.animationTimer >= 0) 
    {
        this.animationTimer -= fixedDeltaTime;
        if (this.animationTimer >= QUESTION_BLOCK_ANIMATION_TIME / 2)
            this.yOffset += QUESTION_BLOCK_ANIMATION_Y_VEL * fixedDeltaTime;
        else
            this.yOffset -= QUESTION_BLOCK_ANIMATION_Y_VEL * fixedDeltaTime;
        this.yOffset = Math.max(this.yOffset, 0);
        this.mesh.position.y = this.ogY + this.yOffset;
        console.log("Question block animation timer:", this.animationTimer, "yOffset:", this.yOffset, this.mesh.position.y);
    }

    if (this.isHit)
    {
      this.world.physics.world.intersectionsWithShape(
        this.hitCollider.translation(),
        this.hitCollider.rotation(),
        this.hitCollider.shape,
        (otherCollider) => {
          const go = this.world.physics.getGameObjectFromCollider(otherCollider);
          if (go instanceof Goomba) {
            go.deadBounce(1);
          }
          else if (go instanceof Koopa) {
            go.deadBounce(1);
          }
          return true;
        }
      );
      this.isHit = false;
    }
  }

  public Hit(dx : number) : void {
    if (this.spawnCount <= 0)
      return;
    switch (this.spawnType)
    {
    case QuestionBlockSpawnType.COIN:
      {
        console.log("Spawning coin from question block");
        const coin = new Coin(this.world);
        const go = this.world.addGameObject(coin);
        coin.setState(CoinState.INTRO); 
        go.transform.position.set(this.transform.position.x, this.transform.position.y + 0.5, this.transform.position.z);
        break;
      }
    case QuestionBlockSpawnType.LEAF:
      {
        const mushroom = new Mushroom(this.world);
        this.world.addGameObject(mushroom);
        mushroom.transform.position.set(
          this.transform.position.x,
          this.transform.position.y,
          this.transform.position.z
        );
        mushroom.setDir(dx);
        break;
      }
    case QuestionBlockSpawnType.ONE_UP:
      {
        // CMario* player = dynamic_cast<CMario*>(game->GetCurrentScene()->GetPlayer());
        // LPGAMEOBJECT powerUp = NULL;
        // powerUp = new COneUp(position.x, position.y);
        // powerUp->SetNx(dx);
        // game->GetCurrentScene()->AddObject(powerUp);

      }
    break;
    case QuestionBlockSpawnType.P_BUTTON:
      {
        // CPButton* button = new CPButton(position.x, position.y - 16.0f);
        // game->GetCurrentScene()->AddObject(button);
      }
    break;
    }
    this.isHit = true;
    this.isActive = false;
    this.spawnCount--;
    this.animationTimer = QUESTION_BLOCK_ANIMATION_TIME;
  }
}