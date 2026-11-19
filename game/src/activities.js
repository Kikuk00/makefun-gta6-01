// Round 2 side activities: the things to do between story missions, all live in free
// roam and all paying cash. Hidden packages (18 gold crates tucked around the city,
// $50 each), taxi fares (a waving passenger, drive them to the marker before the
// clock runs out, $80-$160 a fare) and the Sunset Grand Prix checkpoints are all
// staged here; the story missions in missions.js stay the spine of the game.
import * as THREE from 'three';
import { PACKAGE_COUNT, PACKAGE_REWARD, PACKAGE_SET_BONUS, TAXI_FARE_MIN, TAXI_FARE_MAX, TAXI_TIME_LIMIT } from './config.js';
import { sample } from './random.js';

const PACKAGE_SPOTS = [
  [-232, 232], [-232, -232], [232, 232], [232, -232], [-29, 203], [87, -203],
  [-145, 87], [145, -87], [-87, -145], [203, 87], [-203, -29], [29, -29],
  [261, 145], [-261, 145], [145, 261], [-145, 261], [87, 145], [-87, 203],
  [203, -145], [-203, 203], [29, 261], [-29, -261], [261, -87], [-261, -87],
];

function packageMesh(scene) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshLambertMaterial({ color: 0xffd23c, emissive: 0x7a5a00 }),
  );
  box.position.y = 0.9;
  box.castShadow = true;
  group.add(box);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  gem.position.y = 2.1;
  group.add(gem);
  scene.add(group);
  return { group, gem };
}

export function createActivities(G) {
  const found = new Set(G.saveData ? G.saveData.packagesFound : []);
  const spots = sample(G.rng, PACKAGE_SPOTS, PACKAGE_COUNT);
  const packages = spots.map(([x, z], i) => {
    const mesh = packageMesh(G.scene);
    mesh.group.position.set(x, 0, z);
    mesh.group.visible = !found.has(i);
    return { index: i, x, z, mesh, taken: found.has(i) };
  });

  // Taxi fares: one waving passenger at a time, standing by a roadside.
  const fare = { active: false, stage: 'none', passenger: null, dest: null, fare: 0, timeLeft: 0, marker: null };
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x2ed2a0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.position.y = 15;
  marker.visible = false;
  G.scene.add(marker);
  fare.marker = marker;

  function fareSpots() {
    return [
      G.city.locations.cafe, G.city.locations.pier, G.city.locations.showroom,
      G.city.locations.garage, G.city.locations.safehouse, G.city.locations.hospital,
    ];
  }

  function startFare() {
    if (fare.active) return false;
    const spots = fareSpots();
    const from = spots[Math.floor(G.rng() * spots.length)];
    let to = spots[Math.floor(G.rng() * spots.length)];
    while (to === from) to = spots[Math.floor(G.rng() * spots.length)];
    const ped = G.peds.peds.find((p) => !p.down && !p.dead && p.fare !== true);
    if (!ped) return false;
    ped.fare = true;
    ped.pos.set(from.x + 6, 0, from.z + 6);
    ped.target = null;
    fare.active = true;
    fare.stage = 'pickup';
    fare.passenger = ped;
    fare.dest = to;
    fare.fare = TAXI_FARE_MIN + Math.floor(G.rng() * (TAXI_FARE_MAX - TAXI_FARE_MIN));
    fare.timeLeft = TAXI_TIME_LIMIT;
    marker.visible = true;
    marker.position.set(from.x + 6, 15, from.z + 6);
    G.audio.ding();
    G.hud.banner(`Taxi fare: pick up the passenger — $${fare.fare} if you are quick`);
    return true;
  }

  function endFare(paid, reason) {
    if (fare.passenger) fare.passenger.fare = false;
    fare.active = false;
    fare.stage = 'none';
    fare.passenger = null;
    marker.visible = false;
    if (paid) {
      G.cash += fare.fare;
      G.bestCash = Math.max(G.bestCash, G.cash);
      G.faresDone += 1;
      G.effects.goldSparkle(G.player.state.pos.x, 1.5, G.player.state.pos.z);
      G.hud.banner(`Fare paid — +$${fare.fare}. ${reason}`);
      G.audio.sting();
      G.save();
    } else if (reason) {
      G.hud.banner(reason);
    }
  }

  function update(dt) {
    // Packages spin and bob; walk over one to collect it.
    const p = G.player.state;
    for (const pkg of packages) {
      if (pkg.taken) continue;
      pkg.mesh.gem.rotation.y += dt * 2.5;
      pkg.mesh.gem.position.y = 2.1 + Math.sin(G.time * 2 + pkg.index) * 0.25;
      const d = Math.hypot(pkg.x - p.pos.x, pkg.z - p.pos.z);
      if (d < 2.6 && !p.inCar) {
        pkg.taken = true;
        found.add(pkg.index);
        pkg.mesh.group.visible = false;
        G.cash += PACKAGE_REWARD;
        G.bestCash = Math.max(G.bestCash, G.cash);
        G.effects.goldSparkle(pkg.x, 1.5, pkg.z);
        // Round 3: the whole set pays a bonus on top — a reason to hunt all 24.
        if (found.size >= PACKAGE_COUNT) {
          G.cash += PACKAGE_SET_BONUS;
          G.bestCash = Math.max(G.bestCash, G.cash);
          G.hud.banner(`All ${PACKAGE_COUNT} packages found — +$${PACKAGE_REWARD} plus a $${PACKAGE_SET_BONUS} set bonus!`);
        } else {
          G.hud.banner(`Hidden package ${found.size} of ${PACKAGE_COUNT} — +$${PACKAGE_REWARD}`);
        }
        G.audio.pickup();
        G.save();
      }
    }
    // Taxi fare clock and pickup / drop-off.
    if (!fare.active) return;
    fare.timeLeft -= dt;
    if (fare.timeLeft <= 0) { endFare(false, 'Fare expired — the passenger walked away.'); return; }
    if (fare.stage === 'pickup') {
      const d = Math.hypot(fare.passenger.pos.x - p.pos.x, fare.passenger.pos.z - p.pos.z);
      if (d < 3.5 && p.inCar) {
        fare.stage = 'dropoff';
        marker.position.set(fare.dest.x, 15, fare.dest.z);
        G.hud.banner('Passenger aboard — drive to the green marker, fast!');
        G.audio.ding();
      }
    } else if (fare.stage === 'dropoff') {
      const d = Math.hypot(fare.dest.x - p.pos.x, fare.dest.z - p.pos.z);
      if (d < 8 && p.inCar) {
        const tip = fare.timeLeft > 30 ? 25 : 0;
        fare.fare += tip;
        endFare(true, tip ? `On time, with a $25 tip.` : `Delivered.`);
      }
    }
  }

  return {
    packages, found, fare, startFare, endFare, update,
    packagesLeft() { return PACKAGE_COUNT - found.size; },
    fareObjective() {
      if (!fare.active) return null;
      return fare.stage === 'pickup'
        ? { x: fare.passenger.pos.x, z: fare.passenger.pos.z }
        : { x: fare.dest.x, z: fare.dest.z };
    },
  };
}
