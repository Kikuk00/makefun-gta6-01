// The screenshot scenes behind ?shot=chase|play|drive|mission (with &seed=N). Each one
// plays the real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. Round 2 restages every scene so each frame shows
// several systems at once — a chase with the helicopter, roadblock, wanted stars,
// minimap and mission objective; a taxi fare on foot; a timed race through traffic;
// a firefight with guards, a pistol tracer and a health bar — and the briefing
// subtitles are cleared so they never cover the middle of the frame.
import { STEP } from './config.js';
import { makeCar } from './vehicles.js';

function driveToward(G, car, tx, tz) {
  const guide = G.city.guidePoint(car.pos.x, car.pos.z, tx, tz, 24);
  const dGuide = Math.hypot(guide.x - car.pos.x, guide.z - car.pos.z);
  const want = Math.atan2(guide.x - car.pos.x, guide.z - car.pos.z);
  let dh = want - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return {
    throttle: Math.abs(dh) > 1.2 ? 0.25 : dGuide < 20 ? 0.45 : 1,
    steer: Math.max(-1, Math.min(1, dh * 1.6)),
    handbrake: false,
  };
}

function walkToward(G, tx, tz) {
  const p = G.player.state;
  const dx = tx - p.pos.x;
  const dz = tz - p.pos.z;
  const want = Math.atan2(dx, dz);
  G.stage.rig.targetYaw = want;
  G.camFreeUntil = G.time + 10;
  return { forward: true, back: false, left: false, right: false, run: true, jump: false };
}

// The staged scenes all show a player mid-career: some cash in hand, a package
// already found, so the HUD reads like a game being played, not a fresh boot.
function stageCareer(G) {
  G.cash = 450;
  G.bestCash = 450;
  G.hud.clearSubtitles();
}

export function stageShot(G, name) {
  const P = G.player.state;
  if (name === 'start') {
    // Title vista: a high camera over Downtown at sunset, title screen on top.
    P.pos.set(29, 0, -29);
    P.heading = Math.PI * 0.75;
    G.stage.rig.targetYaw = Math.PI * 0.75;
    G.stage.rig.targetPitch = 0.55;
    G.stage.rig.targetDist = 60;
    G.stage.rig.yaw = Math.PI * 0.75;
    G.camFreeUntil = G.time + 60;
    G.screen = 'title';
    document.getElementById('hud').classList.add('title-mode');
    return;
  }
  G.screen = 'play';
  document.getElementById('hud').classList.remove('title-mode');
  G.hud.showOnly(null);

  if (name === 'play') {
    // On foot by Cafe Azul: a taxi fare is live, the passenger waves by the kerb,
    // pedestrians stroll past, parked cars line the street, a gold package glints.
    G.missions.start(6);
    stageCareer(G);
    G.activities.startFare();
    // Stage the fare up close: Mara a few steps from the waving passenger, a
    // parked taxi at the kerb, pedestrians on the sidewalk — not a 200 m hike.
    const dest = G.activities.fareObjective() || { x: -168, z: 122 };
    P.pos.set(dest.x - 12, 0, dest.z - 8);
    P.heading = Math.atan2(dest.x - P.pos.x, dest.z - P.pos.z);
    const pedSpots = [[dest.x + 8, dest.z + 10], [dest.x - 18, dest.z + 14], [dest.x + 16, dest.z - 6]];
    // Skip peds[0]: the fare passenger is the first free pedestrian, and the
    // fare already placed them by the kerb — moving them would strand the fare.
    G.peds.peds.slice(1, 4).forEach((ped, i) => {
      ped.pos.set(pedSpots[i][0], 0, pedSpots[i][1]);
      ped.target = null;
    });
    const parked = G.traffic.cars.filter((c) => c.parked).slice(0, 1);
    parked.forEach((c) => {
      c.pos.set(dest.x + 10, 0, dest.z - 2);
      c.heading = Math.PI / 2;
      c.mesh.group.position.copy(c.pos);
      c.mesh.group.rotation.y = c.heading;
    });
    for (let i = 0; i < 3 / STEP; i += 1) {
      G.update(STEP, walkToward(G, dest.x, dest.z));
    }
  } else if (name === 'drive') {
    // The Sunset Grand Prix, mid-race: a taxi at speed through Downtown traffic,
    // the race clock on the HUD, the next checkpoint on the minimap.
    G.missions.start(7);
    stageCareer(G);
    const car = makeCar(G, 0xe8c832, 'taxi', 29, -203, 0);
    G.missionCars.push(car);
    G.player.enterCar(car);
    // Four traffic cars around the player — two ahead, two oncoming — so the
    // street reads as alive instead of empty.
    const around = G.traffic.cars.filter((c) => !c.parked && !c.stolen).slice(0, 4);
    const spots = [[26.5, -90, 0], [31.5, 60, Math.PI], [26.5, -160, 0], [31.5, 130, Math.PI]];
    around.forEach((c, i) => {
      c.pos.set(spots[i][0], 0, spots[i][1]);
      c.heading = spots[i][2];
      c.speed = 9;
      c.cruise = 9;
      c.next = { x: spots[i][0], z: spots[i][2] === 0 ? 261 : -261 };
      c.headingTarget = spots[i][2];
      c.mesh.group.position.copy(c.pos);
      c.mesh.group.rotation.y = c.heading;
    });
    for (let i = 0; i < 9 / STEP; i += 1) {
      G.update(STEP, driveToward(G, car, 203, 203));
    }
  } else if (name === 'mission') {
    // The Drop, mid-firefight: Mara pistol-out at the Harbor warehouse, three
    // guards ahead with health bars, one already down, a tracer in the air.
    G.missions.start(3);
    stageCareer(G);
    G.player.givePistol();
    P.pos.set(196, 0, -40);
    P.heading = Math.atan2(232 - 196, -40 - -40);
    const guardSpots = [[212, -46], [216, -34], [210, -28]];
    const guards = guardSpots.map(([x, z]) => G.combat.spawnGuard(x, z));
    if (guards[2]) {
      guards[2].dead = true;
      guards[2].mesh.group.rotation.x = -Math.PI / 2 + 0.15;
      if (guards[2].barGroup) guards[2].barGroup.visible = false;
    }
    for (let i = 0; i < 3 / STEP; i += 1) {
      G.update(STEP, walkToward(G, 204, -40));
    }
    // One real shot at the nearest guard: muzzle flash, tracer and a hit. The
    // guards patrol back toward the warehouse while you walk, so re-stage them
    // close to Mara for the frame — two standing, one already down.
    P.heading = Math.atan2(guards[0].pos.x - P.pos.x, guards[0].pos.z - P.pos.z);
    const fwdX = Math.sin(P.heading);
    const fwdZ = Math.cos(P.heading);
    guards.forEach((g, i) => {
      if (g.dead) return;
      g.pos.x = P.pos.x + fwdX * (11 + i * 3) - fwdZ * (i === 0 ? -3 : 3);
      g.pos.z = P.pos.z + fwdZ * (11 + i * 3) + fwdX * (i === 0 ? -3 : 3);
      g.mesh.group.position.copy(g.pos);
      g.heading = Math.atan2(P.pos.x - g.pos.x, P.pos.z - g.pos.z);
      g.mesh.group.rotation.y = g.heading;
    });
    if (guards[2]) {
      guards[2].dead = true;
      guards[2].pos.set(P.pos.x + fwdX * 7 - fwdZ * 5, 0, P.pos.z + fwdZ * 7 + fwdX * 5);
      guards[2].mesh.group.position.copy(guards[2].pos);
      guards[2].mesh.group.rotation.x = -Math.PI / 2 + 0.15;
      if (guards[2].barGroup) guards[2].barGroup.visible = false;
    }
    P.heading = Math.atan2(guards[0].pos.x - P.pos.x, guards[0].pos.z - P.pos.z);
    G.combat.shoot();
  } else {
    // 'chase' (the cover): Mara in a Comet GT, three stars, the PD helicopter
    // overhead, cruisers on her tail, a roadblock ahead, traffic in the lane and
    // mission 1's package run live on the HUD.
    G.missions.start(0);
    stageCareer(G);
    const car = makeCar(G, 0xd23c2e, 'sport', -203, -29, Math.PI / 2);
    G.missionCars.push(car);
    G.player.enterCar(car);
    G.police.addHeat(55);
    // Traffic ahead in the player's lane so the chase has something to weave past.
    const ahead = G.traffic.cars.filter((c) => !c.parked && !c.stolen).slice(0, 3);
    const carSpots = [[-203, 60], [-208, 120], [-198, 180]];
    ahead.forEach((c, i) => {
      c.pos.set(carSpots[i][0], 0, carSpots[i][1]);
      c.heading = Math.PI / 2;
      c.speed = 8;
      c.cruise = 8;
      c.next = { x: -203, z: 261 };
      c.headingTarget = Math.PI / 2;
      c.mesh.group.position.copy(c.pos);
      c.mesh.group.rotation.y = c.heading;
    });
    for (let i = 0; i < 12 / STEP; i += 1) {
      const step = G.missions.currentStep();
      const pos = step ? G.missions.objectivePos(step) : { x: 0, z: 300 };
      G.update(STEP, driveToward(G, car, pos.x, pos.z));
    }
    // Stage the pursuit for the frame: the sim leaves cruisers ramming the Comet's
    // bumper, which pins it to a stop. Put the nearest cruiser ahead in the
    // oncoming lane where the camera can see it, and the next one on her tail.
    car.speed = 28;
    car.damage = 0;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const byDist = [...G.police.cars].sort((a, b) =>
      Math.hypot(a.pos.x - car.pos.x, a.pos.z - car.pos.z) - Math.hypot(b.pos.x - car.pos.x, b.pos.z - car.pos.z));
    const place = (cop, ahead, side) => {
      cop.pos.x = car.pos.x + fx * ahead - fz * side;
      cop.pos.z = car.pos.z + fz * ahead + fx * side;
      cop.heading = car.heading;
      cop.speed = car.speed * 0.85;
      cop.mesh.group.position.copy(cop.pos);
      cop.mesh.group.rotation.y = cop.heading;
    };
    if (byDist[0]) place(byDist[0], 26, 3.5);
    if (byDist[1]) place(byDist[1], -16, -3.5);
    for (const cop of G.police.cars) {
      const d = Math.hypot(cop.pos.x - car.pos.x, cop.pos.z - car.pos.z);
      if (d < 8) {
        cop.pos.x = car.pos.x - fx * 20;
        cop.pos.z = car.pos.z - fz * 20;
        cop.mesh.group.position.copy(cop.pos);
      }
    }
    // Put the helicopter in the frame, ahead and low enough to see, searchlight
    // on the road.
    const heli = G.police.heli;
    if (heli) {
      heli.group.position.set(car.pos.x + fx * 26, 14, car.pos.z + fz * 26);
      heli.group.rotation.y = car.heading;
    }
  }
  // Settle the camera on the action, then paint.
  G.stage.updateCamera(G, 1);
  G.hud.update(0);
}
