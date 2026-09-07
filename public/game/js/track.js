import * as THREE from 'three';
import { TRACK, COLORS, wrap } from './config.js';

const UP = new THREE.Vector3(0, 1, 0);
export class Track {
  constructor(scene, definition = TRACK) {
    this.definition = definition;
    this.curve = new THREE.CatmullRomCurve3(
      definition.points.map((p) => new THREE.Vector3(...p)),
      true,
      'centripetal',
    );
    this.curve.arcLengthDivisions = 2400;
    this.curve.updateArcLengths();
    this.length = this.curve.getLength();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pads = definition.pads.map((p) => ({
      ...p,
      distance: p.u * this.length,
    }));
    this.hazards = definition.hazards.map((p) => ({
      ...p,
      distance: p.u * this.length,
    }));
    this.gates = [];
    this.buildRoad();
    this.buildObjects();
  }
  frame(u, lane = 0, height = 0) {
    const t = wrap(u),
      position = this.curve.getPointAt(t),
      forward = this.curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(UP, forward).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();
    position.addScaledVector(right, lane).addScaledVector(up, height);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(right, up, forward),
    );
    return { position, forward, right, up, quaternion };
  }
  ribbon(left, right, y, material, vertical = 0) {
    const positions = [],
      uvs = [],
      indices = [],
      count = 720;
    for (let i = 0; i <= count; i++) {
      const f = this.frame(i / count);
      for (let side = 0; side < 2; side++) {
        const p = f.position
          .clone()
          .addScaledVector(f.right, side ? right : left)
          .addScaledVector(f.up, y + (side ? vertical : 0));
        positions.push(...p.toArray());
        uvs.push(side, ((i / count) * this.length) / 24);
      }
      if (i < count) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    this.group.add(m);
    return m;
  }
  buildRoad() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#263147';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 7000; i++) {
      const x = (i * 73.17) % 512,
        y = (i * 131.3) % 512;
      ctx.fillStyle = i % 2 ? '#8794aa08' : '#03050c13';
      ctx.fillRect(x, y, 1, 6);
    }
    ctx.strokeStyle = '#090f20';
    ctx.lineWidth = 4;
    for (let x = 0; x < 513; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 256) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#8197b22a';
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, 502, 246);
    ctx.strokeRect(5, 261, 502, 246);
    ctx.fillStyle = '#8ea8c14a';
    for (let x = 10; x < 512; x += 128)
      for (let y = 12; y < 512; y += 256) ctx.fillRect(x, y, 4, 4);
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.ribbon(
      -14,
      14,
      0,
      new THREE.MeshStandardMaterial({
        map: texture,
        color: 0x9da8c8,
        metalness: 0.6,
        roughness: 0.42,
        side: THREE.DoubleSide,
      }),
    );
    const base = new THREE.MeshStandardMaterial({
      color: 0x111b2e,
      metalness: 0.7,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    this.ribbon(-14.8, 14.8, -0.9, base);
    for (const s of [-1, 1]) {
      this.ribbon(s * 14.5, s * 14.5, -0.9, base, 2.45);
      this.ribbon(
        s * 13.7,
        s * 14.1,
        0.04,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(COLORS.cyan).multiplyScalar(2.3),
          side: THREE.DoubleSide,
        }),
      );
      this.ribbon(
        s * 14.45,
        s * 14.75,
        1.55,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(
            s === 1 ? COLORS.violet : COLORS.cyan,
          ).multiplyScalar(1.8),
          side: THREE.DoubleSide,
        }),
      );
      this.ribbon(
        s * 11.7,
        s * 11.78,
        0.035,
        new THREE.MeshBasicMaterial({
          color: 0x3c7893,
          side: THREE.DoubleSide,
        }),
      );
    }
    const count = 180,
      dummy = new THREE.Object3D();
    const posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.65, 2.2, 0.9),
      base,
      count * 2,
    );
    const lamps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.74, 0.14, 1.1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xb9efff).multiplyScalar(2),
      }),
      count * 2,
    );
    for (let i = 0; i < count; i++)
      for (let s = 0; s < 2; s++) {
        const f = this.frame(i / count, s ? 14.5 : -14.5, 1);
        dummy.position.copy(f.position);
        dummy.quaternion.copy(f.quaternion);
        dummy.updateMatrix();
        posts.setMatrixAt(i * 2 + s, dummy.matrix);
        dummy.position.addScaledVector(f.up, 1.15);
        dummy.updateMatrix();
        lamps.setMatrixAt(i * 2 + s, dummy.matrix);
      }
    this.group.add(posts, lamps);
    const markers = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.14, 0.035, 2),
      new THREE.MeshBasicMaterial({ color: 0x728ca8 }),
      240,
    );
    for (let i = 0; i < 240; i++) {
      const f = this.frame(i / 240, 0, 0.06);
      dummy.position.copy(f.position);
      dummy.quaternion.copy(f.quaternion);
      dummy.updateMatrix();
      markers.setMatrixAt(i, dummy.matrix);
    }
    this.group.add(markers);
  }
  label(text, color = '#a7f5ff') {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#071223db';
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, 510, 94);
    ctx.fillStyle = color;
    ctx.font = '500 34px Bahnschrift, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(12, 2.25),
      new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
  }
  buildObjects() {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x303a58,
      metalness: 0.8,
      roughness: 0.35,
    });
    for (let i = 0; i < 4; i++) {
      const gate = new THREE.Group(),
        f = this.frame(this.definition.gates[i]);
      gate.position.copy(f.position);
      gate.quaternion.copy(f.quaternion);
      const color = i === 0 ? COLORS.violet : COLORS.cyan;
      for (const [r, tube, mat, z] of [
        [18, 0.8, frameMat, 0],
        [
          16.9,
          0.13,
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(color).multiplyScalar(3),
          }),
          -0.5,
        ],
        [18.7, 0.08, new THREE.MeshBasicMaterial({ color }), 0],
      ]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, tube, 6, 8),
          mat,
        );
        ring.rotation.z = Math.PI / 8;
        ring.scale.y = 0.83;
        ring.position.set(0, 6, z);
        gate.add(ring);
      }
      const label = this.label(
        i === 0 ? 'KEPLER  /  START' : 'CHECKPOINT  /  0' + i,
      );
      label.position.set(0, 21.5, 0);
      gate.add(label);
      this.group.add(gate);
      this.gates.push(gate);
    }
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b314d';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#69f4ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 122, 250);
    ctx.lineWidth = 13;
    for (let y = 35; y < 240; y += 61) {
      ctx.beginPath();
      ctx.moveTo(21, y + 21);
      ctx.lineTo(64, y - 4);
      ctx.lineTo(107, y + 21);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const padMat = new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(0xffffff).multiplyScalar(1.8),
      side: THREE.DoubleSide,
    });
    for (const pad of this.pads) {
      const f = this.frame(pad.u, pad.lane, 0.08),
        m = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 19), padMat);
      m.rotation.x = -Math.PI / 2;
      m.quaternion.premultiply(f.quaternion);
      m.position.copy(f.position);
      this.group.add(m);
      pad.mesh = m;
    }
    for (const h of this.hazards) {
      const root = new THREE.Group(),
        f = this.frame(h.u, h.lane, 2.5);
      root.position.copy(f.position);
      root.quaternion.copy(f.quaternion);
      h.baseY = root.position.y;
      root.add(
        new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.65, 1),
          new THREE.MeshStandardMaterial({
            color: 0x241529,
            metalness: 0.85,
            roughness: 0.35,
          }),
        ),
      );
      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLORS.red).multiplyScalar(3),
      });
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 1.6, 4),
          frameMat,
        );
        spike.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0);
        spike.rotation.z = a - Math.PI / 2;
        root.add(spike);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), coreMat);
      core.position.z = -1.4;
      root.add(core);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.3, 0.04, 4, 24),
        new THREE.MeshBasicMaterial({
          color: COLORS.red,
          transparent: true,
          opacity: 0.5,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -2.3;
      root.add(ring);
      this.group.add(root);
      h.mesh = root;
    }
  }
  update(time) {
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      h.mesh.position.y = h.baseY + Math.sin(time * 2 + i) * 0.3;
      h.mesh.rotation.z = Math.sin(time + i) * 0.15;
    }
  }
}
