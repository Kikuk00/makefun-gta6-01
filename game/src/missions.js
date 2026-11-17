// The story of Mara Voss: six missions across Solmar Bay, from a first fare to the
// King of the Bay. Each mission is a list of steps — go somewhere, steal a car, ram a
// target, fight guards, pick something up, lose the cops — with a beacon marking the
// current objective and a cash reward at the end.
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
      { type: 'goto', at: (G) => L(G).cafe, text: 'Deliver the package to Cafe Azul' },
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
      { type: 'steal', text: 'Steal the Comet GT (press E near it)' },
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
      { type: 'ram', hits: 3, text: 'Ram Rolo\'s sedan 3 times to make him stop' },
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
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab the briefcase' },
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
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab crate 2 of 3', offset: { x: 12, z: -8 } },
      { type: 'pickup', at: (G) => L(G).warehouse, text: 'Grab crate 3 of 3', offset: { x: -12, z: 8 } },
      { type: 'deliver', at: (G) => L(G).garage, text: 'Deliver the crates to the garage', inCar: true },
    ],
  },
  {
    id: 'king-of-the-bay', title: 'King of the Bay', reward: 1500,
    briefing: [
      ['Lena', 'Dario Kessler runs this city. Tonight his black limo crosses the Harbor bridge. End it.'],
      ['Mara', 'One city. One king. And it will not be him.'],
    ],
    steps: [
      { type: 'destroy', text: "Wreck Kessler's limo" },
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
  };

  function objectivePos(step) {
    if (step.type === 'ram' || step.type === 'destroy') return state.targetCar ? state.targetCar.pos : null;
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

  function spawnTargetCar(kind, color, x, z, loop) {
    const car = makeCar(G, color, kind, x, z, 0);
    car.missionLocked = true;
    car.isTarget = true;
    G.missionCars.push(car);
    state.targetCar = car;
    state.targetHp = kind === 'van' ? 100 : 60;
    state.driverLoop = loop;
    return car;
  }

  function clearMissionCars() {
    for (const car of G.missionCars) G.scene.remove(car.mesh.group);
    G.missionCars.length = 0;
    state.targetCar = null;
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
      spawnTargetCar('van', 0x111111, 203, -29, [
        { x: 203, z: -203 }, { x: -29, z: -203 }, { x: -29, z: 203 }, { x: 203, z: 203 },
      ]);
      G.police.addHeat(20);
    }
    if (step.type === 'kill') {
      const w = L(G).warehouse;
      const n = step.count;
      for (let i = 0; i < n; i += 1) {
        G.combat.spawnGuard(w.x + (i % 2 === 0 ? -14 : 14), w.z + (i < 2 ? -10 : 12));
      }
      state.killsAtStart = G.combat.guards.filter((g) => g.dead).length;
    }
    if (state.active.def.id === 'the-drop' && step.type === 'goto' && state.active.stepIndex === 0) {
      G.player.state.hasPistol = true;
      G.hud.banner('Lena gave you a pistol — Left Click to shoot');
    }
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
    if (def.id === 'king-of-the-bay') G.hud.showEnding();
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
    // Drive the target car around its loop.
    const target = state.targetCar;
    if (target && state.driverLoop && !target.dead) {
      const wp = state.driverLoop[target.wpIndex || 0];
      const dx = wp.x - target.pos.x;
      const dz = wp.z - target.pos.z;
      if (Math.hypot(dx, dz) < 10) target.wpIndex = ((target.wpIndex || 0) + 1) % state.driverLoop.length;
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
      if (target && player.inCar && state.ramCooldown <= 0) {
        const d = Math.hypot(target.pos.x - player.inCar.pos.x, target.pos.z - player.inCar.pos.z);
        if (d < 4 && Math.abs(player.inCar.speed) > 7) {
          state.ramCooldown = 1.2;
          G.audio.crash(0.7);
          G.hud.shake(0.4);
          target.damage += 20;
          state.targetHp -= 18;
          if (step.type === 'ram') {
            state.ramHits += 1;
            G.hud.banner(`Hit ${state.ramHits} of ${step.hits} — keep ramming!`);
            if (state.ramHits >= step.hits) {
              target.speed = 0;
              target.dead = true;
              state.driverLoop = null;
              nextStep();
            }
          } else if (state.targetHp <= 0) {
            target.dead = true;
            target.speed = 0;
            state.driverLoop = null;
            G.hud.banner("Kessler's limo is wrecked!");
            nextStep();
          }
        }
      }
    } else if (step.type === 'kill') {
      const deadNow = G.combat.guards.filter((g) => g.dead).length;
      if (deadNow - state.killsAtStart >= step.count) nextStep();
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
