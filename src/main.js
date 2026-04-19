import { AudioEngine } from "./audioEngine.js";
import { EqGraph } from "./eqGraph.js";
import { PRESETS, getPresetByName } from "./presets.js";
import { createStore, createDefaultBands, FILTER_TYPES } from "./state.js";
import { formatDb, formatHz, formatQ, secondsToClock } from "./utils.js";

const player = document.getElementById("player");
const playPauseBtn = document.getElementById("playPauseBtn");
const stopBtn = document.getElementById("stopBtn");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const streamUrl = document.getElementById("streamUrl");
const loadStreamBtn = document.getElementById("loadStreamBtn");
const masterVolume = document.getElementById("masterVolume");
const preRmsReadout = document.getElementById("preRmsReadout");
const postRmsReadout = document.getElementById("postRmsReadout");
const trimReadout = document.getElementById("trimReadout");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const globalBypassBtn = document.getElementById("globalBypassBtn");
const resetBtn = document.getElementById("resetBtn");
const timeline = document.getElementById("timeline");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const presetSelect = document.getElementById("presetSelect");
const applyPresetBtn = document.getElementById("applyPresetBtn");
const exportPresetBtn = document.getElementById("exportPresetBtn");
const importPresetInput = document.getElementById("importPresetInput");
const storeABtn = document.getElementById("storeABtn");
const loadABtn = document.getElementById("loadABtn");
const storeBBtn = document.getElementById("storeBBtn");
const loadBBtn = document.getElementById("loadBBtn");
const loudnessMatch = document.getElementById("loudnessMatch");
const autoGain = document.getElementById("autoGain");
const analyzerMode = document.getElementById("analyzerMode");
const analyzerCanvas = document.getElementById("analyzerCanvas");
const bandsContainer = document.getElementById("bandsContainer");
const canvas = document.getElementById("eqCanvas");
const analyzerCtx = analyzerCanvas.getContext("2d");

let objectUrl = null;
let slotA = null;
let slotB = null;
let trimDb = 0;

const historyPast = [];
const historyFuture = [];
let historyBusy = false;
const HISTORY_LIMIT = 100;

const SPECTRUM_POINTS = 220;
let spectrumSmooth = new Float32Array(SPECTRUM_POINTS);
let preRmsSmooth = -96;
let postRmsSmooth = -96;

const store = createStore({
  masterVolume: 0.8,
  globalBypass: false,
  bands: createDefaultBands(),
  selectedBandId: 1,
});

const engine = new AudioEngine(player);
const graph = new EqGraph(canvas, store, engine);

function ensureAudioReady() {
  return engine.ensureReady();
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dbLabel(value) {
  if (!Number.isFinite(value)) {
    return "-inf dB";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;
}

function snapshotsDiffer(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function updateHistoryButtons() {
  undoBtn.disabled = historyPast.length === 0;
  redoBtn.disabled = historyFuture.length === 0;
}

function runTrackedUpdate(mutator) {
  if (historyBusy) {
    mutator();
    return;
  }
  const before = store.getState();
  mutator();
  const after = store.getState();
  if (!snapshotsDiffer(before, after)) {
    return;
  }
  historyPast.push(before);
  if (historyPast.length > HISTORY_LIMIT) {
    historyPast.shift();
  }
  historyFuture.length = 0;
  updateHistoryButtons();
}

function restoreSnapshot(snapshot) {
  historyBusy = true;
  store.replaceState(snapshot);
  historyBusy = false;
}

function sampleRmsDb(analyser) {
  if (!analyser) {
    return -96;
  }
  const buffer = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const s = (buffer[i] - 128) / 128;
    sum += s * s;
  }
  const rms = Math.sqrt(sum / buffer.length);
  return 20 * Math.log10(Math.max(rms, 1e-7));
}

function drawSpectrumGrid(width, height) {
  analyzerCtx.strokeStyle = "#223043";
  analyzerCtx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (i / 5) * height;
    analyzerCtx.beginPath();
    analyzerCtx.moveTo(0, y);
    analyzerCtx.lineTo(width, y);
    analyzerCtx.stroke();
  }
}

function updateAutoGain(preDb, postDb) {
  if (!autoGain.checked) {
    trimDb *= 0.85;
    if (Math.abs(trimDb) < 0.05) {
      trimDb = 0;
    }
    engine.setOutputTrimDb(trimDb);
    trimReadout.textContent = dbLabel(trimDb);
    return;
  }

  const target = clampValue(preDb - postDb, -9, 9);
  trimDb = trimDb * 0.92 + target * 0.08;
  engine.setOutputTrimDb(trimDb);
  trimReadout.textContent = dbLabel(trimDb);
}

function populatePresets() {
  const options = PRESETS.map((preset) => `<option value="${preset.name}">${preset.name}</option>`).join("");
  presetSelect.innerHTML = options;
  presetSelect.value = "Flat";
}

function makeBandRow(band, selectedBandId) {
  const selected = band.id === selectedBandId ? "active" : "";

  return `
    <div class="band-row ${selected}" data-band-id="${band.id}">
      <div class="band-head">
        <strong>Band ${band.id}</strong>
        <label title="Activa o desactiva esta banda sin borrarla."><input type="checkbox" data-action="enabled" ${band.enabled ? "checked" : ""}> On</label>
      </div>
      <div class="band-grid">
        <label class="field" title="Tipo de filtro de la banda: peaking, shelf, pass o notch.">
          <span>Type</span>
          <select data-action="type" title="Selecciona el tipo de filtro para esta banda.">
            ${FILTER_TYPES.map((type) => `<option value="${type}" ${type === band.type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <span class="readout"></span>
        </label>

        <label class="field" title="Frecuencia central o corte del filtro en Hz.">
          <span>Freq</span>
          <input type="range" data-action="frequency" min="20" max="20000" step="1" value="${Math.round(band.frequency)}" title="Ajusta la frecuencia de esta banda." />
          <span class="readout">${formatHz(band.frequency)} Hz</span>
        </label>

        <label class="field" title="Ganancia en dB. No aplica para lowpass/highpass.">
          <span>Gain</span>
          <input type="range" data-action="gain" min="-24" max="24" step="0.1" value="${band.gain.toFixed(1)}" ${["lowpass", "highpass"].includes(band.type) ? "disabled" : ""} title="Sube o baja el nivel de esta banda en dB." />
          <span class="readout">${formatDb(band.gain)} dB</span>
        </label>

        <label class="field" title="Q define el ancho de banda: alto = más estrecho.">
          <span>Q</span>
          <input type="range" data-action="q" min="0.1" max="18" step="0.01" value="${band.q.toFixed(2)}" title="Controla el ancho de banda (Q)." />
          <span class="readout">${formatQ(band.q)}</span>
        </label>
      </div>
    </div>
  `;
}

function renderBands(state) {
  bandsContainer.innerHTML = state.bands.map((band) => makeBandRow(band, state.selectedBandId)).join("");
}

function render(state) {
  masterVolume.value = state.masterVolume;
  globalBypassBtn.textContent = `Global Bypass: ${state.globalBypass ? "On" : "Off"}`;
  renderBands(state);
  graph.render(state);
  updateHistoryButtons();
}

function cloneBands(bands) {
  return bands.map((band) => ({ ...band }));
}

function estimateEqOffsetDb(bands) {
  const weighted = bands.reduce((sum, band) => {
    if (!band.enabled) {
      return sum;
    }
    if (["lowpass", "highpass", "notch"].includes(band.type)) {
      return sum;
    }
    return sum + band.gain;
  }, 0);
  return weighted * 0.24;
}

function maybeLoudnessMatch(fromBands, toBands) {
  if (!loudnessMatch.checked) {
    return;
  }
  const fromDb = estimateEqOffsetDb(fromBands);
  const toDb = estimateEqOffsetDb(toBands);
  const deltaDb = toDb - fromDb;
  const current = store.getState().masterVolume;
  const ratio = 10 ** (-deltaDb / 20);
  const matched = Math.min(1, Math.max(0, current * ratio));
  store.setMasterVolume(matched);
}

function drawSpectrumFrame() {
  const mode = analyzerMode.value;
  const analyser = engine.getAnalyser(mode);
  const preAnalyser = engine.getAnalyser("pre");
  const postAnalyser = engine.getAnalyser("post");

  if (!analyser || !preAnalyser || !postAnalyser) {
    requestAnimationFrame(drawSpectrumFrame);
    return;
  }

  const bins = analyser.frequencyBinCount;
  const data = new Uint8Array(bins);
  analyser.getByteFrequencyData(data);

  const width = analyzerCanvas.width;
  const height = analyzerCanvas.height;
  const nyquist = (engine.getSampleRate() || 48000) / 2;
  const minFreq = 20;
  const maxFreq = Math.min(20000, nyquist);
  const minLog = Math.log10(minFreq);
  const maxLog = Math.log10(maxFreq);

  analyzerCtx.clearRect(0, 0, width, height);
  drawSpectrumGrid(width, height);
  analyzerCtx.beginPath();

  for (let i = 0; i < SPECTRUM_POINTS; i += 1) {
    const ratio = i / (SPECTRUM_POINTS - 1);
    const freq = 10 ** (minLog + ratio * (maxLog - minLog));
    const bin = (freq / nyquist) * (bins - 1);
    const low = Math.floor(bin);
    const high = Math.min(bins - 1, low + 1);
    const fract = bin - low;
    const linear = data[low] * (1 - fract) + data[high] * fract;
    const normalized = linear / 255;

    const rise = 0.34;
    const fall = 0.14;
    const current = spectrumSmooth[i] || 0;
    const alpha = normalized > current ? rise : fall;
    spectrumSmooth[i] = current + (normalized - current) * alpha;

    const x = ratio * width;
    const y = height - spectrumSmooth[i] * height;
    if (i === 0) {
      analyzerCtx.moveTo(x, y);
    } else {
      analyzerCtx.lineTo(x, y);
    }
  }

  analyzerCtx.strokeStyle = mode === "pre" ? "#d1a05a" : "#5fb6ff";
  analyzerCtx.lineWidth = 1.6;
  analyzerCtx.stroke();

  const rawPreDb = sampleRmsDb(preAnalyser);
  const rawPostDb = sampleRmsDb(postAnalyser);
  preRmsSmooth = preRmsSmooth * 0.86 + rawPreDb * 0.14;
  postRmsSmooth = postRmsSmooth * 0.86 + rawPostDb * 0.14;
  preRmsReadout.textContent = dbLabel(preRmsSmooth);
  postRmsReadout.textContent = dbLabel(postRmsSmooth);
  updateAutoGain(preRmsSmooth, postRmsSmooth);

  requestAnimationFrame(drawSpectrumFrame);
}

store.subscribe((state) => {
  engine.applyState(state);
  render(state);
});

bandsContainer.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }
  const row = target.closest(".band-row");
  if (!row) {
    return;
  }

  const bandId = Number(row.dataset.bandId);
  const action = target.dataset.action;

  if (action === "frequency") {
    runTrackedUpdate(() => {
      store.updateBand(bandId, { frequency: Number(target.value) });
    });
    return;
  }
  if (action === "gain") {
    runTrackedUpdate(() => {
      store.updateBand(bandId, { gain: Number(target.value) });
    });
    return;
  }
  if (action === "q") {
    runTrackedUpdate(() => {
      store.updateBand(bandId, { q: Number(target.value) });
    });
    return;
  }
});

bandsContainer.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }
  const row = target.closest(".band-row");
  if (!row) {
    return;
  }

  const bandId = Number(row.dataset.bandId);
  const action = target.dataset.action;

  if (action === "enabled") {
    runTrackedUpdate(() => {
      store.updateBand(bandId, { enabled: target.checked });
    });
    return;
  }
  if (action === "type") {
    runTrackedUpdate(() => {
      store.updateBand(bandId, { type: target.value });
    });
  }
});

bandsContainer.addEventListener("click", (event) => {
  const controlTarget = event.target;
  if (controlTarget instanceof Element && controlTarget.closest("input, select, label, button")) {
    return;
  }
  const row = event.target.closest(".band-row");
  if (!row) {
    return;
  }
  runTrackedUpdate(() => {
    store.setSelectedBand(Number(row.dataset.bandId));
  });
});

undoBtn.addEventListener("click", () => {
  if (historyPast.length === 0) {
    return;
  }
  const previous = historyPast.pop();
  historyFuture.push(store.getState());
  restoreSnapshot(previous);
  updateHistoryButtons();
});

redoBtn.addEventListener("click", () => {
  if (historyFuture.length === 0) {
    return;
  }
  const next = historyFuture.pop();
  historyPast.push(store.getState());
  restoreSnapshot(next);
  updateHistoryButtons();
});

playPauseBtn.addEventListener("click", async () => {
  await ensureAudioReady();
  if (player.paused) {
    await player.play();
    playPauseBtn.textContent = "Pause";
  } else {
    player.pause();
    playPauseBtn.textContent = "Play";
  }
});

stopBtn.addEventListener("click", () => {
  player.pause();
  player.currentTime = 0;
  playPauseBtn.textContent = "Play";
});

player.addEventListener("play", () => {
  playPauseBtn.textContent = "Pause";
});

player.addEventListener("pause", () => {
  playPauseBtn.textContent = "Play";
});

player.addEventListener("loadedmetadata", () => {
  duration.textContent = secondsToClock(player.duration);
});

player.addEventListener("timeupdate", () => {
  const percent = player.duration ? (player.currentTime / player.duration) * 100 : 0;
  timeline.value = percent;
  currentTime.textContent = secondsToClock(player.currentTime);
});

timeline.addEventListener("input", () => {
  if (!Number.isFinite(player.duration) || player.duration <= 0) {
    return;
  }
  player.currentTime = (Number(timeline.value) / 100) * player.duration;
});

masterVolume.addEventListener("input", () => {
  runTrackedUpdate(() => {
    store.setMasterVolume(Number(masterVolume.value));
  });
});

globalBypassBtn.addEventListener("click", () => {
  runTrackedUpdate(() => {
    store.toggleGlobalBypass();
  });
});

resetBtn.addEventListener("click", () => {
  runTrackedUpdate(() => {
    store.reset(createDefaultBands());
  });
  trimDb = 0;
  engine.setOutputTrimDb(0);
});

applyPresetBtn.addEventListener("click", () => {
  const preset = getPresetByName(presetSelect.value);
  runTrackedUpdate(() => {
    store.loadPreset(preset);
  });
});

exportPresetBtn.addEventListener("click", () => {
  const preset = store.exportPreset("Exported preset");
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${preset.name.replace(/\s+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importPresetInput.addEventListener("change", async () => {
  const file = importPresetInput.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  try {
    const payload = JSON.parse(text);
    runTrackedUpdate(() => {
      store.importPreset(payload);
    });
  } catch (error) {
    alert(`No se pudo importar preset: ${error.message}`);
  }

  importPresetInput.value = "";
});

storeABtn.addEventListener("click", () => {
  slotA = cloneBands(store.getState().bands);
});

storeBBtn.addEventListener("click", () => {
  slotB = cloneBands(store.getState().bands);
});

loadABtn.addEventListener("click", () => {
  if (!slotA) {
    return;
  }
  const currentBands = cloneBands(store.getState().bands);
  runTrackedUpdate(() => {
    maybeLoudnessMatch(currentBands, slotA);
    store.loadPreset({ name: "A", bands: slotA });
  });
});

loadBBtn.addEventListener("click", () => {
  if (!slotB) {
    return;
  }
  const currentBands = cloneBands(store.getState().bands);
  runTrackedUpdate(() => {
    maybeLoudnessMatch(currentBands, slotB);
    store.loadPreset({ name: "B", bands: slotB });
  });
});

function loadAudioSource(url) {
  if (objectUrl && objectUrl !== url) {
    URL.revokeObjectURL(objectUrl);
  }

  objectUrl = url.startsWith("blob:") ? url : null;
  player.src = url;
  player.load();
}

function waitForMediaReady() {
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("No se pudo cargar el audio."));
    };
    const cleanup = () => {
      player.removeEventListener("loadedmetadata", onReady);
      player.removeEventListener("canplay", onReady);
      player.removeEventListener("error", onError);
    };

    player.addEventListener("loadedmetadata", onReady, { once: true });
    player.addEventListener("canplay", onReady, { once: true });
    player.addEventListener("error", onError, { once: true });
  });
}

async function loadAndPrimeAudio(url) {
  loadAudioSource(url);
  await waitForMediaReady();
  await ensureAudioReady();

  try {
    await player.play();
  } catch {
    // Some browsers may still block playback; user can press Play manually.
  }
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  const fileUrl = URL.createObjectURL(file);
  try {
    await loadAndPrimeAudio(fileUrl);
  } catch (error) {
    alert(error.message);
  }
  fileInput.value = "";
});

loadStreamBtn.addEventListener("click", async () => {
  const url = streamUrl.value.trim();
  if (!url) {
    return;
  }
  try {
    await loadAndPrimeAudio(url);
  } catch (error) {
    alert(`${error.message} Verifica URL o CORS.`);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");

  const file = event.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith("audio/")) {
    return;
  }

  const fileUrl = URL.createObjectURL(file);
  try {
    await loadAndPrimeAudio(fileUrl);
  } catch (error) {
    alert(error.message);
  }
});

autoGain.addEventListener("change", () => {
  if (autoGain.checked) {
    return;
  }
  trimDb = 0;
  engine.setOutputTrimDb(0);
  trimReadout.textContent = dbLabel(0);
});

updateHistoryButtons();
trimReadout.textContent = dbLabel(0);

populatePresets();
drawSpectrumFrame();
