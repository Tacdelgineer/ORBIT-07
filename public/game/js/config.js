export const COLORS = Object.freeze({
  cyan: 0x67eaff,
  violet: 0xa276ff,
  pink: 0xff5ace,
  red: 0xff4269,
  hull: 0x252d44,
  armor: 0x8196b6,
});
export const RACE = Object.freeze({
  laps: 3,
  maxSpeed: 138,
  boostSpeed: 195,
  acceleration: 43,
  braking: 85,
  drag: 14,
  boostDrain: 29,
  boostRegen: 14,
  steerSpeed: 19,
  halfWidth: 14,
  playerRadius: 2.2,
});
export const TRACK = Object.freeze({
  name: 'Kepler Run',
  points: [
    [0, 0, 250],
    [170, 12, 270],
    [300, 28, 170],
    [285, 38, 0],
    [370, 18, -150],
    [180, 0, -270],
    [-40, 12, -210],
    [-250, 36, -280],
    [-340, 48, -80],
    [-250, 18, 90],
    [-160, 0, 245],
  ],
  gates: [0, 0.25, 0.5, 0.75],
  pads: [
    { u: 0.045, lane: 0 },
    { u: 0.19, lane: -6 },
    { u: 0.35, lane: 6 },
    { u: 0.49, lane: 0 },
    { u: 0.64, lane: -6 },
    { u: 0.82, lane: 6 },
    { u: 0.94, lane: 0 },
  ],
  hazards: [
    { u: 0.11, lane: 0 },
    { u: 0.16, lane: 7 },
    { u: 0.29, lane: -6 },
    { u: 0.4, lane: 0 },
    { u: 0.45, lane: 7 },
    { u: 0.58, lane: 0 },
    { u: 0.69, lane: 6 },
    { u: 0.78, lane: -6 },
    { u: 0.89, lane: 0 },
  ],
});
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const wrap = (n) => ((n % 1) + 1) % 1;
export const damp = (a, b, rate, dt) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '— — : — —';
  const ms = Math.floor(Math.max(0, seconds) * 1000);
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
