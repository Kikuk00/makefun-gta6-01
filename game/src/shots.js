// The screenshot scenes behind ?shot=chase|play|drive|mission (with &seed=N). Each one
// plays the real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The cover (chase) shows a police pursuit with the
// wanted level, the minimap and a mission objective on the HUD at once.
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
    // On foot on a Downtown street, mission 1 live, traffic and pedestrians around.
    G.missions.start(0);
    P.pos.set(33, 0, 87);
    P.heading = 0;
    // Two cars ahead in the player's lane and three pedestrians on the sidewalk.
    const ahead = G.traffic.cars.filter((c) => !c.parked && !c.stolen).slice(0, 2);
    const carSpots = [[26.5, 130], [26.5, 190]];
    ahead.forEach((c, i) => {
      c.pos.set(carSpots[i][0], 0, carSpots[i][1]);
      c.heading = 0;
      c.speed = 8;
      c.cruise = 8;
      c.next = { x: 26.5, z: 261 };
      c.headingTarget = 0;
      c.mesh.group.position.copy(c.pos);
      c.mesh.group.rotation.y = c.heading;
    });
    const pedSpots = [[40, 120], [24, 150], [40, 180]];
    G.peds.peds.slice(0, 3).forEach((ped, i) => {
      ped.pos.set(pedSpots[i][0], 0, pedSpots[i][1]);
      ped.target = null;
    });
    for (let i = 0; i < 8 / STEP; i += 1) {
      G.update(STEP, walkToward(G, 33, 203));
    }
  } else if (name === 'drive') {
    // Driving south through Downtown traffic, mission 1 live on the HUD.
    G.missions.start(0);
    const car = makeCar(G, 0xe8c832, 'taxi', 29, -203, 0);
    G.missionCars.push(car);
    G.player.enterCar(car);
    // Two oncoming cars in the northbound lane so the street reads as alive.
    const oncoming = G.traffic.cars.filter((c) => !c.parked && !c.stolen).slice(0, 2);
    const spots = [[31.5, -50], [31.5, 30]];
    oncoming.forEach((c, i) => {
      c.pos.set(spots[i][0], 0, spots[i][1]);
      c.heading = Math.PI;
      c.speed = 9;
      c.cruise = 9;
      c.next = { x: 31.5, z: -261 };
      c.headingTarget = Math.PI;
      c.mesh.group.position.copy(c.pos);
      c.mesh.group.rotation.y = c.heading;
    });
    for (let i = 0; i < 9 / STEP; i += 1) {
      G.update(STEP, driveToward(G, car, 0, 300));
    }
  } else if (name === 'mission') {
    // Mission 4 in progress: Mara on the road west of the Harbor warehouse, guards ahead, pistol out.
    G.missions.start(3);
    P.pos.set(196, 0, -40);
    P.heading = Math.atan2(232 - 196, -40 - -40);
    for (let i = 0; i < 7 / STEP; i += 1) {
      G.update(STEP, walkToward(G, 210, -40));
    }
  } else {
    // 'chase' (the cover): Mara in a Comet GT, two stars, cruisers on her tail,
    // mission 1's package run live on the HUD.
    G.missions.start(0);
    const car = makeCar(G, 0xd23c2e, 'sport', -203, -29, Math.PI / 2);
    G.missionCars.push(car);
    G.player.enterCar(car);
    G.police.addHeat(35);
    for (let i = 0; i < 12 / STEP; i += 1) {
      const step = G.missions.currentStep();
      const pos = step ? G.missions.objectivePos(step) : { x: 0, z: 300 };
      G.update(STEP, driveToward(G, car, pos.x, pos.z));
    }
    // Stage the pursuit for the frame: the sim leaves cruisers ramming the Comet's
    // bumper, which pins it to a stop. Put the two nearest cruisers ahead of it — one
    // in its lane, one in the oncoming lane — and let the Comet run at speed again.
    car.speed = 28;
    car.damage = 0;
    const byDist = [...G.police.cars].sort((a, b) =>
      Math.hypot(a.pos.x - car.pos.x, a.pos.z - car.pos.z) - Math.hypot(b.pos.x - car.pos.x, b.pos.z - car.pos.z));
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const place = (cop, ahead, side) => {
      cop.pos.x = car.pos.x + fx * ahead - fz * side;
      cop.pos.z = car.pos.z + fz * ahead + fx * side;
      cop.heading = car.heading;
      cop.speed = car.speed * 0.85;
      cop.mesh.group.position.copy(cop.pos);
      cop.mesh.group.rotation.y = cop.heading;
    };
    if (byDist[0]) place(byDist[0], 26, 3.5);
    if (byDist[1]) place(byDist[1], 34, -3.5);
    for (const cop of G.police.cars) {
      const d = Math.hypot(cop.pos.x - car.pos.x, cop.pos.z - car.pos.z);
      if (d < 12) {
        cop.pos.x = car.pos.x - fx * 20;
        cop.pos.z = car.pos.z - fz * 20;
        cop.mesh.group.position.copy(cop.pos);
      }
    }
  }
  // Settle the camera on the action, then paint.
  G.stage.updateCamera(G, 1);
  G.hud.update(0);
}
