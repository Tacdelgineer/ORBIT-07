import { formatTime, wrap } from './config.js';
const $ = (id) => document.getElementById(id);
export class HUD {
  constructor(track) {
    this.track = track;
    this.lastMode = null;
    this.messageUntil = 0;
    this.lastCountdown = '';
    this.map = $('map');
    this.ctx = this.map.getContext('2d');
    this.nodes = {};
    for (const id of [
      'speed',
      'position',
      'position-caption',
      'lap',
      'timer',
      'best-lap',
      'boost-value',
      'boost-fill',
      'boost-state',
      'checkpoint',
      'impact',
    ])
      this.nodes[id] = $(id);
    this.bars = Array.from({ length: 16 }, () => {
      const el = document.createElement('i');
      $('speed-bars').append(el);
      return el;
    });
    this.mapPoints = Array.from({ length: 161 }, (_, i) =>
      this.toMap(track.frame(i / 160).position),
    );
  }
  toMap(p) {
    return { x: 180 + p.x * 0.36, y: 125 + p.z * 0.36 };
  }
  message(text, color = '#8df5ff') {
    const el = $('race-message');
    el.textContent = text;
    el.style.color = color;
    this.messageUntil = performance.now() + 1700;
  }
  setMode(state) {
    if (state.mode === this.lastMode) return;
    this.lastMode = state.mode;
    for (const id of ['menu', 'pause', 'finish']) $(id).hidden = true;
    $('hud').hidden = state.mode === 'menu';
    $('countdown').hidden = state.mode !== 'countdown';
    document.body.classList.toggle('racing', state.mode !== 'menu');
    $('touch-controls').hidden =
      state.mode !== 'racing' || !matchMedia('(pointer: coarse)').matches;
    if (state.mode === 'menu') {
      $('menu').hidden = false;
      $('start').focus({ preventScroll: true });
    }
    if (state.mode === 'paused') {
      $('pause').hidden = false;
      $('resume').focus({ preventScroll: true });
    }
    if (state.mode === 'countdown') {
      this.messageUntil = 0;
      $('race-message').textContent = '';
      document.activeElement?.blur();
      window.focus();
    }
    if (state.mode === 'finished') {
      $('finish').hidden = false;
      $('result-position').textContent =
        String(state.position).padStart(2, '0') + ' / 04';
      $('result-time').textContent = formatTime(state.elapsed);
      $('result-best').textContent = formatTime(state.bestLap);
      $('finish-title').innerHTML =
        state.position === 1 ? 'ORBIT<br>CONQUERED.' : 'RACE<br>COMPLETE.';
      $('result-note').textContent =
        state.position === 1
          ? 'P1. The orbit is yours.'
          : 'Hit cyan pads and save your boost for the clear sections.';
      $('race-again').focus({ preventScroll: true });
    }
  }
  update(state) {
    this.setMode(state);
    const n = this.nodes;
    n.speed.textContent = String(Math.round(state.speed * 3.6)).padStart(
      3,
      '0',
    );
    n.position.textContent = String(state.position).padStart(2, '0');
    n.lap.textContent = String(state.lap).padStart(2, '0');
    n.timer.textContent = formatTime(state.elapsed);
    n['best-lap'].textContent = formatTime(state.bestLap);
    n['boost-value'].textContent = Math.round(state.energy) + '%';
    n['boost-fill'].style.transform = `scaleX(${state.energy / 100})`;
    n['boost-state'].textContent =
      state.boosting || state.padBoost > 0 ? 'OVERDRIVE' : 'ION DRIVE';
    n['position-caption'].textContent =
      state.position === 1 ? 'HOLD THE LEAD' : 'CHASE THE LEAD';
    n.checkpoint.textContent =
      'SECTOR 0' +
      (Math.floor(wrap(state.distance / this.track.length) * 4) + 1);
    n.impact.style.opacity = state.mode === 'racing' ? state.impact : 0;
    this.bars.forEach((el, i) =>
      el.classList.toggle('on', i < (state.speed / 195) * 16),
    );
    if (performance.now() > this.messageUntil)
      $('race-message').textContent = '';
    if (state.mode === 'countdown') {
      const value = Math.ceil(state.countdown);
      if (value !== this.lastCountdown) {
        this.lastCountdown = value;
        $('countdown').innerHTML = `<small>PREPARE FOR LAUNCH</small>${value}`;
      }
    } else this.lastCountdown = '';
    if (state.mode !== 'menu') this.drawMap(state);
  }
  drawMap(state) {
    const c = this.ctx;
    c.clearRect(0, 0, 360, 250);
    c.beginPath();
    this.mapPoints.forEach((p, i) =>
      i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
    );
    c.closePath();
    c.strokeStyle = '#304462';
    c.lineWidth = 10;
    c.stroke();
    c.strokeStyle = '#86afcc66';
    c.lineWidth = 1;
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const p = this.toMap(this.track.frame(i / 4).position);
      c.fillStyle = '#ad9cfb';
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    for (const r of state.rivals) {
      const p = this.toMap(
        this.track.frame(r.distance / this.track.length).position,
      );
      c.beginPath();
      c.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      c.fillStyle = '#ed88e7';
      c.fill();
    }
    const f = this.track.frame(state.distance / this.track.length),
      p = this.toMap(f.position),
      angle = Math.atan2(f.forward.z, f.forward.x);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-5, -5);
    c.lineTo(-3, 0);
    c.lineTo(-5, 5);
    c.closePath();
    c.fillStyle = '#91f5ff';
    c.shadowBlur = 12;
    c.shadowColor = '#5ae7ff';
    c.fill();
    c.restore();
  }
}
