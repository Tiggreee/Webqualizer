import {
  clamp,
  freqToX,
  gainToY,
  xToFreq,
  yToGain,
  formatHz,
  formatDb,
  formatQ,
  MIN_FREQ,
  MAX_FREQ,
  MIN_GAIN,
  MAX_GAIN,
  MIN_Q,
  MAX_Q,
} from "./utils.js";

const GRID_FREQS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const GRID_GAINS = [-24, -18, -12, -6, 0, 6, 12, 18, 24];

export class EqGraph {
  constructor(canvas, store, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.store = store;
    this.engine = engine;
    this.hitRadius = 9;
    this.draggingBandId = null;

    this.bindEvents();
  }

  toCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  bindEvents() {
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("dblclick", (event) => this.onDoubleClick(event));
    window.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", () => {
      this.draggingBandId = null;
    });

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const point = this.toCanvasPoint(event);
      const band = this.pickBand(point.x, point.y);
      if (!band) {
        return;
      }
      const delta = event.deltaY < 0 ? 1.07 : 0.93;
      this.store.updateBand(band.id, {
        q: clamp(band.q * delta, MIN_Q, MAX_Q),
      });
    });
  }

  onPointerDown(event) {
    const point = this.toCanvasPoint(event);
    const band = this.pickBand(point.x, point.y);
    if (!band) {
      return;
    }
    this.draggingBandId = band.id;
    this.store.setSelectedBand(band.id);
  }

  onPointerMove(event) {
    if (!this.draggingBandId) {
      return;
    }

    const point = this.toCanvasPoint(event);
    const x = point.x;
    const y = point.y;

    const state = this.store.getState();
    const band = state.bands.find((entry) => entry.id === this.draggingBandId);
    if (!band) {
      return;
    }

    const frequency = clamp(xToFreq(x, this.canvas.width), MIN_FREQ, MAX_FREQ);
    const patch = { frequency };

    if (!["lowpass", "highpass"].includes(band.type)) {
      patch.gain = clamp(yToGain(y, this.canvas.height), MIN_GAIN, MAX_GAIN);
    }

    this.store.updateBand(band.id, patch);
  }

  onDoubleClick(event) {
    const point = this.toCanvasPoint(event);
    const band = this.pickBand(point.x, point.y);
    if (!band) {
      return;
    }
    this.store.updateBand(band.id, { enabled: !band.enabled });
  }

  pickBand(x, y) {
    const state = this.store.getState();

    let closest = null;
    for (const band of state.bands) {
      const nodeX = freqToX(band.frequency, this.canvas.width);
      const nodeY = this.nodeYForBand(band);
      const dx = x - nodeX;
      const dy = y - nodeY;
      const distance = Math.hypot(dx, dy);

      if (distance <= this.hitRadius && (!closest || distance < closest.distance)) {
        closest = { ...band, distance };
      }
    }

    return closest;
  }

  nodeYForBand(band) {
    if (["lowpass", "highpass"].includes(band.type)) {
      return gainToY(0, this.canvas.height);
    }
    return gainToY(band.gain, this.canvas.height);
  }

  render(state) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.clearRect(0, 0, width, height);
    this.drawGrid(ctx, width, height);
    this.drawResponseCurve(ctx, width, height);
    this.drawBandNodes(ctx, state, width, height);
  }

  drawGrid(ctx, width, height) {
    ctx.strokeStyle = "#243042";
    ctx.lineWidth = 1;

    for (const freq of GRID_FREQS) {
      const x = freqToX(freq, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = "#6d7d95";
      ctx.font = "11px Segoe UI";
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x + 4, 14);
    }

    for (const gain of GRID_GAINS) {
      const y = gainToY(gain, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      if (gain === 0) {
        ctx.strokeStyle = "#41526f";
      } else {
        ctx.strokeStyle = "#243042";
      }

      ctx.fillStyle = "#6d7d95";
      ctx.fillText(`${gain > 0 ? "+" : ""}${gain} dB`, 4, y - 4);
    }
  }

  drawResponseCurve(ctx, width, height) {
    const filters = this.engine.getFilters();
    if (!filters.length) {
      return;
    }

    const bins = 720;
    const freqHz = new Float32Array(bins);
    const totalDb = new Float32Array(bins);

    const minLog = Math.log10(MIN_FREQ);
    const maxLog = Math.log10(MAX_FREQ);

    for (let i = 0; i < bins; i += 1) {
      const ratio = i / (bins - 1);
      freqHz[i] = 10 ** (minLog + ratio * (maxLog - minLog));
      totalDb[i] = 0;
    }

    for (const filter of filters) {
      const mag = new Float32Array(bins);
      const phase = new Float32Array(bins);
      filter.getFrequencyResponse(freqHz, mag, phase);
      for (let i = 0; i < bins; i += 1) {
        totalDb[i] += 20 * Math.log10(Math.max(1e-7, mag[i]));
      }
    }

    ctx.beginPath();
    for (let i = 0; i < bins; i += 1) {
      const x = (i / (bins - 1)) * width;
      const y = gainToY(totalDb[i], height);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#74b8ff";
    ctx.stroke();

    const zeroY = gainToY(0, height);
    ctx.strokeStyle = "#51688d";
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
  }

  drawBandNodes(ctx, state, width, height) {
    for (const band of state.bands) {
      const x = freqToX(band.frequency, width);
      const y = this.nodeYForBand(band);
      const selected = band.id === state.selectedBandId;

      ctx.beginPath();
      ctx.arc(x, y, selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = band.enabled ? "#ffd166" : "#697384";
      ctx.fill();

      if (selected) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.fillStyle = "#d9dfeb";
        ctx.font = "12px Segoe UI";
        const label = `B${band.id} ${formatHz(band.frequency)}Hz ${formatDb(band.gain)}dB Q:${formatQ(band.q)}`;
        ctx.fillText(label, x + 10, y - 10);
      }
    }
  }
}
