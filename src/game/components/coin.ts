import { Collider, Component, MeshRenderer, PhysicsWorld, CharacterController } from '@/engine';
import * as Global from '@/global';
import { sceneManager } from '../../global';
import RAPIER from '@dimforge/rapier3d-compat';
export class Coin extends Component {
  private meshRenderer!: MeshRenderer;
  private collider! : Collider;
  private originalY = 0;
  private isStarted = false;

  constructor() {
    super();
  }

  async start() : Promise<void> {
    super.start();
    const model = await this.gameObject.world.gameScene.content.loadGLTF(
      "assets/platformer/coin-gold.glb",
    );
    const modelMesh = model.scene.clone();
    modelMesh.translateY(-0.25);
    this.meshRenderer = this.gameObject.addComponent(new MeshRenderer(modelMesh));
    this.originalY = this.transform.position.y;

    this.collider = 
      this.gameObject.addComponent(
        new Collider(
          PhysicsWorld
            .getSphereShape(this.gameObject.transform, 0.25)
            .setSensor(true)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            .setActiveHooks(RAPIER.ActiveHooks.FILTER_INTERSECTION_PAIRS)
        )
    );
    this.isStarted = true;
  }

  fixedUpdate(_fixedDeltaTime: number): void {
    if (!this.isStarted) return;
    this.transform.rotateY(0.1);
    this.transform.position.y = this.originalY + 
      Math.sin(Global.timer.getElapsed() * 5 + this.gameObject.transform.position.x) * 0.1;
    
    // Check intersection with any object
    const physicsWorld = this.gameObject.world.physics.world;
    let playerCollected = false;
    
    physicsWorld.intersectionPairsWith(this.collider.Collider, (otherCollider) => {
      // Find the GameObject with this collider
      for (const go of this.gameObject.world.gameObjects) {
        // Player has CharacterController which holds its collider
        const charController = go.getComponent(CharacterController);
        const regularCollider = go.getComponent(Collider);
        
        if ( charController?.Collider.handle === otherCollider.handle || 
             regularCollider?.Collider.handle === otherCollider.handle ) {
          
          if (charController) {
            playerCollected = true;
          }
          break;
        }
      }
    });

    if (playerCollected) {
      console.log("Coin collected by player!");
      this.gameObject.world.remove(this.gameObject);
    }
  }
}