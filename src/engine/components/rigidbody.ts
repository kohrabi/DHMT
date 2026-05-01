import { Collider, Component } from '@/engine';
import RAPIER from '@dimforge/rapier3d-compat';

export class Rigidbody extends Component {
  private rigidbody!: RAPIER.RigidBody;
  private collider!: Collider;

  constructor(private readonly mass: number) {
    super();
  }

  public start(): void {
    this.collider = this.gameObject.getComponent(Collider)!;
    const desc =
      this.mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
    desc.setTranslation(this.transform.position.x, this.transform.position.y, this.transform.position.z);
    if (this.transform.quaternion !== null) desc.setRotation(this.transform.quaternion);
    this.rigidbody = this.gameObject.world.physics.world.createRigidBody(desc);
  }
}