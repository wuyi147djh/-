import * as THREE from 'three';
import { WEAPONS, weaponById } from '../data/weapons.js';
import { cloneSkinned } from '../core/assets.js';

// ============================================================
//  武器系统
//  * 手臂：你提供的 PSX 手臂（55 骨骼 + guard_idle 等 18 段动画）
//  * 枪械：WeaponsPack / MP7 原始几何体（未减面）
//  * 原包无贴图 → 在引擎内按 Kd 颜色重建 PBR 金属材质 + 天空盒 IBL
// ============================================================

const DEG = Math.PI / 180;

function gunMaterial(src) {
  const c = src && src.color ? src.color.clone() : new THREE.Color(0x2a2d33);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const isPolymer = lum < 0.06 || (c.r < 0.05 && c.g < 0.06 && c.b < 0.09);
  const m = new THREE.MeshStandardMaterial({
    color: c,
    metalness: isPolymer ? 0.25 : 0.92,
    roughness: isPolymer ? 0.62 : 0.30,
    envMapIntensity: 1.25,
  });
  m.name = (src && src.name) || 'gun';
  return m;
}

// 自动判定枪口朝向：把「横截面更细」的一端当作枪口（枪管细、枪托/机匣宽）
function detectMuzzle(src) {
  src.updateMatrixWorld(true);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const v = new THREE.Vector3();
  const each = (fn) => src.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position, m = o.matrixWorld;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); fn(v); }
  });
  each((p) => {
    for (let k = 0; k < 3; k++) {
      const c = p.getComponent(k);
      if (c < mn[k]) mn[k] = c;
      if (c > mx[k]) mx[k] = c;
    }
  });
  const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const ai = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
  const oi = ai === 0 ? [1, 2] : ai === 1 ? [0, 2] : [0, 1];
  const lo = mn[ai], hi = mx[ai], band = (hi - lo) * 0.28;
  let rLo = 0, rHi = 0;
  each((p) => {
    const a = p.getComponent(ai);
    const r = Math.hypot(p.getComponent(oi[0]), p.getComponent(oi[1]));
    if (a <= lo + band && r > rLo) rLo = r;
    if (a >= hi - band && r > rHi) rHi = r;
  });
  return { axis: ['x', 'y', 'z'][ai], muzzleAtHigh: rHi < rLo };
}

function prepareModel(obj, { length = null, orient = true } = {}) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    o.frustumCulled = false;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    o.material = gunMaterial(src);
    if (o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
  });

  const wrap = new THREE.Group();
  wrap.add(obj);
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj);
  const size = bb.getSize(new THREE.Vector3());
  const center = bb.getCenter(new THREE.Vector3());

  // 居中到原点
  obj.position.sub(center);
  obj.updateMatrixWorld(true);

  // 自动把「枪口」对齐到 -Z（前方），而非单纯把最长轴对齐
  const info = obj.userData.__orient;
  if (orient && info) {
    if (info.axis === 'x') wrap.rotation.y = info.muzzleAtHigh ? Math.PI / 2 : -Math.PI / 2;
    else if (info.axis === 'y') wrap.rotation.x = info.muzzleAtHigh ? -Math.PI / 2 : Math.PI / 2;
    else wrap.rotation.y = info.muzzleAtHigh ? Math.PI : 0;
  } else if (orient) {
    const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    if (axis === 'x') wrap.rotation.y = Math.PI / 2;
    else if (axis === 'y') wrap.rotation.x = -Math.PI / 2;
  }

  if (length) {
    const maxDim = Math.max(size.x, size.y, size.z);
    wrap.scale.setScalar(length / Math.max(0.0001, maxDim));
  }
  wrap.userData.size = size;
  return wrap;
}

export class WeaponSystem {
  constructor({ camera, scene, assets, audio, vfx, player, hooks = {} }) {
    this.camera = camera;
    this.scene = scene;
    this.assets = assets;
    this.audio = audio;
    this.vfx = vfx;
    this.player = player;
    this.hooks = hooks;

    this.slot = 0;
    this.current = null;
    this.mag = 0;
    this.reserve = 0;
    this.reloading = false;
    this.reloadT = 0;
    this._fireCd = 0;
    this._cycle = 0;
    this._fireEdge = false;
    this._wasFire = false;
    this.spread = 0;
    this.aiming = false;
    this.enabled = false;
    this._switchT = 0;
    this._switching = false;
    this._kick = 0;
    this._swayT = 0;
    this.ammoCache = {};

    this.vmRoot = new THREE.Group();
    camera.add(this.vmRoot);
    this.armsRoot = null;
    this.mixer = null;
    this.actions = {};
    this.gunMount = new THREE.Group();
    this.vmRoot.add(this.gunMount);
    this.muzzle = new THREE.Object3D();
    this.vmRoot.add(this.muzzle);
    this._hitTest = null;

    // 调参常量（可通过视角校准）
    this.TUNE = {
      armsPos: new THREE.Vector3(0.0, -0.42, -0.30),
      armsRot: new THREE.Euler(0, Math.PI, 0),
      armsScale: 1.0,
      gunPos: new THREE.Vector3(0.16, -0.16, -0.34),
      gunRot: new THREE.Euler(0, 0, 0),
      // PSX 手臂资产（55 骨骼）绑定姿势与武器包不匹配：动画下渲染为大块深色形体，
      // 无法作为持枪手使用，故默认关闭；若日后提供匹配的持枪手臂资产，置为 true 即可。
      showArms: false,
      muzzleFwd: 0.32, muzzleRight: 0.0, muzzleUp: -0.02,
      adsPos: new THREE.Vector3(0.0, -0.115, -0.26),
      hipFov: 74,
    };
  }

  setHitTest(fn) { this._hitTest = fn; }

  async init() {
    // ---------- 手臂 ----------
    if (this.assets.arms && this.TUNE.showArms) {
      const arms = cloneSkinned(this.assets.arms);
      arms.traverse((o) => {
        if (o.isMesh || o.isSkinnedMesh) {
          o.frustumCulled = false;
          o.castShadow = false;
          o.receiveShadow = false;
          const src = Array.isArray(o.material) ? o.material[0] : o.material;
          const m = new THREE.MeshStandardMaterial({
            color: src && src.color ? src.color : new THREE.Color(0xffffff),
            map: src && src.map ? src.map : null,
            roughness: 0.72, metalness: 0.0, envMapIntensity: 0.55,
          });
          m.name = 'arms';
          o.material = m;
        }
      });
      arms.position.copy(this.TUNE.armsPos);
      arms.rotation.copy(this.TUNE.armsRot);
      arms.scale.setScalar(this.TUNE.armsScale);
      this.armsRoot = arms;
      this.vmRoot.add(arms);

      if (this.assets.armsClips.length) {
        this.mixer = new THREE.AnimationMixer(arms);
        this.assets.armsClips.forEach((clip) => {
          const a = this.mixer.clipAction(clip);
          this.actions[clip.name] = a;
        });
        const idleName = ['guard_idle', 'rest', 'relax', 'finger_gun_idle'].find((n) => this.actions[n]);
        this._idleAction = idleName ? this.actions[idleName] : Object.values(this.actions)[0];
        if (this._idleAction) { this._idleAction.reset().play(); }
        this._fireAction = this.actions['guard_draw'] || this.actions['finger_gun_fire'] || null;
      }
    }

    // ---------- 初始化弹药与首把武器 ----------
    WEAPONS.forEach((w) => { this.ammoCache[w.id] = { mag: w.mag, reserve: w.reserve }; });
    await this.switchTo(0, true);
    return this;
  }

  async _loadGunModel(modelName, length) {
    const src = this.assets.weapons[modelName];
    if (!src) return null;
    // 每种枪只做一次朝向检测，克隆时随 userData 复制
    if (!src.userData.__orient) src.userData.__orient = detectMuzzle(src);
    return prepareModel(src.clone(true), { length, orient: true });
  }

  async switchTo(slot, instant = false) {
    slot = ((slot % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
    if (this._switching || (slot === this.slot && this.current && !instant)) return;
    const data = WEAPONS[slot];
    this._switching = true;
    this._switchT = instant ? 0 : 0.42;
    this._lowered = true;

    if (!instant) this.audio && this.audio.mech('mech_bolt_release', { volume: 0.5 });

    // 保存当前弹药
    if (this.current) this.ammoCache[this.current.id] = { mag: this.mag, reserve: this.reserve };

    this.slot = slot;
    this.current = data;
    this.reloading = false;
    this._cycle = 0;
    this._fireCd = 0;

    // 重建枪械模型
    if (this.gunModel) { this.gunMount.remove(this.gunModel); }
    const gun = await this._loadGunModel(data.model, data.length);
    if (gun) {
      // 注意：朝向已由 prepareModel 自动对齐到 -Z，这里不要再覆盖 rotation
      gun.position.copy(this.TUNE.gunPos);
      this.gunModel = gun;
      this.gunMount.add(gun);
      // 枪口位置：模型前方（-Z）尖端
      const s = gun.userData.size || new THREE.Vector3(1, 0.2, 0.5);
      const maxDim = Math.max(s.x, s.y, s.z);
      const lenLocal = (data.length / Math.max(0.0001, maxDim)) * (s.z || maxDim);
      this.muzzle.position.set(this.TUNE.gunPos.x + this.TUNE.muzzleRight, this.TUNE.gunPos.y + this.TUNE.muzzleUp, this.TUNE.gunPos.z - Math.max(0.15, data.length * 0.5));
    }
    const cache = this.ammoCache[data.id];
    this.mag = cache.mag; this.reserve = cache.reserve;

    if (this.hooks.onWeaponChange) this.hooks.onWeaponChange(data, this.mag, this.reserve);
    setTimeout(() => { this._switching = false; }, this._switchT * 1000);
  }

  reload() {
    if (this.reloading || !this.current || this.mag >= this.current.mag || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = this.current.reloadTime;
    this.audio && this.audio.reload(this.current.sound.reload);
    if (this.hooks.onReload) this.hooks.onReload(this.current.reloadTime);
  }

  _finishReload() {
    const need = this.current.mag - this.mag;
    const take = Math.min(need, this.reserve);
    this.mag += take;
    this.reserve -= take;
    this.reloading = false;
    if (this.current && this.current.sound.mech) this.audio && this.audio.mech(this.current.sound.mech, { volume: 0.5 });
    if (this.hooks.onAmmo) this.hooks.onAmmo(this.mag, this.reserve);
  }

  _applySpread(base) {
    const deg = base;
    const rad = deg * DEG;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * rad;
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
  }

  _shoot() {
    const w = this.current;
    const player = this.player;
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);

    const baseDir = new THREE.Vector3();
    this.camera.getWorldDirection(baseDir);

    // 基础散布
    let spread = w.spread;
    spread += w.spreadMove * Math.min(1, player.speed / player.sprintSpeed);
    spread += this.spread;
    if (this.aiming) spread *= 0.45;
    if (!player.onGround) spread *= 1.8;

    const pellets = w.pellets || 1;
    const far = w.range;
    let anyHit = false, killed = false;

    // 计算枪口世界坐标（用于曳光起点）
    this.vmRoot.updateWorldMatrix(true, true);
    const mz = new THREE.Vector3();
    this.muzzle.getWorldPosition(mz);

    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(baseDir, up).normalize();

    for (let p = 0; p < pellets; p++) {
      const off = pellets > 1 ? this._applySpread(spread) : this._applySpread(spread);
      const dir = baseDir.clone()
        .addScaledVector(right, Math.tan(off.x))
        .addScaledVector(up, Math.tan(off.y))
        .normalize();

      const res = this._hitTest ? this._hitTest(origin, dir, far) : null;
      if (res) {
        anyHit = true;
        const dmg = w.damage * (res.isHead ? w.headMult : 1);
        if (this.vfx) {
          if (res.enemy) this.vfx.bloodBurst(res.point, dir);
          else this.vfx.impact(res.point, res.normal || dir.clone().negate(), res.surface || 'snow');
        }
        if (res.enemy && res.enemy.takeDamage) {
          const dead = res.enemy.takeDamage(dmg, res.isHead);
          if (this.hooks.onHit) this.hooks.onHit(res.enemy, res.isHead, dead);
          if (dead) killed = true;
        }
        if (this.vfx && Math.random() < (w.tracerChance ?? 0.5)) this.vfx.tracer(mz, res.point, w.tracer.color, w.tracer.width);
      } else {
        const end = origin.clone().addScaledVector(dir, far);
        if (this.vfx && Math.random() < (w.tracerChance ?? 0.5)) this.vfx.tracer(mz, end, w.tracer.color, w.tracer.width);
      }
    }

    // 特效与后坐
    if (this.vfx) {
      const flashPos = mz.clone().addScaledVector(baseDir, 0.05);
      this.vfx.muzzleFlash(flashPos, baseDir, w.muzzleScale);
    }
    const rec = w.recoil * (this.aiming ? 0.6 : 1);
    player.addRecoil(rec * DEG, (Math.random() - 0.5) * rec * 0.35 * DEG);
    this._kick = Math.min(0.06, w.kick);
    this.spread = Math.min(w.spreadMax, this.spread + w.spreadShot);

    const snd = (w.sound.fire && Math.random() < 0.7) ? w.sound.fire : (w.sound.spray || w.sound.fire);
    this.audio && this.audio.gun(snd, { volume: 0.9 });

    if (this.hooks.onShoot) this.hooks.onShoot(killed);
    return true;
  }

  update(dt, input) {
    if (!this.current) return;
    const w = this.current;

    if (this.mixer) this.mixer.update(dt);

    // 开关状态
    if (this._switching) {
      this._switchT -= dt;
      const t = Math.max(0, this._switchT);
      const k = Math.min(1, t / 0.42);
      this.vmRoot.position.y = -0.5 * k;
      this.gunMount.visible = t < 0.28;
      if (this._switchT <= 0 && this._lowered) {
        this._lowered = false;
        this.gunMount.visible = true;
        if (this._switchT <= -0.42) this._switching = false;
      }
      if (this._switchT <= 0) { this._switchT = Math.min(0, this._switchT); }
      if (t <= 0) { this.vmRoot.position.y = 0; }
    } else {
      this.vmRoot.position.y += (0 - this.vmRoot.position.y) * Math.min(1, dt * 12);
      this.gunMount.visible = true;
    }

    // 瞄准
    this.aiming = !!input.actions.aim && !this._switching && !this.reloading;
    this.player.aiming = this.aiming;

    // 散布恢复
    this.spread *= Math.exp(-dt * 3.2);
    if (this.spread < 0.001) this.spread = 0;

    // 换弹计时
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.hooks.onReloadProgress) this.hooks.onReloadProgress(1 - this.reloadT / w.reloadTime);
      if (this.reloadT <= 0) this._finishReload();
    }

    // 开火冷却
    if (this._fireCd > 0) this._fireCd -= dt;
    if (this._cycle > 0) this._cycle -= dt;

    // 触发
    const fire = !!input.actions.fire && this.enabled && !this.reloading && !this._switching;
    const edge = fire && !this._wasFire;
    this._wasFire = fire;

    const interval = 60 / w.rpm;
    const canFire = this._fireCd <= 0 && this._cycle <= 0 && this.mag > 0;

    let wantShoot = false;
    if (w.fireMode === 'auto') wantShoot = fire;
    else wantShoot = edge;

    if (wantShoot && canFire) {
      this._shoot();
      this.mag--;
      this._fireCd = interval;
      if (w.fireMode === 'pump' || w.fireMode === 'bolt') this._cycle = Math.max(interval, 0.55);
      if (this.mag <= 0 && this.hooks.onAmmo) this.hooks.onAmmo(0, this.reserve);
      else if (this.hooks.onAmmo) this.hooks.onAmmo(this.mag, this.reserve);
    } else if (wantShoot && this.mag <= 0 && canFire) {
      this.audio && this.audio.empty();
      this._fireCd = 0.25;
    } else if (wantShoot && edge && this.mag <= 0) {
      this.audio && this.audio.empty();
      this._fireCd = 0.25;
    }

    // 自动换弹
    if (this.mag <= 0 && !this.reloading && this.reserve > 0 && !this._switching) {
      this.reload();
    }

    // ---------- 视觉：摆动 / 后坐 / ADS ----------
    const look = { x: input._look ? input._look.x : 0, y: input._look ? input._look.y : 0 };
    const swayX = THREE.MathUtils.clamp(-input.move.x * 0.02 - playerVelocityX(this.player) * 0.004, -0.05, 0.05);
    const swayY = THREE.MathUtils.clamp(playerVelocityY(this.player) * 0.002, -0.03, 0.03);

    const adsK = this.aiming ? 1 : 0;
    this._adsT = THREE.MathUtils.damp(this._adsT || 0, adsK, 12, dt);

    const basePos = new THREE.Vector3(
      this.TUNE.gunPos.x + swayX,
      this.TUNE.gunPos.y + swayY,
      this.TUNE.gunPos.z
    );
    const adsTarget = this.TUNE.adsPos;
    const targetPos = basePos.lerp(adsTarget, this._adsT);

    this._kick *= Math.exp(-dt * 14);
    targetPos.z += this._kick * 1.4;

    this.gunMount.position.lerp(targetPos, Math.min(1, dt * 16));

    // 手臂跟随（若未绑定骨骼）
    if (this.armsRoot) {
      const bob = this.player.speed > 0.5 ? Math.sin(this.player.bobT) * 0.012 : 0;
      this.armsRoot.position.copy(this.TUNE.armsPos);
      this.armsRoot.position.x += swayX * 0.6;
      this.armsRoot.position.y += swayY * 0.6 + bob;
      this.armsRoot.position.lerp(this._adsArms(), this._adsT * 0.5);
    }

    // 开火动画混合
    if (this._idleAction) {
      const spd = this.aiming ? 0.7 : 1.0;
      this._idleAction.setEffectiveTimeScale(spd);
    }

    if (this.hooks.onSpread) this.hooks.onSpread(this.spread + w.spread + (this.player.speed / this.player.sprintSpeed) * w.spreadMove);
  }

  _adsArms() {
    return new THREE.Vector3(0.0, -0.30, -0.24);
  }
}

function playerVelocityX(p) { return p.velocity.x; }
function playerVelocityY(p) { return p.velocity.y; }
