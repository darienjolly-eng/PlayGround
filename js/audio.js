// Procedural 1930s-ish jazz loop + chunky cartoon SFX, no external assets.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const TRACKS = [
  { bpm: 138, root: 45, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 1, 4], bright: 1.0 },   // field romp
  { bpm: 150, root: 44, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 4, 2], bright: 0.9 },   // bee swing
  { bpm: 126, root: 43, mode: [0, 2, 3, 5, 6, 8, 10], prog: [0, 5, 3, 4], bright: 0.75 },  // pirate dirge
  { bpm: 132, root: 47, mode: [0, 1, 3, 5, 7, 8, 11], prog: [0, 5, 1, 4], bright: 0.85 },  // ice waltz-ish
  { bpm: 158, root: 42, mode: [0, 2, 3, 5, 7, 8, 11], prog: [0, 1, 5, 4], bright: 1.0 },   // devil stomp
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicOn = true;
    this.track = 0;
    this.intensity = 0;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.melodySeed = 0;
    this.lastShot = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.38;
      this.sfxGain.connect(this.master);
      this.noise = this.makeNoise();
      this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setTrack(i) {
    this.track = i % TRACKS.length;
    this.step = 0;
    this.melodySeed = (this.melodySeed + 7) % 11;
    if (this.ctx) {
      this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
    }
  }

  setIntensity(v) { this.intensity = v; }

  startMusic() {
    if (!this.ctx || this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.scheduler(), 45);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  scheduler() {
    if (!this.ctx || !this.musicOn) return;
    const t = TRACKS[this.track];
    const spb = 60 / t.bpm;
    const stepDur = spb / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      this.scheduleStep(this.step, this.nextTime, t, stepDur);
      this.step = (this.step + 1) % 32;
      this.nextTime += stepDur;
    }
  }

  scheduleStep(step, time, t, stepDur) {
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const chordRoot = t.root + t.prog[bar];
    const swing = inBar % 2 === 1 ? stepDur * 0.12 : 0;
    const at = time + swing;
    const loud = this.intensity > 0.5;

    // Walking bass
    if (inBar === 0 || inBar === 2 || inBar === 4 || inBar === 6) {
      const walk = inBar === 6 ? 7 : inBar === 2 ? 5 : 0;
      this.bass(midi(chordRoot + (inBar === 4 ? 7 : walk) - 12), at, 0.24, inBar === 0 ? 0.5 : 0.34);
    }
    // Chord stabs on the "and"
    if (inBar === 3 || inBar === 7) {
      const deg = [0, 3, 7, 10];
      this.stab(deg.map((d) => midi(chordRoot + d + 12)), at, 0.11, 0.09);
    }
    // Melody: simple generated phrase from the mode
    if (this.musicOn && (inBar === 0 || inBar === 2 || inBar === 3 || inBar === 5 || inBar === 6)) {
      const phrase = [0, 4, 2, 3, 6, 4, 1, 0];
      const idx = (step + this.melodySeed + bar * 3) % phrase.length;
      let deg = phrase[idx];
      if (inBar === 3 && Math.random() < 0.5) deg += 1;
      const semi = t.mode[deg % t.mode.length] + 12 * Math.floor(deg / t.mode.length);
      this.lead(midi(chordRoot + semi + 12), at + (inBar === 6 ? stepDur * 0.1 : 0), 0.16, 0.075 * t.bright);
    }
    // Drums
    if (inBar === 0 || inBar === 4) this.kick(at, 0.3);
    if (inBar === 2 || inBar === 6) this.snare(at, loud ? 0.22 : 0.14);
    this.hat(at, inBar % 2 === 0 ? 0.055 : 0.03);
    if (loud && (inBar === 3 || inBar === 7)) this.hat(at, 0.05, true);
  }

  osc(type, freq, t, dur, vol, dest, filterFreq, slideTo) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filterFreq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filterFreq;
      o.connect(f); f.connect(g);
    } else o.connect(g);
    g.connect(dest || this.musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  bass(freq, t, dur, vol) { this.osc('triangle', freq, t, dur, vol, this.musicGain, 420); }
  stab(freqs, t, dur, vol) {
    for (const f of freqs) this.osc('sawtooth', f, t, dur, vol, this.musicGain, 1600);
  }
  lead(freq, t, dur, vol) {
    this.osc('square', freq, t, dur, vol, this.musicGain, 2400);
    this.osc('triangle', freq * 2, t, dur * 0.6, vol * 0.4, this.musicGain, 3200);
  }
  kick(t, vol) { this.osc('sine', 120, t, 0.12, vol, this.musicGain, null, 42); }
  snare(t, vol) {
    this.noiseHit(t, 0.09, vol, 1800, this.musicGain);
    this.osc('triangle', 180, t, 0.07, vol * 0.5, this.musicGain, null, 90);
  }
  hat(t, vol, open) {
    this.noiseHit(t, open ? 0.12 : 0.03, vol, 8000, this.musicGain);
  }

  noiseHit(t, dur, vol, hp, dest) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.3, dur + 0.02);
  }

  // ---- SFX ----
  fx(name, pitch = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'shoot':
        this.osc('square', 620 * pitch, t, 0.055, 0.1, this.sfxGain, 2400, 220 * pitch);
        break;
      case 'shoot2':
        this.noiseHit(t, 0.05, 0.07, 1200, this.sfxGain);
        this.osc('triangle', 340 * pitch, t, 0.07, 0.06, this.sfxGain, null, 180);
        break;
      case 'chaser':
        this.osc('sine', 900 * pitch, t, 0.07, 0.05, this.sfxGain, null, 1500);
        break;
      case 'lob':
        this.osc('triangle', 240, t, 0.14, 0.12, this.sfxGain, 900, 520);
        break;
      case 'hit':
        this.noiseHit(t, 0.06, 0.07, 2500, this.sfxGain);
        this.osc('square', 200, t, 0.05, 0.035, this.sfxGain, null, 120);
        break;
      case 'hurt':
        this.osc('sawtooth', 320, t, 0.3, 0.24, this.sfxGain, 1200, 90);
        this.noiseHit(t, 0.2, 0.12, 500, this.sfxGain);
        break;
      case 'jump':
        this.osc('square', 300, t, 0.1, 0.07, this.sfxGain, 1800, 660);
        break;
      case 'dash':
        this.noiseHit(t, 0.16, 0.1, 1400, this.sfxGain);
        break;
      case 'parry':
        this.osc('sine', 880, t, 0.22, 0.16, this.sfxGain, null, 1760);
        this.osc('sine', 1320, t + 0.05, 0.2, 0.1, this.sfxGain, null, 2200);
        break;
      case 'super':
        [220, 277, 330, 440].forEach((f, i) => this.osc('sawtooth', f, t + i * 0.03, 0.8, 0.1, this.sfxGain, 2000));
        this.noiseHit(t, 0.5, 0.15, 400, this.sfxGain);
        break;
      case 'superShot':
        this.osc('sawtooth', 120, t, 0.3, 0.12, this.sfxGain, 1200, 60);
        break;
      case 'ko':
        [130, 98, 65].forEach((f, i) => this.osc('sine', f, t + i * 0.08, 1.4, 0.22, this.sfxGain, null, f * 0.5));
        this.noiseHit(t, 0.7, 0.16, 200, this.sfxGain);
        break;
      case 'death':
        [320, 240, 180, 120].forEach((f, i) => this.osc('triangle', f, t + i * 0.12, 0.5, 0.16, this.sfxGain, 900));
        break;
      case 'select':
        this.osc('square', 660, t, 0.06, 0.08, this.sfxGain, null, 990);
        break;
      case 'telegraph':
        this.osc('sawtooth', 140, t, 0.18, 0.06, this.sfxGain, 600, 280);
        break;
      case 'heal':
        this.osc('sine', 700, t, 0.3, 0.1, this.sfxGain, null, 1400);
        break;
      case 'explode':
        this.noiseHit(t, 0.4, 0.2, 300, this.sfxGain);
        this.osc('sine', 90, t, 0.35, 0.18, this.sfxGain, null, 40);
        break;
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.9 : 0;
    return this.enabled;
  }
}
