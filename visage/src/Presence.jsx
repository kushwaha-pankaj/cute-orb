import {useEffect,useRef} from 'react';
import * as THREE from 'three';
const vertex=`
float safePow(float x,float y){return pow(abs(x),y);}
uniform float time,morph,energy,speed,scatter,pointSize,mode,motion,scroll,lightMode;uniform vec2 pointer;attribute vec3 sphere;attribute float seed;varying vec3 vColor;varying float vAlpha;
void main(){vColor=color;vec3 p=mix(position,sphere,morph);float t=time*speed;float wave=sin(t*1.3+seed*12.)*.035+sin(t*.7+position.y*5.)*.018;
 p+=normalize(p+vec3(.001))*(wave+energy*.13)*motion;
 float activity=mode==2.? .075 : mode==3.? energy*.15 : mode==1.?energy*.07:.008;
 p.x+=sin(t*2.+seed*60.)*(scatter*.23+activity)*motion;p.y+=cos(t*1.7+seed*50.)*(scatter*.23+activity)*motion;p.z+=sin(t+seed*30.)*scatter*.7*motion;
 float edge=smoothstep(.62,1.25,length(vec2((position.x-.08)/.68,(position.y+.03)/1.05)));
 float life=fract(t*.18+seed);float travel=life*life*(.45+scroll*.55);vec2 outward=normalize(position.xy-vec2(.08,-.03)+vec2(.001));
 p.xy+=outward*travel*edge*(1.-morph)*motion;p.z+=travel*edge*.55*(1.-morph)*motion;
 float mouth=exp(-safePow((position.y+.55)*9.,2.))*exp(-safePow((position.x-.1)*4.,2.));p.y-=mouth*energy*.025*(1.-morph)*motion;
 float d=distance(p.xy,pointer*1.8);p.xy+=normalize(p.xy-pointer*1.8+vec2(.001))*exp(-d*5.)*.13*motion;
 vAlpha=clamp(max(color.r,max(color.g,color.b))*2.,.15,1.)*mix(1.,(1.-smoothstep(.65,1.,life))*(.55+.45*smoothstep(0.,.12,life)),edge*(1.-morph));if(lightMode>.5){vColor=mix(vec3(.53,.47,.84),clamp(color*1.4,0.,1.),.45);vAlpha*=mix(.55,step(.78,seed)*.46,1.-morph);}
vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=pointSize*(3.8/-mv.z)*(1.+energy*.35);}`;
const fragment=`uniform vec3 tint;uniform float glow;varying vec3 vColor;varying float vAlpha;void main(){vec2 p=gl_PointCoord-.5;float a=1.-smoothstep(.3,.5,length(p));gl_FragColor=vec4(vColor*tint*(1.+glow*.7),a*vAlpha);}`;
export default function Presence({config,state,audioLevel,onError,speechCue,theme='dark'}){const host=useRef();const live=useRef({config,state,audioLevel,theme,speechCue});live.current={config,state,audioLevel,theme,speechCue};useEffect(()=>{let renderer,dead=false,frame,geometry,material,points,face,faceGeometry,faceMaterial,faceTexture;const el=host.current;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(e){onError('WebGL is unavailable. Please enable hardware acceleration.');return;}renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.z=5.3;const pointer=new THREE.Vector2(9,9);let rotX=0,rotY=0,scrollTarget=0,scrollProgress=0;const onScroll=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);scrollTarget=Math.min(1,Math.max(0,scrollY/max));};onScroll();window.addEventListener('scroll',onScroll,{passive:true});const clock=new THREE.Clock();const img=new Image();img.src=import.meta.env.BASE_URL+'visage.png';img.onerror=()=>onError('Could not load the face image.');img.onload=()=>{if(dead)return;const c=document.createElement('canvas');c.width=360;c.height=336;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const pixels=ctx.getImageData(0,0,c.width,c.height).data;const pos=[],colors=[],spheres=[],seeds=[];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;const l=Math.max(r,g,b);if(l<.12)continue;const px=(x/c.width-.5)*3.7,py=(.5-y/c.height)*3.45;const core=Math.pow((px-.08)/.68,2)+Math.pow((py+.03)/1.05,2);if(core>1.&&((x*17+y*31)%7)>4)continue;if(core<=1.&&((x+y)%3)!==0)continue;const depth=Math.exp(-(px*px*1.8+py*py*.8))*.23+l*.045;pos.push(px,py,depth);colors.push(r,g,b);const n=seeds.length;const u=((n*.61803398875)%1),v=((n*.754877666)%1);const theta=u*Math.PI*2,zz=2*v-1,rr=Math.sqrt(1-zz*zz);spheres.push(rr*Math.cos(theta)*1.1,zz*1.1,rr*Math.sin(theta)*1.1);seeds.push(Math.random());}geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('sphere',new THREE.Float32BufferAttribute(spheres,3));geometry.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1));material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{lightMode:{value:0},scroll:{value:0},time:{value:0},morph:{value:0},energy:{value:0},speed:{value:1},scatter:{value:0},pointSize:{value:2},mode:{value:0},motion:{value:1},pointer:{value:pointer},tint:{value:new THREE.Color('#ffffff')},glow:{value:.5}}});points=new THREE.Points(geometry,material);scene.add(points);
faceTexture=new THREE.Texture(img);faceTexture.needsUpdate=true;
faceGeometry=new THREE.PlaneGeometry(3.7,3.45,100,100);
const fp=faceGeometry.attributes.position;for(let i=0;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i);fp.setZ(i,Math.exp(-(x*x*1.8+y*y*.8))*.23+.025);}fp.needsUpdate=true;
faceMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:faceTexture},opacity:{value:1},lightMode:{value:0},jaw:{value:0},roundness:{value:0},tint:{value:new THREE.Color('#ffffff')},time:{value:0},energy:{value:0},motion:{value:1}},vertexShader:`float safePow(float x,float y){return pow(abs(x),y);} varying vec2 vUv;uniform float time,energy,motion,jaw;void main(){vUv=uv;vec3 p=position;float chin=exp(-safePow((p.y+.83)*5.,2.))*exp(-safePow((p.x-.1)*3.,2.));p.y-=chin*jaw*.035*motion;float nose=exp(-safePow((p.x-.09)*8.,2.)-safePow((p.y+.12)*4.,2.));p.z+=nose*.035;p.z+=sin(time*.8)*.012*motion;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`float safePow(float x,float y){return pow(abs(x),y);} varying vec2 vUv;uniform sampler2D map;uniform float opacity,lightMode,jaw,roundness;uniform vec3 tint;
void main(){
 vec2 uv=vUv;vec2 centre=vec2(.528,.339);vec2 d=uv-centre;
 float local=exp(-safePow(d.x/.073,4.)-safePow(d.y/.073,4.));
 float opening=jaw*.021;float width=1.-roundness*.23;
 uv.x=centre.x+d.x*(1.+local*(1./width-1.));
 // Move the upper and lower lip separately, preserving the original lip texture.
 uv.y-=(d.y/sqrt(d.y*d.y+.0000277))*opening*local*(d.y>0.? .35:.65);
 vec3 c=texture2D(map,uv).rgb;
 float cavity=1.-smoothstep(.84,1.,length(vec2(d.x/(.049*width), (d.y+opening*.15)/max(.0001,opening*.72))));
 cavity*=smoothstep(.05,.22,jaw);
 c=mix(c,vec3(.065,.055,.17)+vec3(.07,.035,.075)*clamp(-d.y/.025,0.,1.),cavity);
 vec2 q=(vUv-vec2(.52,.49))/vec2(.195,.31);
 float mask=1.-smoothstep(.65,1.2,length(q));
 float brightness=max(c.r,max(c.g,c.b));
 float core=1.-smoothstep(.35,.75,length((vUv-vec2(.527,.425))/vec2(.14,.24)));
 float coverage=mix(1.,max(core,smoothstep(.16,.43,brightness)),lightMode);
 vec3 clean=mix(c,c/max(brightness,.45)*.91,lightMode*(1.-core));
 gl_FragColor=vec4(clean*tint*1.06,mask*coverage*opacity);
}`});
face=new THREE.Mesh(faceGeometry,faceMaterial);face.renderOrder=1;scene.add(face);};
const resize=()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(el);resize();const move=e=>{const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);rotY=pointer.x*.16;rotX=-pointer.y*.09;};const leave=()=>{pointer.set(9,9);rotX=rotY=0;};el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);
function animate(){frame=requestAnimationFrame(animate);scrollProgress+=(scrollTarget-scrollProgress)*.045;const t=clock.getElapsedTime(),{config:c,state:s,audioLevel:a,theme:currentTheme,speechCue:cue}=live.current;if(material){const u=material.uniforms;const light=currentTheme==='light';material.blending=light?THREE.NormalBlending:THREE.AdditiveBlending;u.lightMode.value=light?1:0;u.time.value=t;u.morph.value+=(c.form-u.morph.value)*.045;let targetJaw=0,targetRound=0;
if(s==='speaking'){
 const speech=cue?.current;let ch='a';
 if(speech?.active){const elapsed=(performance.now()-speech.stamp)/1000;const index=speech.index+Math.floor(elapsed*12);ch=speech.text[Math.min(index,speech.text.length-1)]?.toLowerCase()||' ';}
 else {const pattern='a e o m i u ';ch=pattern[Math.floor(t*9)%pattern.length];}
 const closed=/[mbp\s.,!?]/.test(ch);targetRound=/[ouwq]/.test(ch)?1:0;
 const syllable=.35+.65*Math.pow(Math.sin(t*12.5),2.);
 targetJaw=closed?.025:(/[ae]/.test(ch)?.85:/[iou]/.test(ch)?.55:.35)*syllable;
 if(a!=null)targetJaw*=Math.min(1,Math.max(0,a)*2.5);
}
let e=s==='speaking'?targetJaw:s==='listening'?(a||0):s==='thinking'?.18:0;
faceMaterial.uniforms.jaw.value+=(targetJaw*(c.motion?1:0)-faceMaterial.uniforms.jaw.value)*.24;
faceMaterial.uniforms.roundness.value+=(targetRound-faceMaterial.uniforms.roundness.value)*.18;
u.energy.value+=(e*c.sensitivity-u.energy.value)*.12;u.speed.value=c.speed;u.scatter.value=c.scatter;u.pointSize.value=c.size;u.mode.value=['idle','listening','thinking','speaking'].indexOf(s);u.motion.value=c.motion?1:0;u.glow.value=c.glow;u.tint.value.set(c.tint);const scrollMotion=c.motion?scrollProgress:0;u.scroll.value=scrollMotion;points.rotation.set(0,0,0);points.position.y=scrollMotion*.10;points.position.z=Math.sin(scrollMotion*Math.PI)*.24;points.scale.setScalar(c.scale*(1.+Math.sin(scrollMotion*Math.PI)*.07));face.position.copy(points.position);face.rotation.copy(points.rotation);face.scale.copy(points.scale);faceMaterial.uniforms.opacity.value=1.-u.morph.value;faceMaterial.uniforms.lightMode.value=light?1:0;faceMaterial.uniforms.tint.value.set(c.tint);faceMaterial.uniforms.time.value=t;faceMaterial.uniforms.energy.value=u.energy.value;faceMaterial.uniforms.motion.value=c.motion?1:0;}renderer.render(scene,camera);}animate();return()=>{dead=true;cancelAnimationFrame(frame);ro.disconnect();window.removeEventListener('scroll',onScroll);el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);faceGeometry?.dispose();faceMaterial?.dispose();faceTexture?.dispose();geometry?.dispose();material?.dispose();renderer.dispose();el.replaceChildren();};},[]);return <div className="presence" ref={host}/>;}
