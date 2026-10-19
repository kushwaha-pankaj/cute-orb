import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createRenderLoop, renderPixelRatio} from './renderLoop';
import {createTofuModel} from './TofuModel';
import {TOFU_DEFAULTS} from './tofuExpressions';

export default function TofuMascot({config, pointer, audioLevel = 0, controlRef, onReady, onError}) {
  const host = useRef(null), live = useRef(null);
  live.current = {config, pointer, audioLevel, onReady, onError};
  useEffect(() => {
    const el = host.current; let renderer;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    } catch {
      live.current.onError?.('WebGL is unavailable. Enable hardware acceleration to see Tofu.'); return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Tofu mascot. Drag to orbit and scroll to zoom.');
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; scene.environmentIntensity = .35;
    room.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    const resetCamera = () => { camera.position.set(0, 2.65, 10.8); controls.target.set(0, 1.93, 0); controls.update(); };
    resetCamera(); controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 6.5; controls.maxDistance = 15;
    controls.minPolarAngle = .4; controls.maxPolarAngle = Math.PI * .51;
    controls.autoRotateSpeed = .8;
    scene.add(new THREE.HemisphereLight('#ffffff', '#b4a28d', 1.65));
    const key = new THREE.DirectionalLight('#fff5e8', 2.3); key.position.set(-3, 7, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6; key.shadow.camera.far = 20;
    key.shadow.normalBias = .025; key.shadow.bias = -.0002; key.shadow.radius = 5; key.shadow.blurSamples = 8; scene.add(key);
    const fill = new THREE.DirectionalLight('#ffffff', 1.5); fill.position.set(4, 3, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight('#fff5e7', 1.3); rim.position.set(2, 5, -4); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({color: TOFU_DEFAULTS.background, roughness: 1}));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.002; floor.receiveShadow = true; scene.add(floor);
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(67,49,29,.26)'); gradient.addColorStop(.45, 'rgba(67,49,29,.12)'); gradient.addColorStop(1, 'rgba(67,49,29,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas); shadowTexture.colorSpace = THREE.SRGBColorSpace;
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), new THREE.MeshBasicMaterial({map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false}));
    contact.rotation.x = -Math.PI / 2; contact.position.y = .005; scene.add(contact);
    const rig = createTofuModel(); scene.add(rig.root);
    const background = new THREE.Color(); const fog = new THREE.Fog(TOFU_DEFAULTS.background, 15, 35);
    let time = 0, disposed = false, stopLoop = () => {};
    function draw(delta = 0, initial = false) {
      const {config: supplied, pointer: cursor, audioLevel: level} = live.current;
      const c = {...TOFU_DEFAULTS, ...supplied};
      if (c.motion) time += delta * c.speed;
      rig.update(c, time, delta, cursor?.current || {x: 0, y: 0}, level || 0, initial);
      floor.visible = contact.visible = !c.transparent; key.castShadow = !c.transparent;
      scene.background = c.transparent ? null : background.set(c.background);
      scene.fog = c.transparent ? null : fog; fog.color.set(c.background); floor.material.color.set(c.background);
      renderer.setClearColor(background, c.transparent ? 0 : 1); renderer.toneMappingExposure = c.exposure;
      if (camera.zoom !== c.zoom) { camera.zoom = c.zoom; camera.updateProjectionMatrix(); }
      controls.autoRotate = c.motion && c.autoRotate; controls.update();
      renderer.render(scene, camera);
    }
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setPixelRatio(renderPixelRatio(w, h)); renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    if (controlRef) controlRef.current = {resetCamera, capture() { draw(); return renderer.domElement.toDataURL('image/png'); }};
    // Prepare the selected pose before compilation, then report ready only after drawing it.
    rig.update(live.current.config, 0, 0, {x: 0, y: 0}, 0, true);
    const compilation = renderer.compileAsync(scene, camera);
    compilation.then(() => {
      if (disposed) return;
      draw(0, true); live.current.onReady?.();
      stopLoop = createRenderLoop(el, (_now, delta) => draw(delta));
    }).catch(() => { if (!disposed) live.current.onError?.('The 3D character could not start. Reload to try again.'); });
    const lost = event => { event.preventDefault(); stopLoop(); live.current.onError?.('The graphics context was interrupted. Reload to restore the character.'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; stopLoop(); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      if (controlRef) controlRef.current = null;
      renderer.domElement.remove();
      // Three's parallel compiler still polls its programs after unmount. Keep GPU
      // resources alive until that work settles, so a fast route change cannot
      // invalidate a program while it is being checked.
      const release = () => {
        rig.dispose(); contact.geometry.dispose(); contact.material.dispose(); shadowTexture.dispose();
        floor.geometry.dispose(); floor.material.dispose(); key.shadow.map?.dispose(); key.shadow.mapPass?.dispose();
        environment.dispose(); renderer.dispose();
      };
      compilation.then(release, release);
    };
  }, []);
  return <div className="presence" ref={host} />;
}
