const SMOOTH_TIME = 0.015;

export class AudioEngine {
  constructor(audioElement) {
    this.audioElement = audioElement;
    this.context = null;
    this.source = null;
    this.masterGain = null;
    this.bands = [];
    this.eqInput = null;
    this.eqOutput = null;
    this.bypassDry = null;
    this.bypassWet = null;
    this.preAnalyser = null;
    this.postAnalyser = null;
    this.outputTrim = null;
  }

  async ensureReady() {
    if (this.context) {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      return;
    }

    this.context = new AudioContext();
    this.source = this.context.createMediaElementSource(this.audioElement);
    this.masterGain = this.context.createGain();
    this.eqInput = this.context.createGain();
    this.eqOutput = this.context.createGain();
    this.bypassDry = this.context.createGain();
    this.bypassWet = this.context.createGain();
    this.preAnalyser = this.context.createAnalyser();
    this.preAnalyser.fftSize = 2048;
    this.postAnalyser = this.context.createAnalyser();
    this.postAnalyser.fftSize = 2048;
    this.outputTrim = this.context.createGain();

    const bandCount = 6;
    this.bands = Array.from({ length: bandCount }, () => this.context.createBiquadFilter());

    this.source.connect(this.bypassDry);
    this.source.connect(this.eqInput);
    this.source.connect(this.preAnalyser);

    this.eqInput.connect(this.bands[0]);
    for (let i = 0; i < this.bands.length - 1; i += 1) {
      this.bands[i].connect(this.bands[i + 1]);
    }
    this.bands[this.bands.length - 1].connect(this.eqOutput);

    this.eqOutput.connect(this.bypassWet);

    this.bypassDry.connect(this.masterGain);
    this.bypassWet.connect(this.masterGain);

    this.masterGain.connect(this.postAnalyser);
    this.masterGain.connect(this.outputTrim);
    this.outputTrim.connect(this.context.destination);
  }

  getFilters() {
    return this.bands;
  }

  getSampleRate() {
    return this.context?.sampleRate ?? 48000;
  }

  getAnalyser(mode = "post") {
    return mode === "pre" ? this.preAnalyser : this.postAnalyser;
  }

  setOutputTrimDb(db) {
    if (!this.context || !this.outputTrim) {
      return;
    }
    const now = this.context.currentTime;
    const linear = 10 ** (db / 20);
    this.outputTrim.gain.setTargetAtTime(linear, now, SMOOTH_TIME);
  }

  applyState(state) {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(state.masterVolume, now, SMOOTH_TIME);

    const dryTarget = state.globalBypass ? 1 : 0;
    const wetTarget = state.globalBypass ? 0 : 1;
    this.bypassDry.gain.setTargetAtTime(dryTarget, now, SMOOTH_TIME);
    this.bypassWet.gain.setTargetAtTime(wetTarget, now, SMOOTH_TIME);

    state.bands.forEach((bandState, index) => {
      const filter = this.bands[index];
      if (!filter) {
        return;
      }

      if (!bandState.enabled) {
        filter.type = "allpass";
        filter.frequency.setTargetAtTime(1000, now, SMOOTH_TIME);
        filter.gain.setTargetAtTime(0, now, SMOOTH_TIME);
        filter.Q.setTargetAtTime(1, now, SMOOTH_TIME);
        return;
      }

      filter.type = bandState.type;
      filter.frequency.setTargetAtTime(bandState.frequency, now, SMOOTH_TIME);
      filter.gain.setTargetAtTime(bandState.gain, now, SMOOTH_TIME);
      filter.Q.setTargetAtTime(bandState.q, now, SMOOTH_TIME);
    });
  }
}
