// Pedestrians: box-built people who stroll the sidewalks, scatter when a car or a
// gunshot comes near, and can be knocked down (which the police notice).
import * as THREE from 'three';
import { PED_COUNT } from './config.js';
import { pick, range } from './random.js';

const SHIRTS = [0xd24a4a, 0x4a7ad2, 0x4ad27a, 0xd2c04a, 0x9a4ad2, 0xe8e8e8, 0x2e2e2e, 0xd27a2e];
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];

export function createPedMesh(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, SKINS) });
  const pants = new THREE.MeshLambertMaterial({ color: pick(rng, [0x2e3a4a, 0x4a3a2e, 0x3a3a3a]) });
  // Round 2: bodies vary — taller, shorter, a sun hat or a cap — so a crowd does not
  // read as one person cloned thirty times.
  const tall = range(rng, 0.88, 1.12);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);
  if (rng() < 0.3) {
    // A sun hat or a cap.
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.3, 0.1, 8),
      new THREE.MeshLambertMaterial({ color: pick(rng, [0xe8d8a0, 0x2e2e2e, 0xd23c2e]) }),
    );
    hat.position.y = 1.84;
    group.add(hat);
  }
  if (rng() < 0.25) {
    // A shopping bag in one hand.
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.12), new THREE.MeshLambertMaterial({ color: pick(rng, [0xd2a02e, 0x2e6fb8, 0x8a2e5a]) }));
    bag.position.set(0.48, 0.7, 0);
    group.add(bag);
  }
  group.scale.y = tall;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legL.position.set(-0.15, 0.35, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.15;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), shirt);
  armL.position.set(-0.37, 1.05, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.37;
  group.add(armR);
  return { group, legL, legR, armL, armR };
}

export function createPedestrians(G) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const mesh = createPedMesh(G.rng);
    const block = G.city.randomRoadPoint();
    const x = block.x + range(G.rng, -20, 20);
    const z = block.z + range(G.rng, -20, 20);
    mesh.group.position.set(x, 0, z);
    G.scene.add(mesh.group);
    peds.push({
      mesh, pos: mesh.group.position,
      heading: range(G.rng, 0, Math.PI * 2),
      speed: range(G.rng, 1, 1.8),
      walkPhase: range(G.rng, 0, 6),
      target: null, down: 0, scared: 0, dead: false, fare: false,
      // Round 3: one in four pedestrians is a jogger — faster, arms pumping.
      jogger: G.rng() < 0.25,
    });
  }

  function pickTarget(ped) {
    // Wander to a nearby sidewalk point (a block centre offset from the streets).
    const bx = G.city.nearestStreet(ped.pos.x) + pick(G.rng, [-29, 29]) + range(G.rng, -8, 8);
    const bz = G.city.nearestStreet(ped.pos.z) + pick(G.rng, [-29, 29]) + range(G.rng, -8, 8);
    ped.target = { x: Math.max(-300, Math.min(300, bx)), z: Math.max(-300, Math.min(320, bz)) };
  }

  function update(dt, danger) {
    for (const ped of peds) {
      if (ped.dead) continue;
      if (ped.down > 0) {
        ped.down -= dt;
        ped.mesh.group.rotation.x = Math.max(0, ped.mesh.group.rotation.x - dt * 2);
        if (ped.down <= 0) ped.mesh.group.rotation.x = 0;
        continue;
      }
      // Flee from danger (gunfire, a speeding car, a police chase nearby).
      if (danger) {
        const d = Math.hypot(ped.pos.x - danger.x, ped.pos.z - danger.z);
        if (d < danger.r) {
          ped.scared = 2.5;
          ped.target = {
            x: ped.pos.x + ((ped.pos.x - danger.x) / (d || 1)) * 30,
            z: ped.pos.z + ((ped.pos.z - danger.z) / (d || 1)) * 30,
          };
        }
      }
      if (ped.scared > 0) ped.scared -= dt;
      // Round 2: a taxi passenger waits where the fare put them, waving, instead of
      // wandering off down the street.
      if (ped.fare) {
        ped.mesh.armR.rotation.x = -2.4 + Math.sin(G.time * 6) * 0.4;
        ped.mesh.group.rotation.y = ped.heading;
        continue;
      }
      if (!ped.target) pickTarget(ped);
      const dx = ped.target.x - ped.pos.x;
      const dz = ped.target.z - ped.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) { ped.target = null; continue; }
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - ped.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      ped.heading += Math.max(-3 * dt, Math.min(3 * dt, dh));
      const speed = ped.scared > 0 ? ped.speed * 2.6 : ped.jogger ? ped.speed + 1.4 : ped.speed;
      ped.pos.x += Math.sin(ped.heading) * speed * dt;
      ped.pos.z += Math.cos(ped.heading) * speed * dt;
      ped.walkPhase += dt * speed * 4;
      const swing = Math.sin(ped.walkPhase) * (ped.jogger ? 0.8 : 0.5);
      ped.mesh.legL.rotation.x = swing;
      ped.mesh.legR.rotation.x = -swing;
      ped.mesh.armL.rotation.x = -swing * 0.7;
      ped.mesh.armR.rotation.x = swing * 0.7;
      ped.mesh.group.rotation.y = ped.heading;
    }
  }

  function knockDown(ped, fromX, fromZ) {
    if (ped.down > 0 || ped.dead) return;
    ped.down = 4;
    ped.mesh.group.rotation.x = -Math.PI / 2 + 0.15;
    const d = Math.hypot(ped.pos.x - fromX, ped.pos.z - fromZ) || 1;
    ped.pos.x += ((ped.pos.x - fromX) / d) * 1.5;
    ped.pos.z += ((ped.pos.z - fromZ) / d) * 1.5;
  }

  return { peds, update, knockDown };
}
