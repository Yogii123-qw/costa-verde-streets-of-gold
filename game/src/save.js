// Save / load through localStorage: mission progress, cash and story completion.
// Everything is guarded — a private window or a disabled store just means the save
// lasts for this visit only, never a crash.
export const SAVE_KEY = 'costaverde-save-v1';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      missionIndex: Number.isInteger(data.missionIndex) ? data.missionIndex : 0,
      cash: Number.isFinite(data.cash) ? data.cash : 0,
      completed: data.completed === true,
      carsStolen: Number.isInteger(data.carsStolen) ? data.carsStolen : 0,
    };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      missionIndex: state.mission.index,
      cash: Math.round(state.player.cash),
      completed: state.mission.completed,
      carsStolen: state.stats.carsStolen,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
