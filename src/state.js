import { clamp, MIN_FREQ, MAX_FREQ, MIN_GAIN, MAX_GAIN, MIN_Q, MAX_Q } from "./utils.js";

const FILTER_TYPES = ["peaking", "lowshelf", "highshelf", "lowpass", "highpass", "notch"];

function makeBand(id, partial = {}) {
  return {
    id,
    enabled: partial.enabled ?? true,
    type: FILTER_TYPES.includes(partial.type) ? partial.type : "peaking",
    frequency: clamp(partial.frequency ?? 1000, MIN_FREQ, MAX_FREQ),
    gain: clamp(partial.gain ?? 0, MIN_GAIN, MAX_GAIN),
    q: clamp(partial.q ?? 1.0, MIN_Q, MAX_Q),
  };
}

export function createDefaultBands() {
  const defaults = [
    { type: "highpass", frequency: 40, gain: 0, q: 0.71 },
    { type: "lowshelf", frequency: 120, gain: 0, q: 0.9 },
    { type: "peaking", frequency: 450, gain: 0, q: 1.2 },
    { type: "peaking", frequency: 1800, gain: 0, q: 1.2 },
    { type: "highshelf", frequency: 7500, gain: 0, q: 0.8 },
    { type: "lowpass", frequency: 18000, gain: 0, q: 0.71 },
  ];
  return defaults.map((band, i) => makeBand(i + 1, band));
}

export function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function emit() {
    const snapshot = structuredClone(state);
    listeners.forEach((listener) => listener(snapshot));
  }

  function update(updater) {
    state = updater(structuredClone(state));
    emit();
  }

  return {
    getState() {
      return structuredClone(state);
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(structuredClone(state));
      return () => listeners.delete(listener);
    },

    setMasterVolume(value) {
      update((draft) => {
        draft.masterVolume = clamp(value, 0, 1);
        return draft;
      });
    },

    toggleGlobalBypass() {
      update((draft) => {
        draft.globalBypass = !draft.globalBypass;
        return draft;
      });
    },

    reset(defaultBands) {
      update((draft) => {
        draft.globalBypass = false;
        draft.masterVolume = 0.8;
        draft.bands = defaultBands.map((band, index) => makeBand(index + 1, band));
        draft.selectedBandId = draft.bands[0]?.id ?? null;
        return draft;
      });
    },

    setSelectedBand(bandId) {
      update((draft) => {
        draft.selectedBandId = bandId;
        return draft;
      });
    },

    updateBand(bandId, patch) {
      update((draft) => {
        draft.bands = draft.bands.map((band) => {
          if (band.id !== bandId) {
            return band;
          }
          return makeBand(band.id, { ...band, ...patch });
        });
        return draft;
      });
    },

    loadPreset(preset) {
      update((draft) => {
        draft.bands = preset.bands.map((band, index) => makeBand(index + 1, band));
        draft.selectedBandId = draft.bands[0]?.id ?? null;
        return draft;
      });
    },

    exportPreset(name = "Custom") {
      const snapshot = structuredClone(state);
      return {
        name,
        version: 1,
        bands: snapshot.bands,
      };
    },

    importPreset(payload) {
      if (!payload || !Array.isArray(payload.bands)) {
        throw new Error("Preset JSON inválido: falta el arreglo bands.");
      }
      update((draft) => {
        draft.bands = payload.bands.map((band, index) => makeBand(index + 1, band));
        draft.selectedBandId = draft.bands[0]?.id ?? null;
        return draft;
      });
    },
  };
}

export { FILTER_TYPES };
