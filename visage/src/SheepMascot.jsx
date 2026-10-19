import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {FACE_BASE,SHEEP_EXPRESSIONS} from './sheepExpressions';

import {createSheepModel} from './SheepModel';

export default function SheepMascot({config,audioLevel=0,onReady,onError,controlRef,pointer}){
  const host=useRef();const live=useRef();live.current={config,audioLevel,onReady,onError,pointer};
  useEffect(()=>{
    const el=host.current;let renderer;const clear=!!live.current.config.transparent;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:clear,preserveDrawingBuffer:true,premultipliedAlpha:true})}catch{live.current.onError?.('WebGL is unavailable. Enable hardware acceleration to render the sheep.');return}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,clear?0:1);renderer.shadowMap.enabled=!clear;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Interactive 3D sheep mascot. Drag to orbit and scroll to zoom.');
    const scene=new THREE.Scene();if(!clear)scene.fog=new THREE.Fog('#d5c9be',11,27);
    // Transparent hero: pull back a touch and aim slightly lower so feet + soft shadow clear the frame.
    const camera=new THREE.PerspectiveCamera(clear?28:31,1,.1,100);camera.position.set(clear?-0.1: -.25,clear?2.55:2.5,clear?11.8:10.4);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,clear?1.95:2.02,0);controls.update();controls.enableDamping=true;controls.enablePan=false;controls.minDistance=5.3;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*.53;if(clear){controls.enableZoom=false;controls.minPolarAngle=controls.maxPolarAngle=Math.PI*.46}
    const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#fff5e6','#95877b',1.1));
    const key=new THREE.DirectionalLight('#fff2df',2.2);key.position.set(-2.2,8,4.5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
    // Shadow camera must be larger than the visible ground — a tight frustum draws a hard cut line in-frame.
    key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-6;key.shadow.camera.near=.5;key.shadow.camera.far=20;
    key.shadow.normalBias=.03;key.shadow.bias=-.00025;key.shadow.radius=clear?6:4;key.shadow.blurSamples=clear?12:8;scene.add(key);
    const fill=new THREE.DirectionalLight('#f2f4ff',1.3);fill.position.set(4,3,-2);scene.add(fill);
    // Hero: skip ShadowMaterial (its map edge is what was cutting). Soft contact blob only.
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),clear?new THREE.MeshBasicMaterial({transparent:true,opacity:0}):new THREE.MeshStandardMaterial({color:'#d5c9be',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=.015;ground.receiveShadow=!clear;scene.add(ground);
    // Soft contact blob: large plane + compact radial so the mesh silhouette never chisels the falloff.
    const sc=document.createElement('canvas');sc.width=sc.height=256;const sx=sc.getContext('2d');sx.clearRect(0,0,256,256);const sg=sx.createRadialGradient(128,128,1,128,128,72);sg.addColorStop(0,clear?'rgba(55,35,20,.22)':'rgba(60,40,25,.28)');sg.addColorStop(.5,clear?'rgba(55,35,20,.08)':'rgba(60,40,25,.12)');sg.addColorStop(1,'rgba(60,40,25,0)');sx.fillStyle=sg;sx.fillRect(0,0,256,256);const shadowTexture=new THREE.CanvasTexture(sc);shadowTexture.colorSpace=THREE.SRGBColorSpace;
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(clear?2.8:3.2,clear?2.2:2.3),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:1,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.02,0);scene.add(shadow);
    if(clear)key.castShadow=false;
    const rig=createSheepModel();if(clear)rig.root.position.y=.2;scene.add(rig.root);let frame,elapsed=0,previous=performance.now(),nextBlink=2.7,blinkTime=0,faceTick=0;const smooth={...FACE_BASE,blink:0};
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();
    const api={resetCamera(){camera.position.set(clear?-0.1:-.25,clear?2.55:2.5,clear?11.8:10.4);controls.target.set(0,clear?1.95:2.02,0);controls.update()},capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')}};
    if(controlRef)controlRef.current=api;live.current.onReady?.();
    const damp=(a,b,dt)=>THREE.MathUtils.damp(a,b,9,dt);
    // Smoothed cursor (-1..1) from the optional `pointer` ref; config.follow switches it on.
    let fx=0,fy=0;
    function animate(now){frame=requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;const c=live.current.config;if(c.motion)elapsed+=dt*c.speed;const t=elapsed;
      if(!clear){scene.background=new THREE.Color(c.background);scene.fog.color.set(c.background);ground.material.color.set(c.background)}rig.skin.color.set(c.skin);rig.faceSkin.color.set(c.skin);rig.wool.color.set(c.wool);renderer.toneMappingExposure=c.exposure;camera.zoom=c.zoom;camera.updateProjectionMatrix();controls.autoRotate=c.autoRotate&&c.motion;controls.autoRotateSpeed=.8;controls.update();
      const target={...FACE_BASE,...SHEEP_EXPRESSIONS[c.expression]};if(c.motion&&c.state==='idle'){target.lookX+=Math.sin(t*.43)*.045;target.lookY+=Math.sin(t*.31)*.025}
      if(c.state==='thinking'){target.lookX=Math.sin(t*.7)*.55;target.lookY=.5;target.brow=.35;target.tilt=-.14}
      if(c.state==='listening'){target.eyes=.95;target.tilt=.15;target.brow=.2}
      if(c.state==='sleeping'){target.eyes=0;target.tilt=.23}
      if(c.state==='success'){target.smile=1;target.mouth=.4;target.bounce=.08}
      if(c.state==='error'){target.brow=.8;target.smile=-.5;target.tilt=-.15}
      for(const k of Object.keys(FACE_BASE))target[k]=FACE_BASE[k]+(target[k]-FACE_BASE[k])*c.intensity;
      const p=live.current.pointer?.current,follow=!!(p&&c.follow&&c.motion&&c.state!=='sleeping');fx=THREE.MathUtils.damp(fx,follow?p.x:0,5,dt);fy=THREE.MathUtils.damp(fy,follow?p.y:0,5,dt);
      target.lookX=THREE.MathUtils.clamp(target.lookX+c.gazeX+fx*.7,-1,1);target.lookY=THREE.MathUtils.clamp(target.lookY+c.gazeY+fy*.55,-1,1);
      target.mouth=Math.max(target.mouth,c.mouthOpen,live.current.audioLevel);
      if(c.state==='speaking'&&c.motion)target.mouth=Math.max(target.mouth,.08+Math.abs(Math.sin(t*11)*Math.sin(t*7.1))*.65);
      if(c.viseme!=='auto'){const visemes={rest:[0,0],A:[.85,0],E:[.35,0],O:[.7,1],U:[.35,1],M:[0,0],F:[.12,0]};[target.mouth,target.round]=visemes[c.viseme]||[0,0]}
      let blink=0;if(c.motion&&c.autoBlink){nextBlink-=dt;if(nextBlink<0){blinkTime=.18;nextBlink=2.8+Math.random()*3}if(blinkTime>0){blinkTime-=dt;blink=Math.sin(Math.max(0,blinkTime)/.18*Math.PI)}}target.blink=blink;
      for(const k in smooth)smooth[k]=damp(smooth[k],target[k]??0,dt);
      rig.root.rotation.y=c.yaw-.12+fx*.3;rig.root.position.y=(clear?.2:0)+(c.motion?Math.abs(Math.sin(t*3))*smooth.bounce:0);rig.body.scale.y=1+(c.motion?Math.sin(t*1.65)*.007:0);rig.tail.rotation.x=c.motion?Math.sin(t*1.3)*.05:0;
      rig.head.rotation.z=smooth.tilt;rig.head.rotation.x=c.motion?(c.state==='listening'?Math.sin(t*2)*.04:Math.sin(t*.9)*.012+(c.state==='speaking'?Math.sin(t*4)*.015:0)):0;
      rig.head.rotation.y=smooth.lookX*.065+fx*.22;rig.head.rotation.x-=fy*.1;
      rig.ears.forEach((ear,i)=>{ear.rotation.z=(i?1:-1)*.12+(c.motion?Math.sin(t*1.7+i)*.035:0)});
      const ref=c.pose==='reference';rig.legs[0].rotation.x=damp(rig.legs[0].rotation.x,ref?-1.12: c.pose==='dance'?Math.sin(t*3)*.6:0,dt);rig.legs[0].rotation.z=damp(rig.legs[0].rotation.z,ref?-.82:0,dt);rig.legs[1].rotation.z=-.08;
      rig.updateArms(c.pose,t,dt,c.motion);
      if(++faceTick%2===0){rig.updateFace(smooth,t)}renderer.render(scene,camera);
    }frame=requestAnimationFrame(animate);
    const lost=e=>{e.preventDefault();live.current.onError?.('The graphics context was interrupted. Reload to restore the 3D preview.')};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{cancelAnimationFrame(frame);ro.disconnect();controls.dispose();if(controlRef)controlRef.current=null;const geos=new Set(),mats=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();renderer.domElement.remove()};
  },[]);
  return <div className="presence sheep-canvas" ref={host}/>;
}
