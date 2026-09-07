import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Track } from './track.js';
import { createWorld } from './world.js';
import { createVehicle } from './vehicle.js';
import { damp } from './config.js';

export class RaceRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0b102b, 0.00034);
    this.camera = new THREE.PerspectiveCamera(
      58,
      innerWidth / innerHeight,
      0.3,
      5000,
    );
    this.world = createWorld(this.scene);
    this.track = new Track(this.scene);
    this.player = createVehicle();
    this.scene.add(this.player);
    this.rivals = [0xff78bd, 0xffc17c, 0xad98ff].map((color) => {
      const v = createVehicle(color);
      v.scale.setScalar(0.82);
      this.scene.add(v);
      return v;
    });
    const f = this.track.frame(0);
    this.platform = new THREE.Group();
    this.platform.position.copy(f.position);
    this.platform.quaternion.copy(f.quaternion);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 18, 1.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x192235,
        metalness: 0.8,
        roughness: 0.35,
      }),
    );
    base.position.y = -0.25;
    this.platform.add(base);
    for (const r of [12.8, 16.5]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.045, 4, 96),
        new THREE.MeshBasicMaterial({ color: r < 15 ? 0x78edff : 0xb382ff }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      this.platform.add(ring);
    }
    this.scene.add(this.platform);
    this.shipLight = new THREE.PointLight(0x58cfff, 35, 20, 2);
    this.scene.add(this.shipLight);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.55,
      0.55,
      1.05,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.look = new THREE.Vector3();
    this.time = 0;
    this.menuCamera();
    this.slowFrames = 0;
    this.quality = 1;
    this.onResize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.composer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener('resize', this.onResize);
  }
  menuCamera() {
    const f = this.track.frame(0),
      local = (x, y, z) =>
        f.position
          .clone()
          .addScaledVector(f.right, x)
          .addScaledVector(f.up, y)
          .addScaledVector(f.forward, z);
    const pos = f.position
      .clone()
      .add(new THREE.Vector3(24 + Math.sin(this.time * 0.08) * 2, 15, 34));
    this.camera.position.copy(pos);
    this.look.copy(f.position).add(new THREE.Vector3(-8, 3, 5));
    this.camera.lookAt(this.look);
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.player.position.copy(
      local(0, 2.3 + Math.sin(this.time * 1.3) * 0.25, 0),
    );
    this.player.quaternion.copy(f.quaternion);
    this.player.scale.setScalar(1.55);
    this.player.userData.body.rotation.set(
      0,
      0,
      Math.sin(this.time * 0.8) * 0.015,
    );
    this.platform.visible = true;
    this.rivals.forEach((r) => (r.visible = false));
  }
  raceCamera(state, dt, snap = false) {
    this.platform.visible = false;
    this.player.scale.setScalar(1);
    const f = this.track.frame(
      state.distance / this.track.length,
      state.lane,
      2.1 + Math.sin(this.time * 11) * 0.06,
    );
    this.player.position.copy(f.position);
    this.player.quaternion.copy(f.quaternion);
    this.player.userData.body.rotation.z = damp(
      this.player.userData.body.rotation.z,
      -state.steer * 0.22,
      8,
      dt,
    );
    this.player.userData.body.rotation.y = damp(
      this.player.userData.body.rotation.y,
      state.steer * 0.09,
      8,
      dt,
    );
    const behind = f.position
      .clone()
      .addScaledVector(f.forward, -18 - state.speed * 0.015)
      .addScaledVector(f.up, 7.8);
    const ahead = this.track.frame(
      (state.distance + 35) / this.track.length,
      state.lane * 0.4,
      3,
    ).position;
    if (snap) {
      this.camera.position.copy(behind);
      this.look.copy(ahead);
    } else {
      this.camera.position.lerp(behind, 1 - Math.exp(-8 * dt));
      this.look.lerp(ahead, 1 - Math.exp(-10 * dt));
    }
    this.camera.lookAt(this.look);
    this.camera.fov = damp(
      this.camera.fov,
      61 + (state.speed / 195) * 10 + (state.boosting ? 5 : 0),
      3,
      dt,
    );
    this.camera.updateProjectionMatrix();
    state.rivals.forEach((r, i) => {
      const mesh = this.rivals[i],
        rf = this.track.frame(r.distance / this.track.length, r.lane, 2.1);
      mesh.visible = true;
      mesh.position.copy(rf.position);
      mesh.quaternion.copy(rf.quaternion);
    });
  }
  update(dt, state) {
    this.time += dt;
    this.track.update(this.time);
    if (state.mode === 'menu') this.menuCamera();
    else this.raceCamera(state, dt);
    this.shipLight.position
      .copy(this.player.position)
      .add(new THREE.Vector3(0, 1, -2));
    const power =
      state.mode === 'menu'
        ? 0.18
        : Math.max(0.12, state.speed / 150 + (state.boosting ? 0.7 : 0));
    this.player.userData.exhaust.forEach((p, i) => {
      p.scale.y = power * (1 + Math.sin(this.time * 53 + i) * 0.06);
      p.position.z = -3.55 - (i % 2 ? 2 : 2.5) * p.scale.y;
    });
    if (dt > 0.026) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 150 && this.quality === 1) {
      this.quality = 0.75;
      this.slowFrames = 0;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
      this.composer.setPixelRatio(0.85);
      this.onResize();
    } else if (this.slowFrames > 240 && this.quality === 0.75) {
      this.quality = 0.5;
      this.bloom.enabled = false;
      this.composer.setPixelRatio(0.75);
      this.onResize();
    }
    this.composer.render();
  }
  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m) {
          m.map?.dispose();
          m.dispose();
        }
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
