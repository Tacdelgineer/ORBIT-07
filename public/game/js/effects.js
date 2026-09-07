import * as THREE from 'three';

/** Fixed particle pool: no object allocation or geometry churn during a race. */
export class Trails {
  constructor(scene) {
    this.count = 520;
    this.cursor = 0;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.life = new Float32Array(this.count);
    this.velocity = new Float32Array(this.count * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d'),
      g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'white');
    g.addColorStop(0.2, '#c0adff');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(canvas),
        size: 1.2,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.emitter = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.accumulator = 0;
  }
  clear() {
    this.life.fill(0);
    this.colors.fill(0);
    this.geometry.attributes.color.needsUpdate = true;
  }
  update(dt, ship, state) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) {
        this.colors[j] = this.colors[j + 1] = this.colors[j + 2] = 0;
        continue;
      }
      for (let k = 0; k < 3; k++)
        this.positions[j + k] += this.velocity[j + k] * dt;
      const a = Math.min(1, this.life[i] * 2);
      this.colors[j] = 0.45 * a;
      this.colors[j + 1] = 0.35 * a;
      this.colors[j + 2] = 1.7 * a;
    }
    if (state.mode === 'racing' && state.speed > 12) {
      this.accumulator += dt * (state.boosting ? 250 : 135);
      const n = Math.floor(this.accumulator);
      this.accumulator -= n;
      ship.updateMatrixWorld();
      this.direction.set(0, 0, -12).applyQuaternion(ship.quaternion);
      for (let p = 0; p < n; p++) {
        const i = this.cursor++ % this.count,
          j = i * 3;
        this.emitter
          .set(p % 2 ? 2.4 : -2.4, 0.15, -3.7)
          .applyMatrix4(ship.matrixWorld);
        this.life[i] = 0.35 + Math.random() * 0.4;
        for (let k = 0; k < 3; k++) {
          this.positions[j + k] =
            this.emitter.getComponent(k) + (Math.random() - 0.5) * 0.3;
          this.velocity[j + k] =
            this.direction.getComponent(k) + (Math.random() - 0.5) * 2;
        }
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
