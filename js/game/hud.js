// ============================================================
//  HUD / 菜单 UI 控制
// ============================================================
const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      hud: $('hud'), healthNum: $('health-num'), healthFill: $('health-fill'),
      armorFill: $('armor-fill'), ammoMag: $('ammo-mag'), ammoRes: $('ammo-reserve'),
      weaponName: $('weapon-name'), waveNum: $('wave-num'), enemyCount: $('enemy-count'),
      killCount: $('kill-count'), score: $('score'), fps: $('fps'),
      hitmarker: $('hitmarker'), damageFlash: $('damage-flash'), killfeed: $('killfeed'),
      waveBanner: $('wave-banner'), reloadHint: $('reload-hint'), reloadFill: $('reload-fill'),
      chs: [document.querySelector('.ch-t'), document.querySelector('.ch-b'), document.querySelector('.ch-l'), document.querySelector('.ch-r')],
      loading: $('loading'), loadBar: $('load-bar'), loadText: $('load-text'),
      menu: $('menu'), pause: $('pause'), gameover: $('gameover'),
      goWave: $('go-wave'), goKills: $('go-kills'), goScore: $('go-score'),
      wpnBtns: [...document.querySelectorAll('.wpn-btn')],
    };
    this._gap = 6;
    this._lastHealth = -1;
  }

  showLoading(show) { this.el.loading.classList.toggle('hidden', !show); }
  setLoading(p, text) {
    this.el.loadBar.style.width = `${Math.round(p * 100)}%`;
    if (text) this.el.loadText.textContent = text;
  }

  showHUD(v) { this.el.hud.classList.toggle('hidden', !v); }
  showMenu(v) { this.el.menu.classList.toggle('hidden', !v); }
  showPause(v) { this.el.pause.classList.toggle('hidden', !v); }
  showGameOver(v) { this.el.gameover.classList.toggle('hidden', !v); }

  setHealth(h, max, armor) {
    h = Math.max(0, Math.round(h));
    if (h !== this._lastHealth) {
      this.el.healthNum.textContent = h;
      const pct = (h / max) * 100;
      this.el.healthFill.style.width = `${pct}%`;
      this.el.healthFill.style.background = h < 30
        ? 'linear-gradient(90deg,#a82f2f,#ff5f5f)'
        : 'linear-gradient(90deg,#2fae7a,#4ce0a0)';
      this._lastHealth = h;
    }
    this.el.armorFill.style.width = `${Math.max(0, Math.min(100, armor))}%`;
  }

  setAmmo(mag, reserve, name) {
    this.el.ammoMag.textContent = mag;
    this.el.ammoRes.textContent = reserve;
    this.el.ammoMag.classList.toggle('low', mag > 0 && mag <= 6);
    this.el.ammoMag.classList.toggle('empty', mag === 0);
    if (name) this.el.weaponName.textContent = name;
  }

  setWeaponActive(slot) {
    this.el.wpnBtns.forEach((b) => b.classList.toggle('active', +b.dataset.slot === slot));
  }

  setWave(n, remaining) {
    this.el.waveNum.textContent = n;
    this.el.enemyCount.textContent = remaining;
  }

  setScore(kills, score) {
    this.el.killCount.textContent = kills;
    this.el.score.textContent = score;
  }

  setFps(v) { this.el.fps.textContent = Math.round(v); }

  setSpread(spreadDeg) {
    const gap = Math.min(26, 5 + spreadDeg * 3.0);
    this._gap += (gap - this._gap) * 0.35;
    const g = this._gap;
    this.el.chs[0].style.transform = `translateY(${-g}px)`;
    this.el.chs[1].style.transform = `translateY(${g}px)`;
    this.el.chs[2].style.transform = `translateX(${-g}px)`;
    this.el.chs[3].style.transform = `translateX(${g}px)`;
  }

  hitmarker(kill) {
    const hm = this.el.hitmarker;
    hm.classList.toggle('kill', !!kill);
    hm.classList.remove('show');
    void hm.offsetWidth;
    hm.classList.add('show');
  }

  damage() {
    const f = this.el.damageFlash;
    f.style.opacity = '1';
    clearTimeout(this._dmgT);
    this._dmgT = setTimeout(() => { f.style.opacity = '0'; }, 90);
  }

  killFeed(text) {
    const d = document.createElement('div');
    d.className = 'kf';
    d.innerHTML = text;
    this.el.killfeed.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .3s'; setTimeout(() => d.remove(), 320); }, 2600);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.firstChild.remove();
  }

  waveBanner(title, sub) {
    const b = this.el.waveBanner;
    b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;
    b.classList.add('show');
    setTimeout(() => b.classList.add('hidden'), 2300);
  }

  reload(progress, active) {
    this.el.reloadHint.classList.toggle('hidden', !active);
    if (active) this.el.reloadFill.style.width = `${Math.round(progress * 100)}%`;
  }

  gameOver(wave, kills, score) {
    this.el.goWave.textContent = wave;
    this.el.goKills.textContent = kills;
    this.el.goScore.textContent = score;
  }
}
