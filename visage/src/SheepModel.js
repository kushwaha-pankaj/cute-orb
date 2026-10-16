import * as THREE from 'three';

const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const clamp = THREE.MathUtils.clamp;

// Deform an existing tube in place: expressions never allocate new GPU buffers.
function makeStroke(parent, material, radius=.008, segments=32) {
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array((segments+1)*7*3), indices=[];
  for(let i=0;i<segments;i++)for(let j=0;j<6;j++){
    const a=i*7+j,b=a+7;indices.push(a,b,a+1,b,b+1,a+1);
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;parent.add(mesh);
  mesh.update=(fn,r=radius)=>{
    for(let i=0;i<=segments;i++){
      const u=i/segments,p=fn(u),t=fn(Math.min(1,u+.001)).sub(fn(Math.max(0,u-.001))).normalize();
      const n=V(-t.y,t.x,0).normalize(),b=new THREE.Vector3().crossVectors(t,n).normalize();
      for(let j=0;j<=6;j++){
        const rr=typeof r==='function'?r(u):r;
        const a=j/6*Math.PI*2,point=p.clone().addScaledVector(n,Math.cos(a)*rr).addScaledVector(b,Math.sin(a)*rr);
        geometry.attributes.position.setXYZ(i*7+j,point.x,point.y,point.z);
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
  };
  return mesh;
}

export function createSheepModel() {
  const root=new THREE.Group();root.name='Mallow_Root';
  let seed=4867;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
  const sphere=new THREE.SphereGeometry(1,48,32);
  const skin=new THREE.MeshPhysicalMaterial({color:'#edb59a',roughness:.62,metalness:0,clearcoat:.04,clearcoatRoughness:.85,sheen:.22,sheenColor:'#ffd0b1',sheenRoughness:.9});
  const earInside=new THREE.MeshPhysicalMaterial({color:'#d68e74',roughness:.8,sheen:.25,sheenColor:'#ffbba2'});
  const wool=new THREE.MeshPhysicalMaterial({color:'#e8e4d8',roughness:1,sheen:1,sheenColor:'#ffffff',sheenRoughness:1});
  const hoof=new THREE.MeshStandardMaterial({color:'#4a281b',roughness:.5});
  const soleMat=new THREE.MeshStandardMaterial({color:'#754122',roughness:.8});
  const creaseMat=new THREE.MeshStandardMaterial({color:'#563025',roughness:.9});
  const lipMat=new THREE.MeshStandardMaterial({color:'#a86d56',roughness:.75});
  function group(parent,name,pos){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}
  function ell(parent,name,pos,scale,mat=skin){const m=new THREE.Mesh(sphere,mat);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}

  // Multi-scale fleece relief; seeded construction keeps every reload identical.
  const noise=document.createElement('canvas');noise.width=noise.height=256;const nc=noise.getContext('2d');const pixels=nc.createImageData(256,256);
  for(let i=0;i<pixels.data.length;i+=4){const n=120+random()*135;pixels.data.set([n,n,n,255],i)}nc.putImageData(pixels,0,0);
  const bump=new THREE.CanvasTexture(noise);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(2,2);wool.bumpMap=bump;wool.bumpScale=.025;
  // Sculpted, asymmetrical locks, not repeated doughnuts. Each lock has its own turn and size.
  function fleece(parent,name,radii,count,opening=false,lock=.13,origin=[0,0,0]) {
    const placements=[];
    for(let i=0;i<count;i++){
      const yy=1-2*(i+.5)/count,angle=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-yy*yy),xx=Math.cos(angle)*r,zz=Math.sin(angle)*r;
      if(opening && zz>.18 && (xx/.88)**2+((yy+.08)/.87)**2<1)continue;
      const p=V(xx*radii[0],yy*radii[1],zz*radii[2]);p.add(V((random()-.5)*.035,(random()-.5)*.035,(random()-.5)*.035));
      const n=V(xx/radii[0],yy/radii[1],zz/radii[2]).normalize();placements.push({p:p.add(new THREE.Vector3(...origin)),n,size:lock*(.73+random()*.58)});
    }
    const lumpGeo=new THREE.SphereGeometry(1,18,12), lp=lumpGeo.attributes.position;
    for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),d=1+.085*Math.sin(x*8+y*3)*Math.cos(z*7-y*5);lp.setXYZ(i,x*d,y*d,z*d)}lumpGeo.computeVertexNormals();
    const lumps=new THREE.InstancedMesh(lumpGeo,wool,placements.length*3);lumps.name=name+'_tufts';lumps.castShadow=lumps.receiveShadow=true;
    const curve=new THREE.CatmullRomCurve3(Array.from({length:32},(_,i)=>{const u=i/31,a=u*Math.PI*2.45,r=.62*(1-u*.68);return V(Math.cos(a)*r,Math.sin(a)*r,.16+u*.15)}));
    const curlGeo=new THREE.TubeGeometry(curve,30,.26,7,false);const curls=new THREE.InstancedMesh(curlGeo,wool,placements.length);curls.name=name+'_curled_strands';curls.castShadow=curls.receiveShadow=true;
    const dummy=new THREE.Object3D(),colour=new THREE.Color();let index=0;
    const fuzzPoints=[],fuzzColors=[];
    for(let i=0;i<placements.length;i++){
      const {p,n,size}=placements[i],q=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),n),spin=random()*Math.PI*2;
      const tint=.88+random()*.12;colour.setRGB(tint,tint*.993,tint*.97);
      for(let j=0;j<3;j++){
        const a=j*2.3+spin,off=V(Math.cos(a)*size*.38,Math.sin(a)*size*.38,0).applyQuaternion(q);
        dummy.position.copy(p).add(off);dummy.quaternion.copy(q);dummy.rotateZ(spin+j);dummy.scale.set(size*(.85+random()*.2),size*(.72+random()*.25),size*.78);dummy.updateMatrix();lumps.setMatrixAt(index,dummy.matrix);lumps.setColorAt(index++,colour);
      }
      dummy.position.copy(p).addScaledVector(n,size*.58);dummy.quaternion.copy(q);dummy.rotateZ(spin);const curlSize=size*(i%3===0?1:.18);dummy.scale.set(curlSize,curlSize*(.85+random()*.3),curlSize);dummy.updateMatrix();curls.setMatrixAt(i,dummy.matrix);curls.setColorAt(i,colour);
      // Short bent hairs provide fuzzy silhouettes and break up the smooth specular surface.
      for(let j=0;j<145;j++){
        const a=random()*Math.PI*2,r=Math.sqrt(random())*size*1.1;
        const start=V(Math.cos(a)*r,Math.sin(a)*r,size*(.5+Math.sqrt(Math.max(0,1-(r/size/1.2)**2))*.45)).applyQuaternion(q).add(p);
        const length=.022+random()*.033;const end=start.clone().addScaledVector(n,length).add(V((random()-.5)*.014,(random()-.5)*.014,(random()-.5)*.014));
        const mid=start.clone().lerp(end,.5).addScaledVector(n,length*.12);
        fuzzPoints.push(...start.toArray(),...mid.toArray(),...mid.toArray(),...end.toArray());
        const shade=.7+random()*.3;for(let k=0;k<4;k++)fuzzColors.push(shade,shade*.99,shade*.95);
      }
    }
    const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fuzzPoints,3));fg.setAttribute('color',new THREE.Float32BufferAttribute(fuzzColors,3));
    const fuzz=new THREE.LineSegments(fg,new THREE.LineBasicMaterial({color:'#eee9db',vertexColors:true,transparent:true,opacity:.31,depthWrite:false}));fuzz.name=name+'_fine_fibres';
    parent.add(lumps,curls,fuzz);
  }

  // The fleece is a thick wool suit: collar, sleeve cuffs, leg openings and a back seam.
  const body=group(root,'Wool_suit',[.04,1.28,-.03]);ell(body,'Suit_padding',[0,0,0],[.65,.74,.48],wool);fleece(body,'Suit',[.65,.74,.48],280,false,.12);
  const tail=group(body,'Tail',[.6,-.3,-.35]);ell(tail,'Tail_padding',[0,0,0],[.19,.21,.2],wool);fleece(tail,'Tail',[.18,.2,.18],26,false,.075);
  const seam=makeStroke(body,new THREE.MeshStandardMaterial({color:'#b9b4a7',roughness:1}),.009);
  seam.update(u=>{const yy=-.55+u*1.1;return V(.015,yy,-.49*Math.sqrt(Math.max(.05,1-(yy/.77)**2))-.01)});
  const collar=group(root,'Soft_collar',[0,1.94,0]);ell(collar,'Collar_padding',[0,0,0],[.46,.19,.4],wool);fleece(collar,'Collar',[.46,.17,.4],60,false,.09);

  const head=group(root,'Head',[-.045,2.89,.04]);ell(head,'Hood_padding',[0,.015,-.06],[1.03,1.0,.73],wool);fleece(head,'Hood',[1.035,1.01,.74],370,true,.145,[0,.015,-.06]);
  // Pear shaped, broad lower cheeks and softly squared jaw, matching the reference silhouette.
  const facePosition=V(0,-.16,.37),faceScale=V(.94,.83,.6);
  const faceGeo=new THREE.SphereGeometry(1,80,64),fp=faceGeo.attributes.position;
  const pear=y=>1-.13*y;
  for(let i=0;i<fp.count;i++){const y=fp.getY(i);fp.setXYZ(i,fp.getX(i)*pear(y),Math.sign(y)*Math.abs(y)**.88,fp.getZ(i))}faceGeo.computeVertexNormals();
  const mouthCut={center:{value:new THREE.Vector2(0,-.16)},size:{value:new THREE.Vector2(.1,.001)},open:{value:0}};
  const faceSkin=skin.clone();
  faceSkin.onBeforeCompile=shader=>{
    shader.uniforms.mouthCenter=mouthCut.center;shader.uniforms.mouthSize=mouthCut.size;shader.uniforms.mouthIsOpen=mouthCut.open;
    shader.vertexShader='varying vec3 facePoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacePoint=position;');
    shader.fragmentShader='varying vec3 facePoint; uniform vec2 mouthCenter; uniform vec2 mouthSize; uniform float mouthIsOpen;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(mouthIsOpen>0.5 && facePoint.z>0.0 && length((facePoint.xy-mouthCenter)/mouthSize)<1.0) discard;');
  };
  const face=new THREE.Mesh(faceGeo,faceSkin);face.name='Sculpted_cheeks_and_jaw';face.position.copy(facePosition);face.scale.copy(faceScale);face.castShadow=face.receiveShadow=true;head.add(face);
  function faceZ(x,y){const yy=(y-facePosition.y)/faceScale.y,sy=Math.sign(yy)*Math.abs(yy)**(1/.88),xx=x/(faceScale.x*pear(sy));return facePosition.z+faceScale.z*Math.sqrt(Math.max(.015,1-xx*xx-sy*sy))}
  // Colour is painted only for skin blush; all recognizable facial features below are geometry.
  const blushCanvas=document.createElement('canvas');blushCanvas.width=blushCanvas.height=512;const bc=blushCanvas.getContext('2d');
  for(const side of [-1,1]){const x=256+side*155,y=290,g=bc.createRadialGradient(x,y,0,x,y,95);g.addColorStop(0,'rgba(232,111,92,.43)');g.addColorStop(.45,'rgba(237,128,105,.22)');g.addColorStop(1,'rgba(237,128,105,0)');bc.fillStyle=g;bc.fillRect(x-95,y-95,190,190)}
  const blushTexture=new THREE.CanvasTexture(blushCanvas);blushTexture.colorSpace=THREE.SRGBColorSpace;
  const blushGeo=new THREE.PlaneGeometry(1.7,1.4,64,48),bp=blushGeo.attributes.position;
  for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i)-.16;bp.setXYZ(i,x,y,faceZ(x,y)+.006)}blushGeo.computeVertexNormals();
  const blushMat=new THREE.MeshStandardMaterial({map:blushTexture,transparent:true,depthWrite:false,roughness:.8});const blush=new THREE.Mesh(blushGeo,blushMat);blush.name='Cheek_colour';head.add(blush);

  // Cupped ear shells have a thick rolled rim and a recessed, warm inner surface.
  const ears=[];
  for(const side of [-1,1]){
    const ear=group(head,side<0?'Ear_L':'Ear_R',[side*.94,.19,-.08]);const eg=new THREE.SphereGeometry(1,48,32),ep=eg.attributes.position;
    for(let i=0;i<ep.count;i++){
      const x=ep.getX(i),y=ep.getY(i),z=ep.getZ(i);const taper=.8+.2*(1-x*x);ep.setXYZ(i,x*.55,y*.24*taper,z*.14+(z>0?-.105*(1-x*x)*(1-y*y):0));
    }eg.computeVertexNormals();const shell=new THREE.Mesh(eg,skin);shell.position.x=side*.35;shell.castShadow=shell.receiveShadow=true;ear.add(shell);
    const bowl=ell(ear,'Ear_bowl',[side*.38,-.035,.054],[.41,.16,.025],earInside);bowl.rotation.y=side*.12;
    ear.rotation.z=side*.12;ears.push(ear);
  }
  // A few larger fringe locks interrupt the crown with the characteristic forehead curl.
  const fringe=group(head,'Forehead_curls',[0,0,0]);
  fleece(fringe,'Forehead',[.13,.1,.075],8,false,.135,[-.25,.69,.55]);
  fleece(fringe,'Forehead_side',[.1,.1,.06],7,false,.12,[.12,.76,.5]);

  function sculptLimb(parent,name,points,radii){
    const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),40,1,24,false);
    const mesh=new THREE.Mesh(geo,skin);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    mesh.updateShape=newPoints=>{
      const path=new THREE.CatmullRomCurve3(newPoints.map(p=>new THREE.Vector3(...p))),frames=path.computeFrenetFrames(40,false),pos=geo.attributes.position;
      for(let i=0;i<=40;i++){
        const t=i/40,p=path.getPointAt(t),f=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(f)),alpha=f-k,r=THREE.MathUtils.lerp(radii[k],radii[k+1],alpha*alpha*(3-2*alpha));
        for(let j=0;j<=24;j++){
          const a=j/24*Math.PI*2,delta=frames.normals[i].clone().multiplyScalar(-Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.92);
          pos.setXYZ(i*25+j,p.x+delta.x,p.y+delta.y,p.z+delta.z);
        }
      }
      pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    };
    mesh.updateShape(points);return mesh;
  }
  const arms=[],hands=[];
  for(const side of [-1,1]){
    const arm=group(root,side<0?'Arm_L':'Arm_R',[side*.52,1.88,.22]);
    ell(arm,'Sleeve_padding',[side*.015,-.035,0],[.255,.28,.25],wool);fleece(arm,'Rolled_cuff',[.235,.26,.24],48,false,.09,[side*.015,-.035,0]);
    const front=side===1;
    const points=front?[[.025,-.12,.14],[.02,-.31,.3],[-.2,-.32,.51],[-.55,-.16,.54],[-.92,-.07,.18]]:
      [[-.03,-.13,.14],[-.07,-.38,.24],[.14,-.39,.47],[.52,-.27,.46],[.86,-.09,.27]];
    const forearm=sculptLimb(arm,'Elbow_forearm',points,[.025,.19,.205,.17,.115]);arm.userData.forearm=forearm;arm.userData.restPoints=points;arm.userData.currentPoints=points.map(p=>[...p]);
    const wrist=points[points.length-1],hand=group(arm,'Hand',wrist);
    ell(hand,'Palm',[-side*.055,.015,0],[.15,.12,.105]);
    for(let finger=0;finger<3;finger++){
      const f=ell(hand,'Finger_'+finger,[-side*(.095+finger*.018),.065-finger*.052,.045],[.083,.037,.045]);f.rotation.z=side*.22;
    }
    ell(hand,'Thumb',[-side*.025,-.063,.09],[.055,.09,.048]).rotation.z=side*.5;
    arms.push(arm);hands.push(hand);
  }
  function updateArms(pose,time,dt,motion){
    arms.forEach((arm,i)=>{
      const side=i?1:-1,raised=pose==='celebrate'||(pose==='wave'&&i===1);
      let points=arm.userData.restPoints,turn=side<0?.95:-.12;
      if(raised){const wag=motion?Math.sin(time*4)*.045:0;points=[[side*.02,-.10,.12],[side*.23,-.23,.22],[side*.5,-.13,.27],[side*.73,.12,.28],[side*(.79+wag),.42,.28]];turn=-side*1.35+wag*2;}
      if(pose==='relaxed'||pose==='dance'){
        const sway=pose==='dance'?Math.sin(time*3)*.18:0;points=[[0,-.1,.12],[side*.14,-.3,.18],[side*(.16+sway),-.5,.21],[side*(.15+sway),-.65,.2],[side*(.13+sway),-.77,.18]];turn=side*1.4;
      }
      const blend=1-Math.exp(-9*dt);arm.userData.currentPoints.forEach((p,k)=>p.forEach((v,j)=>p[j]=THREE.MathUtils.lerp(v,points[k][j],blend)));
      arm.userData.forearm.updateShape(arm.userData.currentPoints);hands[i].position.set(...arm.userData.currentPoints[4]);hands[i].rotation.z=THREE.MathUtils.damp(hands[i].rotation.z,turn,9,dt);
      const tucked=!raised&&pose!=='relaxed'&&pose!=='dance';hands[i].rotation.x=THREE.MathUtils.damp(hands[i].rotation.x,tucked?Math.PI:0,9,dt);
    });
  }
  const legs=[];
  for(const side of [-1,1]){
    const leg=group(root,side<0?'Leg_L':'Leg_R',[side*.36,.73,-.015]);
    sculptLimb(leg,'Leg',[ [0,.04,0],[0,-.16,0],[.015,-.39,.025],[0,-.55,.035]],[.1,.21,.18,.165]);
    const hg=new THREE.SphereGeometry(1,56,40),hp=hg.attributes.position;
    for(let i=0;i<hp.count;i++){
      const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);const sx=Math.sign(x)*Math.abs(x)**.7,sy=Math.sign(y)*Math.abs(y)**.43,sz=Math.sign(z)*Math.abs(z)**.75;
      hp.setXYZ(i,sx*(side<0?.235:.20),sy*.135,sz*(side<0?.28:.245));
    }hg.computeVertexNormals();const hoofMesh=new THREE.Mesh(hg,hoof);hoofMesh.name='Cloven_hoof';hoofMesh.position.set(0,-.57,.065);hoofMesh.castShadow=hoofMesh.receiveShadow=true;leg.add(hoofMesh);
    ell(leg,'Flat_sole',[0,-.704,.065],[side<0?.22:.188,.012,side<0?.26:.224],soleMat);
    const split=makeStroke(leg,creaseMat,.009,24);split.update(u=>V(.005*Math.sin(u*2),-.7+u*.17,.065+.245*Math.sqrt(Math.max(.05,1-((-.13+u*.17)/.15)**2))));
    legs.push(leg);
  }

  // Curved eye apertures, glassy iris surfaces and volumetric lid edges.
  const irisCanvas=document.createElement('canvas');irisCanvas.width=irisCanvas.height=256;const ic=irisCanvas.getContext('2d');ic.fillStyle='#fffaf1';ic.fillRect(0,0,256,256);
  const irisGrad=ic.createRadialGradient(128,128,0,128,128,43);irisGrad.addColorStop(0,'#08090a');irisGrad.addColorStop(.7,'#101012');irisGrad.addColorStop(.84,'#312820');irisGrad.addColorStop(1,'#43382f');ic.fillStyle=irisGrad;ic.beginPath();ic.arc(128,128,43,0,Math.PI*2);ic.fill();
  const irisTexture=new THREE.CanvasTexture(irisCanvas);irisTexture.colorSpace=THREE.SRGBColorSpace;
  const eyeMat=new THREE.MeshPhysicalMaterial({map:irisTexture,roughness:.38,clearcoat:.18,clearcoatRoughness:.3});
  const lidMat=skin,lashMat=new THREE.MeshStandardMaterial({color:'#4b2b21',roughness:.7});
  const eyes=[];
  for(const side of [-1,1]){
    const center=V(side*.405,.035,0),g=new THREE.PlaneGeometry(.43,.26,48,20),mesh=new THREE.Mesh(g,eyeMat);mesh.name=side<0?'Eye_L':'Eye_R';mesh.frustumCulled=false;head.add(mesh);
    const upper=makeStroke(head,lidMat,.027),lower=makeStroke(head,lidMat,.012),lash=makeStroke(head,lashMat,.006);
    const brow=makeStroke(head,lipMat,.011);const glint=ell(head,'Eye_catchlight',[0,0,0],[.012,.015,.006],new THREE.MeshBasicMaterial({color:'#fffdf5'}));
    eyes.push({side,center,mesh,upper,lower,lash,brow,glint});
  }
  // A rounded peach nose merges into the face; only the two nostril creases are dark.
  const noseGeo=new THREE.SphereGeometry(1,48,32),np=noseGeo.attributes.position;
  for(let i=0;i<np.count;i++){
    const y=np.getY(i);np.setXYZ(i,np.getX(i)*.095*(.58+y*.42),y*.03,np.getZ(i)*.019);
  }noseGeo.computeVertexNormals();
  const nose=new THREE.Mesh(noseGeo,new THREE.MeshPhysicalMaterial({color:'#e9aa91',roughness:.78}));nose.name='Soft_nose';nose.position.set(0,-.12,faceZ(0,-.12)-.003);head.add(nose);
  for(const side of [-1,1]){
    const nostril=makeStroke(head,lipMat,.005,16);nostril.update(u=>{const xx=side*(.042+u*.043),yy=-.115+u*.011;return V(xx,yy,faceZ(xx,yy)+.014+Math.sin(u*Math.PI)*.004)},u=>.0007+Math.sin(u*Math.PI)*.004);
  }
  const philtrum=makeStroke(head,lipMat,.006,16);philtrum.update(u=>{const y=-.17-u*.075;return V(0,y,faceZ(0,y)+.013)});
  const smiles=[makeStroke(head,lipMat,.007),makeStroke(head,lipMat,.007)];
  const mouthRim=makeStroke(head,lipMat,.006,48);
  const mouth=ell(head,'Mouth_cavity',[0,-.3,faceZ(0,-.3)+.01],[.1,.01,.025],new THREE.MeshStandardMaterial({color:'#5c2d28',roughness:.95,side:THREE.BackSide}));
  const tongue=ell(head,'Tongue',[0,-.32,faceZ(0,-.32)+.035],[.07,.025,.017],new THREE.MeshStandardMaterial({color:'#db8e86',roughness:.6}));
  const teeth=ell(head,'Upper_teeth',[0,-.26,faceZ(0,-.26)+.028],[.07,.018,.012],new THREE.MeshStandardMaterial({color:'#fff4df',roughness:.4}));
  const tears=[-1,1].map(side=>ell(head,'Tear',[side*.46,-.1,faceZ(side*.46,-.1)+.03],[.019,.05,.013],new THREE.MeshPhysicalMaterial({color:'#b0d9e9',transparent:true,opacity:.65,roughness:.08,clearcoat:1})));

  function updateFace(s,time){
    blushMat.opacity=.65+s.blush*.6;
    for(const eye of eyes){
      const {side,center,mesh}=eye;const open=clamp((s.eyes+(side>0?s.asymmetric*.22:0))*(1-s.blink)*(side<0?1-s.wink:1),0,1.15);
      const top=.004+open*.095,bottom=.003+open*.125,slant=side*(-.025-s.brow*.05);
      function edge(u,upper){const xx=(u-.5)*.43,arc=Math.sqrt(Math.max(0,1-(2*u-1)**2)),yy=center.y+xx*slant+(upper?arc*top:-arc*bottom);return V(center.x+xx,yy,faceZ(center.x+xx,yy)+.007+arc*.009)}
      const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
      for(let iy=0;iy<=20;iy++)for(let ix=0;ix<=48;ix++){
        const u=ix/48,v=iy/20,a=edge(u,true),b=edge(u,false),p=a.lerp(b,v);p.z+=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.012;
        const index=iy*49+ix;pos.setXYZ(index,p.x,p.y,p.z);uv.setXY(index,.5+(p.x-center.x-s.lookX*.15)/.38,.5+(p.y-center.y-.012-s.lookY*.018)/.38);
      }
      pos.needsUpdate=uv.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.visible=open>.025;
      eye.upper.update(u=>{const p=edge(u,true);p.y+=.009;p.z=faceZ(p.x,p.y)+.003;return p},u=>.001+Math.sin(u*Math.PI)*.011);
      eye.lower.visible=false;eye.lower.update(u=>{const p=edge(u,false);p.y-=.004;p.z=faceZ(p.x,p.y)+.003;return p},u=>.0005+Math.sin(u*Math.PI)*.005);
      eye.lash.update(u=>edge(u,true).add(V(0,-.002,.010)),u=>.0007+Math.sin(u*Math.PI)*.0055);
      eye.brow.visible=Math.abs(s.brow)>.25;eye.brow.update(u=>{const xx=(u-.5)*.3,yy=center.y+.17+Math.sin(u*Math.PI)*.018+side*xx*s.brow*.28;return V(center.x+xx,yy,faceZ(center.x+xx,yy)+.013)});
      const gx=center.x+s.lookX*.15-.015,gy=center.y+.017+s.lookY*.018;eye.glint.scale.set(.006,.007,.003);eye.glint.position.set(gx,gy,faceZ(gx,gy)+.027);eye.glint.visible=open>.63;
    }
    const open=clamp(s.mouth,0,1),width=.09+(1-s.round)*.055;
    const mouthY=-.29-open*.028,mouthHeight=.007+open*.105;
    const localY=(mouthY-facePosition.y)/faceScale.y;
    mouthCut.center.value.set(0,Math.sign(localY)*Math.abs(localY)**(1/.88));
    mouthCut.size.value.set(width/faceScale.x,mouthHeight/faceScale.y);
    mouthCut.open.value=open>.035?1:0;
    mouthRim.visible=open>.035;
    mouthRim.update(u=>{const a=u*Math.PI*2,xx=Math.cos(a)*width,yy=mouthY+Math.sin(a)*mouthHeight;return V(xx,yy,faceZ(xx,yy)+.006)});
    philtrum.update(u=>{const y=THREE.MathUtils.lerp(-.155,open>.035?Math.max(-.22,mouthY+mouthHeight+.004):-.22,u),x=Math.sin(u*Math.PI)*.008;return V(x,y,faceZ(x,y)+.005)},u=>.002+Math.sin(u*Math.PI)*.0015);
    mouth.visible=open>.035;mouth.scale.set(width*1.08,mouthHeight*1.12,.09);mouth.position.y=-.29-open*.028;mouth.position.z=faceZ(0,mouth.position.y)-.025;
    tongue.visible=open>.16||s.tongue>.1;tongue.scale.set(width*.62,.012+open*.025+s.tongue*.018,.018);tongue.position.y=-.3-open*.08;tongue.position.z=faceZ(0,tongue.position.y)-.018;
    teeth.visible=open>.35&&s.smile>.5;
    smiles.forEach((stroke,i)=>{
      stroke.visible=open<=.035;
      const side=i?1:-1,width=i?.205:.132;
      // The original has a small left hook and a longer, gently upturned right smile.
      stroke.update(u=>{
        const x=side*width*u,depth=i?.038:.041,corner=(i?.01:-.01)+s.smile*(i?.022:.012);
        const y=-.22-Math.sin(u*Math.PI)*depth+u*corner;
        return V(x,y,faceZ(x,y)+.004);
      },u=>.0015+Math.sin(u*Math.PI)*.0035);
    });
    tears.forEach((tear,i)=>{tear.visible=s.tears>.2;tear.position.y=-.1-((time*.18+i*.07)%.25);tear.position.z=faceZ(tear.position.x,tear.position.y)+.025});
  }
  return {root,body,head,ears,arms,hands,legs,skin,faceSkin,wool,tail,updateFace,updateArms};
}
