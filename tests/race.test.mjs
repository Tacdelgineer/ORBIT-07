import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Race } from '../public/game/js/race.js';
import { TRACK, RACE, formatTime } from '../public/game/js/config.js';

const emptyTrack = () => ({ length: 1000, pads: [], hazards: [] });
const drive = (r, seconds, input = { throttle: true }, hz = 120) => {
  for (let i = 0; i < seconds * hz; i++) r.step(1 / hz, input);
};
const ready = (track = emptyTrack()) => {
  const r = new Race(track);
  r.start();
  drive(r, 3.1, {});
  assert.equal(r.mode, 'racing');
  return r;
};

test('countdown cannot advance the ship or race timer', () => {
  const r = new Race(emptyTrack());
  r.start();
  drive(r, 2, { throttle: true, boost: true });
  assert.equal(r.distance, 0);
  assert.equal(r.elapsed, 0);
  assert.equal(r.mode, 'countdown');
});
test('complete three sequential laps exactly once with timing', () => {
  const r = ready();
  drive(r, 40);
  assert.equal(r.mode, 'finished');
  assert.equal(r.lapTimes.length, 3);
  assert.ok(Math.abs(r.elapsed - r.lapTimes.reduce((a, b) => a + b, 0)) < 1e-9);
  const time = r.elapsed;
  drive(r, 5);
  assert.equal(r.elapsed, time);
});
test('pause and resume preserve progress and countdown', () => {
  const r = ready();
  drive(r, 4);
  r.pause();
  const before = r.snapshot();
  drive(r, 5);
  assert.deepEqual(r.snapshot(), before);
  r.resume();
  drive(r, 1);
  assert.ok(r.elapsed > before.time);
  r.start();
  drive(r, 1);
  r.pause();
  const count = r.countdown;
  drive(r, 3);
  assert.equal(r.countdown, count);
  r.resume();
  assert.equal(r.mode, 'countdown');
});
test('restarting clears every race-specific value', () => {
  const r = ready();
  drive(r, 12, { throttle: true, boost: true, right: true });
  r.start();
  assert.equal(r.distance, 0);
  assert.equal(r.lane, 0);
  assert.equal(r.energy, 100);
  assert.equal(r.elapsed, 0);
  assert.equal(r.lapTimes.length, 0);
  assert.equal(r.nextGate, 1);
  assert.equal(r.mode, 'countdown');
});
test('steering and braking work in either direction', () => {
  const r = ready();
  drive(r, 3);
  drive(r, 0.3, { throttle: true, right: true });
  assert.ok(r.lane > 0);
  drive(r, 0.6, { throttle: true, left: true });
  assert.ok(r.lane < 0);
  const speed = r.speed;
  drive(r, 0.5, { brake: true });
  assert.ok(r.speed < speed);
});
test('rails retain ship and impose a speed penalty', () => {
  const r = ready();
  drive(r, 5);
  r.lane = 11.7;
  drive(r, 0.1, { throttle: true, right: true });
  assert.ok(Math.abs(r.lane) <= RACE.halfWidth - RACE.playerRadius);
  assert.ok(r.speed < RACE.maxSpeed);
  assert.ok(r.drainEvents().some((e) => e.type === 'collision'));
});
test('boost drains, locks on depletion, then recharges', () => {
  const r = ready();
  drive(r, 3);
  drive(r, 2, { throttle: true, boost: true });
  assert.ok(r.speed > RACE.maxSpeed);
  assert.ok(r.energy < 50);
  drive(r, 2, { throttle: true, boost: true });
  assert.ok(r.boostLocked);
  drive(r, 2, { throttle: true });
  assert.ok(r.energy > 20);
  assert.equal(r.boostLocked, false);
});
test('pad requires matching lane and cannot repeatedly trigger', () => {
  const track = emptyTrack();
  track.pads = [{ distance: 100, lane: 6 }];
  const r = ready(track);
  r.distance = 90;
  r.speed = 138;
  r.energy = 30;
  drive(r, 0.15);
  assert.equal(r.padBoost, 0);
  r.distance = 90;
  r.lane = 6;
  r.speed = 138;
  drive(r, 0.15);
  assert.ok(r.padBoost > 0);
  assert.equal(r.drainEvents().filter((e) => e.type === 'pad').length, 1);
});
test('high-speed swept collisions cannot tunnel through mines', () => {
  const track = emptyTrack();
  track.hazards = [{ distance: 100, lane: 0 }];
  const r = ready(track);
  r.distance = 96;
  r.speed = 195;
  r.padBoost = 1;
  r.step(0.05, { throttle: true });
  assert.ok(r.speed < 120);
  assert.ok(r.impact > 0);
});
test('hazards can be avoided with lane choice', () => {
  const track = emptyTrack();
  track.hazards = [{ distance: 100, lane: 0 }];
  const r = ready(track);
  r.distance = 96;
  r.lane = 7;
  r.speed = 138;
  r.step(0.05, { throttle: true });
  assert.equal(r.impact, 0);
});
test('simulation is stable at 30 and 120 Hz', () => {
  const a = ready(),
    b = ready();
  drive(a, 10, { throttle: true }, 30);
  drive(b, 10, { throttle: true }, 120);
  assert.ok(Math.abs(a.distance - b.distance) < 3);
  assert.equal(a.lap, b.lap);
});
test('full Kepler circuit finishes with rival ranking and every checkpoint', () => {
  const curve = new THREE.CatmullRomCurve3(
    TRACK.points.map((p) => new THREE.Vector3(...p)),
    true,
    'centripetal',
  );
  curve.arcLengthDivisions = 2400;
  const length = curve.getLength();
  const track = {
    length,
    pads: TRACK.pads.map((p) => ({ ...p, distance: p.u * length })),
    hazards: TRACK.hazards.map((p) => ({ ...p, distance: p.u * length })),
  };
  const r = ready(track);
  drive(r, 180, { throttle: true, boost: true });
  assert.equal(r.mode, 'finished');
  assert.equal(r.lapTimes.length, 3);
  assert.ok(r.position >= 1 && r.position <= 4);
  assert.ok(
    r.drainEvents().filter((e) => e.type === 'checkpoint').length === 9,
  );
  console.log(
    `Kepler: ${Math.round(length)}m, completed in ${formatTime(r.elapsed)}, P${r.position}.`,
  );
});
test('timer handles minutes, zero and missing best lap', () => {
  assert.equal(formatTime(65.123), '01:05.123');
  assert.equal(formatTime(0), '00:00.000');
  assert.equal(formatTime(Infinity), '— — : — —');
});
