import { GameObject, World } from "@/engine";
import * as THREE from "three";

const sharedBoxGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);

const PARTICLE_COLORS: Record<string, number> = {
  running: 0xc4a882,
  walking: 0xddd5c8,
  jumping: 0xffffff,
  landing: 0x8b7355,
};

export class PlayerParticle extends GameObject {
  private velocity: THREE.Vector3;
  private lifetime: number;
  private maxLifetime: number;
  private mesh: THREE.Mesh;

  constructor(world: World, position: THREE.Vector3, velocity: THREE.Vector3, lifetime: number = 0.3, color: number = 0xffffff) {
    super("PlayerParticle", world);
    this.velocity = velocity;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.transform.position.copy(position);

    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(sharedBoxGeom, material);
    this.transform.add(this.mesh);
  }

  public update(deltaTime: number): void {
    this.transform.position.addScaledVector(this.velocity, deltaTime);

    this.lifetime -= deltaTime;
    const scale = Math.max(0, this.lifetime / this.maxLifetime);
    this.mesh.scale.set(scale, scale, scale);

    if (this.lifetime <= 0) {
      this.world.removeGameObject(this);
    }
  }
}

export function spawnRunningParticles(world: World, position: THREE.Vector3, direction: number) {
  const pos = position.clone().add(new THREE.Vector3(0, -0.4, 0));
  const vel = new THREE.Vector3(
    -direction * (1 + Math.random()),
    Math.random() * 2,
    (Math.random() - 0.5) * 1,
  );
  const particle = new PlayerParticle(world, pos, vel, 0.2 + Math.random() * 0.2, PARTICLE_COLORS.running);
  world.addGameObject(particle);
}

export function spawnWalkingParticles(world: World, position: THREE.Vector3, direction: number) {
  const pos = position.clone().add(new THREE.Vector3(0, -0.4, 0));
  const vel = new THREE.Vector3(
    -direction * (0.5 + Math.random() * 0.5),
    Math.random() * 1,
    (Math.random() - 0.5) * 0.5,
  );
  const particle = new PlayerParticle(world, pos, vel, 0.15 + Math.random() * 0.15, PARTICLE_COLORS.walking);
  world.addGameObject(particle);
}

export function spawnJumpingParticles(world: World, position: THREE.Vector3) {
  const pos = position.clone().add(new THREE.Vector3(0, -0.4, 0));
  for (let i = 0; i < 4; i++) {
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      -Math.random() * 2,
      (Math.random() - 0.5) * 4,
    );
    const particle = new PlayerParticle(world, pos, vel, 0.2 + Math.random() * 0.2, PARTICLE_COLORS.jumping);
    world.addGameObject(particle);
  }
}

export function spawnLandingParticles(world: World, position: THREE.Vector3) {
  const pos = position.clone().add(new THREE.Vector3(0, -0.4, 0));
  for (let i = 0; i < 5; i++) {
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 6,
    );
    const particle = new PlayerParticle(world, pos, vel, 0.2 + Math.random() * 0.2, PARTICLE_COLORS.landing);
    world.addGameObject(particle);
  }
}
