import { createDefaultBands } from "./state.js";

const flat = {
  name: "Flat",
  bands: createDefaultBands().map((b) => ({ ...b, gain: 0, enabled: true })),
};

const voice = {
  name: "Voice",
  bands: [
    { type: "highpass", frequency: 80, gain: 0, q: 0.71, enabled: true },
    { type: "lowshelf", frequency: 180, gain: -2.5, q: 0.9, enabled: true },
    { type: "peaking", frequency: 320, gain: -1.8, q: 1.1, enabled: true },
    { type: "peaking", frequency: 2800, gain: 2.8, q: 1.3, enabled: true },
    { type: "highshelf", frequency: 9000, gain: 1.8, q: 0.8, enabled: true },
    { type: "lowpass", frequency: 19000, gain: 0, q: 0.71, enabled: true },
  ],
};

const bassBoost = {
  name: "Bass Boost",
  bands: [
    { type: "highpass", frequency: 28, gain: 0, q: 0.71, enabled: true },
    { type: "lowshelf", frequency: 95, gain: 5.5, q: 0.9, enabled: true },
    { type: "peaking", frequency: 220, gain: 2.0, q: 0.9, enabled: true },
    { type: "peaking", frequency: 1200, gain: -1.0, q: 1.2, enabled: true },
    { type: "highshelf", frequency: 9500, gain: 1.2, q: 0.8, enabled: true },
    { type: "lowpass", frequency: 19500, gain: 0, q: 0.71, enabled: true },
  ],
};

const clarity = {
  name: "Clarity",
  bands: [
    { type: "highpass", frequency: 60, gain: 0, q: 0.71, enabled: true },
    { type: "lowshelf", frequency: 170, gain: -1.5, q: 0.8, enabled: true },
    { type: "peaking", frequency: 380, gain: -1.2, q: 1.0, enabled: true },
    { type: "peaking", frequency: 3500, gain: 3.0, q: 1.4, enabled: true },
    { type: "highshelf", frequency: 11000, gain: 2.5, q: 0.8, enabled: true },
    { type: "lowpass", frequency: 19500, gain: 0, q: 0.71, enabled: true },
  ],
};

const podcast = {
  name: "Podcast",
  bands: [
    { type: "highpass", frequency: 75, gain: 0, q: 0.71, enabled: true },
    { type: "lowshelf", frequency: 140, gain: -2.0, q: 0.9, enabled: true },
    { type: "peaking", frequency: 250, gain: -2.2, q: 1.2, enabled: true },
    { type: "peaking", frequency: 4200, gain: 2.4, q: 1.5, enabled: true },
    { type: "highshelf", frequency: 8500, gain: 2.0, q: 0.8, enabled: true },
    { type: "lowpass", frequency: 18000, gain: 0, q: 0.71, enabled: true },
  ],
};

const cinematic = {
  name: "Cinematic",
  bands: [
    { type: "highpass", frequency: 32, gain: 0, q: 0.71, enabled: true },
    { type: "lowshelf", frequency: 85, gain: 3.2, q: 0.95, enabled: true },
    { type: "peaking", frequency: 320, gain: -1.8, q: 1.1, enabled: true },
    { type: "peaking", frequency: 2200, gain: 1.6, q: 1.0, enabled: true },
    { type: "highshelf", frequency: 9500, gain: 1.3, q: 0.85, enabled: true },
    { type: "lowpass", frequency: 17500, gain: 0, q: 0.71, enabled: true },
  ],
};

export const PRESETS = [flat, voice, bassBoost, clarity, podcast, cinematic];

export function getPresetByName(name) {
  return PRESETS.find((preset) => preset.name === name) ?? PRESETS[0];
}
