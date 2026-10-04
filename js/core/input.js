import * as THREE from 'three';

// ============================================================
//  输入：手机触控（左摇杆 / 右半屏划屏 / 按键）+ 电脑键鼠
// ============================================================
export class Input {
  constructor() {
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.move = new THREE.Vector2(0, 0);      // x: 右为正  y: 前为正
    this._look = { x: 0, y: 0 };
    this.actions = { fire: false, aim: false, jump: false, sprint: false, reload: false };
    this.sensitivity = 1.0;
    this.enabled = false;
    this.lefty = false;

    this.onWeapon = null;
    this.onPause = null;

    this._keys = {};
    this._joyId = null;
    this._joyCenter = new THREE.Vector2();
    this._joyVec = new THREE.Vector2();
    this._lookId = null;
    this._lookLast = new THREE.Vector2();
    this._dom = {};

    this._bindDom();
    this._bindKeyboard();
    this._bindMouse();
    if (this.isTouch) this._bindTouch();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.move.set(0, 0);
      this.actions.fire = false;
      this._joyId = null;
      this._lookId = null;
      this._joyVec.set(0, 0);
      this._applyKnob();
    }
  }

  _bindDom() {
    const $ = (id) => document.getElementById(id);
    this._dom = {
      joyBase: $('joy-base'), joyKnob: $('joy-knob'), lookZone: $('look-zone'),
      fire: $('btn-fire'), aim: $('btn-aim'), reload: $('btn-reload'),
      jump: $('btn-jump'), sprint: $('btn-sprint'),
    };
  }

  _hold(el, name) {
    if (!el) return;
    const down = (e) => { if (!this.enabled) return; e.preventDefault(); this.actions[name] = true; el.classList.add('on'); };
    const up = (e) => { this.actions[name] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  _bindTouch() {
    const d = this._dom;
    this._hold(d.aim, 'aim');
    this._hold(d.sprint, 'sprint');
    if (d.jump) d.jump.addEventListener('pointerdown', (e) => { if (!this.enabled) return; e.preventDefault(); this.actions.jump = true; d.jump.classList.add('on'); setTimeout(() => { this.actions.jump = false; d.jump.classList.remove('on'); }, 120); });
    if (d.reload) d.reload.addEventListener('pointerdown', (e) => { if (!this.enabled) return; e.preventDefault(); this.actions.reload = true; d.reload.classList.add('on'); setTimeout(() => { this.actions.reload = false; d.reload.classList.remove('on'); }, 120); });
    this._hold(d.fire, 'fire');

    document.querySelectorAll('.wpn-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.onWeapon) this.onWeapon(+b.dataset.slot); });
    });

    // ---- 摇杆 ----
    const base = d.joyBase;
    const startJoy = (e) => {
      if (!this.enabled || this._joyId !== null) return;
      e.preventDefault();
      this._joyId = e.pointerId;
      const r = base.getBoundingClientRect();
      this._joyCenter.set(r.left + r.width / 2, r.top + r.height / 2);
      this._moveJoy(e.clientX, e.clientY, r.width / 2);
    };
    base.addEventListener('pointerdown', startJoy);

    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === this._joyId) {
        const r = base.getBoundingClientRect();
        this._moveJoy(e.clientX, e.clientY, r.width / 2);
      } else if (e.pointerId === this._lookId) {
        const dx = e.clientX - this._lookLast.x;
        const dy = e.clientY - this._lookLast.y;
        this._lookLast.set(e.clientX, e.clientY);
        this._look.x += dx;
        this._look.y += dy;
      }
    }, { passive: false });
    const endPtr = (e) => {
      if (e.pointerId === this._joyId) { this._joyId = null; this._joyVec.set(0, 0); this.move.set(0, 0); this._applyKnob(); }
      if (e.pointerId === this._lookId) { this._lookId = null; }
    };
    window.addEventListener('pointerup', endPtr);
    window.addEventListener('pointercancel', endPtr);

    // ---- 视角划屏 ----
    const lz = d.lookZone;
    lz.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this._lookId !== null) return;
      e.preventDefault();
      this._lookId = e.pointerId;
      this._lookLast.set(e.clientX, e.clientY);
    });
    if (d.fire) d.fire.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _moveJoy(cx, cy, radius) {
    let dx = cx - this._joyCenter.x;
    let dy = cy - this._joyCenter.y;
    const len = Math.hypot(dx, dy);
    const max = radius * 0.95;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    this._joyVec.set(dx / max, dy / max);
    this.move.set(this._joyVec.x, -this._joyVec.y);
    this._applyKnob();
  }

  _applyKnob() {
    const k = this._dom.joyKnob;
    if (!k) return;
    const R = 37;
    k.style.transform = `translate(${this._joyVec.x * R}px, ${this._joyVec.y * R}px)`;
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this._keys[e.code] = true;
      if (!this.enabled) return;
      if (e.code === 'KeyR') this.actions.reload = true;
      if (e.code === 'KeyR') setTimeout(() => (this.actions.reload = false), 120);
      if (e.code === 'Digit1') this.onWeapon && this.onWeapon(0);
      if (e.code === 'Digit2') this.onWeapon && this.onWeapon(1);
      if (e.code === 'Digit3') this.onWeapon && this.onWeapon(2);
      if (e.code === 'Digit4') this.onWeapon && this.onWeapon(3);
      if (e.code === 'Digit5') this.onWeapon && this.onWeapon(4);
      if (e.code === 'Escape') this.onPause && this.onPause();
      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this._keys[e.code] = false; });
    window.addEventListener('blur', () => { this._keys = {}; this.actions.fire = false; this.actions.aim = false; });
  }

  _bindMouse() {
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement !== canvas) { canvas.requestPointerLock(); return; }
      if (e.button === 0) this.actions.fire = true;
      if (e.button === 2) this.actions.aim = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.actions.fire = false;
      if (e.button === 2) this.actions.aim = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.isTouch) return;
      if (document.pointerLockElement === canvas) {
        this._look.x += e.movementX;
        this._look.y += e.movementY;
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.enabled) this.actions.jump = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.actions.jump = false;
    });
  }

  // 每帧调用：合成键鼠移动向量
  sample() {
    if (!this.isTouch) {
      let x = 0, y = 0;
      if (this._keys['KeyW']) y += 1;
      if (this._keys['KeyS']) y -= 1;
      if (this._keys['KeyD']) x += 1;
      if (this._keys['KeyA']) x -= 1;
      this.move.set(x, y);
      this.actions.sprint = !!(this._keys['ShiftLeft'] || this._keys['ShiftRight']);
    } else {
      if (this.lefty) {
        // 左手模式：摇杆与划屏区域镜像（由 CSS 处理位置，这里交换语义）
      }
    }
  }

  consumeLook() {
    const s = this._look;
    this._look = { x: 0, y: 0 };
    return s;
  }
}
