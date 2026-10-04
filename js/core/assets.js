import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPONS, ENEMY_GUNS } from '../data/weapons.js';

// ============================================================
//  资产加载器：全部离线本地资源，几何体保持原始精度
// ============================================================
export class AssetManager {
  constructor() {
    this.manager = new THREE.LoadingManager();
    this.gltf = new GLTFLoader(this.manager);
    this.tex = new THREE.TextureLoader(this.manager);
    this.skybox = {};
    this.weapons = {};
    this.env = null;
    this.arms = null;
    this.armsClips = [];
    this.soldier = null;
    this.soldierClips = [];
  }

  _glb(url) {
    return new Promise((res, rej) => this.gltf.load(url, res, undefined, rej));
  }

  _tex(url) {
    return new Promise((res, rej) => this.tex.load(url, res, undefined, rej));
  }

  async loadAll(onProgress) {
    const steps = [];
    const push = (label, fn) => steps.push({ label, fn });

    push('加载雪原站场关卡', async () => {
      const g = await this._glb('./assets/models/env.glb');
      this.env = g.scene;
    });
    push('加载第一人称手臂骨架', async () => {
      const g = await this._glb('./assets/models/arms.glb');
      this.arms = g.scene;
      this.armsClips = g.animations || [];
    });
    push('加载士兵模型', async () => {
      const g = await this._glb('./assets/models/soldier/scene.gltf');
      this.soldier = g.scene;
      this.soldierClips = g.animations || [];
    });
    push('加载天空全景', async () => {
      for (const k of ['sky_day_dusk', 'sky_overcast', 'sky_storm', 'sky_dawn']) {
        const t = await this._tex(`./assets/textures/skybox/${k}.png`);
        this.skybox[k] = t;
      }
    });
    push('加载武器（原始几何体）', async () => {
      const all = new Set();
      WEAPONS.forEach((w) => all.add(w.model));
      ENEMY_GUNS.forEach((w) => all.add(w.model));
      const arr = [...all];
      await Promise.all(
        arr.map(async (m) => {
          const g = await this._glb(`./assets/models/weapons/${m}.glb`);
          this.weapons[m] = g.scene;
        })
      );
    });

    let done = 0;
    for (const s of steps) {
      if (onProgress) onProgress(done / steps.length, s.label);
      await s.fn();
      done++;
      if (onProgress) onProgress(done / steps.length, s.label);
    }
    if (onProgress) onProgress(1, '就绪');
  }
}

// ---- 工具：克隆带骨骼的模型（SkeletonUtils 精简版） ----
export function cloneSkinned(source) {
  const sourceLookup = new Map();
  const cloneLookup = new Map();
  const clone = source.clone();

  parallelTraverse(source, clone, (a, b) => {
    sourceLookup.set(b, a);
    cloneLookup.set(a, b);
  });

  clone.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const cloneMesh = node;
    const sourceMesh = sourceLookup.get(node);
    const sourceBones = sourceMesh.skeleton.bones;
    cloneMesh.skeleton = sourceMesh.skeleton.clone();
    cloneMesh.bindMatrix.copy(sourceMesh.bindMatrix);
    cloneMesh.skeleton.bones = sourceBones.map((b) => cloneLookup.get(b));
    cloneMesh.bind(cloneMesh.skeleton, cloneMesh.bindMatrix);
  });
  return clone;
}

function parallelTraverse(a, b, cb) {
  cb(a, b);
  for (let i = 0; i < a.children.length; i++) {
    parallelTraverse(a.children[i], b.children[i], cb);
  }
}
