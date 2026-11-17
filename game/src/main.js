// Solmar Bay: boot and the one loop. Input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves between
// screens: title, play, paused, mission list, mission complete / failed, and the ending.
//
// ?seed=N fixes the city and the traffic. ?shot=chase|play|drive|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createTraffic, driveStep } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions, MISSIONS } from './missions.js';
import { createHud } from './hud.js';
import { createStage } from './render.js';
import { loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const saveData = loadSave();

const G = {
  time: 0,
  seed,
  rng: createRandom(seed),
  cash: saveData ? saveData.cash : 0,
  bestCash: saveData ? saveData.bestCash : 0,
  muted: saveData ? saveData.muted : false,
  saveData,
  missionCars: [],
  camFreeUntil: 0,
  screen: 'title',
};
G.audio = createAudio();
G.audio.setMuted(G.muted);
G.stage = createStage(canvas);
G.scene = G.stage.scene;
G.city = buildCity(G.scene, G.rng);
G.traffic = createTraffic(G);
G.peds = createPedestrians(G);
G.player = createPlayer(G);
G.police = createPolice(G);
G.combat = createCombat(G);
G.missions = createMissions(G);
G.hud = createHud(G);
G.hud.setSaveInfo(saveData);

G.save = function save() {
  return saveGame({
    cash: G.cash,
    missionsDone: [...G.missions.state.done],
    bestCash: G.bestCash,
    muted: G.muted,
  });
};

function announce(message) {
  status.textContent = message;
}

G.events = {
  wasted() {
    G.missions.onPlayerDown('wasted');
    respawn('wasted');
  },
  busted() {
    G.missions.onPlayerDown('busted');
    respawn('busted');
  },
};

function respawn(reason) {
  const p = G.player.state;
  if (p.inCar) G.player.exitCar();
  const h = G.city.locations.hospital;
  p.pos.set(h.x, 0, h.z + 12);
  p.pos.y = 0;
  p.health = 100;
  p.velX = 0;
  p.velZ = 0;
  const fine = reason === 'wasted' ? 100 : 150;
  G.cash = Math.max(0, G.cash - fine);
  G.police.state.heat = 0;
  G.police.state.stars = 0;
  G.hud.banner(reason === 'wasted' ? `Wasted. The clinic patched you up — $${fine}.` : `Busted. Bail cost $${fine}. Stay out of trouble.`, 5);
  G.audio.busted();
  G.save();
}

// Keyboard, mouse and wheel input. Held keys steer; one-shot presses are queued and
// taken once by the loop, so a press between two frames is never lost.
const input = {
  forward: false, back: false, left: false, right: false,
  run: false, jump: false, handbrake: false, shootHeld: false,
  actions: 0,
};
const ACTION_ENTER_CAR = 1;
const ACTION_PUNCH = 2;
const ACTION_PAUSE = 4;
const ACTION_MISSIONS = 8;
const ACTION_CONFIRM = 16;

const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'jump',
};
window.addEventListener('keydown', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) {
    input[mapped] = true;
    if (mapped === 'jump') input.handbrake = true;
    event.preventDefault();
    return;
  }
  if (event.repeat) return;
  if (event.code === 'KeyE') input.actions |= ACTION_ENTER_CAR;
  else if (event.code === 'KeyF') input.actions |= ACTION_PUNCH;
  else if (event.code === 'KeyM') input.actions |= ACTION_MISSIONS;
  else if (event.code === 'Escape' || event.code === 'KeyP') input.actions |= ACTION_PAUSE;
  else if (event.code === 'Enter') input.actions |= ACTION_CONFIRM;
  else return;
  event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) {
    input[mapped] = false;
    if (mapped === 'jump') input.handbrake = false;
  }
});
window.addEventListener('blur', () => {
  for (const k of ['forward', 'back', 'left', 'right', 'run', 'jump', 'handbrake']) input[k] = false;
  input.shootHeld = false;
});
let dragging = false;
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    input.shootHeld = true;
    dragging = true;
  }
});
window.addEventListener('mouseup', () => {
  input.shootHeld = false;
  dragging = false;
});
window.addEventListener('mousemove', (event) => {
  if (!dragging) return;
  G.stage.rig.targetYaw -= event.movementX * 0.005;
  G.stage.rig.targetPitch = Math.max(0.08, Math.min(1.0, G.stage.rig.targetPitch + event.movementY * 0.003));
  G.camFreeUntil = G.time + 2.5;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  G.stage.rig.targetDist = Math.max(6, Math.min(22, G.stage.rig.targetDist + event.deltaY * 0.01));
}, { passive: false });

function takeActions() {
  const taken = input.actions;
  input.actions = 0;
  return taken;
}

function startGame() {
  G.screen = 'play';
  G.hud.showOnly(null);
  G.audio.resume();
  G.audio.engineStart();
  G.audio.musicStart();
  announce('Playing. WASD to move, E to enter a car, M for missions.');
  if (!G.missions.state.active && G.missions.nextAvailable() === 0 && G.missions.state.done.size === 0) {
    G.missions.start(0);
  }
}

function togglePause() {
  if (G.screen === 'play') {
    G.screen = 'pause';
    G.hud.showOnly('pause');
    announce('Paused.');
  } else if (G.screen === 'pause') {
    G.screen = 'play';
    G.hud.showOnly(null);
    announce('Playing.');
  }
}

G.hud.onAction = (action) => {
  G.audio.resume();
  G.audio.click();
  if (action.type === 'start') {
    startGame();
  } else if (action.type === 'resume') {
    if (G.screen === 'pause' || G.screen === 'missions' || G.screen === 'failed' || G.screen === 'ending' || G.screen === 'complete') {
      G.screen = 'play';
      G.hud.showOnly(null);
    }
  } else if (action.type === 'save') {
    G.save();
    G.hud.banner('Game saved.');
  } else if (action.type === 'restart-mission') {
    const active = G.missions.state.active;
    if (active) {
      const idx = MISSIONS.findIndex((m) => m.id === active.def.id);
      G.missions.abandon();
      G.player.state.health = 100;
      G.police.state.heat = 0;
      G.police.state.stars = 0;
      if (idx >= 0 && G.missions.start(idx)) {
        G.screen = 'play';
        G.hud.showOnly(null);
      }
    }
  } else if (action.type === 'quit-title') {
    G.screen = 'title';
    G.hud.showOnly('title');
  } else if (action.type === 'open-missions') {
    G.screen = 'missions';
  } else if (action.type === 'start-mission') {
    if (G.missions.start(action.index)) {
      G.screen = 'play';
      G.hud.showOnly(null);
    }
  } else if (action.type === 'retry-mission') {
    const next = G.missions.nextAvailable();
    if (next >= 0) {
      G.player.state.health = 100;
      G.police.state.heat = 0;
      G.police.state.stars = 0;
      if (G.missions.start(next)) {
        G.screen = 'play';
        G.hud.showOnly(null);
      }
    }
  } else if (action.type === 'mute') {
    G.muted = !G.muted;
    G.audio.setMuted(G.muted);
    G.save();
  }
};

// One fixed simulation step: player, traffic, pedestrians, police, combat, missions,
// then the collisions between them (player car vs traffic, player car vs pedestrians).
G.update = function update(dt, driveInput) {
  G.time += dt;
  const p = G.player.state;
  const inCar = !!p.inCar;
  if (inCar) {
    const car = p.inCar;
    const di = driveInput || {
      throttle: (input.forward ? 1 : 0) + (input.back ? -1 : 0),
      steer: (input.left ? 1 : 0) - (input.right ? 1 : 0),
      handbrake: input.handbrake,
    };
    driveStep(G, car, di, dt);
    G.audio.engine(Math.min(1, Math.abs(car.speed) / 34), true);
    // Keep the player's position in sync with the car: the HUD, the missions and the
    // police all read the player's position, on foot or behind the wheel.
    p.pos.x = car.pos.x;
    p.pos.z = car.pos.z;
    p.heading = car.heading;
    // Ramming traffic cars: shove them and slow down.
    for (const other of G.traffic.cars) {
      if (other.dead || other.stolen) continue;
      const d = Math.hypot(other.pos.x - car.pos.x, other.pos.z - car.pos.z);
      if (d < 3.6 && d > 0.01) {
        const nx = (other.pos.x - car.pos.x) / d;
        const nz = (other.pos.z - car.pos.z) / d;
        other.pos.x += nx * (3.6 - d);
        other.pos.z += nz * (3.6 - d);
        if (Math.abs(car.speed) > 8) {
          car.speed *= 0.75;
          G.audio.crash(0.5);
          G.hud.shake(0.3);
          G.police.addHeat(4);
        }
      }
    }
    // Running over pedestrians.
    for (const ped of G.peds.peds) {
      if (ped.dead || ped.down > 0) continue;
      const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
      if (d < 2.3 && Math.abs(car.speed) > 4) {
        G.peds.knockDown(ped, car.pos.x, car.pos.z);
        car.speed *= 0.8;
        G.audio.crash(0.4);
        G.police.addHeat(30);
      }
    }
    if (car.damage > 120) {
      car.damage = 0;
      car.speed = 0;
      G.hud.banner('Your car is wrecked. Find another ride.');
    }
  } else {
    const moveInput = driveInput || input;
    G.player.update(dt, moveInput, G.stage.rig.yaw);
    G.audio.engine(0, false);
  }
  G.traffic.update(dt, inCar ? p.inCar : null);
  const danger = inCar && Math.abs(p.inCar.speed) > 8
    ? { x: p.inCar.pos.x, z: p.inCar.pos.z, r: 12 }
    : null;
  G.peds.update(dt, danger);
  G.police.update(dt);
  G.combat.update(dt);
  G.missions.update(dt);
};

function handleActions() {
  const actions = takeActions();
  const p = G.player.state;
  if (actions & ACTION_CONFIRM) {
    if (G.screen === 'title') startGame();
  }
  if (actions & ACTION_PAUSE) {
    if (G.screen === 'play' || G.screen === 'pause') togglePause();
    else if (G.screen === 'missions') {
      G.screen = 'play';
      G.hud.showOnly(null);
    }
  }
  if (actions & ACTION_MISSIONS) {
    if (G.screen === 'play') {
      G.screen = 'missions';
      G.hud.buildMissionList();
      G.hud.showOnly('missions');
    } else if (G.screen === 'missions') {
      G.screen = 'play';
      G.hud.showOnly(null);
    }
  }
  if (G.screen !== 'play') return;
  if (actions & ACTION_ENTER_CAR) {
    if (p.inCar) {
      G.player.exitCar();
      G.audio.click();
    } else {
      const car = G.player.nearestCar(3.6);
      if (car) {
        G.player.enterCar(car);
        if (!car.isComet) G.police.addHeat(car.parked ? 10 : 25);
        G.hud.setPrompt('');
      }
    }
  }
  if (actions & ACTION_PUNCH) G.combat.punch();
  if (input.shootHeld && p.hasPistol && !p.inCar) G.combat.shoot();
}

function contextPrompt() {
  const p = G.player.state;
  if (G.screen !== 'play') {
    G.hud.setPrompt('');
    return;
  }
  if (!p.inCar) {
    const car = G.player.nearestCar(3.6);
    G.hud.setPrompt(car ? 'E — Enter car' : '');
  } else {
    G.hud.setPrompt('E — Exit car    Space — Handbrake');
  }
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  G.hud.showOnly('title');
  announce('Solmar Bay. Press Enter or click Start.');

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    document.getElementById('hud').classList.toggle('title-mode', G.screen === 'title');
    if (G.screen === 'play') {
      while (accumulator >= STEP) {
        G.update(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      G.time += 1 / 60;
      if (G.screen === 'title') {
        // Slow orbit over Downtown behind the title screen.
        G.stage.rig.targetYaw += 0.02 * (1 / 60);
        G.camFreeUntil = G.time + 1;
      }
    }
    contextPrompt();
    G.stage.updateCamera(G, 1 / 60);
    G.hud.update(1 / 60);
    G.stage.renderer.render(G.stage.scene, G.stage.camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') togglePause();
  });

  requestAnimationFrame(frame);
}

function runShot(name) {
  stageShot(G, name);
  let painted = 0;
  function paint() {
    G.stage.renderer.render(G.stage.scene, G.stage.camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else runGame();

// Exposed for automated play-testing (headless Chrome via CDP).
window.__G = G;
window.__input = input;
