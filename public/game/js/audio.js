/** Optional synthesized audio. AudioContext is created only after user input. */
export class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }
  async toggle() {
    this.enabled = !this.enabled;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.engine = this.ctx.createOscillator();
        this.engine.type = 'sawtooth';
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 250;
        this.engine.connect(this.filter);
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.06;
        this.filter.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engine.start();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.master.gain.setTargetAtTime(
        this.enabled ? 0.22 : 0,
        this.ctx.currentTime,
        0.12,
      );
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }
  update(state) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(40 + state.speed * 0.8, t, 0.09);
    this.filter.frequency.setTargetAtTime(
      140 + state.speed * 3 + (state.boosting ? 350 : 0),
      t,
      0.09,
    );
    this.engineGain.gain.setTargetAtTime(
      state.mode === 'racing' ? 0.1 : 0,
      t,
      0.1,
    );
  }
  tone(type) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain(),
      t = this.ctx.currentTime;
    osc.type = type === 'collision' ? 'sawtooth' : 'sine';
    const hz =
      type === 'collision'
        ? 100
        : type === 'pad'
          ? 660
          : type === 'count'
            ? 440
            : 880;
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(
      type === 'collision' ? 35 : hz * 1.5,
      t + 0.17,
    );
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(t + 0.26);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
