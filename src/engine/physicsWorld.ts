import RAPIER, { QueryFilterFlags } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { GameObject } from "./gameObject";

const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
const ZERO = new RAPIER.Vector3(0.0, 0.0, 0.0);
const frameRate = 60;
const _scale = new THREE.Vector3(1, 1, 1);

export class PhysicsWorld {
  readonly world = new RAPIER.World(gravity);

  readonly colliderGameObjectMap: Map<RAPIER.Collider, GameObject> = new Map();

  readonly _vector = new THREE.Vector3();
  readonly _quaternion = new THREE.Quaternion();
  readonly _matrix = new THREE.Matrix4();
  readonly timer = new THREE.Timer();
  readonly eventQueue: RAPIER.EventQueue = new RAPIER.EventQueue(true);
  readonly containPairs : Map<number, number> = new Map();
  readonly pendingRemovals: Set<RAPIER.Collider> = new Set();
  private readonly controllers: Set<RAPIER.KinematicCharacterController> = new Set();

  private intervalId: ReturnType<typeof setInterval> | null = null;

  public onFixedStep?: (fdt: number) => void;
  /** Fired when two NON-sensor colliders start/stop touching. */
  public onCollision?: (go1: GameObject, go2: GameObject, started: boolean) => void;
  /** Fired when a SENSOR collider overlaps with any other collider. */
  public onIntersection?: (go1: GameObject, go2: GameObject, intersecting: boolean) => void;

  constructor() {
    this.intervalId = setInterval(() => this.step(), 1000 / frameRate);
  }

  public dispose() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // clear tracked meshes
    // this.meshes.length = 0;

    // free rapier world (if available in your build)
    this.world.free?.();
  }

  step() {
    
    this.timer.update();
    
    this.world.timestep = this.timer.getDelta();
    this.world.step();
    
    this.containPairs.clear();
    
    // Solid vs solid contacts
    // this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    //   this.containPairs.set(handle1, handle2);
    //   console.log("Collision event:", handle1, handle2, started);
    // });
      
      
    try {
      // console.log("Colliders", this.world.colliders.len());
      this.onFixedStep?.(frameRate / 1000);
    } catch (error) {
      console.error("Error during physics step:", error);
    }
      
    try {
      for (const collider of this.pendingRemovals) {
        this.world.removeCollider(collider, true);
        console.log("Removed collider:", collider.handle);
      }
      this.pendingRemovals.clear();
    } catch (error) {
      console.error("Error during collider removal:", error);
    }
  }

  public registerCollider(collider: RAPIER.Collider, gameObject: GameObject) {
    this.colliderGameObjectMap.set(collider, gameObject);
  }

  public unregisterCollider(collider: RAPIER.Collider) {
    this.colliderGameObjectMap.delete(collider);
    
  }

  public getGameObjectFromCollider(collider: RAPIER.Collider): GameObject | undefined {
    return this.colliderGameObjectMap.get(collider);
  }

  public removeCollider(collider: RAPIER.Collider) {
    collider.setEnabled(false);
    this.pendingRemovals.add(collider);
    this.colliderGameObjectMap.delete(collider);
    console.log("Scheduled collider for removal:", collider.handle);
  }

  /**
   * Adds the given mesh to this physics simulation.
   *
   * @method
   * @name RapierPhysics#addMesh
   * @param {Mesh} mesh The mesh to add.
   * @param {number} [mass=0] The mass in kg of the mesh.
   * @param {number} [restitution=0] The restitution of the mesh, usually from 0 to 1. Represents how "bouncy" objects are when they collide with each other.
   */
  public addMesh(
    mesh: THREE.Mesh,
    mass: number = 0,
    restitution: number = 0,
    initTransform: {
      position?: THREE.Vector3;
      quaternion?: THREE.Quaternion;
    } = {},
  ) {
    const shape = PhysicsWorld.getShape(mesh.geometry);

    if (shape === null) return;

    shape.setMass(mass);
    shape.setRestitution(restitution);

    const { body, collider } =
      mesh instanceof THREE.InstancedMesh
        ? this.createInstancedBody(mesh, mass, shape, initTransform)
        : this.createBody(
            initTransform.position || mesh.position,
            initTransform.quaternion || mesh.quaternion,
            mass,
            shape,
          );
    
    

    return { body, collider };
  }

  /**
   * Adds the given geometry to this physics simulation.
   *
   * @method
   * @name RapierPhysics#addGeometry
   * @param {Geometry} geometry The geometry to add.
   * @param {number} [mass=0] The mass in kg of the geometry.
   * @param {number} [restitution=0] The restitution of the geometry, usually from 0 to 1. Represents how "bouncy" objects are when they collide with each other.
   */
  public addGeometry(
    mesh:
      | THREE.BoxGeometry
      | THREE.SphereGeometry
      | THREE.CylinderGeometry
      | THREE.CapsuleGeometry,
    mass: number = 0,
    restitution: number = 0,
    initTransform: {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
    },
  ) {
    const shape = PhysicsWorld.getShape(mesh);

    if (shape === null) return;

    shape.setMass(mass);
    shape.setRestitution(restitution);

    const { body, collider } = this.createBody(
      initTransform.position,
      initTransform.quaternion,
      mass,
      shape,
    );

    return { body, collider };
  }

  public createInstancedBody(
    mesh: THREE.InstancedMesh,
    mass: number,
    shape: RAPIER.ColliderDesc,
    initTransform: {
      position?: THREE.Vector3;
      quaternion?: THREE.Quaternion;
    } = {},
  ) {
    const bodies = [];
    const colliders = [];

    for (let i = 0; i < mesh.count; i++) {
      const position = this._vector.fromArray(
        initTransform.position?.toArray() || mesh.instanceMatrix.array,
        i * 16 + 12,
      );
      const { body, collider } = this.createBody(
        position,
        initTransform.quaternion || null,
        mass,
        shape,
      );
      bodies.push(body);
      colliders.push(collider);
    }

    return { body: bodies, collider: colliders };
  }

  public createBody(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
    mass: number,
    shape: RAPIER.ColliderDesc,
  ) {
    const desc =
      mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
    desc.setTranslation(position.x, position.y, position.z);
    if (quaternion !== null) desc.setRotation(quaternion);

    const body = this.world.createRigidBody(desc);
    const collider = this.world.createCollider(shape, body);

    return { body, collider };
  }

  public createCharacterController(
    GameObject: GameObject,
    threeShape: THREE.BufferGeometry | THREE.BoxGeometry | THREE.SphereGeometry | THREE.CylinderGeometry | THREE.CapsuleGeometry
  ) {
    
    // offset (skin width): the gap Rapier keeps between the collider and surfaces.
    // Must be > 0 so computedGrounded() is reliable every frame.
    const controller = this.world.createCharacterController(0.05);
    // Snap the player down to the ground if within this distance,
    // preventing floating / missed-ground-contact on descents.
    controller.enableSnapToGround(0.5);
    const shape = PhysicsWorld.getShape(threeShape)!;
    const collider = this.world.createCollider(shape);
    collider.setTranslation({
      x: GameObject.transform.position.x,
      y: GameObject.transform.position.y,
      z: GameObject.transform.position.z,
    });
    this.registerCollider(collider, GameObject);
    this.controllers.add(controller);
    return {
      controller,
      collider,
    };
  }

  public removeCharacterController(controller: RAPIER.KinematicCharacterController): void {
    this.controllers.delete(controller);
    this.world.removeCharacterController(controller);
  }

  get controllerCount(): number {
    return this.controllers.size;
  }

  public castShape(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    vel : THREE.Vector3,
    shape : RAPIER.Shape,
    targetDistance: number,
    maxToi: number,
  ) {
    let stopAtPenetration = true;
    let filterFlags = QueryFilterFlags.EXCLUDE_DYNAMIC;

    return this.world.castShape(
      position, quaternion, vel, 
      shape, targetDistance, maxToi, stopAtPenetration, filterFlags);
  }
  
  public static moveAndCollide(
    controller : RAPIER.KinematicCharacterController, 
    collider: RAPIER.Collider,
    transform: THREE.Object3D,
    vel: THREE.Vector3,
    filterPredicate?: (collider: RAPIER.Collider) => boolean
  ): THREE.Vector3 {
    // Do NOT use EXCLUDE_SENSORS here — sensors (coins, triggers) must
    // be included so computedCollisions() can report them.
    controller.computeColliderMovement(
      collider,
      vel,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      filterPredicate
    );

    let correctedMovement = controller.computedMovement();

    let t = collider.translation();
    collider.setTranslation({
      x: t.x + correctedMovement.x,
      y: t.y + correctedMovement.y,
      z: t.z + correctedMovement.z,
    });
    t = collider.translation();
    transform.position.set(t.x, t.y, t.z);

    return new THREE.Vector3(
      correctedMovement.x,
      correctedMovement.y,
      correctedMovement.z,
    );
  }

  public static moveAndSlide(
    controller : RAPIER.KinematicCharacterController, 
    collider: RAPIER.Collider,
    transform: THREE.Object3D,
    vel: THREE.Vector3,
    deltaTime: number,
    filterPredicate?: (collider: RAPIER.Collider) => boolean
  ): THREE.Vector3 {
    const correctedMovement = this.moveAndCollide(
      controller,
      collider,
      transform,
      vel.clone().multiplyScalar(deltaTime),
      filterPredicate
    ).divideScalar(deltaTime);

    // Update horizontal velocity in-place (slide feedback).
    // Y is intentionally left to the caller — grounding/ceiling resets
    // depend on controller state that only the caller knows.
    vel.x = correctedMovement.x;
    vel.z = correctedMovement.z;

    return correctedMovement;
  }

  public static getShape(
    geometry:
      | THREE.BufferGeometry
      | THREE.BoxGeometry
      | THREE.SphereGeometry
      | THREE.CylinderGeometry
      | THREE.CapsuleGeometry,
  ) {
    if (geometry instanceof THREE.BoxGeometry) {
      const sx =
        geometry.parameters.width !== undefined
          ? geometry.parameters.width / 2
          : 0.5;
      const sy =
        geometry.parameters.height !== undefined
          ? geometry.parameters.height / 2
          : 0.5;
      const sz =
        geometry.parameters.depth !== undefined
          ? geometry.parameters.depth / 2
          : 0.5;

      return RAPIER.ColliderDesc.cuboid(sx, sy, sz);
    } else if (
      geometry instanceof THREE.SphereGeometry ||
      geometry instanceof THREE.IcosahedronGeometry
    ) {
      const radius =
        geometry.parameters.radius !== undefined
          ? geometry.parameters.radius
          : 1;
      return RAPIER.ColliderDesc.ball(radius);
    } else if (geometry instanceof THREE.CylinderGeometry) {
      const radius =
        geometry.parameters.radiusBottom !== undefined
          ? geometry.parameters.radiusBottom
          : 0.5;
      const length =
        geometry.parameters.height !== undefined
          ? geometry.parameters.height
          : 0.5;

      return RAPIER.ColliderDesc.cylinder(length / 2, radius);
    } else if (geometry instanceof THREE.CapsuleGeometry) {
      const radius =
        geometry.parameters.radius !== undefined
          ? geometry.parameters.radius
          : 0.5;
      const length =
        geometry.parameters.height !== undefined
          ? geometry.parameters.height
          : 0.5;

      return RAPIER.ColliderDesc.capsule(length / 2, radius);
    } else if (geometry instanceof THREE.BufferGeometry) {
      const position = geometry.getAttribute("position");
      const vertex = new THREE.Vector3();
      const vertices: Float32Array = new Float32Array(position.count * 3);

      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        vertices[i * 3] = vertex.x;
        vertices[i * 3 + 1] = vertex.y;
        vertices[i * 3 + 2] = vertex.z;
      }

      // if the buffer is non-indexed, generate an index buffer
      const indices: Uint32Array =
        geometry.getIndex() === null
          ? Uint32Array.from(Array(vertices.length / 3).keys())
          : Uint32Array.from(geometry.getIndex()!.array);

      return RAPIER.ColliderDesc.trimesh(vertices, indices);
    }

    console.error("RapierPhysics: Unsupported geometry type:", typeof geometry);

    return null;
  }

  public static getBoxShape(transform: THREE.Object3D, size: THREE.Vector3) {
    const position = transform.position;
    const quaternion = transform.quaternion;
    return RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setTranslation(position.x, position.y, position.z)
      .setRotation(quaternion);
  }

  public static getSphereShape(transform: THREE.Object3D, radius: number) {
    const position = transform.position;
    const quaternion = transform.quaternion;
    return RAPIER.ColliderDesc.ball(radius)
      .setTranslation(position.x, position.y, position.z)
      .setRotation(quaternion);
  }
  
  public static 
    buildCollisionGroups(membership: number[], filter: number[]): number {
    let membershipMask = 0;
    let filterMask = 0;

    for (let i = 0; i < membership.length; i++) {
      const group = membership[i];
      if (group < 0 || group > 15) continue;
      membershipMask |= 1 << group;
    }

    for (let i = 0; i < filter.length; i++) {
      const group = filter[i];
      if (group < 0 || group > 15) continue;
      filterMask |= 1 << group;
    }

    return (membershipMask << 16) | filterMask;
  }

}
