// Mara Voss, on foot: a box-built character who walks, runs and jumps with the camera,
// and gets in and out of cars. Driving itself lives in vehicles.js.
import * as THREE from 'three';
import { CAR, PLAYER } from './config.js';
import { clampToCity } from './vehicles.js';

export function createPlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x8a2e3a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e3a5a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.34), jacket);
  torso.position.y = 1.08;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), skin);
  head.position.y = 1.66;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), new THREE.MeshLambertMaterial({ color: 0x1a1210 }));
  hair.position.y = 1.88;
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), jeans);
  legL.position.set(-0.16, 0.36, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.64, 0.19), jacket);
  armL.position.set(-0.4, 1.08, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.4;
  group.add(armR);
  return { group, legL, legR, armL, armR };
}

export function createPlayer(G) {
  const mesh = createPlayerMesh();
  const spawn = G.city.spawn;
  mesh.group.position.set(spawn.x, 0, spawn.z);
  G.scene.add(mesh.group);
  const state = {
    mesh,
    pos: mesh.group.position,
    heading: spawn.heading,
    velX: 0, velZ: 0,
    vy: 0, grounded: true,
    health: PLAYER.health,
    inCar: null,
    walkPhase: 0,
    moving: false,
    hasPistol: false,
    lastDamageAt: -10,
  };

  function collide(pos) {
    for (const c of G.city.colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < PLAYER.radius * PLAYER.radius) {
        const d = Math.sqrt(d2) || 0.001;
        pos.x += (dx / d) * (PLAYER.radius - d);
        pos.z += (dz / d) * (PLAYER.radius - d);
      }
    }
  }

  function update(dt, input, camYaw) {
    if (state.inCar) return;
    // Movement is camera-relative: W runs away from the camera.
    let mx = 0;
    let mz = 0;
    if (input.forward) mz += 1;
    if (input.back) mz -= 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const len = Math.hypot(mx, mz);
    state.moving = len > 0;
    const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (len > 0) {
      mx /= len;
      mz /= len;
      // Camera forward is (sin(camYaw), cos(camYaw)); right is (-cos, sin).
      const sin = Math.sin(camYaw);
      const cos = Math.cos(camYaw);
      const worldX = sin * mz - cos * mx;
      const worldZ = cos * mz + sin * mx;
      state.velX += (worldX * speed - state.velX) * Math.min(1, 12 * dt);
      state.velZ += (worldZ * speed - state.velZ) * Math.min(1, 12 * dt);
      state.heading = Math.atan2(state.velX, state.velZ);
    } else {
      state.velX *= 1 - Math.min(1, 10 * dt);
      state.velZ *= 1 - Math.min(1, 10 * dt);
    }
    state.pos.x += state.velX * dt;
    state.pos.z += state.velZ * dt;
    collide(state.pos);
    clampToCity(state.pos, PLAYER.radius);
    if (input.jump && state.grounded) {
      state.vy = 7;
      state.grounded = false;
    }
    if (!state.grounded) {
      state.vy -= 22 * dt;
      state.pos.y += state.vy * dt;
      if (state.pos.y <= 0) {
        state.pos.y = 0;
        state.vy = 0;
        state.grounded = true;
      }
    }
    const spd = Math.hypot(state.velX, state.velZ);
    state.walkPhase += dt * spd * 1.6;
    const swing = Math.sin(state.walkPhase) * (spd > 0.5 ? 0.55 : 0);
    mesh.legL.rotation.x = swing;
    mesh.legR.rotation.x = -swing;
    mesh.armL.rotation.x = -swing * 0.8;
    mesh.armR.rotation.x = swing * 0.8;
    mesh.group.rotation.y = state.heading;
    mesh.group.position.y = state.pos.y;
    // Slow health regen out of danger.
    if (G.time - state.lastDamageAt > 8 && state.health < PLAYER.health) {
      state.health = Math.min(PLAYER.health, state.health + 4 * dt);
    }
  }

  function damage(amount, fromX, fromZ) {
    state.health -= amount;
    state.lastDamageAt = G.time;
    G.hud.flashDamage();
    if (state.health <= 0) {
      state.health = 0;
      G.events.wasted();
    }
    void fromX;
    void fromZ;
  }

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    const all = [...G.traffic.cars, ...G.police.cars, ...G.missionCars];
    for (const car of all) {
      if (!car || car.dead || car.stolen || car.missionLocked) continue;
      const d = Math.hypot(car.pos.x - state.pos.x, car.pos.z - state.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterCar(car) {
    if (!car) return false;
    state.inCar = car;
    car.stolen = true;
    car.driver = state;
    mesh.group.visible = false;
    G.audio.engineStart();
    return true;
  }

  function exitCar() {
    const car = state.inCar;
    if (!car) return;
    state.inCar = null;
    car.stolen = false;
    car.driver = null;
    car.speed = 0;
    const side = car.heading + Math.PI / 2;
    state.pos.x = car.pos.x + Math.sin(side) * 2.2;
    state.pos.z = car.pos.z + Math.cos(side) * 2.2;
    state.pos.y = 0;
    mesh.group.visible = true;
    mesh.group.position.copy(state.pos);
  }

  return { state, update, damage, nearestCar, enterCar, exitCar };
}
