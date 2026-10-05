import * as THREE from 'three';
import { Renderer } from './core/renderer.js';
import { AssetManager } from './core/assets.js';
import { AudioManager } from './core/audio.js';
import { Input } from './core/input.js';
import { Level, buildLevel } from './game/level.js';
import { Player } from './game/player.js';
import { VFX } from './game/vfx.js';
import { WeaponSystem } from './game/weapon.js';
import { EnemyManager } from './game/enemy.js';
import { HUD } from './game/hud.js';
import { WEAPONS } from './data/weapons.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.state = 'boot';   // boot | menu | playing | paused | over
    this.wave = 0;
    this.kills = 0;
    this.score = 0;
    this._waveTimer = 0;
    this._spawnQueue = 0;
    this._clock = new THREE.Clock();
    this._fpsAcc = 0; this._fpsFrames = 0;
  }

  async boot() {
    this.hud = new HUD();
    this.audio = new AudioManager();
    this.renderer = new Renderer($('game-canvas'));
    this.scene = this.renderer.scene;
    this.camera = this.renderer.camera;
    this.scene.add(this.camera);           // 关键：让第一人称模型随相机渲染

    // ---- 光照 ----
    this._setupLights();

    // ---- 加载 ----
    this.assets = new AssetManager();
    this.hud.setLoading(0.02, '初始化引擎…');
    await this.assets.loadAll((p, label) => this.hud.setLoading(p * 0.85, label));
    this.hud.setLoading(0.86, '准备音频…');
    await this.audio.init();
    await this.audio.load((p) => this.hud.setLoading(0.86 + p * 0.1, '准备音频…'));

    this.hud.setLoading(0.97, '构建雪原站场…');
    // 天空
    this.skyTex = this.assets.skybox.sky_day_dusk;
    this.renderer.setSky(this.skyTex, { fogColor: 0xa7bac9, intensity: 1.0 });
    this.scene.environmentIntensity = 0.9;

    // 关卡
    this.level = await buildLevel(this.assets.env, { span: 190, envIntensity: 0.9 });
    this.scene.add(this.level.root);
    this.level.sampleSpawnPoints(80);
    this.renderer.setSun(this.sun);

    // 系统
    this.vfx = new VFX(this.scene, this.camera, 'high');
    this.input = new Input();
    this.player = new Player(this.camera, this.input, this.level, this.audio);
    this.weapons = new WeaponSystem({
      camera: this.camera, scene: this.scene, assets: this.assets,
      audio: this.audio, vfx: this.vfx, player: this.player,
      hooks: {
        onAmmo: (m, r) => { this.hud.setAmmo(m, r); this.hud.reload(0, false); },
        onReload: () => this.hud.reload(0, true),
        onReloadProgress: (p) => this.hud.reload(p, true),
        onWeaponChange: (w, m, r) => { this.hud.setAmmo(m, r, w.name); this.hud.setWeaponActive(w.slot); },
        onShoot: (killed) => { if (!killed) this.hud.hitmarker(false); },
        onHit: (enemy, head, dead) => {
          this.hud.hitmarker(dead);
          if (dead) { this._onKill(enemy, head); }
          else this.audio.hitmarker();
        },
        onSpread: (s) => this.hud.setSpread(s),
      },
    });
    this.enemies = new EnemyManager({
      scene: this.scene, assets: this.assets, level: this.level,
      audio: this.audio, player: this.player, vfx: this.vfx, shadows: true,
      hooks: {
        onKill: (e) => { /* 击杀特效在 weapon 钩子里统一处理 */ },
        onPlayerHit: () => this.hud.damage(),
      },
    });

    await this.weapons.init();
    this.weapons.setHitTest((o, d, f) => this._hitTest(o, d, f));

    this._bindUI();
    window.addEventListener('resize', () => this.renderer.resize());

    this.hud.setLoading(1, '就绪');
    setTimeout(() => {
      this.hud.showLoading(false);
      this.hud.showMenu(true);
      $('menu').classList.remove('hidden');
      this.state = 'menu';
    }, 250);

    this._loop();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xbcd4e6, 0x6b7683, 0.55);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe6c8, 2.4);
    sun.position.set(-60, 55, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    const S = 34;
    sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
    sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
    this._sunOffset = new THREE.Vector3(-42, 52, 30);
  }

  _bindUI() {
    $('btn-start').addEventListener('click', () => this.startGame());
    $('btn-retry').addEventListener('click', () => this.startGame());
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-restart').addEventListener('click', () => this.startGame());
    $('btn-quit').addEventListener('click', () => this.toMenu());
    $('btn-gomenu').addEventListener('click', () => this.toMenu());
    $('btn-pause').addEventListener('click', () => this.togglePause());

    $('opt-quality').addEventListener('change', (e) => {
      this.renderer.setQuality(e.target.value);
      this.vfx && this.vfx.setQuality(e.target.value);
    });
    $('opt-sens').addEventListener('input', (e) => { this.input.sensitivity = e.target.value / 100; });
    $('opt-vol').addEventListener('input', (e) => { this.audio.setVolume(e.target.value / 100); });
    $('opt-lefty').addEventListener('change', (e) => {
      document.body.classList.toggle('lefty', e.target.checked);
      this.input.lefty = e.target.checked;
      const joy = $('joystick'), fire = $('btn-fire'), acts = $('action-buttons');
      const lz = $('look-zone');
      if (e.target.checked) {
        joy.style.left = 'auto'; joy.style.right = 'calc(22px + var(--safe-r))';
        fire.style.right = 'auto'; fire.style.left = 'calc(24px + var(--safe-l))';
        acts.style.right = 'auto'; acts.style.left = 'calc(18px + var(--safe-l))';
        lz.style.right = 'auto'; lz.style.left = '0';
      } else {
        joy.style.left = ''; joy.style.right = '';
        fire.style.right = ''; fire.style.left = '';
        acts.style.right = ''; acts.style.left = '';
        lz.style.right = ''; lz.style.left = '';
      }
    });

    // 竖屏：允许直接游玩（系统方向锁定时也能玩）
    $('btn-play-portrait').addEventListener('click', () => this.usePortrait());
    $('btn-force-landscape').addEventListener('click', () => this.tryLandscape());
    window.addEventListener('orientationchange', () => setTimeout(() => this.renderer.resize(), 120));

    this.input.onWeapon = (slot) => { if (this.state === 'playing') this.weapons.switchTo(slot); };
    this.input.onPause = () => this.togglePause();

    // 默认桌面/触屏标记
    document.body.classList.toggle('desktop', !this.input.isTouch);
    // 上次选择过竖屏游玩则不再拦截
    try {
      if (localStorage.getItem('snowbound.portrait') === '1') document.body.classList.add('portrait-ok');
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  // 竖屏直接游玩
  usePortrait() {
    document.body.classList.add('portrait-ok');
    try { localStorage.setItem('snowbound.portrait', '1'); } catch (e) { /* 忽略 */ }
    setTimeout(() => this.renderer.resize(), 60);
  }

  // 尝试全屏并锁定横屏（iOS Safari 不支持时会自动退回竖屏游玩）
  async tryLandscape() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
      document.body.classList.remove('portrait-ok');
      try { localStorage.removeItem('snowbound.portrait'); } catch (e) { /* 忽略 */ }
    } catch (e) {
      this.usePortrait();
    }
    setTimeout(() => this.renderer.resize(), 150);
  }

  _hitTest(origin, dir, far) {
    const e = this.enemies.raycast(origin, dir, far);
    const l = this.level.raycastColliders(origin, dir, e ? e.distance : far);
    if (e && (!l || e.distance <= l.distance)) return e;
    if (l) return l;
    return null;
  }

  startGame() {
    this.audio.resume();
    this.audio.startAmbient();
    this.hud.showMenu(false);
    this.hud.showGameOver(false);
    this.hud.showPause(false);
    this.hud.showHUD(true);

    // 重置
    this.enemies.clear();
    this.kills = 0; this.score = 0; this.wave = 0;
    this._spawnQueue = 0; this._waveTimer = 1.2;
    this.hud.setScore(0, 0);

    // 出生点
    const pts = this.level.spawnPoints;
    let sp = pts.length ? pts[0] : new THREE.Vector3(0, this.level.floorY, 0);
    if (pts.length) {
      // 选离中心最近的
      sp = pts.reduce((a, b) => (a.length() < b.length() ? a : b));
    }
    this.player.spawnAt(sp);
    this.weapons.mag = this.weapons.current.mag;
    this.weapons.reserve = this.weapons.current.reserve;
    this.hud.setAmmo(this.weapons.mag, this.weapons.reserve, this.weapons.current.name);
    this.hud.setWeaponActive(0);

    this.input.setEnabled(true);
    this.weapons.enabled = true;
    if (!this.input.isTouch) {
      const c = $('game-canvas');
      c.requestPointerLock && c.requestPointerLock();
    }
    this.state = 'playing';
    this._clock.getDelta();
  }

  toMenu() {
    this.state = 'menu';
    this.hud.showGameOver(false);
    this.hud.showPause(false);
    this.hud.showHUD(false);
    this.hud.showMenu(true);
    this.input.setEnabled(false);
    this.audio.stopAmbient();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.hud.showPause(true);
    this.audio.stopAmbient();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.showPause(false);
    this.input.setEnabled(true);
    this.audio.resume();
    this.audio.startAmbient();
    if (!this.input.isTouch) $('game-canvas').requestPointerLock && $('game-canvas').requestPointerLock();
    this._clock.getDelta();
  }

  gameOver() {
    this.state = 'over';
    this.input.setEnabled(false);
    this.audio.die();
    this.audio.stopAmbient();
    this.hud.gameOver(this.wave, this.kills, this.score);
    this.hud.showGameOver(true);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _onKill(enemy, head) {
    this.kills++;
    this.score += head ? 150 : 100;
    this.hud.setScore(this.kills, this.score);
    this.hud.hitmarker(true);
    this.audio.kill();
    this.hud.killFeed(`击杀 <b>敌兵</b>${head ? ' · 爆头 +150' : ' +100'}`);
  }

  _waveLogic(dt) {
    if (this.state !== 'playing') return;
    const alive = this.enemies.aliveCount + this._spawnQueue;
    if (this._spawnQueue > 0) {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) {
        this.enemies.spawn(this.player.position, this.wave);
        this._spawnQueue--;
        this._waveTimer = Math.max(0.5, 1.6 - this.wave * 0.08);
      }
    } else if (alive === 0) {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) {
        this.wave++;
        this._spawnQueue = Math.min(14, 3 + this.wave);
        this._waveTimer = 0.01;
        this.hud.waveBanner(`第 ${this.wave} 波`, '敌军来袭 · 守住站场');
        this.audio.wave();
      }
    }
    this.hud.setWave(Math.max(1, this.wave), Math.max(0, this.enemies.aliveCount + this._spawnQueue));
  }

  _loop = () => {
    requestAnimationFrame(this._loop);
    const dtRaw = this._clock.getDelta();
    const dt = Math.min(dtRaw, 0.05);

    // FPS
    this._fpsAcc += dtRaw; this._fpsFrames++;
    if (this._fpsAcc >= 0.5) {
      this.hud.setFps(this._fpsFrames / this._fpsAcc);
      this._fpsAcc = 0; this._fpsFrames = 0;
    }

    if (this.state === 'playing' || this.state === 'paused' || this.state === 'over') {
      // 太阳阴影跟随玩家
      if (this.player) {
        this.sun.target.position.copy(this.player.position);
        this.sun.position.copy(this.player.position).add(this._sunOffset);
      }
    }

    if (this.state === 'playing') {
      this.input.sample();
      this.player.update(dt);
      this.weapons.update(dt, this.input);
      this.enemies.update(dt);
      this._waveLogic(dt);

      // 相机 FOV（瞄准）
      const targetFov = this.weapons.aiming ? this.weapons.current.adsFov : (this.input.isTouch ? 74 : 80);
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();

      this.audio.setListener(this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()));

      this.hud.setHealth(this.player.health, this.player.maxHealth, this.player.armor);
      if (this.player.dead) this.gameOver();
    } else if (this.state === 'over') {
      this.enemies.update(dt);
    }

    if (this.vfx) this.vfx.update(dt, this.camera.position);
    this.renderer.render();
  };
}

const game = new Game();
window.__game = game;
game.boot().catch((err) => {
  console.error(err);
  const t = $('load-text');
  if (t) t.textContent = '加载失败：' + (err && err.message ? err.message : err);
});
