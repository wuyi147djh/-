import * as THREE from 'three';

// ============================================================
//  音频系统：使用 Snake's Authentic Gun Sounds WAV 原始素材
//  + 程序化合成的 UI/环境/受击音效（资产包中缺失的部分）
// ============================================================
const FILES = [
  'gun_556_single', 'gun_556_spray', 'gun_762x39_single', 'gun_762x39_spray',
  'gun_762x54r_single', 'gun_762x54r_spray', 'gun_22lr_single', 'gun_22lr_spray',
  'mech_charging', 'mech_bolt_release', 'mech_bolt_cycle',
  'reload_ar', 'reload_ak', 'reload_pump', 'reload_308', 'reload_pistol',
];
const BASE = './assets/audio/guns/';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.master = null;
    this.masterVol = 0.85;
    this._listenerPos = new THREE.Vector3();
    this._listenerDir = new THREE.Vector3(0, 0, -1);
    this._ambient = null;
    this._lastStep = 0;
  }

  async init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVol;
    this.master.connect(this.ctx.destination);
    this._buildSynth();
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setVolume(v) {
    this.masterVol = v;
    if (this.master) this.master.gain.value = v;
  }

  async load(onProgress) {
    await this.init();
    let done = 0;
    await Promise.all(
      FILES.map(async (name) => {
        try {
          const res = await fetch(BASE + name + '.wav');
          const ab = await res.arrayBuffer();
          this.buffers[name] = await this.ctx.decodeAudioData(ab);
        } catch (e) {
          console.warn('音频加载失败', name, e);
        }
        done++;
        if (onProgress) onProgress(done / FILES.length);
      })
    );
  }

  // ---------- 空间衰减 ----------
  setListener(pos, dir) {
    this._listenerPos.copy(pos);
    this._listenerDir.copy(dir);
  }

  _spatial(pos) {
    if (!pos) return { gain: 1, pan: 0 };
    const d = this._listenerPos.distanceTo(pos);
    const gain = Math.max(0, 1 - d / 120) * (1 / (1 + d * 0.02));
    const toSrc = pos.clone().sub(this._listenerPos);
    if (toSrc.lengthSq() > 0.001) toSrc.normalize();
    const right = new THREE.Vector3().crossVectors(this._listenerDir, new THREE.Vector3(0, 1, 0)).normalize();
    const pan = THREE.MathUtils.clamp(toSrc.dot(right), -1, 1);
    return { gain, pan };
  }

  _play(name, { volume = 1, rate = 1, pos = null, delay = 0 } = {}) {
    const buf = this.buffers[name];
    if (!buf || !this.ctx) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    const sp = this._spatial(pos);
    g.gain.value = volume * sp.gain;
    src.connect(g);
    let tail = g;
    if (Math.abs(sp.pan) > 0.02) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = sp.pan;
      g.connect(p);
      tail = p;
    }
    tail.connect(this.master);
    const t = this.ctx.currentTime + delay;
    src.start(t);
    return src;
  }

  gun(name, opts = {}) {
    const rate = 0.94 + Math.random() * 0.12;
    this._play(name, { volume: 0.85, rate, ...opts });
  }
  reload(name, opts = {}) { this._play(name, { volume: 0.8, ...opts }); }
  mech(name, opts = {}) { this._play(name, { volume: 0.6, ...opts }); }

  // ---------- 程序化合成音效 ----------
  _buildSynth() {
    const ctx = this.ctx;
    // 环境风声：棕噪声 + 低通
    const len = ctx.sampleRate * 4;
    const nb = ctx.createBuffer(2, len, ctx.sampleRate);
    let last = 0;
    for (let ch = 0; ch < 2; ch++) {
      const d = nb.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    this._windBuf = nb;
  }

  startAmbient() {
    if (!this.ctx || this._ambient) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._windBuf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(lp).connect(g).connect(this.master);
    src.start();
    this._ambient = { src, g };
  }

  stopAmbient() {
    if (this._ambient) { try { this._ambient.src.stop(); } catch (e) {} this._ambient = null; }
  }

  _beep({ freq = 880, dur = 0.08, type = 'sine', vol = 0.25, slide = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noiseBurst({ dur = 0.12, vol = 0.3, freq = 900, q = 1 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
  }

  hitmarker() { this._beep({ freq: 1500, dur: 0.05, type: 'square', vol: 0.12, slide: -500 }); }
  kill() { this._beep({ freq: 620, dur: 0.09, type: 'triangle', vol: 0.2, slide: 420 }); this._beep({ freq: 980, dur: 0.14, type: 'sine', vol: 0.16, slide: 300 }); }
  hurt() { this._noiseBurst({ dur: 0.25, vol: 0.35, freq: 320, q: 0.6 }); this._beep({ freq: 180, dur: 0.2, type: 'sawtooth', vol: 0.14, slide: -80 }); }
  ui() { this._beep({ freq: 520, dur: 0.05, type: 'triangle', vol: 0.14 }); }
  empty() { this._beep({ freq: 240, dur: 0.035, type: 'square', vol: 0.14 }); }
  wave() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._beep({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18 }), i * 110)); }
  die() { this._beep({ freq: 300, dur: 1.1, type: 'sawtooth', vol: 0.28, slide: -240 }); }

  footstep(v = 1) {
    const now = performance.now();
    if (now - this._lastStep < 300) return;
    this._lastStep = now;
    this._noiseBurst({ dur: 0.09, vol: 0.13 * v, freq: 260 + Math.random() * 120, q: 0.8 });
  }
}
