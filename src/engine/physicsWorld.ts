import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/Addons.js";

const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
const ZERO = new RAPIER.Vector3(0.0, 0.0, 0.0);
const frameRate = 60;
const _scale = new THREE.Vector3(1, 1, 1);

export class PhysicsWorld {
  readonly world = new RAPIER.World(gravity);

  readonly meshes: THREE.Mesh[] = [];
  readonly meshMap = new WeakMap();

  readonly _vector = new THREE.Vector3();
  readonly _quaternion = new THREE.Quaternion();
  readonly _matrix = new THREE.Matrix4();
  readonly timer = new THREE.Timer();

  private intervalId: ReturnType<typeof setInterval> | null = null;

  public onFixedStep?: (fdt: number) => void;

  constructor() {
    this.intervalId = setInterval(() => this.step(), 1000 / frameRate);
  }

  public dispose() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // clear tracked meshes
    this.meshes.length = 0;

    // free rapier world (if available in your build)
    this.world.free?.();
  }

  step() {
    this.timer.update();

    this.world.timestep = this.timer.getDelta();
    this.world.step();
    this.onFixedStep?.(frameRate / 1000);
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
    const shape = this.getShape(mesh.geometry);

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

    if (!mesh.userData.physics) mesh.userData.physics = {};

    mesh.userData.physics.body = body;
    mesh.userData.physics.collider = collider;

    if (mass > 0) {
      this.meshes.push(mesh);
      this.meshMap.set(mesh, { body, collider });
    }
    return { body, collider };
  }

  /**
   * Removes the given mesh from this physics simulation.
   *
   * @method
   * @name RapierPhysics#removeMesh
   * @param {Mesh} mesh The mesh to remove.
   */
  public removeMesh(mesh: THREE.Mesh) {
    const index = this.meshes.indexOf(mesh);

    if (index !== -1) {
      this.meshes.splice(index, 1);
      this.meshMap.delete(mesh);

      if (!mesh.userData.physics) return;

      const body = mesh.userData.physics.body;
      const collider = mesh.userData.physics.collider;

      if (body) this.removeBody(body);
      if (collider) this.removeCollider(collider);
    }
  }

  createInstancedBody(
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

  createBody(
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

  public removeBody(body: RAPIER.RigidBody | RAPIER.RigidBody[]) {
    if (Array.isArray(body)) {
      for (let i = 0; i < body.length; i++) {
        this.world.removeRigidBody(body[i]);
      }
    } else {
      this.world.removeRigidBody(body);
    }
  }

  public removeCollider(collider: RAPIER.Collider | RAPIER.Collider[]) {
    if (Array.isArray(collider)) {
      for (let i = 0; i < collider.length; i++) {
        this.world.removeCollider(collider[i], false);
      }
    } else {
      this.world.removeCollider(collider, false);
    }
  }

  getShape(
    geometry:
      | THREE.BufferGeometry
      | THREE.BoxGeometry
      | THREE.SphereGeometry
      | THREE.CylinderGeometry
      | THREE.CapsuleGeometry
      | RoundedBoxGeometry,
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
}
