// The HUD: cash and health, wanted stars, the mission objective, a live minimap, the
// speedometer, context prompts, story subtitles, and every menu (title, pause, mission
// list, mission complete / failed, ending). Round 2 adds a mission tracker with the
// step count, a race/fare timer, an ammo counter, the car you are driving with its
// damage, a sprint stamina bar and a hidden-package count. All DOM; the 3D view
// stays a plain canvas.
import { districtAt, clockString, CAR_NAMES, PACKAGE_COUNT } from './config.js';
import { MISSIONS } from './missions.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const els = {
    cash: $('cash'), healthFill: $('health-fill'), healthText: $('health-text'),
    district: $('district'), stars: $('stars'), objective: $('objective'),
    objectiveDist: $('objective-dist'), banner: $('banner'), subtitle: $('subtitle'),
    speed: $('speed'), prompt: $('prompt'), crosshair: $('crosshair'),
    vignette: $('vignette'), minimap: $('minimap'),
    title: $('title-screen'), pause: $('pause-menu'), missions: $('mission-menu'),
    complete: $('mission-complete'), failed: $('mission-failed'), ending: $('ending-screen'),
    completeTitle: $('complete-title'), completeReward: $('complete-reward'),
    failedTitle: $('failed-title'), failedReason: $('failed-reason'),
    missionList: $('mission-list'), startBtn: $('start-btn'), continueBtn: $('continue-btn'),
    titleSave: $('title-save'),
    // Round 2 elements.
    missionTitle: $('mission-title'), timer: $('timer'), ammo: $('ammo'),
    vehicle: $('vehicle'), staminaFill: $('stamina-fill'), packages: $('packages'),
    // Round 3 elements.
    armorFill: $('armor-fill'), shop: $('shop-screen'), shopList: $('shop-list'),
    shopCash: $('shop-cash'),
  };
  const mapCtx = els.minimap.getContext('2d');
  let bannerUntil = 0;
  let subtitleUntil = 0;
  let subtitleQueue = [];
  let shakeAmount = 0;
  let onAction = () => {};
  let lastObjective = '';

  function showOnly(name) {
    for (const key of ['title', 'pause', 'missions', 'complete', 'failed', 'ending', 'shop']) {
      els[key].classList.toggle('hidden', key !== name);
    }
    if (!name) for (const key of ['title', 'pause', 'missions', 'complete', 'failed', 'ending', 'shop']) els[key].classList.add('hidden');
  }

  function banner(text, seconds = 3.5) {
    els.banner.textContent = text;
    els.banner.classList.remove('hidden');
    bannerUntil = G.time + seconds;
  }

  // Round 3: hide the banner right away — the staged screenshots call this so no
  // banner covers the middle of the frame.
  function clearBanner() {
    els.banner.classList.add('hidden');
    bannerUntil = 0;
  }

  // Round 3: a radio line from the crew — queued like a briefing line, so the story
  // talks while you drive instead of only at the mission start.
  function say(who, line) {
    subtitleQueue.push({ who, line });
  }

  function showBriefing(def) {
    subtitleQueue = def.briefing.map(([who, line]) => ({ who, line }));
  }

  // Round 2: skip the briefing subtitles — the staged screenshots use this so the
  // story text does not cover the middle of the frame; real play still shows it.
  function clearSubtitles() {
    subtitleQueue = [];
    els.subtitle.classList.add('hidden');
    subtitleUntil = 0;
  }

  function missionComplete(def) {
    els.completeTitle.textContent = `Mission complete: ${def.title}`;
    els.completeReward.textContent = `+$${def.reward}  •  Total cash $${G.cash}`;
    G.screen = 'complete';
    showOnly('complete');
    window.setTimeout(() => {
      if (G.screen === 'complete') {
        G.screen = 'play';
        showOnly(null);
      }
    }, 4500);
  }

  function missionFailed(def, reason) {
    els.failedTitle.textContent = `Mission failed: ${def.title}`;
    els.failedReason.textContent = reason === 'wasted' ? 'Mara was wasted. The crew does not wait.' : 'Busted by the Solmar Bay PD. The crew does not wait.';
    G.screen = 'failed';
    showOnly('failed');
  }

  function showEnding() {
    G.screen = 'ending';
    showOnly('ending');
  }

  function flashDamage() {
    els.vignette.style.opacity = '0.55';
  }

  function shake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
  }

  function setPrompt(text) {
    els.prompt.textContent = text || '';
  }

  function drawMinimap() {
    const W = 200;
    const H = 200;
    const scale = W / 680;
    const ox = 340 * scale;
    const oz = 340 * scale;
    const X = (x) => ox + x * scale;
    const Z = (z) => oz + z * scale;
    // Round 2: a brighter map — pale roads on a dark blue-green sea, so it reads
    // at a glance even when the contact sheet shrinks it.
    mapCtx.fillStyle = '#12283a';
    mapCtx.fillRect(0, 0, W, H);
    // Water: south and west edges.
    mapCtx.fillStyle = '#1f7fa8';
    mapCtx.fillRect(0, Z(330), W, H - Z(330));
    mapCtx.fillRect(0, 0, X(-292), H);
    // Blocks.
    mapCtx.fillStyle = '#3a4552';
    for (const c of G.city.colliders) {
      mapCtx.fillRect(X(c.minX), Z(c.minZ), (c.maxX - c.minX) * scale, (c.maxZ - c.minZ) * scale);
    }
    // Roads.
    mapCtx.strokeStyle = '#8a929c';
    mapCtx.lineWidth = 2.5;
    for (const s of G.city.streets) {
      mapCtx.beginPath(); mapCtx.moveTo(X(s), Z(-290)); mapCtx.lineTo(X(s), Z(290)); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(X(-290), Z(s)); mapCtx.lineTo(X(290), Z(s)); mapCtx.stroke();
    }
    // Round 3: the speedboats on the water, and the orange stunt ramps on land.
    if (G.boats) {
      mapCtx.fillStyle = '#7dd8ff';
      for (const boat of G.boats) {
        if (boat.dead) continue;
        mapCtx.beginPath(); mapCtx.arc(X(boat.pos.x), Z(boat.pos.z), 3, 0, 7); mapCtx.fill();
      }
    }
    if (G.city.ramps) {
      mapCtx.fillStyle = '#d2681e';
      for (const r of G.city.ramps) mapCtx.fillRect(X(r.x) - 2, Z(r.z) - 2, 4, 4);
    }
    // Safehouse.
    const sh = G.city.locations.safehouse;
    mapCtx.fillStyle = '#4ad27a';
    mapCtx.font = 'bold 11px sans-serif';
    mapCtx.fillText('H', X(sh.x) - 3, Z(sh.z) + 4);
    // Traffic dots.
    mapCtx.fillStyle = '#c8ced6';
    for (const car of G.traffic.cars) {
      if (car.dead) continue;
      mapCtx.fillRect(X(car.pos.x) - 1, Z(car.pos.z) - 1, 2.5, 2.5);
    }
    // Round 2: hidden packages as gold dots, the taxi fare as a green diamond,
    // and the helicopter as a big flashing blip.
    if (G.activities) {
      mapCtx.fillStyle = '#ffd23c';
      for (const pkg of G.activities.packages) {
        if (pkg.taken) continue;
        mapCtx.beginPath(); mapCtx.arc(X(pkg.x), Z(pkg.z), 2, 0, 7); mapCtx.fill();
      }
      const f = G.activities.fareObjective();
      if (f && G.activities.fare.active) {
        mapCtx.fillStyle = '#2ed2a0';
        mapCtx.beginPath(); mapCtx.arc(X(f.x), Z(f.z), 3.5, 0, 7); mapCtx.fill();
      }
    }
    if (G.police.heli && G.police.heli.group.visible) {
      mapCtx.fillStyle = Math.floor(G.time * 4) % 2 === 0 ? '#ff4040' : '#ffffff';
      mapCtx.beginPath(); mapCtx.arc(X(G.police.heli.group.position.x), Z(G.police.heli.group.position.z), 4, 0, 7); mapCtx.fill();
    }
    // Police blips (flashing).
    if (Math.floor(G.time * 3) % 2 === 0) mapCtx.fillStyle = '#ff4040';
    else mapCtx.fillStyle = '#4080ff';
    for (const car of G.police.cars) {
      mapCtx.beginPath(); mapCtx.arc(X(car.pos.x), Z(car.pos.z), 3, 0, 7); mapCtx.fill();
    }
    // Mission target / objective.
    const step = G.missions.currentStep();
    if (step) {
      const pos = G.missions.objectivePos(step);
      if (pos) {
        const pulse = 4 + Math.sin(G.time * 5) * 1.5;
        mapCtx.fillStyle = '#ffd23c';
        mapCtx.beginPath();
        mapCtx.moveTo(X(pos.x), Z(pos.z) - pulse);
        mapCtx.lineTo(X(pos.x) + pulse, Z(pos.z));
        mapCtx.lineTo(X(pos.x), Z(pos.z) + pulse);
        mapCtx.lineTo(X(pos.x) - pulse, Z(pos.z));
        mapCtx.closePath(); mapCtx.fill();
      }
    }
    // Player arrow.
    const p = G.player.state;
    mapCtx.save();
    mapCtx.translate(X(p.pos.x), Z(p.pos.z));
    mapCtx.rotate(Math.PI - p.heading);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6); mapCtx.lineTo(4, 5); mapCtx.lineTo(-4, 5);
    mapCtx.closePath(); mapCtx.fill();
    mapCtx.restore();
  }

  function update(dt) {
    const p = G.player.state;
    els.cash.textContent = `$${G.cash}`;
    const hp = Math.max(0, Math.round(p.health));
    els.healthFill.style.width = `${hp}%`;
    els.healthText.textContent = `${hp}`;
    els.district.textContent = districtAt(p.pos.x, p.pos.z);
    const stars = G.police.state.stars;
    els.stars.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    els.stars.classList.toggle('hot', stars > 0);
    const step = G.missions.currentStep();
    if (step) {
      const text = G.missions.objectiveText();
      if (text !== lastObjective) {
        els.objective.textContent = text;
        lastObjective = text;
      }
      const pos = G.missions.objectivePos(step);
      els.objectiveDist.textContent = pos ? `${Math.round(Math.hypot(pos.x - p.pos.x, pos.z - p.pos.z))} m` : '';
    } else {
      els.objective.textContent = G.missions.nextAvailable() >= 0 ? 'Free roam — press M for missions' : 'All missions complete. Solmar Bay is yours.';
      els.objectiveDist.textContent = '';
      lastObjective = '';
    }
    // Round 2: mission tracker (title + step x of y), the race / fare clock, the
    // ammo counter, the car line with damage, stamina, and the package count.
    const active = G.missions.state.active;
    if (els.missionTitle) {
      els.missionTitle.textContent = active
        ? `${active.def.title}  •  step ${active.stepIndex + 1}/${active.def.steps.length}`
        : (G.missions.nextAvailable() >= 0 ? 'Free roam' : 'King of the Bay');
    }
    if (els.timer) {
      let t = '';
      if (active && active.def.steps[active.stepIndex] && active.def.steps[active.stepIndex].type === 'race') {
        t = `⏱ ${clockString(G.missions.state.raceTimeLeft)}`;
      } else if (G.activities && G.activities.fare.active) {
        t = `🚕 ${clockString(G.activities.fare.timeLeft)}`;
      }
      els.timer.textContent = t;
      els.timer.classList.toggle('hidden', !t);
    }
    if (els.ammo) {
      els.ammo.textContent = p.hasPistol ? `🔫 ${p.ammo} / ${p.ammoMax}` : '';
      els.ammo.classList.toggle('hidden', !p.hasPistol);
    }
    if (els.vehicle) {
      if (p.inCar) {
        const name = CAR_NAMES[p.inCar.kind] || 'Car';
        const dmg = Math.max(0, Math.round(100 - p.inCar.damage));
        els.vehicle.textContent = `${name}  •  condition ${dmg}%`;
        els.vehicle.classList.remove('hidden');
      } else {
        els.vehicle.classList.add('hidden');
      }
    }
    if (els.staminaFill) els.staminaFill.style.width = `${Math.round(p.stamina)}%`;
    // Round 3: the armor bar — 50 points from the shop, gone once it has absorbed
    // its share of damage.
    if (els.armorFill) els.armorFill.style.width = `${Math.round((p.armor || 0) / 50 * 100)}%`;
    if (els.packages && G.activities) {
      els.packages.textContent = `📦 ${G.activities.found.size}/${PACKAGE_COUNT} packages`;
    }
    if (G.time > bannerUntil) els.banner.classList.add('hidden');
    if (subtitleQueue.length > 0 && G.time > subtitleUntil) {
      const { who, line } = subtitleQueue.shift();
      els.subtitle.innerHTML = `<b>${who}:</b> ${line}`;
      els.subtitle.classList.remove('hidden');
      subtitleUntil = G.time + 4.2;
    } else if (subtitleQueue.length === 0 && G.time > subtitleUntil) {
      els.subtitle.classList.add('hidden');
    }
    if (p.inCar) {
      els.speed.textContent = `${Math.round(Math.abs(p.inCar.speed) * 3.6)} km/h`;
      els.speed.classList.remove('hidden');
    } else {
      els.speed.classList.add('hidden');
    }
    els.crosshair.classList.toggle('hidden', !(p.hasPistol && !p.inCar));
    const vOp = parseFloat(els.vignette.style.opacity || '0');
    if (vOp > 0) els.vignette.style.opacity = String(Math.max(0, vOp - dt * 1.4));
    if (shakeAmount > 0) {
      shakeAmount = Math.max(0, shakeAmount - dt * 1.5);
      const dx = (Math.random() - 0.5) * shakeAmount * 14;
      const dy = (Math.random() - 0.5) * shakeAmount * 14;
      document.getElementById('game-root').style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
      document.getElementById('game-root').style.transform = '';
    }
    drawMinimap();
  }

  function buildMissionList() {
    els.missionList.innerHTML = '';
    MISSIONS.forEach((def, i) => {
      const done = G.missions.state.done.has(def.id);
      const btn = document.createElement('button');
      btn.className = 'mission-item';
      btn.textContent = `${done ? '✓ ' : ''}${i + 1}. ${def.title} — $${def.reward}${done ? ' (done)' : ''}`;
      btn.disabled = done || !!G.missions.state.active;
      btn.addEventListener('click', () => onAction({ type: 'start-mission', index: i }));
      els.missionList.appendChild(btn);
    });
  }

  // Round 3: the shop list — one button per item, greyed out when owned or too dear.
  function buildShop() {
    els.shopList.innerHTML = '';
    els.shopCash.textContent = `Your cash: $${G.cash}`;
    for (const item of G.shop.items()) {
      const btn = document.createElement('button');
      btn.className = 'mission-item';
      btn.textContent = item.owned
        ? `✓ ${item.label} — owned`
        : `${item.label} — $${item.price}  •  ${item.desc}`;
      btn.disabled = item.owned || G.cash < item.price;
      btn.addEventListener('click', () => {
        if (onAction({ type: 'buy', id: item.id })) buildShop();
      });
      els.shopList.appendChild(btn);
    }
  }

  function wireActions() {
    els.startBtn.addEventListener('click', () => onAction({ type: 'start' }));
    els.continueBtn.addEventListener('click', () => onAction({ type: 'start' }));
    $('resume-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('save-btn').addEventListener('click', () => onAction({ type: 'save' }));
    $('restart-mission-btn').addEventListener('click', () => onAction({ type: 'restart-mission' }));
    $('quit-btn').addEventListener('click', () => onAction({ type: 'quit-title' }));
    $('missions-btn').addEventListener('click', () => { buildMissionList(); showOnly('missions'); onAction({ type: 'open-missions' }); });
    $('missions-close').addEventListener('click', () => onAction({ type: 'resume' }));
    // Round 3: the shop opens from the pause menu or with B, and closes the same way.
    $('shop-btn').addEventListener('click', () => { buildShop(); showOnly('shop'); onAction({ type: 'open-shop' }); });
    $('shop-close').addEventListener('click', () => onAction({ type: 'resume' }));
    $('retry-btn').addEventListener('click', () => onAction({ type: 'retry-mission' }));
    $('failed-roam-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('ending-roam-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('mute-btn').addEventListener('click', () => onAction({ type: 'mute' }));
  }

  wireActions();

  return {
    update, banner, showBriefing, missionComplete, missionFailed, showEnding,
    flashDamage, shake, setPrompt, showOnly, buildMissionList, clearSubtitles,
    clearBanner, say, buildShop,
    set onAction(fn) { onAction = fn; },
    setSaveInfo(save) {
      if (save && save.cash > 0) {
        els.continueBtn.classList.remove('hidden');
        els.titleSave.textContent = `Continue — $${save.cash}, ${save.missionsDone.length} mission${save.missionsDone.length === 1 ? '' : 's'} done`;
      }
    },
  };
}
