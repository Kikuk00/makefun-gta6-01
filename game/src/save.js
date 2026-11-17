// Save and load: one localStorage slot holding cash, mission progress and settings.
// Nothing here ever touches the network; a missing or corrupt slot just starts fresh.
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
    }));
    return true;
  } catch {
    return false;
  }
}
