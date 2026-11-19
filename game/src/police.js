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

  // Round 2: the PD helicopter — a circling searchlight over the player at three
  // stars and up, with a rotor you can hear. Built once, hidden until it is needed.
  const heli = (() => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 4.2), new THREE.MeshLambertMaterial({ color: 0x1e3a6e }));
    body.position.y = 0;
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), new THREE.MeshLambertMaterial({ color: 0x1e3a6e }));
    tail.position.set(0, 0.2, -3.4);
    group.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 0.8;
    group.add(rotor);
    const light = new THREE.Mesh(
      new THREE.ConeGeometry(4, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    light.position.y = -13;
    light.rotation.x = Math.PI;
    group.add(light);
    group.visible = false;
    G.scene.add(group);
    return { group, rotor, angle: 0 };
  })();
  let roadblock = null;

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
      const idx = cars.map((c) => !!c.driver || !!c.isRoadblock).lastIndexOf(false);
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
      if (car.driver || car.isRoadblock) continue;
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

    // Round 2: at three stars the helicopter circles overhead with its searchlight,
    // and two cruisers park across the road ahead as a roadblock. Both clear when
    // the heat drops below three stars.
    const heliOn = state.stars >= 3;
    heli.group.visible = heliOn;
    G.audio.heli(heliOn, heliOn ? Math.max(0, 1 - near / 150) : 0);
    if (heliOn) {
      heli.angle += dt * 0.5;
      heli.group.position.set(
        player.pos.x + Math.sin(heli.angle) * 22,
        34,
        player.pos.z + Math.cos(heli.angle) * 22,
      );
      heli.group.rotation.y = heli.angle + Math.PI / 2;
      heli.rotor.rotation.y += dt * 22;
    }
    if (state.stars >= 3 && !roadblock && player.inCar) {
      const fx = Math.sin(player.inCar.heading);
      const fz = Math.cos(player.inCar.heading);
      const bx = player.pos.x + fx * 55;
      const bz = player.pos.z + fz * 55;
      const c1 = makeCar(G, 0x1a1a22, 'police', bx - fz * 3, bz + fx * 3, player.inCar.heading + Math.PI / 2);
      const c2 = makeCar(G, 0x1a1a22, 'police', bx + fz * 3, bz - fx * 3, player.inCar.heading + Math.PI / 2);
      c1.isPolice = true;
      c2.isPolice = true;
      c1.isRoadblock = true;
      c2.isRoadblock = true;
      c1.speed = 0;
      c2.speed = 0;
      roadblock = { cars: [c1, c2], until: G.time + 25 };
      cars.push(c1, c2);
    }
    if (roadblock && (state.stars < 3 || G.time > roadblock.until)) {
      for (const c of roadblock.cars) {
        const i = cars.indexOf(c);
        if (i >= 0) cars.splice(i, 1);
        G.scene.remove(c.mesh.group);
      }
      roadblock = null;
    }

    // Siren loudness follows the nearest cruiser.
    G.audio.siren(cars.length > 0, Math.max(0, 1 - near / 120));
  }

  return { state, cars, cops, heli, addHeat, update, nearestCopDist };
}
