// Every sound in the game is synthesized with WebAudio: engine hum, sirens, gunshots,
// punches, pickups, crashes and a looping bass-led groove. No audio files, no network.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenTimer = null;
  let musicStep = 0;
  let heliOsc = null;
  let heliGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq, filterType) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType || 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = value ? 0 : 0.5;
  }

  function engineStart() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(master);
    engineOsc.start();
  }

  function engine(speed01, on) {
    if (!engineOsc) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
    engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.08);
    engineFilter.frequency.setTargetAtTime(350 + speed01 * 900, t, 0.1);
  }

  function siren(on, closeness) {
    if (!ensure()) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
      sirenTimer = window.setInterval(() => {
        if (!sirenOsc) return;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 720, ctx.currentTime, 0.05);
      }, 380);
    } else if (!on && sirenOsc) {
      window.clearInterval(sirenTimer);
      sirenOsc.stop();
      sirenOsc = null;
      sirenGain = null;
    }
    if (sirenGain) sirenGain.gain.setTargetAtTime(0.028 * closeness, ctx.currentTime, 0.2);
  }

  // A 16-step loop at 100 BPM: Am - F - C - G bass, hats and a plucked lead.
  const BASS = [55, 55, 0, 55, 43.65, 43.65, 0, 43.65, 65.41, 65.41, 0, 65.41, 49, 49, 0, 49];
  const LEAD = [220, 0, 261.6, 0, 329.6, 0, 261.6, 0, 174.6, 0, 220, 0, 196, 0, 246.9, 0];
  function musicStart() {
    if (!ensure() || musicTimer) return;
    const stepDur = 60 / 100 / 2;
    musicTimer = window.setInterval(() => {
      if (ctx.state !== 'running') return;
      const i = musicStep % 16;
      const bass = BASS[i];
      if (bass) blip(bass, stepDur * 1.8, 'sawtooth', 0.10);
      if (i % 2 === 0) noiseBurst(0.03, 0.035, 8000, 'highpass');
      if (i % 4 === 2) noiseBurst(0.09, 0.06, 1800, 'bandpass');
      const lead = LEAD[i];
      if (lead) blip(lead, stepDur * 0.9, 'triangle', 0.05);
      musicStep += 1;
    }, stepDur * 1000);
  }

  function musicStop() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
  }

  return {
    resume, setMuted, engineStart, engine, siren, musicStart, musicStop,
    click() { blip(660, 0.07, 'sine', 0.12); },
    shot() { noiseBurst(0.12, 0.5, 1400); blip(160, 0.1, 'square', 0.25, 60); },
    punch() { noiseBurst(0.1, 0.4, 300); blip(90, 0.09, 'sine', 0.3, 45); },
    crash(v) { noiseBurst(0.25, Math.min(0.6, 0.15 + v * 0.4), 500); },
    pickup() { blip(880, 0.09, 'sine', 0.15); window.setTimeout(() => blip(1318, 0.14, 'sine', 0.15), 90); },
    sting() { [440, 554, 659, 880].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.14), i * 110)); },
    fail() { [330, 262, 196].forEach((f, i) => window.setTimeout(() => blip(f, 0.25, 'sawtooth', 0.1), i * 140)); },
    busted() { blip(520, 0.4, 'square', 0.12, 380); },
    // Round 2: taxi bell, race countdown beep, reload click, skid squeal, and the
    // helicopter's rotor chop (a low pulsing noise loop while it is overhead).
    ding() { blip(1175, 0.18, 'sine', 0.14); window.setTimeout(() => blip(1568, 0.22, 'sine', 0.12), 120); },
    beep(final) { blip(final ? 880 : 440, final ? 0.3 : 0.12, 'square', 0.14); },
    reload() { blip(300, 0.05, 'square', 0.12); window.setTimeout(() => blip(420, 0.05, 'square', 0.12), 90); },
    skid() { noiseBurst(0.3, 0.22, 2500, 'bandpass'); },
    // Round 3: an explosion for the convoy finale, a splash for the boat, and a
    // whoosh when a stunt ramp throws the car into the air.
    explosion() { noiseBurst(0.7, 0.6, 300); blip(70, 0.5, 'sine', 0.4, 30); },
    splash() { noiseBurst(0.4, 0.25, 900); },
    jump() { noiseBurst(0.35, 0.18, 1200, 'bandpass'); },
    heli(on, vol) {
      if (!ensure()) return;
      if (on && !heliOsc) {
        heliOsc = ctx.createOscillator();
        heliOsc.type = 'square';
        heliOsc.frequency.value = 13;
        heliGain = ctx.createGain();
        heliGain.gain.value = 0;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 220;
        heliOsc.connect(filt).connect(heliGain).connect(master);
        heliOsc.start();
      }
      if (heliGain) heliGain.gain.value = on ? Math.min(0.16, vol * 0.16) : 0;
      if (!on && heliOsc) { try { heliOsc.stop(); } catch {} heliOsc = null; heliGain = null; }
    },
  };
}
