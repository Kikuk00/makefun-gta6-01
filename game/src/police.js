// The Solmar Bay PD: a wanted level that rises with crimes and cools off out of sight,
// police cruisers that chase the player by road and on foot, and the busted timer.
import * as THREE from 'three';
import { CAR, WANTED } from './config.js';
import { makeCar, driveStep } from './vehicles.js';
import { createPedMesh } from './pedestrians.js';

export function createPolice(G) {
  const cars = [];
  const cops = [];
  const state = { heat: 0, stars: 0, bustedTimer: 0, unseenFor: 0 };

  function starsFor(heat) {
    return heat <= 0 ? 0 : Math.min(5, Math.ceil(heat / 20));
  }

  function addHeat(amount) {
    state.heat = Math.min(WANTED.maxHeat, state.heat + amount);
    state.stars = starsFor(state.heat);
    state.unseenFor = 0;
  }

  function spawnCruiser() {
    const p = G.city.randomRoadPoint();
    // Spawn on a road near the player, but not on top of them.
    let tries = 0;
    while (Math.hypot(p.x - G.player.state.pos.x, p.z - G.player.state.pos.z) < 60 && tries < 12) {
      const q = G.city.randomRoadPoint();
      p.x = q.x;
      p.z = q.z;
      tries += 1;
    }
    const car = makeCar(G, 0x1a1a22, 'police', p.x, p.z, 0);
    car.isPolice = true;
    car.speed = 12;
    cars.push(car);
    return car;
  }

  function spawnCop(x, z) {
    const mesh = createPedMesh(G.rng);
    mesh.group.children[0].material = new THREE.MeshLambertMaterial({ color: 0x1e3a6e });
    mesh.group.position.set(x, 0, z);
    G.scene.add(mesh.group);
    const cop = { mesh, pos: mesh.group.position, heading: 0, walkPhase: 0, speed: 5.2 };
    cops.push(cop);
    return cop;
  }

  function nearestCopDist() {
    const pp = G.player.state.pos;
    let best = Infinity;
    for (const car of cars) best = Math.min(best, Math.hypot(car.pos.x - pp.x, car.pos.z - pp.z));
    for (const cop of cops) best = Math.min(best, Math.hypot(cop.pos.x - pp.x, cop.pos.z - pp.z));
    return best;
  }

  function update(dt) {
    const player = G.player.state;
    const wantCars = state.stars === 0 ? 0 : Math.min(2 + state.stars, 6);
    while (cars.length < wantCars) spawnCruiser();
    while (cars.length > wantCars) {
      const idx = cars.map((c) => !!c.driver).lastIndexOf(false);
      if (idx === -1) break;
      const car = cars[idx];
      cars.splice(idx, 1);
      G.scene.remove(car.mesh.group);
    }
    // Foot cops join the chase when the player is on foot and wanted.
    if (!player.inCar && state.stars > 0 && cops.length < Math.min(3, state.stars)) {
      spawnCop(player.pos.x + 25, player.pos.z + 10);
    }
    if (state.stars === 0) {
      for (const cop of cops) G.scene.remove(cop.mesh.group);
      cops.length = 0;
    }

    // Heat cools when no police is near.
    const near = nearestCopDist();
    if (state.stars > 0 && near > 55) {
      state.unseenFor += dt;
      if (state.unseenFor > 6) {
        state.heat = Math.max(0, state.heat - WANTED.decayPerSec * dt);
        state.stars = starsFor(state.heat);
      }
    } else {
      state.unseenFor = 0;
    }

    // Cruisers: steer toward the player along the grid, ram the player's car.
    // A cruiser the player stole is theirs now — the police leave it alone.
    for (const car of cars) {
      if (car.driver) continue;
      const guide = G.city.guidePoint(car.pos.x, car.pos.z, player.pos.x, player.pos.z, 24);
      const wantHeading = Math.atan2(guide.x - car.pos.x, guide.z - car.pos.z);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const topSpeed = 20 + state.stars * 2.5;
      const input = {
        throttle: near < 4 ? 0 : Math.abs(dh) > 1.2 ? 0.3 : 1,
        steer: Math.max(-1, Math.min(1, dh * 1.4)),
        handbrake: false,
      };
      const before = car.speed;
      driveStep(G, car, input, dt);
      car.speed = Math.min(car.speed, topSpeed);
      // Ramming the player's car slows it and shakes the camera.
      if (player.inCar) {
        const d = Math.hypot(car.pos.x - player.inCar.pos.x, car.pos.z - player.inCar.pos.z);
        if (d < 3.4 && Math.abs(before) > 6) {
          player.inCar.speed *= 0.6;
          player.inCar.damage += 4;
          G.audio.crash(0.5);
          G.hud.shake(0.35);
          addHeat(WANTED.ramCop * 0.2);
        }
      }
    }

    // Foot cops run at the player; close in for two seconds and it's a bust.
    let touching = false;
    for (const cop of cops) {
      const dx = player.pos.x - cop.pos.x;
      const dz = player.pos.z - cop.pos.z;
      const d = Math.hypot(dx, dz);
      cop.heading = Math.atan2(dx, dz);
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.walkPhase += dt * 12;
      const swing = Math.sin(cop.walkPhase) * 0.5;
      cop.mesh.legL.rotation.x = swing;
      cop.mesh.legR.rotation.x = -swing;
      cop.mesh.group.rotation.y = cop.heading;
      if (d < 2.2 && !player.inCar) touching = true;
    }
    if (touching && !player.inCar) {
      state.bustedTimer += dt;
      if (state.bustedTimer > 2) {
        state.bustedTimer = 0;
        G.events.busted();
      }
    } else {
      state.bustedTimer = Math.max(0, state.bustedTimer - dt * 2);
    }

    // Siren loudness follows the nearest cruiser.
    G.audio.siren(cars.length > 0, Math.max(0, 1 - near / 120));
  }

  return { state, cars, cops, addHeat, update, nearestCopDist };
}
