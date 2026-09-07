import * as THREE from 'three';
import { COLORS } from './config.js';

// Shared shader noise keeps the planet and sky completely self-contained.
const noiseGLSL = `
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(17.1,3.8,9.2);a*=.5;}return v;}`;

export function createWorld(scene) {
  scene.add(new THREE.HemisphereLight(0x99baff, 0x111127, 2));
  const sun = new THREE.DirectionalLight(0xc3ddff, 3.2);
  sun.position.set(-250, 400, 300);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8d5fff, 2.5);
  rim.position.set(100, 120, -300);
  scene.add(rim);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vDir;${noiseGLSL}void main(){vec3 d=normalize(vDir);float n=fbm(d*5.+vec3(3,1,0));float cloud=pow(max(0.,n-.32)*2.0,3.);float band=exp(-abs(d.y-.16+d.x*.27)*4.);vec3 col=vec3(.004,.007,.022)+mix(vec3(.03,.08,.17),vec3(.14,.035,.25),smoothstep(-.5,.7,d.x))*cloud*band;gl_FragColor=vec4(col,1.);}`,
    }),
  );
  scene.add(sky);
  let seed = 2178;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pos = [],
    colors = [];
  for (let i = 0; i < 2700; i++) {
    const y = rand() * 2 - 1,
      a = rand() * Math.PI * 2,
      r = 2900 + rand() * 400,
      s = Math.sqrt(1 - y * y);
    pos.push(Math.cos(a) * s * r, y * r, Math.sin(a) * s * r);
    const k = 0.3 + rand() * 0.9;
    colors.push(k * (0.7 + rand() * 0.3), k * (0.75 + rand() * 0.25), k);
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(
    new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        size: 2.3,
        sizeAttenuation: true,
        vertexColors: true,
        depthWrite: false,
      }),
    ),
  );
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(570, 72, 48),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vPos;varying vec3 vN;varying vec3 vWorld;void main(){vPos=position;vN=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vPos;varying vec3 vN;varying vec3 vWorld;${noiseGLSL}void main(){vec3 p=normalize(vPos),n=normalize(vN);float land=fbm(p*6.7);float mask=smoothstep(.47,.55,land);vec3 ocean=vec3(.008,.031,.085);vec3 ground=mix(vec3(.045,.079,.13),vec3(.13,.17,.22),fbm(p*29.));vec3 col=mix(ocean,ground,mask);float cloud=smoothstep(.52,.68,fbm(p*12.+vec3(11,2,0)));col=mix(col,vec3(.53,.66,.83),cloud*.75);float light=max(dot(n,normalize(vec3(-.5,.65,.5))),0.);col*=.15+light*1.25;float city=pow(noise(p*380.),19.)*smoothstep(.45,.55,land)*(1.-cloud)*pow(1.-light,3.);col+=vec3(1.,.46,.24)*city*2.;vec3 view=normalize(cameraPosition-vWorld);float rim=pow(1.-max(dot(n,view),0.),4.);col+=vec3(.11,.36,.85)*rim*.7;gl_FragColor=vec4(col,1.);}`,
    }),
  );
  planet.position.set(-920, 350, -1000);
  planet.rotation.z = 0.25;
  scene.add(planet);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(580, 64, 40),
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      vertexShader: `varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 n;varying vec3 v;void main(){float f=pow(max(0.,1.+dot(normalize(n),normalize(v))),6.);gl_FragColor=vec4(.12,.4,1.,f*.65);}`,
    }),
  );
  atmosphere.position.copy(planet.position);
  scene.add(atmosphere);
  const moon = new THREE.Mesh(
    new THREE.IcosahedronGeometry(100, 4),
    new THREE.MeshStandardMaterial({ color: 0x6f7396, roughness: 1 }),
  );
  moon.position.set(540, 470, -1500);
  scene.add(moon);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x29334b,
    metalness: 0.8,
    roughness: 0.48,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0x59647b,
    metalness: 0.7,
    roughness: 0.42,
  });
  const cyan = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COLORS.cyan).multiplyScalar(1.7),
  });
  const violet = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COLORS.violet).multiplyScalar(1.6),
  });
  function station(x, y, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 24, 240, 8),
      metal,
    );
    group.add(tower);
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 9, 140, 6),
      silver,
    );
    spine.position.y = 160;
    group.add(spine);
    for (const [h, r] of [
      [-95, 70],
      [-35, 105],
      [45, 79],
      [100, 50],
    ]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 4, 6, 72), metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h;
      group.add(ring);
      const edge = new THREE.Mesh(
        new THREE.TorusGeometry(r + 1, 0.32, 4, 72),
        h > 0 ? cyan : violet,
      );
      edge.rotation.x = Math.PI / 2;
      edge.position.y = h + 3.4;
      group.add(edge);
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(r * 1.9, 2, 3),
          silver,
        );
        spoke.rotation.y = (i * Math.PI) / 3;
        spoke.position.y = h;
        group.add(spoke);
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 150, 0.5), cyan);
      panel.position.set(Math.sin(a) * 18, 0, Math.cos(a) * 18);
      panel.rotation.y = a;
      group.add(panel);
    }
    scene.add(group);
    return group;
  }
  station(20, 20, -20, 1.25);
  station(450, -55, -600, 0.85);
  station(-600, 40, 140, 0.7);
  const rocks = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        color: 0x454256,
        roughness: 0.95,
        flatShading: true,
      }),
      110,
    ),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 110; i++) {
    const a = rand() * Math.PI * 2,
      r = 450 + rand() * 550;
    dummy.position.set(Math.cos(a) * r, -100 - rand() * 210, Math.sin(a) * r);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    const s = 3 + rand() * 12;
    dummy.scale.set(s, s * (0.6 + rand()), s * (0.6 + rand()));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocks);
  return { planet };
}
