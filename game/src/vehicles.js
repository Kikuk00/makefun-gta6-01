// Cars: a box-built car model, arcade driving physics (accelerate, steer, drift, collide)
// and the traffic that fills the streets, driving the grid on the right-hand lane.
import * as THREE from 'three';
import { CAR, CITY, PALETTE, TRAFFIC_COUNT } from './config.js';
import { pick, range } from './random.js';

function collideCircle(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
      return { nx: dx / d, nz: dz / d };
    }
  }
  return null;
}

export function clampToCity(pos, radius) {
  const b = CITY.bound;
  pos.x = Math.max(-b, Math.min(b, pos.x));
  pos.z = Math.max(-b - 6, Math.min(CITY.waterZ + 6, pos.z));
  if (pos.x < CITY.harborX - 6) pos.x = CITY.harborX - 6;
  void radius;
}

// A car from boxes: body, cabin, wheels, headlights and tail lights. kind: 'sedan' |
// 'sport' | 'taxi' | 'police' | 'van' | 'bus' | 'truck' | 'limo'.
export function createCarMesh(color, kind = 'sedan') {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242e });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const long = kind === 'bus' ? 7.6 : kind === 'limo' ? 6.2 : kind === 'truck' ? 5.2 : kind === 'van' ? 5.4 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.62, long), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, kind === 'van' ? 2.6 : kind === 'bus' ? 6.4 : kind === 'truck' ? 1.6 : 2.1), glassMat);
  cabin.position.set(0, 1.18, kind === 'van' ? 0.4 : kind === 'truck' ? 1.4 : kind === 'bus' ? 0 : -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  if (kind === 'bus') {
    // Roof sign and a stripe down the side, so it reads as a bus at a glance.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 6.8), new THREE.MeshBasicMaterial({ color: 0xffd23c }));
    stripe.position.set(0, 0.75, 0);
    group.add(stripe);
  }
  if (kind === 'truck') {
    // Open bed with a crate in it.
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.6), new THREE.MeshLambertMaterial({ color: 0xb8442e }));
    crate.position.set(0, 1.35, -1.2);
    crate.castShadow = true;
    group.add(crate);
  }
  if (kind === 'limo') {
    const divider = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.5, 0.12), darkMat);
    divider.position.set(0, 1.18, 0.6);
    group.add(divider);
  }
  if (kind === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.4), darkMat);
    spoiler.position.set(0, 1.05, -2.1);
    group.add(spoiler);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
    sign.position.set(0, 1.6, -0.2);
    group.add(sign);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.55, -0.2);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar2.position.set(0, 1.55, 0.25);
    group.add(bar2);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheels = [];
  const wheelZ = kind === 'bus' || kind === 'limo' ? 2.6 : kind === 'truck' ? 1.9 : 1.45;
  for (const [wx, wz] of [[-0.95, wheelZ], [0.95, wheelZ], [-0.95, -wheelZ], [0.95, -wheelZ]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const halfLen = long / 2 + 0.01;
  for (const lx of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), lightMat);
    l.position.set(lx, 0.72, halfLen);
    group.add(l);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xdd2222 }));
    t.position.set(lx, 0.72, -halfLen);
    group.add(t);
  }
  return { group, wheels, body };
}

export function makeCar(G, color, kind, x, z, heading) {
  const mesh = createCarMesh(color, kind);
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  G.scene.add(mesh.group);
  return {
    mesh, kind, color,
    pos: mesh.group.position,
    heading, speed: 0, steer: 0,
    damage: 0, smoke: null, dead: false,
    driver: null,
  };
}

// One arcade step for a driven car: throttle/brake/steer input, grip, building collision.
export function driveStep(G, car, input, dt) {
  const fwdX = Math.sin(car.heading);
  const fwdZ = Math.cos(car.heading);
  const forwardSpeed = car.speed;
  if (input.throttle > 0) car.speed += CAR.accel * input.throttle * dt;
  else if (input.throttle < 0) {
    if (forwardSpeed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 6 * dt;
    if (Math.abs(car.speed) < 0.2) car.speed = 0;
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerTarget = input.steer * CAR.steer * (car.speed >= 0 ? 1 : -1);
  car.steer += (steerTarget - car.steer) * Math.min(1, 10 * dt);
  const turnRate = car.steer * Math.min(1, Math.abs(car.speed) / 8) * (input.handbrake ? 1.6 : 1);
  car.heading += turnRate * Math.sign(car.speed || 1) * dt * (car.speed >= 0 ? 1 : -1) * (car.speed === 0 ? 0 : 1);
  if (input.handbrake) car.speed *= 1 - 0.9 * dt;
  const nx = Math.sin(car.heading);
  const nz = Math.cos(car.heading);
  car.pos.x += nx * car.speed * dt;
  car.pos.z += nz * car.speed * dt;
  const hit = collideCircle(car.pos, CAR.radius, G.city.colliders);
  if (hit) {
    const vn = fwdX * hit.nx + fwdZ * hit.nz;
    if (vn < 0) {
      car.speed *= 0.45;
      if (Math.abs(vn * car.speed) > 3) G.audio.crash(Math.abs(vn));
      car.damage += Math.abs(vn) * 0.4;
    }
    car.pos.x += hit.nx * 0.05;
    car.pos.z += hit.nz * 0.05;
  }
  clampToCity(car.pos, CAR.radius);
  car.mesh.group.position.copy(car.pos);
  car.mesh.group.rotation.y = car.heading;
  for (const w of car.mesh.wheels) w.rotation.x += car.speed * dt * 2.8;
  // Round 2: a wrecked car smokes, and a hard launch puffs exhaust — the damage you
  // can see, not just a number on the HUD.
  if (G.effects) {
    if (car.damage > 60 && Math.abs(car.speed) > 2 && G.rng() < 0.35) {
      G.effects.tireSmoke(car.pos.x, 1.2, car.pos.z);
    } else if (input.throttle > 0.8 && Math.abs(car.speed) < 6 && G.rng() < 0.2) {
      const bx = car.pos.x - Math.sin(car.heading) * 2.2;
      const bz = car.pos.z - Math.cos(car.heading) * 2.2;
      G.effects.exhaust(bx, 0.5, bz);
    }
  }
  return hit;
}

export function createTraffic(G) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const p = G.city.randomRoadPoint();
    const kind = pick(G.rng, ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sport', 'bus', 'truck', 'sedan', 'taxi']);
    const color = kind === 'taxi' ? 0xe8c832 : kind === 'bus' ? 0x2e6f8a : pick(G.rng, PALETTE.car);
    const heading = G.rng() < 0.5 ? 0 : Math.PI / 2;
    const car = makeCar(G, color, kind, p.x, p.z, heading);
    car.speed = range(G.rng, 7, 11);
    car.cruise = car.speed;
    car.next = null;
    car.parked = G.rng() < 0.15;
    if (car.parked) car.speed = 0;
    cars.push(car);
  }

  function pickNext(car) {
    const onX = Math.abs(car.pos.x - G.city.nearestStreet(car.pos.x)) < 5;
    const dirs = [];
    if (onX) dirs.push({ dx: 0, dz: 1 }, { dx: 0, dz: -1 });
    else dirs.push({ dx: 1, dz: 0 }, { dx: -1, dz: 0 });
    const dir = pick(G.rng, dirs);
    const step = CITY.pitch;
    const target = {
      x: car.pos.x + dir.dx * step,
      z: car.pos.z + dir.dz * step,
    };
    // Right-hand lane: shift the target 2.5 m to the driver's right.
    if (dir.dz !== 0) target.x -= Math.sign(dir.dz) * 2.5;
    else target.z += Math.sign(dir.dx) * 2.5;
    target.x = Math.max(-CITY.half, Math.min(CITY.half, target.x));
    target.z = Math.max(-CITY.half, Math.min(CITY.half, target.z));
    car.next = target;
    car.headingTarget = Math.atan2(target.x - car.pos.x, target.z - car.pos.z);
  }

  function update(dt, playerCar) {
    for (const car of cars) {
      if (car.dead || car.stolen) continue;
      if (car.parked) continue;
      if (!car.next) pickNext(car);
      // Slow down for the car ahead (player or traffic).
      let blocked = false;
      const ahead = { x: car.pos.x + Math.sin(car.heading) * 7, z: car.pos.z + Math.cos(car.heading) * 7 };
      for (const other of cars) {
        if (other === car || other.dead) continue;
        const d = Math.hypot(other.pos.x - ahead.x, other.pos.z - ahead.z);
        if (d < 3.5) { blocked = true; break; }
      }
      if (playerCar && !blocked) {
        const d = Math.hypot(playerCar.pos.x - ahead.x, playerCar.pos.z - ahead.z);
        if (d < 3.5) blocked = true;
      }
      const want = blocked ? 0 : car.cruise;
      car.speed += (want - car.speed) * Math.min(1, 1.5 * dt);
      let dh = car.headingTarget - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      const dx = car.next.x - car.pos.x;
      const dz = car.next.z - car.pos.z;
      if (dx * dx + dz * dz < 9) pickNext(car);
      collideCircle(car.pos, CAR.radius, G.city.colliders);
      clampToCity(car.pos, CAR.radius);
      car.mesh.group.position.copy(car.pos);
      car.mesh.group.rotation.y = car.heading;
      for (const w of car.mesh.wheels) w.rotation.x += car.speed * dt * 2.8;
    }
  }

  return { cars, update };
}
