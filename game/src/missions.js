// The story of Mara Voss: twelve missions across Solmar Bay, from a first fare to
// the King of the Bay — plus a taxi chain, a timed street race, a harbor heist by
// speedboat, a stunt run over the city's ramps, a getaway job and the last score.
// Each mission is a list of steps — go somewhere, steal a car, ram a target, fight
// guards, pick something up, lose the cops, run fares, beat a race clock, jump ramps,
// escape by boat — with a beacon marking the current objective, radio chatter from
// the crew as the job unfolds, and a cash reward at the end.
import * as THREE from 'three';
import { CAR, WANTED } from './config.js';
import { makeCar, driveStep } from './vehicles.js';

const L = (G) => G.city.locations;

function beaconMesh(scene) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 20;
  group.add(beam);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: 0xffd23c }),
  );
  gem.position.y = 6;
  group.add(gem);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);
  scene.add(group);
  return { group, gem, beam, ring };
}

export const MISSIONS = [
  {
    id: 'first-fare', title: 'First Fare', reward: 150,
    briefing: [
      ['Mara', 'Rent is due and my tank is empty. One fare. That is all I need.'],
      ['Lena', 'A package is waiting on the Marina pier. Take it to Cafe Azul, Old Town. No questions.'],
    ],
    steps: [
      { type: 'goto', at: (G) => L(G).pier, text: 'Pick up the package at the Marina pier' },
      { type: 'goto', at: (G) => L(G).cafe, text: 'Deliver the package to Cafe Azul', radio: ['Lena', 'Cafe Azul, Old Town. The owner asks no questions, and neither do you.'] },
    ],
  },
  {
    id: 'hot-wheels', title: 'Hot Wheels', reward: 300,
    briefing: [
      ['Lena', 'A Comet GT is sitting in the Solmar Motors showroom. Wrench will pay good money for it.'],
      ['Mara', 'Stealing a showroom car in broad daylight. What could go wrong?'],
    ],
    steps: [
      { type: 'goto', at: (G) => L(G).showroom, text: 'Get to the Solmar Motors showroom' },
      { type: 'steal', text: 'Steal the Comet GT (press E near it)', radio: ['Wrench', 'Yellow Comet, front of the showroom. Do not scratch it. Actually — scratch it, it is not mine.'] },
      { type: 'deliver', at: (G) => L(G).garage, text: "Deliver the Comet GT to Wrench's garage", inCar: true },
    ],
  },
  {
    id: 'debt-run', title: 'Debt Run', reward: 450,
    briefing: [
      ['Wrench', 'A debtor named Rolo owes me four hundred. He is cruising Downtown in a blue sedan.'],
      ['Mara', 'I will tap his bumper until he sees reason.'],
    ],
    steps: [
      { type: 'ram', hits: 3, text: 'Ram Rolo\'s sedan 3 times to make him stop', radio: ['Wrench', 'He is circling Downtown in the blue sedan. Tap him until he listens.'] },
      { type: 'pickup', at: (G) => null, text: 'Collect the cash from Rolo' },
    ],
  },
  {
    id: 'the-drop', title: 'The Drop', reward: 600,
    briefing: [
      ['Lena', 'The Harbor warehouse holds a briefcase for a client. It is guarded. Take this pistol.'],
      ['Mara', 'First time I have held one since the courier days. Let us get it done.'],
    ],
    steps: [
      { type: 'goto', at: (G) => L(G).warehouse, text: 'Reach the Harbor warehouse' },
      { type: 'kill', count: 3, text: 'Deal with the warehouse guards' },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab the briefcase', radio: ['Lena', 'The briefcase is by the crates. Take it and do not open it.'] },
      { type: 'escape', text: 'Lose the cops, then reach the safehouse' },
      { type: 'goto', at: (G) => L(G).safehouse, text: 'Bring the briefcase home' },
    ],
  },
  {
    id: 'warehouse-raid', title: 'Warehouse Raid', reward: 900,
    briefing: [
      ['Wrench', 'Kessler\'s crew stashed three crates of parts in the warehouse. We take them tonight.'],
      ['Mara', 'Four guards, three crates, one very fast getaway.'],
    ],
    steps: [
      { type: 'goto', at: (G) => L(G).warehouse, text: 'Reach the Harbor warehouse' },
      { type: 'kill', count: 4, text: 'Clear the warehouse guards' },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab crate 1 of 3' },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab crate 2 of 3', offset: { x: 12, z: 4 } },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab crate 3 of 3', offset: { x: -12, z: 4 } },
      { type: 'deliver', at: (G) => L(G).garage, text: 'Deliver the crates to the garage', inCar: true, radio: ['Wrench', 'Crates in the back, foot down. Kessler will notice they are gone by morning.'] },
    ],
  },
  {
    id: 'king-of-the-bay', title: 'King of the Bay', reward: 1500,
    briefing: [
      ['Lena', 'Dario Kessler runs this city. Tonight his black limo crosses the Harbor bridge. End it.'],
      ['Mara', 'One city. One king. And it will not be him.'],
    ],
    steps: [
      { type: 'destroy', text: "Wreck Kessler's limo", radio: ['Lena', 'His limo is crossing the Harbor bridge tonight. End it, and end him.'] },
      { type: 'escape', text: 'Lose the cops, then reach the safehouse' },
      { type: 'goto', at: (G) => L(G).safehouse, text: 'Lay low at the safehouse' },
    ],
  },
  {
    id: 'taxi-driver', title: 'Taxi Driver', reward: 500,
    briefing: [
      ['Lena', 'The taxi rank needs a driver tonight. Three fares, three stops, no dawdling — the meter is running.'],
      ['Mara', 'Three fares. I can drive. The hard part is the passengers.'],
    ],
    steps: [
      { type: 'fare', count: 3, text: 'Run 3 taxi fares (press T near a waving passenger)' },
    ],
  },
  {
    id: 'sunset-grand-prix', title: 'Sunset Grand Prix', reward: 800,
    briefing: [
      ['Wrench', 'Street race at sunset, four checkpoints across the whole city. Beat the clock and the prize is yours.'],
      ['Mara', 'Four checkpoints. One Comet. No brakes I cannot afford.'],
    ],
    steps: [
      { type: 'race', checkpoints: [
        { x: 203, z: 203, label: 'Marina' }, { x: -203, z: 203, label: 'Old Town' },
        { x: -203, z: -203, label: 'Coral Hills' }, { x: 203, z: -203, label: 'Harbor' },
      ], timeLimit: 150, text: 'Race through 4 checkpoints before the clock runs out', radio: ['Wrench', 'Four checkpoints, whole city, one hundred fifty seconds. The Comet can do it. Can you?'] },
    ],
  },
  {
    id: 'harbor-heist', title: 'Harbor Heist', reward: 1100,
    briefing: [
      ['Lena', 'Kessler keeps his cash in a briefcase at the Harbor warehouse. His guards are light tonight.'],
      ['Wrench', 'I have a speedboat waiting at the Marina pier. Grab the case, get to the pier, and lose them on the water.'],
    ],
    steps: [
      { type: 'goto', at: (G) => L(G).warehouse, text: 'Reach the Harbor warehouse' },
      { type: 'kill', count: 2, text: 'Deal with the dock guards', radio: ['Lena', 'Two guards on the dock. Quiet would be nice. Loud works too.'] },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab the briefcase' },
      { type: 'goto', at: (G) => L(G).boatPier, text: 'Get to the speedboat at the Marina pier', radio: ['Wrench', 'White speedboat, end of the pier. Keys are in it. Go!'] },
      { type: 'boat', at: (G) => L(G).openWater, text: 'Escape by boat — reach open water' },
      { type: 'escape', text: 'Lose the cops, then reach the safehouse' },
      { type: 'goto', at: (G) => L(G).safehouse, text: 'Bring the briefcase home' },
    ],
  },
  {
    id: 'stunt-run', title: 'Stunt Run', reward: 700,
    briefing: [
      ['Wrench', 'The boys bet you cannot fly a car. Three ramps, three jumps, then bring it home in one piece.'],
      ['Mara', 'Three ramps. One Comet. Hold my coffee.'],
    ],
    steps: [
      { type: 'jump', count: 3, text: 'Hit 3 stunt ramps at speed', radio: ['Wrench', 'Ramps are marked orange on the map. Speed is everything — crawl over one and you just bump.'] },
      { type: 'deliver', at: (G) => L(G).garage, text: "Drive back to Wrench's garage", inCar: true },
    ],
  },
  {
    id: 'getaway-driver', title: 'Getaway Driver', reward: 900,
    briefing: [
      ['Lena', "Kessler's courier is carrying the week's take in a black van, circling Downtown. Take it off him."],
      ['Mara', 'Ram, grab, vanish. My favourite kind of errand.'],
    ],
    steps: [
      { type: 'ram', hits: 2, text: "Ram the courier's van 2 times to make him stop", radio: ['Lena', 'Black van, Downtown loop. He will not stop for a friendly wave.'] },
      { type: 'pickup', at: (G) => null, text: 'Collect the cash from the courier' },
      { type: 'escape', text: 'Lose the cops, then reach the safehouse' },
      { type: 'goto', at: (G) => L(G).safehouse, text: 'Bring the take home' },
    ],
  },
  {
    id: 'the-last-score', title: 'The Last Score', reward: 2000,
    briefing: [
      ['Lena', 'Kessler is gone, but his lieutenant Vex runs the last convoy tonight — two armored vans, Downtown loop.'],
      ['Wrench', 'Wreck them both and the city is finally ours. Every road, every dock, every sunset.'],
    ],
    steps: [
      { type: 'destroy', count: 2, text: "Wreck both of Vex's armored vans", radio: ['Lena', 'Two vans, black, armored. Ram them until they stop moving.'] },
      { type: 'escape', text: 'Lose the cops, then reach the safehouse' },
      { type: 'goto', at: (G) => L(G).safehouse, text: 'Lay low at the safehouse' },
    ],
  },
];

export function createMissions(G) {
  const beacon = beaconMesh(G.scene);
  beacon.group.visible = false;
  const state = {
    active: null, // { def, stepIndex, ... }
    done: new Set(G.saveData ? G.saveData.missionsDone : []),
    ramHits: 0, ramCooldown: 0, killsAtStart: 0,
    targetCar: null, targetHp: 0, driverLoop: null,
    // Round 2: the taxi chain and the race keep their progress here.
    faresAtStart: 0, raceIndex: 0, raceTimeLeft: 0,
    // Round 3: the convoy keeps its own target list, and the stunt run counts jumps.
    targetCars: [], destroyedCount: 0, jumpsAtStart: 0,
  };

  function objectivePos(step) {
    if (step.type === 'ram' || step.type === 'destroy') {
      const alive = state.targetCars.find((c) => !c.dead) || state.targetCar;
      return alive ? alive.pos : null;
    }
    // Round 2: a race checkpoint is the current objective; a taxi chain follows
    // the live fare (or has no marker while no fare is running).
    if (step.type === 'race') return step.checkpoints[state.raceIndex] || null;
    if (step.type === 'fare') return G.activities ? G.activities.fareObjective() : null;
    // Round 3: a stunt run points at the nearest ramp; a boat step points at the
    // water marker the step names.
    if (step.type === 'jump') {
      let best = null;
      let bestD = Infinity;
      for (const r of G.city.ramps) {
        const d = Math.hypot(r.x - G.player.state.pos.x, r.z - G.player.state.pos.z);
        if (d < bestD) { bestD = d; best = r; }
      }
      return best;
    }
    if (step.type === 'boat') return step.at ? step.at(G) : null;
    if (!step.at) return state.targetCar ? state.targetCar.pos : null;
    const p = step.at(G);
    if (!p) return state.targetCar ? state.targetCar.pos : null;
    const off = step.offset || { x: 0, z: 0 };
    return { x: p.x + off.x, z: p.z + off.z };
  }

  function currentStep() {
    if (!state.active) return null;
    return state.active.def.steps[state.active.stepIndex];
  }

  function objectiveText() {
    const step = currentStep();
    if (!step) return '';
    return step.text;
  }

  function spawnTargetCar(kind, color, x, z, loop, hp = 60) {
    const car = makeCar(G, color, kind, x, z, 0);
    car.missionLocked = true;
    car.isTarget = true;
    // Round 3: a target car carries its own loop and health, so a convoy of two
    // vans can drive itself while the player hunts them one by one.
    car.loop = loop;
    car.wpIndex = 0;
    car.hp = hp;
    G.missionCars.push(car);
    state.targetCar = car;
    state.targetCars.push(car);
    state.targetHp = hp;
    state.driverLoop = loop;
    return car;
  }

  function clearMissionCars() {
    for (const car of G.missionCars) G.scene.remove(car.mesh.group);
    G.missionCars.length = 0;
    state.targetCar = null;
    state.targetCars = [];
    state.destroyedCount = 0;
  }

  function setupStep(step) {
    state.ramHits = 0;
    if (step.type === 'steal') {
      const s = L(G).showroom;
      const car = makeCar(G, 0xe8c832, 'sport', s.x, s.z + 14, Math.PI / 2);
      car.isComet = true;
      G.missionCars.push(car);
      state.targetCar = car;
    }
    if (step.type === 'ram') {
      spawnTargetCar('sedan', 0x2e6fd2, 29, -87, [
        { x: 29, z: -203 }, { x: 203, z: -203 }, { x: 203, z: 29 }, { x: 29, z: 29 },
      ]);
    }
    if (step.type === 'destroy') {
      // Round 3: the last score is a convoy — two armored vans on the same loop.
      const count = step.count || 1;
      const loop = [
        { x: 203, z: -203 }, { x: -29, z: -203 }, { x: -29, z: 203 }, { x: 203, z: 203 },
      ];
      if (count > 1) {
        spawnTargetCar('van', 0x1a1a1a, 203, -29, loop, 100);
        spawnTargetCar('van', 0x1a1a1a, 203, 87, loop, 100);
      } else {
        spawnTargetCar('limo', 0x111111, 203, -29, loop, 100);
      }
      G.police.addHeat(20);
    }
    if (step.type === 'kill') {
      const w = L(G).warehouse;
      const n = step.count;
      for (let i = 0; i < n; i += 1) {
        // Round 3: guards wait outside the warehouse wall, not inside the building.
        G.combat.spawnGuard(w.x + (i % 2 === 0 ? -14 : 14), w.z + (i < 2 ? 10 : 16));
      }
      state.killsAtStart = G.combat.guards.filter((g) => g.dead).length;
    }
    if (state.active.def.id === 'the-drop' && step.type === 'goto' && state.active.stepIndex === 0) {
      G.player.givePistol();
      G.hud.banner('Lena gave you a pistol — Left Click to shoot, R to reload');
    }
    // Round 2: a taxi chain starts from zero fares; a race starts its clock.
    if (step.type === 'fare') {
      state.faresAtStart = G.faresDone;
      G.hud.banner('Find a waving passenger and press T — or just drive a taxi, fares come to you');
    }
    if (step.type === 'race') {
      state.raceIndex = 0;
      state.raceTimeLeft = step.timeLimit;
      G.audio.beep(false);
      G.hud.banner(`Sunset Grand Prix — ${step.checkpoints.length} checkpoints, ${step.timeLimit} seconds. Go!`);
    }
    // Round 3: a boat step parks a speedboat at the pier (one is enough — the same
    // boat waits if you retry the step), and a jump step counts from zero.
    if (step.type === 'boat') {
      let boat = G.boats.find((b) => b.missionBoat);
      if (!boat) {
        const pier = L(G).boatPier;
        boat = makeCar(G, 0xe8e8e8, 'boat', pier.x, pier.z, Math.PI);
        boat.missionBoat = true;
        G.boats.push(boat);
      }
      G.hud.banner('The speedboat is waiting at the end of the pier — get in and go!');
    }
    if (step.type === 'jump') {
      state.jumpsAtStart = G.stunts.totalJumps;
      G.hud.banner(`Stunt Run — hit ${step.count} ramps at speed. The orange wedges are on the map.`);
    }
    // Round 3: radio chatter — a line from the crew when the step starts, so the
    // story keeps talking while you drive instead of only at the briefing.
    if (step.radio) G.hud.say(step.radio[0], step.radio[1]);
    const pos = objectivePos(step);
    beacon.group.visible = !!pos;
    if (pos) beacon.group.position.set(pos.x, 0, pos.z);
  }

  function start(index) {
    const def = MISSIONS[index];
    if (!def) return false;
    if (state.active) return false;
    clearMissionCars();
    G.combat.clearGuards();
    state.active = { def, stepIndex: 0 };
    G.hud.showBriefing(def);
    setupStep(def.steps[0]);
    return true;
  }

  function nextStep() {
    const active = state.active;
    active.stepIndex += 1;
    if (active.stepIndex >= active.def.steps.length) {
      complete();
      return;
    }
    setupStep(active.def.steps[active.stepIndex]);
    G.hud.banner(active.def.steps[active.stepIndex].text);
  }

  function complete() {
    const def = state.active.def;
    state.done.add(def.id);
    G.cash += def.reward;
    G.bestCash = Math.max(G.bestCash, G.cash);
    clearMissionCars();
    beacon.group.visible = false;
    state.active = null;
    G.audio.sting();
    G.hud.missionComplete(def);
    G.save();
    // Round 3: the ending plays when every mission is done — all twelve of them,
    // from the first fare to the last score — whichever job finishes the set.
    if (MISSIONS.every((m) => state.done.has(m.id))) G.hud.showEnding();
  }

  function fail(reason) {
    if (!state.active) return;
    clearMissionCars();
    G.combat.clearGuards();
    beacon.group.visible = false;
    const def = state.active.def;
    state.active = null;
    G.audio.fail();
    G.hud.missionFailed(def, reason);
  }

  // Drop the current mission without an overlay (used by "Restart mission").
  function abandon() {
    if (!state.active) return;
    clearMissionCars();
    G.combat.clearGuards();
    beacon.group.visible = false;
    state.active = null;
  }

  function onPlayerDown(reason) {
    if (state.active) fail(reason);
  }

  function update(dt) {
    state.ramCooldown = Math.max(0, state.ramCooldown - dt);
    // The beacon pulses and spins.
    if (beacon.group.visible) {
      beacon.gem.rotation.y += dt * 2;
      beacon.gem.position.y = 6 + Math.sin(G.time * 2) * 0.6;
      beacon.beam.material.opacity = 0.2 + Math.sin(G.time * 3) * 0.08;
    }
    // Drive every target car around its loop (a convoy drives in formation).
    for (const target of G.missionCars) {
      if (!target.loop || target.dead) continue;
      const wp = target.loop[target.wpIndex || 0];
      const dx = wp.x - target.pos.x;
      const dz = wp.z - target.pos.z;
      if (Math.hypot(dx, dz) < 10) target.wpIndex = ((target.wpIndex || 0) + 1) % target.loop.length;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - target.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      driveStep(G, target, { throttle: Math.abs(dh) > 1.2 ? 0.3 : 1, steer: Math.max(-1, Math.min(1, dh * 1.5)), handbrake: false }, dt);
      target.speed = Math.min(target.speed, 16);
    }
    const step = currentStep();
    if (!step) return;
    const player = G.player.state;
    const pos = objectivePos(step);
    beacon.group.visible = !!pos;
    if (pos) beacon.group.position.set(pos.x, 0, pos.z);
    const dist = pos ? Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z) : 0;
    if (step.type === 'goto' || step.type === 'deliver') {
      if (dist < 7 && (!step.inCar || player.inCar)) nextStep();
    } else if (step.type === 'pickup') {
      if (dist < 4 && !player.inCar) {
        G.audio.pickup();
        if (state.active.def.id === 'the-drop') G.police.addHeat(40);
        nextStep();
      }
    } else if (step.type === 'steal') {
      if (player.inCar && player.inCar.isComet) {
        G.police.addHeat(WANTED.stealCar);
        nextStep();
      }
    } else if (step.type === 'ram' || step.type === 'destroy') {
      // Round 3: ramming works on the nearest living target — one sedan for a ram
      // job, two armored vans for the last score, each with its own health.
      const target = state.targetCars.find((c) => !c.dead) || null;
      if (target && player.inCar && state.ramCooldown <= 0) {
        const d = Math.hypot(target.pos.x - player.inCar.pos.x, target.pos.z - player.inCar.pos.z);
        if (d < 4 && Math.abs(player.inCar.speed) > 7) {
          state.ramCooldown = 1.2;
          G.audio.crash(0.7);
          G.hud.shake(0.4);
          target.damage += 20;
          target.hp -= 18;
          if (step.type === 'ram') {
            state.ramHits += 1;
            G.hud.banner(`Hit ${state.ramHits} of ${step.hits} — keep ramming!`);
            if (state.ramHits >= step.hits) {
              target.speed = 0;
              target.dead = true;
              target.loop = null;
              nextStep();
            }
          } else if (target.hp <= 0) {
            target.dead = true;
            target.speed = 0;
            target.loop = null;
            state.destroyedCount += 1;
            G.effects.explosion(target.pos.x, 1.5, target.pos.z);
            G.audio.explosion();
            G.hud.shake(0.6);
            if (state.destroyedCount >= (step.count || 1)) {
              G.hud.banner("The convoy is scrap metal — Vex's last vans are done!");
              nextStep();
            } else {
              G.hud.banner(`One van down — ${step.count - state.destroyedCount} to go!`);
            }
          }
        }
      }
    } else if (step.type === 'boat') {
      // Round 3: the boat step ends when Mara is in the speedboat inside the marker.
      if (player.inCar && player.inCar.isBoat && dist < 14) nextStep();
    } else if (step.type === 'jump') {
      // Round 3: the stunt run counts jumps landed since the step started.
      const done = G.stunts.totalJumps - state.jumpsAtStart;
      if (done >= step.count) nextStep();
    } else if (step.type === 'kill') {
      const deadNow = G.combat.guards.filter((g) => g.dead).length;
      if (deadNow - state.killsAtStart >= step.count) nextStep();
    } else if (step.type === 'fare') {
      // Round 2: the taxi chain counts fares finished while the mission is live.
      const done = G.faresDone - state.faresAtStart;
      if (done >= step.count) nextStep();
    } else if (step.type === 'race') {
      // Round 2: a timed checkpoint race — reach each marker before the clock dies.
      state.raceTimeLeft -= dt;
      if (state.raceTimeLeft <= 0) { fail('The race clock ran out.'); return; }
      const cp = step.checkpoints[state.raceIndex];
      if (cp && dist < 10) {
        state.raceIndex += 1;
        G.audio.beep(state.raceIndex >= step.checkpoints.length);
        if (state.raceIndex >= step.checkpoints.length) {
          const ms = Math.round((step.timeLimit - state.raceTimeLeft) * 1000);
          if (!G.bestRaceMs || ms < G.bestRaceMs) {
            G.bestRaceMs = ms;
            G.hud.banner(`New best race time — ${(ms / 1000).toFixed(1)}s!`);
          }
          nextStep();
        } else {
          G.hud.banner(`Checkpoint ${state.raceIndex} of ${step.checkpoints.length} — ${step.checkpoints[state.raceIndex].label}`);
        }
      }
    } else if (step.type === 'escape') {
      if (G.police.state.stars === 0) nextStep();
    }
  }

  return {
    state, start, update, onPlayerDown, abandon, objectiveText, currentStep, objectivePos,
    nextAvailable() {
      for (let i = 0; i < MISSIONS.length; i += 1) {
        if (!state.done.has(MISSIONS[i].id)) return i;
      }
      return -1;
    },
  };
}
