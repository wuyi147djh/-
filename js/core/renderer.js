import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const QUALITY = {
  low:    { pr: 0.65, shadows: 0,    bloom: false, aa: false, exposure: 1.02, fog: 0.0075 },
  medium: { pr: 0.9,  shadows: 1024, bloom: false, aa: true,  exposure: 1.05, fog: 0.006 },
  high:   { pr: 1.35, shadows: 2048, bloom: true,  aa: true,  exposure: 1.08, fog: 0.005 },
  ultra:  { pr: 2.0,  shadows: 4096, bloom: true,  aa: true,  exposure: 1.1,  fog: 0.0045 },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, powerPreference: 'high-performance',
      stencil: false, depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0a0f14, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 1400);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();

    this.composer = null;
    this.passes = {};
    this.quality = 'high';
    this._maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.resize();
  }

  setSky(tex, opts = {}) {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this._maxAniso);
    const env = this.pmrem.fromEquirectangular(tex).texture;
    this.scene.environment = env;
    this.scene.background = tex;
    this.scene.backgroundBlurriness = opts.blur ?? 0.0;
    this.scene.backgroundIntensity = opts.intensity ?? 1.0;
    this._skyColor = opts.fogColor != null ? new THREE.Color(opts.fogColor) : new THREE.Color(0x9fb4c4);
    this._applyFog();
    this._teardownComposer();
    return env;
  }

  _applyFog() {
    const q = QUALITY[this.quality];
    if (!this._skyColor) return;
    this.scene.fog = new THREE.FogExp2(this._skyColor.getHex(), q.fog);
  }

  setQuality(level) {
    if (!QUALITY[level]) level = 'high';
    this.quality = level;
    const q = QUALITY[level];
    this.renderer.toneMappingExposure = q.exposure;
    this.renderer.shadowMap.enabled = q.shadows > 0;
    if (q.shadows > 0) {
      this.renderer.shadowMap.type = level === 'medium' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    }
    if (this._sun) {
      this._sun.castShadow = q.shadows > 0;
      if (q.shadows > 0) {
        this._sun.shadow.mapSize.set(q.shadows, q.shadows);
        if (this._sun.shadow.map) { this._sun.shadow.map.dispose(); this._sun.shadow.map = null; }
      }
    }
    this._applyFog();
    this._teardownComposer();
    this.resize();
  }

  setSun(light) {
    this._sun = light;
    this.setQuality(this.quality);
  }

  _teardownComposer() {
    if (!this.composer) return;
    this.composer.renderTarget1?.dispose();
    this.composer.renderTarget2?.dispose();
    this.composer = null;
    this.passes = {};
  }

  _buildComposer() {
    const q = QUALITY[this.quality];
    const w = Math.max(2, this.renderer.domElement.width);
    const h = Math.max(2, this.renderer.domElement.height);
    const c = new EffectComposer(this.renderer);
    c.setSize(w, h);
    const rp = new RenderPass(this.scene, this.camera);
    c.addPass(rp);
    this.passes.render = rp;
    if (q.bloom) {
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.6, 0.92);
      c.addPass(bloom);
      this.passes.bloom = bloom;
    }
    if (q.aa) {
      const smaa = new SMAAPass(w, h);
      c.addPass(smaa);
      this.passes.smaa = smaa;
    }
    c.addPass(new OutputPass());
    this.composer = c;
  }

  resize() {
    const q = QUALITY[this.quality];
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, q.pr);
    this.renderer.setPixelRatio(Math.max(0.5, dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._teardownComposer();
    this._buildComposer();
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._teardownComposer();
    this.pmrem.dispose();
  }
}
