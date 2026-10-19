import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import typeface from 'three/examples/fonts/helvetiker_bold.typeface.json';

/** A small sculpture, rendered only while the footer is in view. */
export default function FooterWordmark() {
  const host = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 2, -2, 0.1, 40);
    camera.position.set(0, 0, 12);
    scene.add(new THREE.HemisphereLight(0xfff8ed, 0x65422c, 2));
    const key = new THREE.DirectionalLight(0xfff1d6, 3);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 3);
    rim.position.set(4, 2, -2);
    scene.add(rim);

    const font = new FontLoader().parse(typeface);
    const geometry = new TextGeometry('Mascotty', {
      font, size: 1, depth: 0.28, curveSegments: 10,
      bevelEnabled: true, bevelThickness: 0.065, bevelSize: 0.038, bevelSegments: 5,
    });
    geometry.center();
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const front = new THREE.MeshStandardMaterial({color: '#e2690f', roughness: 0.3, metalness: 0.12});
    const sides = new THREE.MeshStandardMaterial({color: '#bd4b08', roughness: 0.42, metalness: 0.08});
    const mesh = new THREE.Mesh(geometry, [front, sides]);
    scene.add(mesh);
    mesh.rotation.set(-0.14, -0.075, -0.025);
    const target = {x: -0.14, y: -0.075};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let frame = 0;

    const render = () => renderer.render(scene, camera);
    const animate = () => {
      mesh.rotation.x += (target.x - mesh.rotation.x) * 0.07;
      mesh.rotation.y += (target.y - mesh.rotation.y) * 0.07;
      render();
      const moving = Math.abs(target.x - mesh.rotation.x) + Math.abs(target.y - mesh.rotation.y) > 0.0005;
      if (moving && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(animate);
      else frame = 0;
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden) {
        if (reduced.matches) {
          mesh.rotation.set(-0.14, -0.075, -0.025);
          render();
        } else animate();
      }
    };
    const resize = new ResizeObserver(() => {
      const {width, height} = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const halfHeight = Math.max(size.y * 0.85, (size.x * 0.55) / (width / height));
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.right = halfHeight * width / height;
      camera.left = -camera.right;
      camera.updateProjectionMatrix();
      render();
      setReady(true);
    });
    resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el);
    const move = event => {
      if (reduced.matches || event.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      target.y = ((event.clientX - rect.left) / rect.width - 0.5) * 0.28 - 0.075;
      target.x = ((event.clientY - rect.top) / rect.height - 0.5) * 0.18 - 0.14;
      if (!frame && visible) update();
    };
    const reset = () => { target.x = -0.14; target.y = -0.075; if (!frame && visible) update(); };
    const contextLost = event => { event.preventDefault(); setReady(false); visible = false; update(); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      geometry.dispose();
      front.dispose();
      sides.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className={`lp-wordmark${ready ? ' is-ready' : ''}`} ref={host} aria-hidden="true">
    <span>Mascotty</span>
  </div>;
}
