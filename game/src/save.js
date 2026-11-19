// Save and load: one localStorage slot holding cash, mission progress and settings.
// Round 2 also keeps the hidden packages found, taxi fares finished and the best race
// time, so free-roam progress survives a reload too. Nothing here ever touches the
// network; a missing or corrupt slot just starts fresh.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: Number.isFinite(data.cash) ? data.cash : 0,
      missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
      bestCash: Number.isFinite(data.bestCash) ? data.bestCash : 0,
      muted: data.muted === true,
      packagesFound: Array.isArray(data.packagesFound) ? data.packagesFound : [],
      faresDone: Number.isFinite(data.faresDone) ? data.faresDone : 0,
      bestRaceMs: Number.isFinite(data.bestRaceMs) ? data.bestRaceMs : 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash,
      missionsDone: state.missionsDone,
      bestCash: state.bestCash,
      muted: state.muted,
      packagesFound: state.packagesFound || [],
      faresDone: state.faresDone || 0,
      bestRaceMs: state.bestRaceMs || 0,
    }));
    return true;
  } catch {
    return false;
  }
}
