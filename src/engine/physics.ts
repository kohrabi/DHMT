import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Docs: https://threejs.org/docs/#RapierPhysics

const frameRate = 60;

const _scale = new THREE.Vector3(1, 1, 1);
const ZERO = new THREE.Vector3();

function getShape(
  geometry:
    | THREE.BufferGeometry
    | THREE.BoxGeometry
    | THREE.SphereGeometry
    | THREE.CylinderGeometry
    | THREE.CapsuleGeometry
    | RoundedBoxGeometry,
) {
  // if (geometry instanceof RoundedBoxGeometry) {
  //   const sx =
  //     geometry.parameters.width !== undefined
  //       ? geometry.parameters.width / 2
  //       : 0.5;
  //   const sy =
  //     geometry.parameters.height !== undefined
  //       ? geometry.parameters.height / 2
  //       : 0.5;
  //   const sz =
  //     geometry.parameters.depth !== undefined
  //       ? geometry.parameters.depth / 2
  //       : 0.5;
  //   const radius =
  //     geometry.parameters.radius !== undefined
  //       ? geometry.parameters.radius
  //       : 0.1;

  //   return RAPIER.ColliderDesc.roundCuboid(
  //     sx - radius,
  //     sy - radius,
  //     sz - radius,
  //     radius,
  //   );
  // } else
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
      geometry.parameters.radius !== undefined ? geometry.parameters.radius : 1;
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

/**
 * @classdesc Can be used to include Rapier as a Physics engine into
 * `three.js` apps. The API can be initialized via:
 * ```js
 * const physics = await RapierPhysics();
 * ```
 * The component automatically imports Rapier from a CDN so make sure
 * to use the component with an active Internet connection.
 *
 * @name RapierPhysics
 * @class
 * @hideconstructor
 * @three_import import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
import * as THREE from 'three';
 */
async function RapierPhysics() {
  // Docs: https://rapier.rs/docs/api/javascript/JavaScript3D/
  await RAPIER.init();

  const gravity = new THREE.Vector3(0.0, -9.81, 0.0);
  const world = new RAPIER.World({ gravity });

  const meshes: THREE.Mesh[] = [];
  const meshMap = new WeakMap();

  const _vector = new THREE.Vector3();
  const _quaternion = new THREE.Quaternion();
  const _matrix = new THREE.Matrix4();

  function addScene(scene: THREE.Scene) {
    scene.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        const physics = child.userData.physics;

        if (physics) {
          addMesh(child, physics.mass, physics.restitution);
        }
      }
    });
  }

  function addMesh(mesh: THREE.Mesh, mass = 0, restitution = 0) {
    const shape = getShape(mesh.geometry);

    if (shape === null) return;

    shape.setMass(mass);
    shape.setRestitution(restitution);

    const { body, collider } =
      mesh instanceof THREE.InstancedMesh
        ? createInstancedBody(mesh, mass, shape)
        : createBody(mesh.position, mesh.quaternion, mass, shape);

    if (!mesh.userData.physics) mesh.userData.physics = {};

    mesh.userData.physics.body = body;
    mesh.userData.physics.collider = collider;

    if (mass > 0) {
      meshes.push(mesh);
      meshMap.set(mesh, { body, collider });
    }
  }

  function removeMesh(mesh: THREE.Mesh) {
    const index = meshes.indexOf(mesh);

    if (index !== -1) {
      meshes.splice(index, 1);
      meshMap.delete(mesh);

      if (!mesh.userData.physics) return;

      const body = mesh.userData.physics.body;
      const collider = mesh.userData.physics.collider;

      if (body) removeBody(body);
      if (collider) removeCollider(collider);
    }
  }

  function createInstancedBody(
    mesh: THREE.InstancedMesh,
    mass: number,
    shape: RAPIER.ColliderDesc,
  ) {
    const array = mesh.instanceMatrix.array;

    const bodies = [];
    const colliders = [];

    for (let i = 0; i < mesh.count; i++) {
      const position = _vector.fromArray(array, i * 16 + 12);
      const { body, collider } = createBody(position, null, mass, shape);
      bodies.push(body);
      colliders.push(collider);
    }

    return { body: bodies, collider: colliders };
  }

  function createBody(
    position: THREE.Vector3,
    quaternion: THREE.Quaternion | null,
    mass: number,
    shape: RAPIER.ColliderDesc,
  ) {
    const desc =
      mass > 0 ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
    desc.setTranslation(position.x, position.y, position.z);
    if (quaternion !== null) desc.setRotation(quaternion);

    const body = world.createRigidBody(desc);
    const collider = world.createCollider(shape, body);

    return { body, collider };
  }

  function removeBody(body: RAPIER.RigidBody | RAPIER.RigidBody[]) {
    if (Array.isArray(body)) {
      for (let i = 0; i < body.length; i++) {
        world.removeRigidBody(body[i]);
      }
    } else {
      world.removeRigidBody(body);
    }
  }

  function removeCollider(collider: RAPIER.Collider | RAPIER.Collider[]) {
    if (Array.isArray(collider)) {
      for (let i = 0; i < collider.length; i++) {
        world.removeCollider(collider[i], false);
      }
    } else {
      world.removeCollider(collider, false);
    }
  }

  function setMeshPosition(
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    index = 0,
  ) {
    let { body } = meshMap.get(mesh);

    if (mesh instanceof THREE.InstancedMesh) {
      body = body[index];
    }

    body.setAngvel(ZERO);
    body.setLinvel(ZERO);
    body.setTranslation(position);
  }

  function setMeshVelocity(
    mesh: THREE.Mesh,
    velocity: THREE.Vector3,
    index = 0,
  ) {
    let { body } = meshMap.get(mesh);

    if (mesh instanceof THREE.InstancedMesh) {
      body = body[index];
    }

    body.setLinvel(velocity);
  }

  function addHeightfield(
    mesh: THREE.Mesh,
    width: number,
    depth: number,
    heights: Float32Array,
    scale: RAPIER.Vector3,
  ) {
    const shape = RAPIER.ColliderDesc.heightfield(width, depth, heights, scale);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    bodyDesc.setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
    bodyDesc.setRotation(mesh.quaternion);

    const body = world.createRigidBody(bodyDesc);
    world.createCollider(shape, body);

    if (!mesh.userData.physics) mesh.userData.physics = {};
    mesh.userData.physics.body = body;

    return body;
  }

  //

  const timer = new THREE.Timer();

  function step() {
    timer.update();

    world.timestep = timer.getDelta();
    world.step();

    //

    for (let i = 0, l = meshes.length; i < l; i++) {
      const mesh = meshes[i];

      if (mesh instanceof THREE.InstancedMesh) {
        const array = mesh.instanceMatrix.array;
        const { body: bodies } = meshMap.get(mesh);

        for (let j = 0; j < bodies.length; j++) {
          const body = bodies[j];

          const position = body.translation();
          _quaternion.copy(body.rotation());

          _matrix.compose(position, _quaternion, _scale).toArray(array, j * 16);
        }

        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      } else {
        const { body } = meshMap.get(mesh);

        mesh.position.copy(body.translation());
        mesh.quaternion.copy(body.rotation());
      }
    }
  }

  // animate

  let intervalId: ReturnType<typeof setInterval> | null = null;

  intervalId = setInterval(step, 1000 / frameRate);

  function dispose() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // clear tracked meshes
    meshes.length = 0;

    // free rapier world (if available in your build)
    world.free?.();
  }

  return {
    RAPIER,
    world,
    /**
     * Adds the given scene to this physics simulation. Only meshes with a
     * `physics` object in their {@link Object3D#userData} field will be honored.
     * The object can be used to store the mass and restitution of the mesh. E.g.:
     * ```js
     * box.userData.physics = { mass: 1, restitution: 0 };
     * ```
     *
     * @method
     * @name RapierPhysics#addScene
     * @param {Object3D} scene The scene or any type of 3D object to add.
     */
    addScene: addScene,

    /**
     * Adds the given mesh to this physics simulation.
     *
     * @method
     * @name RapierPhysics#addMesh
     * @param {Mesh} mesh The mesh to add.
     * @param {number} [mass=0] The mass in kg of the mesh.
     * @param {number} [restitution=0] The restitution of the mesh, usually from 0 to 1. Represents how "bouncy" objects are when they collide with each other.
     */
    addMesh: addMesh,

    /**
     * Removes the given mesh from this physics simulation.
     *
     * @method
     * @name RapierPhysics#removeMesh
     * @param {Mesh} mesh The mesh to remove.
     */
    removeMesh: removeMesh,

    /**
     * Set the position of the given mesh which is part of the physics simulation. Calling this
     * method will reset the current simulated velocity of the mesh.
     *
     * @method
     * @name RapierPhysics#setMeshPosition
     * @param {Mesh} mesh The mesh to update the position for.
     * @param {Vector3} position - The new position.
     * @param {number} [index=0] - If the mesh is instanced, the index represents the instanced ID.
     */
    setMeshPosition: setMeshPosition,

    /**
     * Set the velocity of the given mesh which is part of the physics simulation.
     *
     * @method
     * @name RapierPhysics#setMeshVelocity
     * @param {Mesh} mesh The mesh to update the velocity for.
     * @param {Vector3} velocity - The new velocity.
     * @param {number} [index=0] - If the mesh is instanced, the index represents the instanced ID.
     */
    setMeshVelocity: setMeshVelocity,

    /**
     * Adds a heightfield terrain to the physics simulation.
     *
     * @method
     * @name RapierPhysics#addHeightfield
     * @param {Mesh} mesh - The Three.js mesh representing the terrain.
     * @param {number} width - The number of vertices along the width (x-axis) of the heightfield.
     * @param {number} depth - The number of vertices along the depth (z-axis) of the heightfield.
     * @param {Float32Array} heights - Array of height values for each vertex in the heightfield.
     * @param {Object} scale - Scale factors for the heightfield dimensions.
     * @param {number} scale.x - Scale factor for width.
     * @param {number} scale.y - Scale factor for height.
     * @param {number} scale.z - Scale factor for depth.
     * @returns {RigidBody} The created Rapier rigid body for the heightfield.
     */
    addHeightfield: addHeightfield,
    dispose: dispose,
  };
}

export { RapierPhysics };
