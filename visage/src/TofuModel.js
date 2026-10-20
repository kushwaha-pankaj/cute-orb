import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {TOFU_DEFAULTS, TOFU_EXPRESSIONS} from './tofuExpressions.js';

/** A rounded solid, built once. Every point lies on a smooth Lp sphere. */
function softGeometry(exponent = .66, segments = 48, rings = 32) {
  const geometry = new THREE.SphereGeometry(1, segments, rings);
  const position = geometry.attributes.position;
  const power = v => Math.sign(v) * Math.abs(v) ** exponent;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i, power(position.getX(i)), power(position.getY(i)), power(position.getZ(i)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Sculpted hanging arm: a narrow shoulder, curved forearm and round mitten tip.
 * The profile is sampled once; poses rotate the finished solid at its shoulder.
 */
function armGeometry(side) {
  const profile = new THREE.CatmullRomCurve3([
    [0, -1.12], [.065, -1.105], [.125, -1.065], [.17, -.995],
    [.19, -.9], [.188, -.74], [.17, -.52], [.14, -.3],
    [.13, -.12], [.125, .015], [.09, .12], [0, .17],
  ].map(([radius, y]) => new THREE.Vector3(radius, y, 0)));
  const points = profile.getPoints(56).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  const lathe = new THREE.LatheGeometry(points, 32);
  const vertices = lathe.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i), t = (.17 - y) / 1.29;
    // Bow away from the torso, then curl the hand back in towards the hip.
    const curve = .38 * Math.sin(t * Math.PI * .65);
    vertices.setXYZ(i, vertices.getX(i) + side * curve, y, vertices.getZ(i) * 1.12 + .055 * t);
  }
  // Weld the radial seam and cap vertices before smoothing the bent surface.
  lathe.deleteAttribute('normal'); lathe.deleteAttribute('uv');
  const geometry = mergeVertices(lathe); lathe.dispose(); geometry.computeVertexNormals();
  return geometry;
}

/** Real solid geometry, articulated at the shoulders and neck; no image planes. */
export function createTofuModel() {
  const root = new THREE.Group(); root.name = 'Tofu';
  const skin = new THREE.MeshStandardMaterial({color: TOFU_DEFAULTS.bodyColor, roughness: .62});
  const ink = new THREE.MeshStandardMaterial({color: TOFU_DEFAULTS.eyeColor, roughness: .48});
  const soft = softGeometry(), round = new THREE.SphereGeometry(1, 24, 16);
  const mesh = (name, geometry, material, parent, scale, position) => {
    const item = new THREE.Mesh(geometry, material); item.name = name;
    item.scale.set(...scale); item.position.set(...position);
    item.castShadow = item.receiveShadow = true; parent.add(item); return item;
  };
  const body = mesh('Body', soft, skin, root, [.83, .78, .58], [0, 1.16, 0]);
  // Small shoulder taper keeps the torso tucked beneath the head.
  const bodyGeometry = softGeometry(.88); const bp = bodyGeometry.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - .13 * Math.max(0, bp.getY(i))));
  bodyGeometry.computeVertexNormals(); body.geometry = bodyGeometry;
  const neck = mesh('Neck', soft, skin, root, [.69, .085, .49], [0, 1.86, 0]);
  const head = new THREE.Group(); head.name = 'Head pivot'; head.position.y = 2.81; root.add(head);
  mesh('Head', soft, skin, head, [1.57, .98, .78], [0, 0, 0]);
  const legs = [-1, 1].map(side => {
    const leg = new THREE.Group(); root.add(leg); leg.position.set(side * .46, .62, 0);
    mesh('Foot', soft, skin, leg, [.36, .37, .47], [0, -.25, .035]);
    return leg;
  });
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group(); arm.name = side < 0 ? 'Right arm' : 'Left arm';
    arm.position.set(side * .62, 1.78, .015); root.add(arm);
    mesh('Arm', armGeometry(side), skin, arm, [1, 1, 1], [0, 0, 0]);
    return arm;
  });
  const eyes = [-1, 1].map(side => mesh('Eye', round, ink, head, [.08, .085, .032], [side * .67, -.32, .78]));
  const brows = [-1, 1].map(() => mesh('Brow', round, ink, head, [.115, .022, .02], [0, 0, 0]));
  // Constant topology: update a short ribbon rather than allocating curves per frame.
  const mouthGeometry = new THREE.BufferGeometry();
  mouthGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(25 * 2 * 3), 3));
  const indices = [];
  for (let i = 0; i < 24; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  mouthGeometry.setIndex(indices);
  const mouth = new THREE.Mesh(mouthGeometry, new THREE.MeshBasicMaterial({color: TOFU_DEFAULTS.eyeColor, side: THREE.DoubleSide}));
  mouth.name = 'Expression curve'; mouth.frustumCulled = false; head.add(mouth);
  const openMouth = mesh('Open mouth', round, ink, head, [.09, .1, .018], [0, -.53, .79]);
  const face = {...TOFU_EXPRESSIONS.neutral};
  let fx = 0, fy = 0;
  // Exact surface of the head: all facial details stay attached as proportions change.
  const surface = (x, y) => .78 * Math.max(.001, 1 - Math.abs(x / 1.57) ** (2 / .66) - Math.abs(y / .98) ** (2 / .66)) ** (.66 / 2);
  function update(config, time = 0, delta = 1 / 60, pointer = {x: 0, y: 0}, audioLevel = 0, immediate = false) {
    const c = {...TOFU_DEFAULTS, ...config};
    const t = c.motion ? time : 0;
    const follow = c.motion && c.follow && c.state !== 'sleeping';
    const ease = (a, b, rate = 9) => immediate ? b : THREE.MathUtils.damp(a, b, rate, delta);
    fx = ease(fx, follow ? pointer.x : 0, 5); fy = ease(fy, follow ? pointer.y : 0, 5);
    const mood = {...TOFU_EXPRESSIONS[c.expression] || TOFU_EXPRESSIONS.neutral};
    if (c.state === 'listening') { mood.eyes = 1.15; mood.tilt = .1 + (c.motion ? audioLevel * .09 : 0); }
    if (c.state === 'thinking') { mood.tilt = -.16; mood.brow = .5; }
    if (c.state === 'sleeping') { mood.eyes = .08; mood.tilt = .14; }
    if (c.state === 'success') Object.assign(mood, {smile: 1, eyes: .7, tilt: .06});
    if (c.state === 'error') Object.assign(mood, {smile: -1, brow: .9, tilt: -.1});
    for (const key of ['eyes', 'smile', 'mouth', 'brow', 'tilt']) {
      const base = TOFU_EXPRESSIONS.neutral[key];
      face[key] = ease(face[key], base + (mood[key] - base) * c.intensity);
    }
    skin.color.set(c.bodyColor); skin.roughness = c.roughness; ink.color.set(c.eyeColor); mouth.material.color.set(c.eyeColor);
    head.scale.set(c.headWidth, c.headHeight, 1);
    // Keep the underside attached to the neck as head height changes.
    head.position.y = 1.83 + .98 * c.headHeight;
    body.scale.x = .83 * c.bodyWidth; neck.scale.x = .69 * Math.min(c.bodyWidth, c.headWidth);
    body.scale.y = .78 * (1 + (c.motion ? Math.sin(t * 1.8) * .007 : 0));
    root.rotation.y = c.yaw + fx * .16;
    root.position.y = c.motion && (c.pose === 'dance' || c.state === 'success') ? Math.abs(Math.sin(t * 3.5)) * .1 : 0;
    head.rotation.set(-fy * .1 + (c.state === 'listening' && c.motion ? Math.sin(t * 2.2) * .02 : 0), fx * .17, face.tilt);
    const blink = c.motion && c.autoBlink ? Math.max(0, 1 - Math.abs((t % 4.6) - 3.8) / .085) : 0;
    const gx = THREE.MathUtils.clamp(c.gazeX + fx * .6 + (c.state === 'thinking' ? .35 : 0), -1, 1) * .09;
    const gy = THREE.MathUtils.clamp(c.gazeY + fy * .5 + (c.state === 'thinking' ? .5 : 0), -1, 1) * .07;
    eyes.forEach((eye, i) => {
      const side = i ? 1 : -1, x = side * .67 * c.eyeSpacing + gx, y = -.32 + gy;
      eye.position.set(x, y, surface(x, y) + .018);
      eye.scale.set(.078 * c.eyeSize, .085 * c.eyeSize * Math.max(.08, face.eyes * (1 - blink)), .032);
      // Slight tilt makes smiles lift the inner eye corners.
      eye.rotation.z = side * face.smile * .1;
      const brow = brows[i]; brow.visible = Math.abs(face.brow) > .25;
      brow.position.set(x, y + .18, surface(x, y + .18) + .025);
      brow.rotation.z = -side * face.brow * .36;
    });
    const speaking = c.motion && c.state === 'speaking' ? .15 + Math.abs(Math.sin(t * 12) * Math.sin(t * 7.3)) * .6 : 0;
    const opening = Math.max(c.mouthOpen, face.mouth, c.motion && c.state === 'speaking' ? audioLevel : 0, speaking);
    const expressive = c.showMouth || c.expression !== 'neutral' || ['speaking', 'success', 'error'].includes(c.state) || c.mouthOpen > 0;
    mouth.visible = expressive && opening < .12; openMouth.visible = expressive && opening >= .12;
    const mp = mouthGeometry.attributes.position;
    for (let i = 0; i <= 24; i++) {
      const u = i / 24 * 2 - 1, x = u * .15;
      const y = -.57 + face.smile * .09 * (u * u - .5);
      for (let j = 0; j < 2; j++) { const yy = y + (j ? .014 : -.014); mp.setXYZ(i * 2 + j, x, yy, surface(x, yy) + .025); }
    }
    mp.needsUpdate = true;
    openMouth.position.set(0, -.57, surface(0, -.57) + .025);
    openMouth.scale.set(.085 + Math.max(0, face.smile) * .065, .035 + opening * .14, .024);
    arms.forEach((arm, i) => {
      const side = i ? 1 : -1;
      arm.position.x = side * .62 * c.bodyWidth;
      let angle = 0;
      const waving = c.pose === 'wave' && i === 1;
      if (waving) angle = 1.95 + (c.motion ? Math.sin(t * 5) * .14 : 0);
      arm.position.z = ease(arm.position.z, waving ? .35 : .015);
      if (c.pose === 'welcome') angle = side * 1.15;
      if (c.pose === 'dance') angle = side * (.6 + Math.sin(t * 3.5 + i) * .45);
      arm.rotation.z = ease(arm.rotation.z, angle);
      arm.rotation.x = ease(arm.rotation.x, (waving ? .3 : 0) + (c.motion ? Math.sin(t * 1.7 + i) * .025 : 0));
      legs[i].rotation.x = c.pose === 'dance' && c.motion ? Math.sin(t * 3.5 + i * Math.PI) * .14 : 0;
    });
  }
  const geometries = new Set(), materials = new Set();
  root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
  return {root, head, eyes, arms, update, dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }};
}
