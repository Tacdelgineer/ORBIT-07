import * as THREE from 'three';
import { COLORS } from './config.js';

/** Low-poly layered airframe. Local +Z is forward; every rival shares its geometry. */
export function createVehicle(accent = COLORS.cyan) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hull = new THREE.MeshStandardMaterial({
    color: COLORS.hull,
    metalness: 0.75,
    roughness: 0.32,
  });
  const armor = new THREE.MeshStandardMaterial({
    color: COLORS.armor,
    metalness: 0.7,
    roughness: 0.36,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x080f23,
    metalness: 0.9,
    roughness: 0.16,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accent).multiplyScalar(2.7),
  });
  const violet = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COLORS.violet).multiplyScalar(3),
  });
  function box(x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    body.add(m);
    return m;
  }
  function plate(points, depth, mat, y = 0) {
    const shape = new THREE.Shape(
      points.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.12,
      bevelSegments: 1,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.y = y;
    body.add(m);
    return m;
  }
  plate(
    [
      [-1.25, -3],
      [1.25, -3],
      [1.15, 1.4],
      [0.25, 6.2],
      [-0.25, 6.2],
      [-1.15, 1.4],
    ],
    0.55,
    hull,
  );
  plate(
    [
      [-0.77, -1.8],
      [0.77, -1.8],
      [0.7, 1],
      [0, 4.5],
      [-0.7, 1],
    ],
    0.4,
    armor,
    0.46,
  );
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dark);
  canopy.scale.set(0.68, 0.6, 1.75);
  canopy.position.set(0, 0.97, 0.5);
  body.add(canopy);
  for (const s of [-1, 1]) {
    plate(
      [
        [s * 1.1, 1.3],
        [s * 2.5, 3.8],
        [s * 4.6, -2.1],
        [s * 3.1, -2.7],
        [s * 1.2, -1.7],
      ],
      0.32,
      armor,
      0.1,
    );
    plate(
      [
        [s * 1.6, 0.2],
        [s * 2.6, 2.2],
        [s * 4.3, -2],
        [s * 2.9, -2.1],
      ],
      0.12,
      hull,
      0.45,
    );
    plate(
      [
        [s * 0.55, 4.3],
        [s * 1.1, 1.1],
        [s * 1.2, -0.3],
        [s * 0.85, 1.3],
      ],
      0.06,
      glow,
      0.6,
    );
    const strip = box(s * 3.2, 0.57, -0.4, 0.12, 0.08, 3.15, glow);
    strip.rotation.y = -s * 0.34;
    box(s * 1.3, 0.65, -1.8, 0.1, 0.1, 2.1, violet);
    const engine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.63, 0.68, 2.6, 12),
      hull,
    );
    engine.rotation.x = Math.PI / 2;
    engine.position.set(s * 2.4, 0.15, -2.2);
    body.add(engine);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.095, 6, 18),
      violet,
    );
    ring.position.set(s * 2.4, 0.15, -3.54);
    body.add(ring);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glow);
    core.rotation.y = Math.PI;
    core.position.set(s * 2.4, 0.15, -3.56);
    body.add(core);
    const fin = box(s * 2.2, 1.0, -2.5, 0.16, 1.7, 1.55, hull);
    fin.rotation.z = -s * 0.38;
    const finGlow = box(s * 2.45, 1.73, -2.5, 0.1, 0.11, 1.5, violet);
    finGlow.rotation.z = -s * 0.38;
  }
  for (let i = 0; i < 5; i++)
    box(0, 0.65, -1.5 - i * 0.24, 0.75, 0.12, 0.08, glow);
  const exhaust = [];
  for (const s of [-1, 1]) {
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.47, 5, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLORS.violet,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    plume.rotation.x = -Math.PI / 2;
    plume.position.set(s * 2.4, 0.15, -5.8);
    body.add(plume);
    exhaust.push(plume);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 4, 8),
      new THREE.MeshBasicMaterial({
        color: 0xdbeaff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(s * 2.4, 0.15, -5.4);
    body.add(core);
    exhaust.push(core);
  }
  root.userData = { body, exhaust };
  return root;
}
