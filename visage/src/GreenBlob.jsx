import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL_URL = import.meta.env.BASE_URL + 'green_blob.glb';

function findByName(root, name) {
  let found = null;
  root.traverse((obj) => {
    if (obj.name === name) found = obj;
  });
  return found;
}

function findMorphMeshes(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
      meshes.push(obj);
    }
  });
  return meshes;
}

function setMorph(meshes, name, value) {
  for (const mesh of meshes) {
    const index = mesh.morphTargetDictionary?.[name];
    if (index == null) continue;
    mesh.morphTargetInfluences[index] = THREE.MathUtils.clamp(value, 0, 1);
  }
}

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function prepareFadeMaterials(obj) {
  if (!obj) return;
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  const next = mats.map((m) => {
    if (!m) return m;
    const clone = m.clone();
    clone.transparent = true;
    clone.opacity = 1;
    clone.depthWrite = true;
    clone.needsUpdate = true;
    return clone;
  });
  obj.material = next.length === 1 ? next[0] : next;
  obj.userData.fadeMats = Array.isArray(obj.material) ? obj.material : [obj.material];
}

function setFade(obj, opacity) {
  if (!obj) return;
  const a = THREE.MathUtils.clamp(opacity, 0, 1);
  obj.visible = a > 0.02;
  const mats = obj.userData.fadeMats || (Array.isArray(obj.material) ? obj.material : [obj.material]);
  for (const m of mats) {
    if (!m) continue;
    m.transparent = true;
    m.opacity = a;
    m.depthWrite = a > 0.9;
  }
}

function upgradeMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const upgraded = mats.map((m) => {
      if (!m) return m;
      const physical = m.isMeshPhysicalMaterial
        ? m
        : new THREE.MeshPhysicalMaterial({
            color: m.color?.clone?.() || new THREE.Color('#55D46A'),
            map: m.map || null,
            emissive: m.emissive?.clone?.() || new THREE.Color(0x000000),
            emissiveMap: m.emissiveMap || null,
            emissiveIntensity: m.emissiveIntensity ?? 1,
            roughness: m.roughness ?? 0.45,
            metalness: m.metalness ?? 0,
            transparent: !!m.transparent,
            opacity: m.opacity ?? 1,
            side: m.side ?? THREE.FrontSide,
          });

      if (obj.name.startsWith('GEO_Eye')) {
        physical.color.set('#FAF8F2');
        physical.roughness = 0.12;
        physical.clearcoat = 1;
        physical.clearcoatRoughness = 0.05;
        physical.envMapIntensity = 1.1;
      } else if (obj.name.startsWith('GEO_Pupil')) {
        physical.roughness = 0.35;
        physical.envMapIntensity = 0.35;
      } else if (obj.name.startsWith('GEO_Tongue')) {
        physical.color.set('#FF6860');
        physical.roughness = 0.28;
        physical.clearcoat = 0.25;
        physical.clearcoatRoughness = 0.2;
      } else if (obj.name.startsWith('GEO_Mouth')) {
        physical.color.set('#090303');
        physical.roughness = 0.95;
        physical.envMapIntensity = 0.05;
      } else if (
        obj.name.startsWith('GEO_Body') ||
        obj.name.startsWith('GEO_Bump') ||
        obj.name.startsWith('GEO_Arm') ||
        obj.name.startsWith('GEO_Foot')
      ) {
        physical.roughness = 0.42;
        physical.clearcoat = 0.18;
        physical.clearcoatRoughness = 0.45;
        physical.envMapIntensity = 0.55;
      }

      physical.flatShading = false;
      physical.needsUpdate = true;
      return physical;
    });
    obj.material = upgraded.length === 1 ? upgraded[0] : upgraded;
  });
}

function tintBodyMaterials(root, hex) {
  if (!root) return;
  const color = new THREE.Color(hex);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const isBody =
      obj.name.startsWith('GEO_Body') ||
      obj.name.startsWith('GEO_Bump') ||
      obj.name.startsWith('GEO_Arm') ||
      obj.name.startsWith('GEO_Foot');
    if (!isBody) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m.color) m.color.copy(color);
      if (m.emissive) m.emissive.copy(color).multiplyScalar(0.045);
    }
  });
}

function makeRibbonArc(width, depth, thickness, color = '#0A0505') {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-width, 0, 0),
    new THREE.Vector3(0, -depth, 0),
    new THREE.Vector3(width, 0, 0),
  );
  const points = curve.getPoints(48);
  const shape = new THREE.Shape();
  const hw = thickness * 0.5;
  shape.moveTo(points[0].x, points[0].y - hw);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y - hw);
  for (let i = points.length - 1; i >= 0; i--) shape.lineTo(points[i].x, points[i].y + hw);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness * 0.55,
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: thickness * 0.15,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.userData.fadeMats = [mat];
  return mesh;
}

function makeOMouthMesh() {
  const geo = new THREE.TorusGeometry(0.078, 0.022, 16, 48);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#0A0505',
    roughness: 0.88,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  // TorusGeometry already faces +Z (towards the camera); tipping it flat showed only a black bar.
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.userData.fadeMats = [mat];
  return mesh;
}

function setPartToggle(root, names, visible) {
  if (!root) return;
  root.traverse((obj) => {
    if (names.includes(obj.name)) obj.visible = visible;
  });
}

/**
 * Face is driven ONLY by config:
 *   lookX/lookY  (-1..1)  pupil gaze
 *   mouthOpen    (0..1)   how open the mouth is
 *   blink        (0..1)   eyelids closed
 *   mouthStyle   open | smile | o
 * Expressions in the UI write these same fields — no parallel preset fight.
 */
export default function GreenBlob({config, onError, onReady}) {
  const host = useRef(null);
  const live = useRef({config});
  live.current = {config};

  useEffect(() => {
    let renderer;
    let dead = false;
    let frame = 0;
    let pmrem = null;
    let envTex = null;
    const el = host.current;
    if (!el) return undefined;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch {
      onError?.('WebGL is unavailable. Please enable hardware acceleration.');
      return undefined;
    }

    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the clay's green saturated; ACES washed it out to mint.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.92, 4.35);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 7.2;
    controls.target.set(0, 0.88, 0);
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.minPolarAngle = Math.PI * 0.24;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.85;

    pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.5;

    const hemi = new THREE.HemisphereLight('#F2FFF2', '#3F8A58', 0.62);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF8D6', 1.85);
    key.position.set(2.4, 2.6, 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    key.shadow.blurSamples = 12;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -3.2;
    key.shadow.camera.right = 3.2;
    key.shadow.camera.top = 3.2;
    key.shadow.camera.bottom = -3.2;
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const fill = new THREE.DirectionalLight('#D8F4EA', 0.75);
    fill.position.set(-2.8, 1.6, 2.2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#E8FFD8', 0.55);
    rim.position.set(0.8, 2.0, -2.8);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 96),
      new THREE.MeshStandardMaterial({color: '#62A874', roughness: 0.94, metalness: 0}),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    const root = new THREE.Group();
    scene.add(root);

    const fx = new THREE.Group();
    const smileArc = makeRibbonArc(0.19, 0.088, 0.022);
    const oMouth = makeOMouthMesh();
    const lidL = makeRibbonArc(0.105, 0.072, 0.018);
    const lidR = makeRibbonArc(0.1, 0.068, 0.018);
    fx.add(smileArc, oMouth, lidL, lidR);

    let mascot = null;
    let morphMeshes = [];
    let parts = {};
    let lastBodyColor = '';
    let blinkHold = 0;
    let nextBlink = 2.8 + Math.random() * 2;

    const state = {
      lookX: 0,
      lookY: 0,
      mouthOpen: 1,
      blink: 0,
      openW: 1,
      smileW: 0,
      oW: 0,
      lidsW: 0,
      tongueW: 1,
      eyesW: 1,
      bob: 0,
      yaw: 0,
      scale: 1,
    };

    const tmp = new THREE.Vector3();

    function placeOverlayAt(mesh, source, offset = new THREE.Vector3()) {
      if (!source || !mascot) return;
      source.getWorldPosition(tmp);
      mascot.worldToLocal(tmp);
      mesh.position.copy(tmp).add(offset);
    }

    const surfaceRay = new THREE.Raycaster();
    function restOnSurface(mesh, surface, lift) {
      if (!surface || !mascot) return;
      mascot.updateWorldMatrix(true, true);
      const from = mascot.localToWorld(mesh.position.clone());
      from.z += 10;
      surfaceRay.set(from, new THREE.Vector3(0, 0, -1));
      const hit = surfaceRay.intersectObject(surface, true)[0];
      if (!hit) return;
      const local = mascot.worldToLocal(hit.point.clone());
      mesh.position.z = local.z + lift;
    }

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (dead) return;
        mascot = gltf.scene;
        upgradeMaterials(mascot);

        mascot.traverse((obj) => {
          if (!obj.isMesh) return;
          obj.castShadow = true;
          obj.receiveShadow = true;
        });

        const box = new THREE.Box3().setFromObject(mascot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        mascot.position.sub(center);
        mascot.position.y += size.y * 0.5;
        const fit = 2.15 / Math.max(size.x, size.y, size.z);
        mascot.scale.setScalar(fit);

        morphMeshes = findMorphMeshes(mascot);
        parts = {
          eyeL: findByName(mascot, 'GEO_Eye_L'),
          eyeR: findByName(mascot, 'GEO_Eye_R'),
          pupilL: findByName(mascot, 'GEO_Pupil_L'),
          pupilR: findByName(mascot, 'GEO_Pupil_R'),
          mouth: findByName(mascot, 'GEO_Mouth_Cavity'),
          tongue: findByName(mascot, 'GEO_Tongue'),
        };

        for (const key of ['mouth', 'tongue', 'eyeL', 'eyeR', 'pupilL', 'pupilR']) {
          prepareFadeMaterials(parts[key]);
        }

        // Store pupil rest pose in their OWN local space (simple + reliable)
        for (const key of ['pupilL', 'pupilR']) {
          const p = parts[key];
          if (p) p.userData.restPos = p.position.clone();
        }
        if (parts.mouth) parts.mouth.userData.restScale = parts.mouth.scale.clone();

        mascot.add(fx);
        placeOverlayAt(smileArc, parts.mouth, new THREE.Vector3(0.015, -0.02, 0.04));
        placeOverlayAt(oMouth, parts.mouth, new THREE.Vector3(0.015, 0.0, 0.045));
        // The mouth cavity sits behind the body's front surface, so overlays offset from it end up
        // buried inside the clay once the cavity fades (Smile, Surprised). Rest them on the skin instead.
        const body = findByName(mascot, 'GEO_Body');
        for (const overlay of [smileArc, oMouth]) restOnSurface(overlay, body, 0.014);
        placeOverlayAt(lidL, parts.eyeL, new THREE.Vector3(0, -0.01, 0.045));
        placeOverlayAt(lidR, parts.eyeR, new THREE.Vector3(0, -0.01, 0.045));
        smileArc.rotation.set(0.05, 0, 0);
        lidL.rotation.set(0.08, 0, 0.06);
        lidR.rotation.set(0.08, 0, -0.1);

        root.add(mascot);
        onReady?.({
          meshes: (() => {
            const names = [];
            mascot.traverse((o) => {
              if (o.isMesh) names.push(o.name);
            });
            return names;
          })(),
          morphs: morphMeshes[0] ? Object.keys(morphMeshes[0].morphTargetDictionary || {}) : [],
        });
      },
      undefined,
      () => onError?.('Could not load the green blob model.'),
    );

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const clock = new THREE.Clock();

    function animate() {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      const c = live.current.config;
      const motion = c.motion ? 1 : 0;

      scene.background = new THREE.Color(c.studio);
      floor.material.color.set(c.floor);
      floor.visible = c.showFloor;
      hemi.intensity = c.ambient;
      key.intensity = c.keyLight * 0.9;
      fill.intensity = c.fillLight;
      rim.intensity = c.rimLight;
      renderer.toneMappingExposure = c.exposure;
      controls.autoRotate = c.autoRotate && !!c.motion;
      controls.autoRotateSpeed = (c.spinSpeed || 1) * 0.7;

      const style = c.mouthStyle || 'open';
      const showMouth = c.showMouth !== false;
      const showTongue = c.showTongue !== false;
      const showEyes = c.showEyes !== false;

      // Direct targets from sliders / expression-written config
      let targetLookX = THREE.MathUtils.clamp(c.lookX ?? 0, -1, 1);
      let targetLookY = THREE.MathUtils.clamp(c.lookY ?? 0, -1, 1);
      let targetMouth = THREE.MathUtils.clamp(c.mouthOpen ?? 0, 0, 1);
      let targetBlink = THREE.MathUtils.clamp(c.blink ?? 0, 0, 1);

      let wantOpen = style === 'open' && showMouth ? 1 : 0;
      let wantSmile = style === 'smile' && showMouth ? 1 : 0;
      let wantO = style === 'o' && showMouth ? 1 : 0;
      let wantTongue = style === 'open' && showTongue ? targetMouth : 0;
      let wantEyes = showEyes ? 1 - targetBlink : 0;
      let wantLids = showEyes ? targetBlink : 0;

      // Soft auto-blink only when eyes aren't already closed by slider
      if (c.autoBlink && motion && showEyes && targetBlink < 0.15) {
        nextBlink -= dt;
        if (nextBlink <= 0 && blinkHold <= 0) {
          blinkHold = 0.16;
          nextBlink = 2.8 + Math.random() * 3.2;
        }
        if (blinkHold > 0) {
          blinkHold -= dt;
          const u = 1 - blinkHold / 0.16;
          const pulse = Math.sin(THREE.MathUtils.clamp(u, 0, 1) * Math.PI);
          targetBlink = Math.max(targetBlink, pulse);
          wantLids = Math.max(wantLids, pulse);
          wantEyes = Math.min(wantEyes, 1 - pulse * 0.95);
        }
      }

      state.lookX = damp(state.lookX, targetLookX, 10, dt);
      state.lookY = damp(state.lookY, targetLookY, 10, dt);
      state.mouthOpen = damp(state.mouthOpen, targetMouth, 10, dt);
      state.blink = damp(state.blink, targetBlink, 14, dt);
      state.openW = damp(state.openW, wantOpen, 11, dt);
      state.smileW = damp(state.smileW, wantSmile, 11, dt);
      state.oW = damp(state.oW, wantO, 11, dt);
      state.tongueW = damp(state.tongueW, wantTongue, 11, dt);
      state.lidsW = damp(state.lidsW, wantLids, 14, dt);
      state.eyesW = damp(state.eyesW, wantEyes, 14, dt);
      state.yaw = damp(state.yaw, c.yaw || 0, 8, dt);
      state.scale = damp(state.scale, c.scale || 1, 8, dt);
      // Optional camera zoom, framed around the orbit target.
      if (camera.zoom !== (c.zoom || 1)) {
        camera.zoom = c.zoom || 1;
        camera.updateProjectionMatrix();
      }
      state.bob = damp(state.bob, Math.sin(t * (c.bobSpeed || 1.4)) * (c.bobAmount || 0) * motion, 6, dt);

      // Morphs (body shape keys) — mouthOpen/blink if present in GLB
      setMorph(morphMeshes, 'mouthOpen', state.mouthOpen * state.openW);
      setMorph(morphMeshes, 'blink', state.blink);

      if (mascot) {
        if (c.bodyColor !== lastBodyColor) {
          tintBodyMaterials(mascot, c.bodyColor);
          lastBodyColor = c.bodyColor;
        }

        // Mouth / tongue visibility from style + mouthOpen
        const cavityFade = state.openW * (0.35 + 0.65 * state.mouthOpen);
        setFade(parts.mouth, cavityFade);
        setFade(parts.tongue, state.tongueW * state.openW * (0.25 + 0.75 * state.mouthOpen));

        // Eyes / pupils / lids from blink
        setFade(parts.eyeL, state.eyesW);
        setFade(parts.eyeR, state.eyesW);
        setFade(parts.pupilL, state.eyesW);
        setFade(parts.pupilR, state.eyesW);

        setPartToggle(mascot, ['GEO_Arm_L', 'GEO_Arm_R'], c.showArms !== false);
        setPartToggle(mascot, ['GEO_Foot_L', 'GEO_Foot_R'], c.showFeet !== false);
        setPartToggle(mascot, ['GEO_Bump_Front', 'GEO_Bump_Mid', 'GEO_Bump_Back'], c.showBumps !== false);

        // Pupils: simple local offset from rest (X = left/right, Y = up/down)
        const amp = 0.11;
        for (const key of ['pupilL', 'pupilR']) {
          const p = parts[key];
          if (!p?.userData.restPos) continue;
          const r = p.userData.restPos;
          p.position.set(r.x + state.lookX * amp, r.y + state.lookY * amp, r.z);
        }

        // Mouth cavity scale responds to mouthOpen
        if (parts.mouth?.userData.restScale) {
          const rs = parts.mouth.userData.restScale;
          const open = state.mouthOpen;
          if (state.oW > 0.05) {
            const k = state.oW;
            parts.mouth.scale.set(
              rs.x * (1 - k * 0.45),
              rs.y * (1 - k * 0.1),
              rs.z * (1 + k * 0.15),
            );
          } else {
            // Slightly squash when less open
            parts.mouth.scale.set(rs.x * (0.85 + 0.15 * open), rs.y * (0.55 + 0.45 * open), rs.z * (0.7 + 0.3 * open));
          }
        }

        setFade(smileArc, state.smileW);
        setFade(oMouth, state.oW);
        setFade(lidL, state.lidsW);
        setFade(lidR, state.lidsW);
        smileArc.scale.setScalar(0.92 + state.smileW * 0.1);
        oMouth.scale.setScalar(0.75 + state.oW * 0.35 * (0.6 + 0.4 * state.mouthOpen));
        lidL.scale.setScalar(0.9 + state.lidsW * 0.12);
        lidR.scale.setScalar(0.9 + state.lidsW * 0.12);
      }

      root.position.y = state.bob;
      root.rotation.y = THREE.MathUtils.degToRad(state.yaw);
      root.rotation.z = Math.sin(t * 0.55) * 0.012 * motion;
      root.scale.setScalar(state.scale);

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      envTex?.dispose?.();
      pmrem?.dispose?.();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m.dispose?.();
        }
      });
      renderer.dispose();
      el.replaceChildren();
    };
  }, [onError, onReady]);

  return <div className="presence green-blob-stage" ref={host} />;
}
