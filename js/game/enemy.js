import * as THREE from 'three';
import { ENEMY_GUNS } from '../data/weapons.js';

// ============================================================
//  敌人
//  模型：military_rts_character_1_cc0（2048² PBR 贴图）
//  注意：该资产为静置网格（无骨骼），因此这里用程序化姿态驱动
//        （行走起伏 / 朝向 / 受击后仰 / 倒地），不修改模型本身
// ============================================================

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function slabRay(origin, dir, box, far) {
  const inv = _tmp.set(1 / (dir.x || 1e-8), 1 / (dir.y || 1e-8), 1 / (dir.z || 1e-8));
  let t1 = (box.min.x - origin.x) * inv.x, t2 = (box.max.x - origin.x) * inv.x;
  let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
  let axis = 0, sign = t1 > t2 ? 1 : -1;
  t1 = (box.min.y - origin.y) * inv.y; t2 = (box.max.y - origin.y) * inv.y;
  const ymin = Math.min(t1, t2), ymax = Math.max(t1, t2);
  if (ymin > tmin) { tmin = ymin; axis = 1; sign = t1 > t2 ? 1 : -1; }
  if (ymax < tmax) tmax = ymax;
  t1 = (box.min.z - origin.z) * inv.z; t2 = (box.max.z - origin.z) * inv.z;
  const zmin = Math.min(t1, t2), zmax = Math.max(t1, t2);
  if (zmin > tmin) { tmin = zmin; axis = 2; sign = t1 > t2 ? 1 : -1; }
  if (zmax < tmax) tmax = zmax;
  if (tmax < 0 || tmin > tmax || tmin > far) return null;
  const t = tmin < 0 ? 0 : tmin;
  const point = origin.clone().addScaledVector(dir, t);
  const normal = new THREE.Vector3();
  normal.setComponent(axis, sign);
  return { distance: t, point, normal };
}

export class Enemy {
  constructor(mgr, template, cfg, spawn, opts = {}) {
    this.mgr = mgr;
    this.level = mgr.level;
    this.audio = mgr.audio;
    this.player = mgr.player;
    this.vfx = mgr.vfx;

    this.group = template.clone(true);
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = mgr.shadows;
        o.receiveShadow = false;
        o.material = o.material.clone();
        o.material.envMapIntensity = 0.8;
        o.frustumCulled = true;
        this._mat = this._mat || o.material;
        this._mats = this._mats || [];
        this._mats.push(o.material);
      }
    });

    this.position = spawn.clone();
    this.velocity = new THREE.Vector3();
    this.height = 1.8;
    this.radius = 0.42;
    this.maxHealth = opts.health || 100;
    this.health = this.maxHealth;
    this.speed = opts.speed || 2.5;
    this.cfg = cfg;
    this.state = 'advance';
    this.dead = false;
    this.deadT = 0;
    this.fireCd = 1 + Math.random() * 2;
    this.burstLeft = 0;
    this.burstCd = 0;
    this.preferred = 11 + Math.random() * 8;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 1 + Math.random() * 2;
    this.yaw = Math.random() * Math.PI * 2;
    this.bobT = Math.random() * 6;
    this.hitFlash = 0;
    this._aim = new THREE.Vector3();
    this.random = Math.random() * 100;

    this.group.position.copy(this.position);
    mgr.scene.add(this.group);
  }

  box(target = new THREE.Box3()) {
    return target.set(
      _v.set(this.position.x - this.radius, this.position.y, this.position.z - this.radius),
      _v2.set(this.position.x + this.radius, this.position.y + this.height, this.position.z + this.radius)
    );
  }

  takeDamage(dmg, isHead) {
    if (this.dead) return false;
    this.health -= dmg;
    this.hitFlash = 0.12;
    for (const m of this._mats) {
      m.emissive = m.emissive || new THREE.Color(0, 0, 0);
      m.emissive.setRGB(0.9, 0.1, 0.1);
      m.emissiveIntensity = 1.0;
    }
    if (this.health <= 0) { this._die(); return true; }
    return false;
  }

  _die() {
    this.dead = true;
    this.deadT = 0;
    this.state = 'dead';
    for (const m of this._mats) { m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; }
    if (this.mgr.hooks.onKill) this.mgr.hooks.onKill(this);
  }

  _hasLOS(from, to) {
    const dir = _tmp.copy(to).sub(from);
    const dist = dir.length();
    if (dist < 0.5) return true;
    dir.normalize();
    const hit = this.level.raycastColliders(from, dir, dist - 0.4);
    return !hit;
  }

  update(dt) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.55);
      const e = 1 - Math.pow(1 - k, 3);
      this.group.rotation.x = -e * Math.PI * 0.5;
      this.group.position.y = this.position.y - e * 0.15;
      if (this.deadT > 6) this.mgr._recycle(this);
      return;
    }

    // 受击闪光衰减
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const on = this.hitFlash > 0;
      for (const m of this._mats) {
        m.emissiveIntensity = on ? this.hitFlash / 0.12 : 0;
      }
    }

    const toPlayer = _v.copy(this.player.position).sub(this.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    if (toPlayer.lengthSq() > 1e-4) toPlayer.normalize();

    const eye = _v2.set(this.position.x, this.position.y + 1.55, this.position.z);
    const target = new THREE.Vector3(this.player.position.x, this.player.position.y + 1.3, this.player.position.z);
    const los = this._hasLOS(eye, target);

    // ---- 移动 ----
    let moveX = 0, moveZ = 0;
    if (dist > this.preferred + 2) { moveX = toPlayer.x; moveZ = toPlayer.z; }
    else if (dist < this.preferred - 3) { moveX = -toPlayer.x; moveZ = -toPlayer.z; }
    else {
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeT = 1.2 + Math.random() * 2; this.strafeDir *= -1; }
      moveX = -toPlayer.z * this.strafeDir;
      moveZ = toPlayer.x * this.strafeDir;
    }
    const hasLOSMove = los;
    if (!hasLOSMove && dist > 6) { moveX = toPlayer.x; moveZ = toPlayer.z; }
    const ml = Math.hypot(moveX, moveZ);
    if (ml > 0.001) {
      moveX /= ml; moveZ /= ml;
      const sp = this.speed * (los ? 0.85 : 1.15);
      this.position.x += moveX * sp * dt;
      this.position.z += moveZ * sp * dt;
      this.bobT += dt * sp * 3.2;
      this.level.resolveHorizontal(this.position, this.radius, this.height, 0.5);
    }
    this.position.y = this.level.supportHeightAt(this.position, this.radius * 0.8, 0.5);

    // 朝向玩家
    const wantYaw = Math.atan2(this.player.position.x - this.position.x, this.player.position.z - this.position.z);
    let d = wantYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 6);

    // ---- 应用姿态 ----
    const bob = ml > 0.001 ? Math.sin(this.bobT * 2) * 0.035 : 0;
    const bobX = ml > 0.001 ? Math.cos(this.bobT) * 0.02 : 0;
    this.group.position.set(this.position.x + bobX, this.position.y + Math.abs(bob), this.position.z);
    this.group.rotation.set(0, this.yaw, 0);
    this.group.rotation.z = ml > 0.001 ? Math.sin(this.bobT) * 0.03 : 0;

    // ---- 开火 ----
    this.fireCd -= dt;
    if (this.burstLeft > 0) {
      this.burstCd -= dt;
      if (this.burstCd <= 0) {
        this._fire(target, dist);
        this.burstLeft--;
        this.burstCd = 0.11;
        if (this.burstLeft <= 0) this.fireCd = 1.1 + Math.random() * 1.6;
      }
    } else if (los && dist < this.cfg.range && dist > 3 && this.fireCd <= 0) {
      this.burstLeft = this.cfg.burst;
      this.burstCd = 0;
    }
  }

  _fire(target, dist) {
    const muzzle = new THREE.Vector3(this.position.x, this.position.y + 1.42, this.position.z)
      .addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.35);
    const dirTo = target.clone().sub(muzzle).normalize();
    if (this.vfx) this.vfx.tracer(muzzle, target, 0xff9a4a, 0.03);
    if (this.vfx) this.vfx.muzzleFlash(muzzle, dirTo, 0.7);
    if (this.audio) this.audio.gun(this.cfg.sound, { volume: 0.5 * Math.max(0.2, 1 - dist / 90), pos: muzzle });

    // 命中概率
    const pSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    let chance = 0.5 - dist * 0.0035 - pSpeed * 0.025;
    chance = THREE.MathUtils.clamp(chance, 0.06, 0.55);
    if (Math.random() < chance) {
      this.player.takeDamage(this.cfg.damage);
      if (this.mgr.hooks.onPlayerHit) this.mgr.hooks.onPlayerHit();
    }
    if (this.vfx) this.vfx.impact(target, dirTo.clone().negate(), 'blood');
  }
}

// ============================================================
export class EnemyManager {
  constructor({ scene, assets, level, audio, player, vfx, hooks = {}, shadows = true }) {
    this.scene = scene;
    this.assets = assets;
    this.level = level;
    this.audio = audio;
    this.player = player;
    this.vfx = vfx;
    this.hooks = hooks;
    this.shadows = shadows;
    this.enemies = [];
    this.pool = [];
    this._box = new THREE.Box3();
    this.active = true;
    this._buildTemplate();
  }

  _buildTemplate() {
    const src = this.assets.soldier;
    const tpl = src.clone(true);
    // 只保留最高精度 LOD（6298 面），隐藏另外两级低模
    const meshes = [];
    tpl.traverse((o) => { if (o.isMesh) meshes.push(o); });
    let best = null, bestCount = -1;
    for (const m of meshes) {
      const c = m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
      if (c > bestCount) { bestCount = c; best = m; }
    }
    for (const m of meshes) { m.visible = m === best; }
    meshes.forEach((m) => { if (m !== best) m.parent && (m.parent.visible = false); });

    // 资产为 Z-up：旋转到 Y-up 并归一化到 1.8m
    const holder = new THREE.Group();
    tpl.rotation.x = -Math.PI / 2;
    holder.add(tpl);
    holder.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(holder);
    const h = bb.max.y - bb.min.y;
    const s = 1.8 / Math.max(0.001, h);
    tpl.scale.multiplyScalar(s);
    holder.updateMatrixWorld(true);
    const bb2 = new THREE.Box3().setFromObject(holder);
    const c = bb2.getCenter(new THREE.Vector3());
    tpl.position.x -= c.x; tpl.position.z -= c.z; tpl.position.y -= bb2.min.y;
    holder.updateMatrixWorld(true);

    this.template = holder;
  }

  spawn(playerPos, difficulty = 1) {
    const cfg = ENEMY_GUNS[Math.floor(Math.random() * ENEMY_GUNS.length)];
    let spawn = null;
    if (this.level.spawnPoints.length) {
      let bestD = -1;
      for (let i = 0; i < 8; i++) {
        const p = this.level.spawnPoints[Math.floor(Math.random() * this.level.spawnPoints.length)];
        const d = p.distanceTo(playerPos);
        if (d > 22 && d < 90 && d > bestD) { bestD = d; spawn = p; }
      }
      if (!spawn) spawn = this.level.spawnPoints[Math.floor(Math.random() * this.level.spawnPoints.length)];
    }
    if (!spawn) {
      const b = this.level.bounds;
      spawn = new THREE.Vector3(THREE.MathUtils.lerp(b.minX, b.maxX, Math.random()), this.level.floorY + 0.1, THREE.MathUtils.lerp(b.minZ, b.maxZ, Math.random()));
    }
    const e = new Enemy(this, this.template, cfg, spawn, {
      health: 80 + difficulty * 14,
      speed: 2.2 + Math.min(1.6, difficulty * 0.14),
    });
    this.enemies.push(e);
    return e;
  }

  _recycle(e) {
    this.scene.remove(e.group);
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  clear() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.enemies.length = 0;
  }

  get aliveCount() {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    return n;
  }

  update(dt) {
    if (!this.active) return;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt);
    }
  }

  // 供武器命中检测
  raycast(origin, dir, far) {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const hit = slabRay(origin, dir, e.box(this._box), far);
      if (hit && (!best || hit.distance < best.distance)) {
        const isHead = hit.point.y > e.position.y + e.height * 0.82;
        best = { ...hit, enemy: e, isHead };
      }
    }
    return best;
  }
}
