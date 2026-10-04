import * as THREE from 'three';

// ============================================================
//  关卡：加载 "雪原站场"（station-under-siege）原始场景
//  * 几何体 100% 保留（632k 三角面，无减面、无合并、无裁剪）
//  * 自动派生 AABB 碰撞体（供角色/子弹使用，不改动网格本身）
// ============================================================

const GROUND_RE = /(ground|tile|pad|track|ramp|drift|floor|platform|stair|tunnel)/i;
const OBSTACLE_RE = /(habitat|module|corridor|hut|generator|building|wall|clad|container|crate|drum|vehicle|snowcat|skidoo|boulder|transport|mast|tower|tank|rig|winch|dome|emplacement|rack|cradle|heater|tripod|pole|winch|bulkhead|cargo|sled|pallet|flag)/i;

export class Level {
  constructor() {
    this.root = new THREE.Group();
    this.colliders = [];       // {min:Vector3, max:Vector3}
    this.groundMeshes = [];
    this.spawnPoints = [];
    this.bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    this.floorY = 0;
    this.scale = 1;
  }

  groundHeightAt(x, z, from = 60) {
    const ray = new THREE.Ray(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0));
    const hits = this._rc.intersectObjects(this.groundMeshes, false);
    return hits.length ? hits[0].point.y : this.floorY;
  }

  // 水平碰撞：圆 vs AABB 推出；台阶可攀爬
  resolveHorizontal(pos, radius, height, stepHeight = 0.5) {
    const feet = pos.y;
    const head = pos.y + height;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (head < c.min.y || feet > c.max.y) continue;
      // 可攀爬的矮台交给地面逻辑处理
      if (c.max.y - feet <= stepHeight && c.max.y - feet > -0.01) continue;
      const cx = THREE.MathUtils.clamp(pos.x, c.min.x, c.max.x);
      const cz = THREE.MathUtils.clamp(pos.z, c.min.z, c.max.z);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > radius * radius) continue;          // 无重叠
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      } else {
        // 圆心在盒内：沿最小穿透轴推出
        const pxr = c.max.x - pos.x, pxl = pos.x - c.min.x;
        const pzr = c.max.z - pos.z, pzl = pos.z - c.min.z;
        const m = Math.min(pxr, pxl, pzr, pzl);
        if (m === pxr) pos.x = c.max.x + radius;
        else if (m === pxl) pos.x = c.min.x - radius;
        else if (m === pzr) pos.z = c.max.z + radius;
        else pos.z = c.min.z - radius;
      }
    }
  }

  // 站立高度：地面 + 可攀爬平台（使用常量地面高度，避免每帧网格射线）
  supportHeightAt(pos, radius, stepHeight = 0.5) {
    let y = this.floorY;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (pos.x < c.min.x - radius || pos.x > c.max.x + radius) continue;
      if (pos.z < c.min.z - radius || pos.z > c.max.z + radius) continue;
      if (c.max.y <= pos.y + stepHeight && c.max.y > y) y = c.max.y;
    }
    return y;
  }

  // 快速子弹/视线：射线 vs 碰撞体 AABB（slab 法），移动端友好
  raycastColliders(origin, dir, far) {
    let best = null;
    // 地面（解决子弹打空后穿透地面）
    if (dir.y < -1e-4) {
      const t = (this.floorY - origin.y) / dir.y;
      if (t >= 0 && t <= far) {
        best = { distance: t, point: origin.clone().addScaledVector(dir, t), normal: new THREE.Vector3(0, 1, 0), surface: 'snow' };
      }
    }
    const inv = new THREE.Vector3(1 / (dir.x || 1e-8), 1 / (dir.y || 1e-8), 1 / (dir.z || 1e-8));
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      let t1 = (c.min.x - origin.x) * inv.x, t2 = (c.max.x - origin.x) * inv.x;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      let axis = 0, sign = t1 > t2 ? 1 : -1;
      t1 = (c.min.y - origin.y) * inv.y; t2 = (c.max.y - origin.y) * inv.y;
      const ymin = Math.min(t1, t2), ymax = Math.max(t1, t2);
      if (ymin > tmin) { tmin = ymin; axis = 1; sign = t1 > t2 ? 1 : -1; }
      if (ymax < tmax) tmax = ymax;
      t1 = (c.min.z - origin.z) * inv.z; t2 = (c.max.z - origin.z) * inv.z;
      const zmin = Math.min(t1, t2), zmax = Math.max(t1, t2);
      if (zmin > tmin) { tmin = zmin; axis = 2; sign = t1 > t2 ? 1 : -1; }
      if (zmax < tmax) tmax = zmax;
      if (tmax < 0 || tmin > tmax || tmin > far) continue;
      const t = tmin < 0 ? 0 : tmin;
      if (!best || t < best.distance) {
        const point = origin.clone().addScaledVector(dir, t);
        const normal = new THREE.Vector3();
        normal.setComponent(axis, sign);
        best = { distance: t, point, normal, surface: point.y < this.floorY + 0.6 ? 'snow' : 'metal' };
      }
    }
    return best;
  }

  // 视线遮挡检测（子弹 / AI）
  raycast(origin, dir, far, targets) {
    this._ray.set(origin, dir);
    this._ray.far = far;
    const objs = targets || this.collisionMeshes;
    const hits = this._ray.intersectObjects(objs, true);
    return hits.length ? hits[0] : null;
  }

  sampleSpawnPoints(count = 60) {
    const pts = [];
    const { minX, maxX, minZ, maxZ } = this.bounds;
    let guard = 0;
    while (pts.length < count && guard++ < count * 40) {
      const x = THREE.MathUtils.lerp(minX, maxX, Math.random());
      const z = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
      let blocked = false;
      for (const c of this.colliders) {
        if (x > c.min.x - 0.8 && x < c.max.x + 0.8 && z > c.min.z - 0.8 && z < c.max.z + 0.8 && c.max.y - this.floorY > 0.6) { blocked = true; break; }
      }
      if (blocked) continue;
      const y = this.groundHeightAt(x, z, this.floorY + 60);
      if (y < this.floorY - 8) continue;
      pts.push(new THREE.Vector3(x, y, z));
    }
    this.spawnPoints = pts;
    return pts;
  }
}

export async function buildLevel(envScene, opts = {}) {
  const TARGET_SPAN = opts.span || 200;   // 场景最大水平跨度（米）
  const level = new Level();
  level._rc = new THREE.Raycaster();
  level._rc.firstHitOnly = false;
  level._ray = new THREE.Ray();
  level.collisionMeshes = [];

  const root = envScene;
  // ---- 归一化尺寸与位置 ----
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  const size = bb.getSize(new THREE.Vector3());
  const scale = TARGET_SPAN / Math.max(size.x, size.z);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const bb2 = new THREE.Box3().setFromObject(root);
  const c2 = bb2.getCenter(new THREE.Vector3());
  root.position.x -= c2.x;
  root.position.z -= c2.z;
  root.position.y -= bb2.min.y;      // 底部对齐 y=0
  root.updateMatrixWorld(true);
  level.scale = scale;

  const bb3 = new THREE.Box3().setFromObject(root);
  level.bounds = { minX: bb3.min.x, maxX: bb3.max.x, minZ: bb3.min.z, maxZ: bb3.max.z };

  // ---- 遍历：材质修正 + 阴影 + 碰撞分类 ----
  const box = new THREE.Box3();
  const seenBoxes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const m of mats) {
      if (!m) continue;
      // 透射玻璃在移动端代价高：改为普通半透明
      if (m.transmission && m.transmission > 0) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = 0.32;
        m.roughness = 0.12;
        m.thickness = 0;
      }
      m.envMapIntensity = opts.envIntensity ?? 0.9;
    }
    o.receiveShadow = true;
    o.castShadow = false;
    o.frustumCulled = true;

    const name = (o.name || '') + '|' + (o.parent ? o.parent.name : '');
    box.setFromObject(o);
    if (!box.isEmpty()) {
      const s = box.getSize(new THREE.Vector3());
      const isGround = GROUND_RE.test(name);
      if (isGround) {
        level.groundMeshes.push(o);
      } else if (OBSTACLE_RE.test(name) || (s.y > 0.8 && Math.max(s.x, s.z) > 0.6)) {
        // 合并重叠的重复包围盒，减少碰撞体数量
        const dup = seenBoxes.some((b) =>
          Math.abs(b.min.x - box.min.x) < 0.05 && Math.abs(b.min.y - box.min.y) < 0.05 &&
          Math.abs(b.min.z - box.min.z) < 0.05 && Math.abs(b.max.x - box.max.x) < 0.05 &&
          Math.abs(b.max.y - box.max.y) < 0.05 && Math.abs(b.max.z - box.max.z) < 0.05);
        if (!dup) {
          seenBoxes.push(box.clone());
          level.colliders.push({ min: box.min.clone(), max: box.max.clone() });
        }
      }
    }
    level.collisionMeshes.push(o);
  });

  if (opts.groundCastsShadow) {
    level.groundMeshes.forEach((m) => { if (m) m.castShadow = false; });
  }

  // ---- 地面高度 ----
  if (level.groundMeshes.length) {
    const gb = new THREE.Box3().setFromObject(level.groundMeshes[0]);
    if (!gb.isEmpty()) level.floorY = gb.max.y;
    level.groundMeshes.forEach((m) => { const b = new THREE.Box3().setFromObject(m); if (!b.isEmpty()) level.floorY = Math.max(level.floorY, b.max.y); });
    // 取中位数更稳
    const tops = level.groundMeshes.map((m) => new THREE.Box3().setFromObject(m).max.y).sort((a, b) => a - b);
    level.floorY = tops[Math.floor(tops.length / 2)] ?? level.floorY;
  }

  root.name = 'level-root';
  level.root.add(root);
  return level;
}
