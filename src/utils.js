export const MIN_FREQ = 20;
export const MAX_FREQ = 20000;
export const MIN_GAIN = -24;
export const MAX_GAIN = 24;
export const MIN_Q = 0.1;
export const MAX_Q = 18;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function freqToX(freq, width) {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);
  const ratio = (Math.log10(freq) - minLog) / (maxLog - minLog);
  return ratio * width;
}

export function xToFreq(x, width) {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);
  const ratio = clamp(x / width, 0, 1);
  return 10 ** (minLog + ratio * (maxLog - minLog));
}

export function gainToY(gainDb, height) {
  const ratio = (MAX_GAIN - gainDb) / (MAX_GAIN - MIN_GAIN);
  return ratio * height;
}

export function yToGain(y, height) {
  const ratio = clamp(y / height, 0, 1);
  return MAX_GAIN - ratio * (MAX_GAIN - MIN_GAIN);
}

export function formatHz(freq) {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)}k`;
  }
  return `${Math.round(freq)}`;
}

export function formatDb(db) {
  return `${db > 0 ? "+" : ""}${db.toFixed(1)}`;
}

export function formatQ(q) {
  return q.toFixed(2);
}

export function secondsToClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const whole = Math.floor(seconds);
  const min = String(Math.floor(whole / 60)).padStart(2, "0");
  const sec = String(whole % 60).padStart(2, "0");
  return `${min}:${sec}`;
}
