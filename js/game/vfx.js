import * as THREE from 'three';

// ============================================================
//  VFX：资产包中没有特效贴图，这里全部程序化生成
//  （枪口火焰 / 曳光弹 / 弹孔贴花 / 火花 / 血雾 / 飘雪）
// ============================================================

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function texFlash() {
  return canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const cx = s / 2;
    const grd = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grd.addColorStop(0, 'rgba(255,255,235,1)');
    grd.addColorStop(0.25, 'rgba(255,214,140,0.95)');
    grd.addColorStop(0.55, 'rgba(255,140,50,0.45)');
    grd.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.fill();
    // 星形光芒
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,230,180,0.9)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineWidth = 3 + Math.random() * 4;
      g.beginPath(); g.moveTo(cx, cx);
      g.lineTo(cx + Math.cos(a) * cx * 0.95, cx + Math.sin(a) * cx * 0.95); g.stroke();
    }
  });
}

function texSoftDot(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(64, (g, s) => {
    const cx = s / 2;
    const grd = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
}

function texHole(ring, core, snow) {
  return canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const cx = s / 2;
    if (snow) {
      // 雪地弹孔：外圈翻起的雪
      const grd = g.createRadialGradient(cx, cx, 2, cx, cx, cx * 0.92);
      grd.addColorStop(0, 'rgba(20,18,22,0.95)');
      grd.addColorStop(0.22, 'rgba(40,38,44,0.8)');
      grd.addColorStop(0.42, 'rgba(226,236,244,0.85)');
      grd.addColorStop(0.7, 'rgba(210,224,236,0.30)');
      grd.addColorStop(1, 'rgba(210,224,236,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.fill();
    } else {
      const grd = g.createRadialGradient(cx, cx, 1, cx, cx, cx * 0.6);
      grd.addColorStop(0, core);
      grd.addColorStop(0.5, 'rgba(10,10,12,0.85)');
      grd.addColorStop(0.75, ring);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(cx, cx, cx * 0.7, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(190,195,205,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2, r = cx * 0.35 + Math.random() * cx * 0.35;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.5, cx + Math.sin(a) * r * 0.5);
        g.lineTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r); g.stroke();
      }
    }
  });
}

// ---------------- 粒子池 ----------------
const PARTICLE_VS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor;
uniform float uScale;
void main(){
  vAlpha = aAlpha; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
}`;
const PARTICLE_FS = `
uniform sampler2D uTex;
varying float vAlpha; varying vec3 vColor;
void main(){
  vec4 t = texture2D(uTex, gl_PointCoord);
  if (t.a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor, t.a * vAlpha);
}`;

class ParticlePool {
  constructor(count, tex, blending, scene) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.grav = new Float32Array(count);
    this.drag = new Float32Array(count);
    this.cursor = 0;
    this.active = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: { value: 600 } },
      vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    scene.add(this.points);
  }

  emit(p, v, color, size, life, { gravity = -6, drag = 1.5 } = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const i3 = i * 3;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = v.x; this.vel[i3 + 1] = v.y; this.vel[i3 + 2] = v.z;
    this.col[i3] = color.r; this.col[i3 + 1] = color.g; this.col[i3 + 2] = color.b;
    this.size[i] = size;
    this.life[i] = life; this.maxLife[i] = life;
    this.alpha[i] = 1;
    this.grav[i] = gravity; this.drag[i] = drag;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; any = true; } continue; }
      any = true;
      this.life[i] -= dt;
      const i3 = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= d; this.vel[i3 + 2] *= d;
      this.vel[i3 + 1] = this.vel[i3 + 1] * d + this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = t * t;
      if (this.life[i] <= 0) this.alpha[i] = 0;
    }
    if (any) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aAlpha.needsUpdate = true;
      this.geo.attributes.aColor.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
    }
  }
}

// ---------------- VFX 主类 ----------------
export class VFX {
  constructor(scene, camera, quality = 'high') {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;

    this.texFlash = texFlash();
    this.texSpark = texSoftDot('rgba(255,240,200,1)', 'rgba(255,120,20,0)');
    this.texSmoke = texSoftDot('rgba(190,200,210,0.75)', 'rgba(160,170,180,0)');
    this.texSnow = texSoftDot('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.texSnowHole = texHole(null, null, true);
    this.texMetalHole = texHole('rgba(120,130,145,0.6)', 'rgba(255,255,255,0.9)', false);
    this.texBloodHole = texHole('rgba(120,10,10,0.6)', 'rgba(180,20,20,0.9)', false);

    this.sparks = new ParticlePool(quality === 'low' ? 160 : 420, this.texSpark, THREE.AdditiveBlending, scene);
    this.smoke = new ParticlePool(quality === 'low' ? 60 : 160, this.texSmoke, THREE.NormalBlending, scene);
    this.snow = new ParticlePool(quality === 'low' ? 260 : quality === 'medium' ? 500 : 900, this.texSnow, THREE.NormalBlending, scene);

    // 枪口火光
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texFlash, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true,
    }));
    this.flash.visible = false;
    this.flash.frustumCulled = false;
    scene.add(this.flash);
    this._flashT = 0;

    this.muzzleLight = new THREE.PointLight(0xffc070, 0, 9, 2);
    this.muzzleLight.castShadow = false;
    scene.add(this.muzzleLight);
    this._lightT = 0;

    // 曳光弹池
    this.tracers = [];
    const tGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    tGeo.translate(0, 0.5, 0);
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({
        color: 0xffd27a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      this.tracers.push({ mesh: m, t: 0 });
    }
    this._tracerCursor = 0;

    // 弹孔贴花池
    this.decals = [];
    this._decalCursor = 0;
    this._decalMax = quality === 'low' ? 24 : quality === 'medium' ? 40 : 64;
    const dGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < this._decalMax; i++) {
      const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({
        map: this.texMetalHole, transparent: true, depthWrite: false, opacity: 0.95,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }));
      m.visible = false;
      scene.add(m);
      this.decals.push({ mesh: m, life: 0 });
    }

    this._snowBox = new THREE.Vector3(70, 34, 70);
    this._v = new THREE.Vector3();
    this._snowAcc = 0;
    this.enableSnow = true;
    this._initSnow();
  }

  setQuality(q) { this.quality = q; }

  _initSnow() {
    for (let i = 0; i < this.snow.count; i++) {
      const p = new THREE.Vector3(
        (Math.random() - 0.5) * this._snowBox.x, Math.random() * this._snowBox.y, (Math.random() - 0.5) * this._snowBox.z);
      this._v.set((Math.random() - 0.5) * 0.8, -0.6 - Math.random() * 0.8, (Math.random() - 0.5) * 0.8);
      this.snow.emit(p, this._v, new THREE.Color(0xffffff), 0.05 + Math.random() * 0.1, 1e9, { gravity: 0, drag: 0 });
      // life 常驻：用 1e9 表示不消失，靠位置循环
      this.snow.life[i] = 1e9; this.snow.maxLife[i] = 1e9; this.snow.alpha[i] = 0.75;
    }
    this.snow.geo.attributes.aAlpha.needsUpdate = true;
  }

  _updateSnow(dt, camPos) {
    if (!this.enableSnow) return;
    const n = this.snow.count;
    const bx = this._snowBox.x / 2, bz = this._snowBox.z / 2;
    this._snowAcc += dt;
    const sway = performance.now() * 0.0006;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      this.posFall(this.snow, i, i3, dt, sway);
      // 环绕相机
      if (this.snow.pos[i3 + 1] < camPos.y - 6) this.snow.pos[i3 + 1] += this._snowBox.y;
      if (this.snow.pos[i3] < camPos.x - bx) this.snow.pos[i3] += this._snowBox.x;
      if (this.snow.pos[i3] > camPos.x + bx) this.snow.pos[i3] -= this._snowBox.x;
      if (this.snow.pos[i3 + 2] < camPos.z - bz) this.snow.pos[i3 + 2] += this._snowBox.z;
      if (this.snow.pos[i3 + 2] > camPos.z + bz) this.snow.pos[i3 + 2] -= this._snowBox.z;
    }
    this.snow.geo.attributes.position.needsUpdate = true;
  }

  posFall(pool, i, i3, dt, sway) {
    pool.pos[i3 + 1] += pool.vel[i3 + 1] * dt;
    pool.pos[i3] += (pool.vel[i3] + Math.sin(sway + i * 0.7) * 0.5) * dt;
    pool.pos[i3 + 2] += (pool.vel[i3 + 2] + Math.cos(sway + i * 0.5) * 0.5) * dt;
  }

  update(dt, camPos) {
    this.sparks.update(dt);
    this.smoke.update(dt);
    this._updateSnow(dt, camPos);

    if (this._flashT > 0) {
      this._flashT -= dt;
      const k = Math.max(0, this._flashT / 0.055);
      this.flash.material.opacity = k;
      this.flash.scale.multiplyScalar(1 + dt * 6);
      if (this._flashT <= 0) this.flash.visible = false;
    }
    if (this._lightT > 0) {
      this._lightT -= dt;
      this.muzzleLight.intensity = Math.max(0, this._lightT / 0.06) * 22;
      if (this._lightT <= 0) this.muzzleLight.intensity = 0;
    }

    for (const t of this.tracers) {
      if (t.t <= 0) continue;
      t.t -= dt;
      t.mesh.material.opacity = Math.max(0, t.t / 0.09);
      if (t.t <= 0) t.mesh.visible = false;
    }
    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) d.mesh.visible = false;
    }
  }

  muzzleFlash(pos, dir, scale = 1) {
    this.flash.visible = true;
    this.flash.position.copy(pos);
    const s = 0.4 * scale;
    this.flash.scale.set(s, s, s);
    this.flash.material.opacity = 1;
    this._flashT = 0.055;

    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 22;
    this._lightT = 0.06;

    // 火花
    for (let i = 0; i < (this.quality === 'low' ? 3 : 6); i++) {
      const v = dir.clone().multiplyScalar(6 + Math.random() * 9);
      v.x += (Math.random() - 0.5) * 4; v.y += (Math.random() - 0.5) * 4; v.z += (Math.random() - 0.5) * 4;
      this.sparks.emit(pos, v, new THREE.Color(0xffc060), 0.06 + Math.random() * 0.05, 0.12 + Math.random() * 0.12, { gravity: -8, drag: 3 });
    }
    // 硝烟
    for (let i = 0; i < 2; i++) {
      const v = dir.clone().multiplyScalar(0.6 + Math.random()).add(new THREE.Vector3((Math.random() - .5) * .5, 0.5 + Math.random() * .4, (Math.random() - .5) * .5));
      this.smoke.emit(pos, v, new THREE.Color(0xb9c4cf), 0.28 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, { gravity: 0.4, drag: 1.2 });
    }
  }

  tracer(from, to, color, width = 0.05) {
    const t = this.tracers[this._tracerCursor];
    this._tracerCursor = (this._tracerCursor + 1) % this.tracers.length;
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.05) return;
    dir.normalize();
    t.mesh.position.copy(from);
    t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    t.mesh.scale.set(width, len, width);
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 0.75;
    t.mesh.visible = true;
    t.t = 0.09;
  }

  impact(point, normal, type = 'snow') {
    const mat = type === 'snow' ? this.texSnowHole : type === 'blood' ? this.texBloodHole : this.texMetalHole;
    const d = this.decals[this._decalCursor];
    this._decalCursor = (this._decalCursor + 1) % this.decals.length;
    d.mesh.material.map = mat;
    d.mesh.material.needsUpdate = true;
    const size = 0.18 + Math.random() * 0.14;
    d.mesh.scale.set(size, size, size);
    d.mesh.position.copy(point).addScaledVector(normal, 0.012);
    const look = point.clone().add(normal);
    d.mesh.lookAt(look);
    d.mesh.rotateZ(Math.random() * Math.PI * 2);
    d.mesh.visible = true;
    d.life = 14;

    const col = type === 'snow' ? new THREE.Color(0xf2f7fb) : type === 'blood' ? new THREE.Color(0x8f1414) : new THREE.Color(0xc9ccd2);
    for (let i = 0; i < (this.quality === 'low' ? 4 : 9); i++) {
      const v = normal.clone().multiplyScalar(1.6 + Math.random() * 3);
      v.x += (Math.random() - .5) * 2.6; v.y += (Math.random() - .5) * 2.6 + 0.7; v.z += (Math.random() - .5) * 2.6;
      this.smoke.emit(point, v, col, 0.08 + Math.random() * 0.1, 0.3 + Math.random() * 0.35, { gravity: type === 'snow' ? -2 : -7, drag: 2.2 });
    }
    if (type === 'metal') {
      for (let i = 0; i < 5; i++) {
        const v = normal.clone().multiplyScalar(3 + Math.random() * 5).add(new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 3, (Math.random() - .5) * 4));
        this.sparks.emit(point, v, new THREE.Color(0xffb040), 0.05, 0.16 + Math.random() * 0.2, { gravity: -12, drag: 2.5 });
      }
    }
  }

  bloodBurst(point, dir) {
    for (let i = 0; i < 12; i++) {
      const v = dir.clone().multiplyScalar(2 + Math.random() * 5).add(new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 3, (Math.random() - .5) * 4));
      this.sparks.emit(point, v, new THREE.Color(0x9c1010), 0.07 + Math.random() * 0.07, 0.35 + Math.random() * 0.3, { gravity: -10, drag: 1.4 });
    }
  }
}
