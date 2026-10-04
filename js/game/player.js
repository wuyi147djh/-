import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(camera, input, level, audio) {
    this.camera = camera;
    this.input = input;
    this.level = level;
    this.audio = audio;

    this.position = new THREE.Vector3(0, 0, 0);   // 脚底
    this.velocity = new THREE.Vector3();
    this.radius = 0.34;
    this.height = 1.78;
    this.eyeHeight = 1.62;

    this.yaw = 0;
    this.pitch = 0;
    this.aiming = false;

    this.walkSpeed = 4.5;
    this.sprintSpeed = 7.6;
    this.adsSpeed = 2.3;
    this.accel = 42;
    this.friction = 12;
    this.jumpSpeed = 7.4;
    this.gravity = -24;

    this.onGround = false;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 50;
    this.dead = false;

    this.speed = 0;          // 水平速度（供武器摆动）
    this.bobT = 0;
    this._bobY = 0;
    this._bobX = 0;
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._recoilPitch = 0;
    this._recoilYaw = 0;
    this._lastDamage = 0;
  }

  spawnAt(v) {
    this.position.copy(v);
    this.position.y += 0.05;
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.armor = 50;
    this.dead = false;
    this.pitch = 0;
  }

  lookDir(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).multiplyScalar(-1);
    return out.normalize();
  }

  eyePosition(out = new THREE.Vector3()) {
    return out.set(this.position.x, this.position.y + this.eyeHeight + this._bobY, this.position.z);
  }

  addRecoil(pitch, yaw) {
    this._recoilPitch += pitch;
    this._recoilYaw += yaw;
  }

  update(dt) {
    if (this.dead) dt = Math.min(dt, 0.033);
    const inp = this.input;

    // ---------- 视角 ----------
    const look = inp.consumeLook();
    const sens = 0.0022 * inp.sensitivity;
    this.yaw -= look.x * sens;
    this.pitch -= look.y * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.5, 1.5);

    // 后坐力回复
    this._recoilPitch *= Math.exp(-dt * 9);
    this._recoilYaw *= Math.exp(-dt * 9);

    // ---------- 移动方向 ----------
    this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.crossVectors(this._fwd, UP).normalize().multiplyScalar(-1);
    this._desired.set(0, 0, 0);
    if (!this.dead) {
      this._desired.addScaledVector(this._fwd, inp.move.y);
      this._desired.addScaledVector(this._right, -inp.move.x);
      if (this._desired.lengthSq() > 1) this._desired.normalize();
    }

    const wantSprint = inp.actions.sprint && inp.move.y > 0.5 && !this.aiming && !this.dead;
    let target = this.aiming ? this.adsSpeed : wantSprint ? this.sprintSpeed : this.walkSpeed;
    this._desired.multiplyScalar(target);

    // 加速度 / 摩擦
    const a = this.onGround ? this.accel : this.accel * 0.35;
    this.velocity.x += (this._desired.x - this.velocity.x) * Math.min(1, a * dt);
    this.velocity.z += (this._desired.z - this.velocity.z) * Math.min(1, a * dt);
    if (this.onGround && this._desired.lengthSq() < 1e-4) {
      const f = Math.min(1, this.friction * dt);
      this.velocity.x *= 1 - f;
      this.velocity.z *= 1 - f;
    }

    // 跳跃 & 重力
    if (inp.actions.jump && this.onGround && !this.dead) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }
    this.velocity.y += this.gravity * dt;

    // ---------- 位置积分 + 碰撞 ----------
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.level.resolveHorizontal(this.position, this.radius, this.height, 0.5);

    this.position.y += this.velocity.y * dt;
    const support = this.level.supportHeightAt(this.position, this.radius * 0.8, 0.5);
    if (this.position.y <= support) {
      if (this.velocity.y < -6) { /* 落地 */ }
      this.position.y = support;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // 边界限制
    const b = this.level.bounds;
    this.position.x = THREE.MathUtils.clamp(this.position.x, b.minX + 1, b.maxX - 1);
    this.position.z = THREE.MathUtils.clamp(this.position.z, b.minZ + 1, b.maxZ - 1);

    // ---------- 相机抖动 / 脚步声 ----------
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    const bobAmp = this.aiming ? 0.006 : 0.032;
    if (this.onGround && this.speed > 0.6) {
      this.bobT += dt * this.speed * 1.5;
      this._bobY = Math.sin(this.bobT * 2) * bobAmp;
      this._bobX = Math.cos(this.bobT) * bobAmp * 0.7;
      if (this.audio) this.audio.footstep(Math.min(1, this.speed / this.sprintSpeed));
    } else {
      this._bobY *= Math.exp(-dt * 8);
      this._bobX *= Math.exp(-dt * 8);
    }

    // ---------- 应用到相机 ----------
    const eye = this.eyePosition();
    this.camera.position.copy(eye);
    this.camera.position.x += this._bobX * Math.cos(this.yaw);
    this.camera.position.z -= this._bobX * Math.sin(this.yaw);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this._recoilYaw;
    this.camera.rotation.x = this.pitch + this._recoilPitch;
    // 受伤抖动
    const tNow = performance.now() / 1000;
    const shake = Math.max(0, 1 - (tNow - this._lastDamage) * 1.6) * 0.05;
    if (shake > 0.001) {
      this.camera.rotation.z += (Math.random() - 0.5) * shake;
      this.camera.rotation.x += (Math.random() - 0.5) * shake;
    }
    this.camera.rotation.z += this._bobX * 0.35;
  }

  takeDamage(amount) {
    if (this.dead) return false;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.health = Math.max(0, this.health - dmg);
    this._lastDamage = performance.now() / 1000;
    if (this.health <= 0) { this.dead = true; return true; }
    return false;
  }
}
