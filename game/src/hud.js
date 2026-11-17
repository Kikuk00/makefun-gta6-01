// The HUD: cash and health, wanted stars, the mission objective, a live minimap, the
// speedometer, context prompts, story subtitles, and every menu (title, pause, mission
// list, mission complete / failed, ending). All DOM; the 3D view stays a plain canvas.
import { districtAt } from './config.js';
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
  };
  const mapCtx = els.minimap.getContext('2d');
  let bannerUntil = 0;
  let subtitleUntil = 0;
  let subtitleQueue = [];
  let shakeAmount = 0;
  let onAction = () => {};
  let lastObjective = '';

  function showOnly(name) {
    for (const key of ['title', 'pause', 'missions', 'complete', 'failed', 'ending']) {
      els[key].classList.toggle('hidden', key !== name);
    }
    if (!name) for (const key of ['title', 'pause', 'missions', 'complete', 'failed', 'ending']) els[key].classList.add('hidden');
  }

  function banner(text, seconds = 3.5) {
    els.banner.textContent = text;
    els.banner.classList.remove('hidden');
    bannerUntil = G.time + seconds;
  }

  function showBriefing(def) {
    subtitleQueue = def.briefing.map(([who, line]) => ({ who, line }));
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
    const W = 180;
    const H = 180;
    const scale = W / 680;
    const ox = 340 * scale;
    const oz = 340 * scale;
    const X = (x) => ox + x * scale;
    const Z = (z) => oz + z * scale;
    mapCtx.fillStyle = '#0d1b26';
    mapCtx.fillRect(0, 0, W, H);
    // Water: south and west edges.
    mapCtx.fillStyle = '#1f7fa8';
    mapCtx.fillRect(0, Z(330), W, H - Z(330));
    mapCtx.fillRect(0, 0, X(-292), H);
    // Blocks.
    mapCtx.fillStyle = '#2a2f38';
    for (const c of G.city.colliders) {
      mapCtx.fillRect(X(c.minX), Z(c.minZ), (c.maxX - c.minX) * scale, (c.maxZ - c.minZ) * scale);
    }
    // Roads.
    mapCtx.strokeStyle = '#5a6068';
    mapCtx.lineWidth = 2;
    for (const s of G.city.streets) {
      mapCtx.beginPath(); mapCtx.moveTo(X(s), Z(-290)); mapCtx.lineTo(X(s), Z(290)); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(X(-290), Z(s)); mapCtx.lineTo(X(290), Z(s)); mapCtx.stroke();
    }
    // Safehouse.
    const sh = G.city.locations.safehouse;
    mapCtx.fillStyle = '#4ad27a';
    mapCtx.font = 'bold 11px sans-serif';
    mapCtx.fillText('H', X(sh.x) - 3, Z(sh.z) + 4);
    // Traffic dots.
    mapCtx.fillStyle = '#9aa2ac';
    for (const car of G.traffic.cars) {
      if (car.dead) continue;
      mapCtx.fillRect(X(car.pos.x) - 1, Z(car.pos.z) - 1, 2, 2);
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

  function wireActions() {
    els.startBtn.addEventListener('click', () => onAction({ type: 'start' }));
    els.continueBtn.addEventListener('click', () => onAction({ type: 'start' }));
    $('resume-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('save-btn').addEventListener('click', () => onAction({ type: 'save' }));
    $('restart-mission-btn').addEventListener('click', () => onAction({ type: 'restart-mission' }));
    $('quit-btn').addEventListener('click', () => onAction({ type: 'quit-title' }));
    $('missions-btn').addEventListener('click', () => { buildMissionList(); showOnly('missions'); onAction({ type: 'open-missions' }); });
    $('missions-close').addEventListener('click', () => onAction({ type: 'resume' }));
    $('retry-btn').addEventListener('click', () => onAction({ type: 'retry-mission' }));
    $('failed-roam-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('ending-roam-btn').addEventListener('click', () => onAction({ type: 'resume' }));
    $('mute-btn').addEventListener('click', () => onAction({ type: 'mute' }));
  }

  wireActions();

  return {
    update, banner, showBriefing, missionComplete, missionFailed, showEnding,
    flashDamage, shake, setPrompt, showOnly, buildMissionList,
    set onAction(fn) { onAction = fn; },
    setSaveInfo(save) {
      if (save && save.cash > 0) {
        els.continueBtn.classList.remove('hidden');
        els.titleSave.textContent = `Continue — $${save.cash}, ${save.missionsDone.length} mission${save.missionsDone.length === 1 ? '' : 's'} done`;
      }
    },
  };
}
