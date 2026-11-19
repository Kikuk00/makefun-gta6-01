// Solmar Bay itself: a sun-soaked coastal city on a street grid — Downtown towers, Old
// Town houses, Marina hotels, Harbor warehouses, Coral Hills villas, a beach and a pier.
// Builds the meshes, the building colliders and the road graph the traffic drives on.
import * as THREE from 'three';
import { CITY, PALETTE, RAMPS } from './config.js';
import { pick, range } from './random.js';

const P = CITY.pitch;
const STREETS = [];
for (let i = 0; i < CITY.streets; i += 1) STREETS.push(-CITY.half + i * P);
const BLOCKS = [];
for (let i = 0; i < CITY.streets - 1; i += 1) BLOCKS.push(-CITY.half + P / 2 + i * P);

function facadeTexture(rng, base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 0, 128, 10);
  for (let y = 22; y < 246; y += 26) {
    for (let x = 12; x < 118; x += 26) {
      const on = rng() < lit;
      g.fillStyle = on ? '#ffd98a' : 'rgba(20,30,50,0.85)';
      g.fillRect(x, y, 16, 18);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x, y, 16, 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Round 2: painted shop and billboard signs — canvas textures with the city's own
// names on them, so streets read as places instead of blank walls.
function signTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = 'bold 56px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, material, x, y, z, group, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const addCollider = (x, z, w, d) => {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  };

  // Ground: grass base, sand along the south beach, asphalt roads on top.
  // Round 3: the grass stops at the shoreline (x -306, z 330) instead of running
  // 900 m across the whole map — the old plane covered the water, so the sea
  // showed as a green lawn and the speedboat drove on grass.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 660),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(14, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 60),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(14, 0.01, CITY.beachZ + 18);
  sand.receiveShadow = true;
  group.add(sand);

  const waterMat = new THREE.MeshPhongMaterial({ color: PALETTE.water, transparent: true, opacity: 0.9, shininess: 120 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, CITY.waterZ + 150);
  group.add(water);
  const harborWater = new THREE.Mesh(new THREE.PlaneGeometry(300, 900), waterMat.clone());
  harborWater.rotation.x = -Math.PI / 2;
  harborWater.position.set(CITY.harborX - 150, -0.4, 20);
  group.add(harborWater);

  // Sidewalk slabs per block, then road strips, then dashed centre lines.
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(P - 2, P - 2), walkMat);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(bx, 0.02, bz);
      slab.receiveShadow = true;
      group.add(slab);
    }
  }
  for (const s of STREETS) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(12, 620), roadMat);
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(s, 0.04, 0);
    rx.receiveShadow = true;
    group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(620, 12), roadMat);
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(0, 0.04, s);
    rz.receiveShadow = true;
    group.add(rz);
    for (let d = -280; d < 280; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 8), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(s, 0.06, d);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.6), lineMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(d, 0.06, s);
      group.add(dash2);
    }
  }

  // Facade materials (shared): a few windowed faces per palette colour.
  const facades = PALETTE.building.map((c) => {
    const hex = `#${c.toString(16).padStart(6, '0')}`;
    return new THREE.MeshLambertMaterial({ map: facadeTexture(rng, hex, 0.35) });
  });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
  const wareMat = new THREE.MeshLambertMaterial({ color: 0xa89a8a });
  const villaMat = new THREE.MeshLambertMaterial({ color: 0xf0e0c0 });

  // Special blocks (by block centre): safehouse, garage, showroom, cafe, warehouse, hospital.
  const special = new Map([
    ['-232,-58', 'safehouse'], ['232,58', 'garage'], ['58,-58', 'showroom'],
    ['-174,116', 'cafe'], ['232,-58', 'warehouse'], ['-58,-232', 'hospital'],
  ]);
  const parks = new Set();
  while (parks.size < 8) parks.add(`${pick(rng, BLOCKS)},${pick(rng, BLOCKS)}`);

  const treePositions = [];
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      const key = `${bx},${bz}`;
      if (parks.has(key) && !special.has(key)) {
        for (let i = 0; i < 5; i += 1) treePositions.push([bx + range(rng, -18, 18), bz + range(rng, -18, 18)]);
        continue;
      }
      const kind = special.get(key);
      if (kind === 'safehouse' || kind === 'hospital' || kind === 'cafe') {
        const m = box(20, kind === 'hospital' ? 14 : 9, 16, kind === 'hospital' ? facades[2] : villaMat, bx, (kind === 'hospital' ? 14 : 9) / 2, bz, group);
        void m;
        addCollider(bx, bz, 20, 16);
        treePositions.push([bx + 16, bz + 12]);
        continue;
      }
      if (kind === 'garage' || kind === 'warehouse' || kind === 'showroom') {
        const w = kind === 'showroom' ? 30 : 38;
        const d = 24;
        const h = kind === 'showroom' ? 12 : 11;
        box(w, h, d, kind === 'showroom' ? facades[5] : wareMat, bx, h / 2, bz, group);
        addCollider(bx, bz, w, d);
        if (kind !== 'showroom') {
          for (let i = 0; i < 4; i += 1) {
            const cx = bx + range(rng, -16, 16);
            const cz = bz + range(rng, -16, 16);
            box(6, 2.6, 2.6, new THREE.MeshLambertMaterial({ color: pick(rng, [0xb8442e, 0x2e6fb8, 0x4a8a3a, 0xd8a02e]) }), cx, 1.3, cz, group);
            addCollider(cx, cz, 6, 2.6);
          }
        }
        continue;
      }
      // Regular block by district.
      if (bz > 150) { // Marina hotels
        const h = range(rng, 16, 34);
        box(34, h, 20, pick(rng, facades), bx, h / 2, bz, group);
        addCollider(bx, bz, 34, 20);
      } else if (bx < -120 && bz < 0) { // Old Town: four small houses
        for (const dx of [-11, 11]) for (const dz of [-11, 11]) {
          const h = range(rng, 8, 14);
          box(16, h, 16, pick(rng, facades), bx + dx, h / 2, bz + dz, group);
          addCollider(bx + dx, bz + dz, 16, 16);
        }
      } else if (bx > 120) { // Harbor warehouses
        const h = range(rng, 10, 16);
        box(36, h, 24, wareMat, bx, h / 2, bz, group);
        addCollider(bx, bz, 36, 24);
      } else if (bz < -150) { // Coral Hills villas
        for (const dx of [-11, 11]) {
          const h = range(rng, 6, 10);
          box(18, h, 16, villaMat, bx + dx, h / 2, bz, group);
          addCollider(bx + dx, bz, 18, 16);
        }
        treePositions.push([bx - 18, bz + 14], [bx + 18, bz - 14]);
      } else if (Math.abs(bx) < 120 && bz > -180 && bz < 60) { // Downtown towers
        const h = range(rng, 26, 58);
        box(30, h, 30, pick(rng, facades), bx, h / 2, bz, group);
        box(32, 1.5, 32, roofMat, bx, h + 0.75, bz, group, false);
        addCollider(bx, bz, 30, 30);
      } else { // Mid-rise
        const h = range(rng, 12, 22);
        box(28, h, 22, pick(rng, facades), bx, h / 2, bz, group);
        addCollider(bx, bz, 28, 22);
      }
    }
  }

  // Palms: instanced trunks + canopies, along the beach and in parks.
  for (let i = 0; i < 40; i += 1) treePositions.push([range(rng, -280, 280), CITY.beachZ + range(rng, 4, 26)]);
  const palmCount = treePositions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const canopyGeo = new THREE.IcosahedronGeometry(2.2, 0);
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3a });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, palmCount);
  const dummy = new THREE.Object3D();
  treePositions.forEach(([x, z], i) => {
    dummy.position.set(x, 2.5, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 5.6, z);
    dummy.scale.set(1, 0.55, 1);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
  });
  trunks.castShadow = true;
  canopies.castShadow = true;
  group.add(trunks, canopies);

  // Streetlights at every other intersection corner.
  const lightGeo = new THREE.CylinderGeometry(0.09, 0.12, 6, 6);
  const lightMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const bulbGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const lampSpots = [];
  for (let i = 0; i < STREETS.length; i += 2) {
    for (let j = 0; j < STREETS.length; j += 2) lampSpots.push([STREETS[i] + 6.5, STREETS[j] + 6.5]);
  }
  const poles = new THREE.InstancedMesh(lightGeo, lightMat, lampSpots.length);
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 3, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 6.1, z);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  group.add(poles, bulbs);

  // Round 2 street life: zebra crossings at the Downtown intersections, shop signs
  // over the named places, a big SOLMAR BAY billboard on the beach road, beach
  // umbrellas on the sand and bus-stop shelters on the main streets.
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const sx of [29, 87]) {
    for (const sz of [29, 87]) {
      for (let i = -2; i <= 2; i += 1) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5), crossMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(sx + i * 2.2, 0.05, sz - 8);
        group.add(stripe);
      }
    }
  }
  function sign(text, bg, fg, x, y, z, w, ry) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: signTexture(text, bg, fg) }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
  }
  sign('CAFE AZUL', '#1e5a8a', '#ffd98a', -174, 7.5, 116, 18, 0);
  sign('SOLMAR MOTORS', '#8a2e3a', '#ffffff', 58, 9, -40, 26, Math.PI / 2);
  sign("WRENCH'S GARAGE", '#3a3f46', '#ffd23c', 232, 8, 76, 24, -Math.PI / 2);
  sign('SOLMAR BAY', '#d23c2e', '#fff2b0', 0, 16, 261, 44, 0);
  sign('HARBOR DOCKS', '#2e6f5a', '#ffffff', 232, 9, -40, 24, -Math.PI / 2);
  const umbrellaMat = new THREE.MeshLambertMaterial({ color: 0xd23c2e });
  const umbrellaMat2 = new THREE.MeshLambertMaterial({ color: 0x2e6fd2 });
  for (let i = 0; i < 8; i += 1) {
    const ux = -240 + i * 68 + range(rng, -8, 8);
    const uz = CITY.beachZ + 10 + range(rng, 0, 14);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1, 8), i % 2 ? umbrellaMat2 : umbrellaMat);
    top.position.set(ux, 2.9, uz);
    group.add(top);
  }
  const shelterMat = new THREE.MeshLambertMaterial({ color: 0x3a4150 });
  for (const [bx, bz] of [[29, 145], [145, 29], [-87, 203], [203, -87]]) {
    box(6, 0.3, 2.4, shelterMat, bx, 3, bz, group);
    box(0.3, 3, 2.4, shelterMat, bx - 2.8, 1.5, bz, group);
    box(0.3, 3, 2.4, shelterMat, bx + 2.8, 1.5, bz, group);
  }

  // The pier reaching into the water at the Marina, and hills hemming in the north.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5c40 });
  box(8, 1, 40, pierMat, 0, 0.6, CITY.waterZ + 12, group);
  for (let i = 0; i < 5; i += 1) box(0.8, 3, 0.8, pierMat, -3.5 + i * 1.75, 0.5, CITY.waterZ + 30, group);

  // Round 3: the stunt ramps — orange wedges on the road, hit them fast and fly.
  const ramps = [];
  const rampMat = new THREE.MeshLambertMaterial({ color: 0xd2681e });
  const rampStripe = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  for (const r of RAMPS) {
    const ramp = new THREE.Group();
    const slope = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 9), rampMat);
    slope.position.set(0, 1.35, 0);
    slope.rotation.x = -0.36;
    slope.castShadow = true;
    ramp.add(slope);
    for (const sx of [-2.2, 2.2]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 9), rampStripe);
      stripe.position.set(sx, 1.95, 0);
      stripe.rotation.x = -0.36;
      ramp.add(stripe);
    }
    ramp.position.set(r.x, 0, r.z);
    ramp.rotation.y = r.heading;
    group.add(ramp);
    ramps.push({ x: r.x, z: r.z, heading: r.heading });
  }

  // Round 3: the Harbor dock — a wooden platform over the west water where the
  // speedboats tie up, two container cranes over the docks, and three moored boats
  // bobbing on the water. The boat you can steal is a real drivable boat, not scenery.
  box(10, 1, 34, pierMat, -297, 0.6, 100, group);
  for (let i = 0; i < 4; i += 1) box(0.8, 3, 0.8, pierMat, -301 + i * 2.4, 0.5, 116, group);
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xd2a02e });
  for (const cz of [-120, 120]) {
    box(3, 26, 3, craneMat, -272, 13, cz, group);
    addCollider(-272, cz, 4, 4);
    box(22, 1.6, 1.6, craneMat, -282, 25, cz, group);
    box(0.3, 8, 0.3, new THREE.MeshLambertMaterial({ color: 0x333333 }), -290, 21, cz, group);
  }
  const mooredBoats = [];
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const hullMat2 = new THREE.MeshLambertMaterial({ color: 0x2e6fd2 });
  for (let i = 0; i < 3; i += 1) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 6.5), i % 2 ? hullMat2 : hullMat);
    hull.position.y = 0.4;
    hull.castShadow = true;
    b.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.2), new THREE.MeshLambertMaterial({ color: 0x18242e }));
    cab.position.set(0, 1.1, 0.6);
    b.add(cab);
    b.position.set(-320, 0.1, -80 + i * 120);
    b.rotation.y = Math.PI / 2 + range(rng, -0.15, 0.15);
    group.add(b);
    mooredBoats.push(b);
  }

  // Round 3: the Marina ferris wheel — the landmark you steer home by from the
  // water, turning slowly over the beach.
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.5, 8, 24), new THREE.MeshLambertMaterial({ color: 0xd23c2e }));
  wheel.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 26, 0.4), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
    spoke.rotation.z = (i * Math.PI) / 8;
    wheel.add(spoke);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: pick(rng, [0xffd23c, 0x2e6fd2, 0x2ed2a0]) }));
    cabin.position.set(Math.sin((i * Math.PI) / 4) * 13, Math.cos((i * Math.PI) / 4) * 13, 0);
    wheel.add(cabin);
  }
  wheel.position.set(120, 17, 312);
  group.add(wheel);
  for (const lx of [112, 128]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a4150 }));
    leg.position.set(lx, 9, 312);
    leg.rotation.z = lx < 120 ? 0.25 : -0.25;
    group.add(leg);
  }
  sign('MARINA PIER', '#1e5a8a', '#ffd98a', 0, 8, 322, 20, 0);
  sign('PIER 9 — BOAT HIRE', '#2e6f5a', '#ffffff', -297, 6, 118, 16, Math.PI / 2);
  let wheelTime = 0;
  function update(dt) {
    wheelTime += dt;
    wheel.rotation.z += dt * 0.12;
    mooredBoats.forEach((b, i) => {
      b.position.y = 0.1 + Math.sin(wheelTime * 1.1 + i * 2.1) * 0.14;
      b.rotation.z = Math.sin(wheelTime * 0.9 + i) * 0.03;
    });
  }
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x4a6b3a });
  for (const [hx, hz, hr] of [[-220, -360, 90], [-40, -390, 120], [160, -370, 100], [300, -350, 80]]) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(hr, 16, 12), hillMat);
    hill.scale.y = 0.35;
    hill.position.set(hx, 0, hz);
    group.add(hill);
  }

  // Named places the missions use (road-side points, not block centres).
  // Round 3: every point sits just outside its building's wall — inside the
  // trigger radius of the step that uses it. The old points were up to 10 m from
  // the wall, past the goto radius, so a delivery or a pickup could never fire.
  const locations = {
    safehouse: { x: -232, z: -46, label: "Mara's apartment" },
    garage: { x: 232, z: 76, label: "Wrench's garage" },
    showroom: { x: 58, z: -40, label: 'Solmar Motors showroom' },
    cafe: { x: -174, z: 128, label: 'Cafe Azul' },
    warehouse: { x: 232, z: -44, label: 'Harbor warehouse' },
    hospital: { x: -58, z: -220, label: 'Coral Hills clinic' },
    pier: { x: 0, z: 300, label: 'Marina pier' },
    beach: { x: 87, z: 306, label: 'Marina Beach' },
    // Round 3: where the speedboat waits, and where the heist ends on open water.
    // The marker sits far enough out that a nine-second escape still has water ahead.
    boatPier: { x: 0, z: 345, label: 'Marina pier — speedboat' },
    openWater: { x: 250, z: 520, label: 'Open water' },
    harborDock: { x: -310, z: 100, label: 'Harbor dock' },
  };

  function nearestStreet(v) {
    let best = STREETS[0];
    for (const s of STREETS) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
    return best;
  }

  function randomRoadPoint() {
    if (rng() < 0.5) return { x: pick(rng, STREETS), z: range(rng, -280, 280) };
    return { x: range(rng, -280, 280), z: pick(rng, STREETS) };
  }

  // A guide point for driving toward (tx, tz): stay on a street, turn at the intersection
  // nearest the target, then drive straight at it off-road for the last few metres.
  // With `ahead` set, a driver close to its guide is handed the next leg instead, so it
  // starts the turn early instead of overshooting the intersection at speed.
  function guidePoint(x, z, tx, tz, ahead = 0) {
    const compute = (cx, cz) => {
      const ix = nearestStreet(tx);
      const iz = nearestStreet(tz);
      if (Math.abs(cx - ix) < 8 && Math.abs(cz - iz) < 8) return { x: tx, z: tz };
      const onX = Math.abs(cx - nearestStreet(cx)) < 8;
      const onZ = Math.abs(cz - nearestStreet(cz)) < 8;
      if (!onX && !onZ) return { x: nearestStreet(cx), z: cz };
      if (onX && Math.abs(tx - cx) < 6) return { x: tx, z: tz };
      if (onZ && Math.abs(tz - cz) < 6) return { x: tx, z: tz };
      if (onX && Math.abs(cz - iz) < 6) return { x: ix, z: cz };
      if (onZ && Math.abs(cx - ix) < 6) return { x: cx, z: iz };
      if (onX) return { x: cx, z: iz };
      if (onZ) return { x: ix, z: cz };
      return { x: ix, z: cz };
    };
    const guide = compute(x, z);
    if (ahead > 0 && Math.hypot(guide.x - x, guide.z - z) < ahead) {
      const next = compute(guide.x, guide.z);
      if (Math.hypot(next.x - guide.x, next.z - guide.z) > 1) return next;
    }
    return guide;
  }

  return {
    group, colliders, streets: STREETS, locations, water, harborWater,
    nearestStreet, randomRoadPoint, guidePoint, ramps, update,
    spawn: { x: -232, z: -29, heading: Math.PI / 2 },
  };
}
