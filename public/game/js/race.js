import { RACE, clamp, damp, wrap } from './config.js';

/** Deterministic race simulation, independent from Three.js and the browser. */
export class Race {
  constructor(track) {
    this.track = track;
    this.events = [];
    this.reset();
    this.mode = 'menu';
  }
  reset() {
    Object.assign(this, {
      mode: 'countdown',
      countdown: 3,
      distance: 0,
      lane: 0,
      steer: 0,
      lateralVelocity: 0,
      speed: 0,
      energy: 100,
      boosting: false,
      boostLocked: false,
      padBoost: 0,
      elapsed: 0,
      lapStart: 0,
      lap: 1,
      nextGate: 1,
      hitCooldown: 0,
      impact: 0,
      position: 4,
      bestLap: Infinity,
      lapTimes: [],
      lastPad: -1,
      lastPadLap: -1,
    });
    this.rivals = [
      { name: 'LYRA', distance: 14, lane: -6, pace: 116 },
      { name: 'NOVA', distance: 27, lane: 6, pace: 121 },
      { name: 'ECHO', distance: 40, lane: 0, pace: 125 },
    ].map((r) => ({ ...r, speed: 0, finishedAt: null }));
    this.events = [];
    this.emit('state', 'countdown');
  }
  emit(type, value) {
    this.events.push({ type, value });
  }
  drainEvents() {
    return this.events.splice(0);
  }
  start() {
    this.reset();
  }
  menu() {
    this.mode = 'menu';
    this.speed = 0;
    this.boosting = false;
    this.emit('state', 'menu');
  }
  pause() {
    if (!['racing', 'countdown'].includes(this.mode)) return;
    this.resumeMode = this.mode;
    this.mode = 'paused';
    this.emit('state', 'paused');
  }
  resume() {
    if (this.mode !== 'paused') return;
    this.mode = this.resumeMode;
    this.emit('state', this.mode);
  }
  collide(rail = false) {
    if (this.hitCooldown > 0) return;
    this.speed *= rail ? 0.78 : 0.48;
    this.energy = clamp(this.energy - (rail ? 3 : 12), 0, 100);
    this.hitCooldown = rail ? 0.7 : 1.1;
    this.impact = rail ? 0.35 : 0.85;
    this.emit('collision', rail ? 'GUARDRAIL CONTACT' : 'HULL IMPACT');
  }
  step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.mode === 'countdown') {
      const previous = Math.ceil(this.countdown);
      this.countdown = Math.max(0, this.countdown - dt);
      if (Math.ceil(this.countdown) !== previous)
        this.emit('count', Math.ceil(this.countdown));
      if (this.countdown <= 0) {
        this.mode = 'racing';
        this.emit('state', 'racing');
        this.emit('message', 'GO / FULL THROTTLE');
      }
      return;
    }
    if (this.mode !== 'racing') return;
    const previousDistance = this.distance,
      previousTime = this.elapsed;
    this.elapsed += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.impact = Math.max(0, this.impact - dt * 1.6);
    this.padBoost = Math.max(0, this.padBoost - dt);
    if (!input.boost) this.boostLocked = false;
    this.boosting =
      !!input.boost &&
      !this.boostLocked &&
      this.energy > 0 &&
      this.speed > 25 &&
      !input.brake;
    if (this.boosting) {
      this.energy = Math.max(0, this.energy - RACE.boostDrain * dt);
      if (this.energy === 0) this.boostLocked = true;
    } else this.energy = Math.min(100, this.energy + RACE.boostRegen * dt);
    const boosted = this.boosting || this.padBoost > 0,
      target = boosted ? RACE.boostSpeed : RACE.maxSpeed;
    if (input.brake) this.speed -= RACE.braking * dt;
    else if (input.throttle || boosted)
      this.speed += RACE.acceleration * (boosted ? 2.3 : 1) * dt;
    else this.speed -= RACE.drag * dt;
    if (this.speed > target)
      this.speed = Math.max(target, this.speed - 65 * dt);
    this.speed = clamp(this.speed, 0, RACE.boostSpeed);
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.steer = damp(this.steer, direction, 11, dt);
    this.lateralVelocity = damp(
      this.lateralVelocity,
      direction *
        RACE.steerSpeed *
        (0.35 + (0.65 * this.speed) / RACE.maxSpeed),
      8,
      dt,
    );
    this.lane += this.lateralVelocity * dt;
    const edge = RACE.halfWidth - RACE.playerRadius;
    if (Math.abs(this.lane) > edge) {
      this.lane = clamp(this.lane, -edge, edge);
      this.lateralVelocity *= -0.35;
      if (this.speed > 20) this.collide(true);
    }
    this.distance += this.speed * dt;
    const traveled = this.distance - previousDistance,
      L = this.track.length;
    // Swept forward checks prevent boost-speed frames from skipping a pad or mine.
    const passed = (distance, radius) => {
      const ahead = wrap((distance - previousDistance) / L) * L;
      const near = Math.abs(
        ((((this.distance - distance + L / 2) % L) + L) % L) - L / 2,
      );
      return ahead <= traveled + radius || near < radius;
    };
    for (let i = 0; i < this.track.pads.length; i++) {
      const pad = this.track.pads[i],
        lap = Math.floor(this.distance / L);
      if (
        passed(pad.distance, 7) &&
        Math.abs(this.lane - pad.lane) < 3.4 &&
        (this.lastPad !== i || this.lastPadLap !== lap)
      ) {
        this.padBoost = 1.3;
        this.energy = Math.min(100, this.energy + 18);
        this.lastPad = i;
        this.lastPadLap = lap;
        this.emit('pad', 'BOOST PAD / OVERDRIVE');
      }
    }
    for (const hazard of this.track.hazards)
      if (
        passed(hazard.distance, 2.7) &&
        Math.abs(this.lane - hazard.lane) < 3.3
      )
        this.collide();
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i],
        oldDistance = r.distance;
      r.speed = damp(
        r.speed,
        r.pace + Math.sin(this.elapsed * 0.65 + i * 2) * 7,
        1.2,
        dt,
      );
      r.distance += r.speed * dt;
      let targetLane = Math.sin(this.elapsed * 0.3 + i * 2) * 7;
      for (const h of this.track.hazards) {
        const ahead = wrap((h.distance - r.distance) / L) * L;
        if (ahead < 52 && Math.abs(h.lane - targetLane) < 4)
          targetLane = h.lane > 0 ? -6 : 6;
      }
      r.lane = damp(r.lane, targetLane, 2.1, dt);
      if (r.finishedAt === null && r.distance >= L * RACE.laps)
        r.finishedAt =
          previousTime +
          (L * RACE.laps - oldDistance) / Math.max(0.001, r.speed);
    }
    this.position =
      1 + this.rivals.filter((r) => r.distance > this.distance).length;
    while (this.distance >= (this.nextGate * L) / 4) {
      const crossTime =
        previousTime +
        (((this.nextGate * L) / 4 - previousDistance) /
          Math.max(traveled, 0.001)) *
          dt;
      if (this.nextGate % 4 === 0) {
        const lapTime = crossTime - this.lapStart;
        this.lapTimes.push(lapTime);
        this.bestLap = Math.min(this.bestLap, lapTime);
        this.lapStart = crossTime;
        if (this.lap >= RACE.laps) {
          this.elapsed = crossTime;
          this.mode = 'finished';
          this.boosting = false;
          this.position =
            1 +
            this.rivals.filter(
              (r) => r.finishedAt !== null && r.finishedAt < crossTime,
            ).length;
          this.emit('state', 'finished');
          break;
        }
        this.lap++;
        this.emit(
          'lap',
          this.lap === RACE.laps
            ? 'FINAL LAP'
            : 'LAP ' + this.lap + ' / ' + RACE.laps,
        );
      } else this.emit('checkpoint', 'CHECKPOINT / 0' + (this.nextGate % 4));
      this.nextGate++;
    }
  }
  snapshot() {
    return {
      mode: this.mode,
      lap: this.lap,
      position: this.position,
      speedKmh: Math.round(this.speed * 3.6),
      time: this.elapsed,
      boost: Math.round(this.energy),
      completedLaps: this.lapTimes.length,
    };
  }
}
