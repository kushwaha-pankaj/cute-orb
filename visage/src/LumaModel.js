import * as THREE from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {LUMA_DEFAULTS, LUMA_EXPRESSIONS} from './lumaExpressions.js';

/** A continuous, bevelled silhouette gives Luma its soft suit and split feet. */
export function createLumaModel() {
  const root = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({color: LUMA_DEFAULTS.bodyColor, roughness: .65});
  const cream = new THREE.MeshStandardMaterial({color: LUMA_DEFAULTS.faceColor, roughness: .8});
  const ink = new THREE.MeshPhysicalMaterial({color: LUMA_DEFAULTS.eyeColor, roughness: .21, clearcoat: 1});
  const eyelidMaterial = new THREE.MeshStandardMaterial({color:LUMA_DEFAULTS.eyeColor, roughness:.65});
  const white = new THREE.MeshBasicMaterial({color: '#ffffff'});
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  function oval(parent, name, material, position, scale) {
    const mesh = new THREE.Mesh(sphere, material); mesh.name = name;
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const body = new THREE.Group(); root.add(body);
  const outline = new THREE.Shape();
  outline.moveTo(-.98, .22);
  outline.bezierCurveTo(-1.18,.5,-1.24,1.5,-1.08,2.14);
  outline.bezierCurveTo(-.94,2.85,-.51,3.1,0,3.1);
  outline.bezierCurveTo(.62,3.1,1.02,2.76,1.15,2.08);
  outline.bezierCurveTo(1.28,1.38,1.2,.55,1.02,.22);
  outline.bezierCurveTo(.94,.06,.55,.04,.43,.14);
  outline.bezierCurveTo(.27,.25,.27,.53,.08,.55);
  outline.bezierCurveTo(-.13,.56,-.23,.25,-.36,.14);
  outline.bezierCurveTo(-.49,.04,-.87,.06,-.98,.22);
  let shellGeometry = new THREE.ExtrudeGeometry(outline, {depth:.58, bevelEnabled:true, bevelThickness:.3, bevelSize:.16, bevelSegments:8, steps:1, curveSegments:24});
  const original = shellGeometry;
  shellGeometry = new TessellateModifier(.18, 7).modify(original); original.dispose();
  shellGeometry.deleteAttribute('normal'); shellGeometry.deleteAttribute('uv');
  const tessellated = shellGeometry; shellGeometry = mergeVertices(tessellated); tessellated.dispose();
  shellGeometry.translate(0, 0, -.59);
  const vertices = shellGeometry.attributes.position;
  for (let i=0; i<vertices.count; i++) {
    const x=vertices.getX(i), y=vertices.getY(i), z=vertices.getZ(i);
    // Round the broad front and back rather than leaving an extrusion's flat cap.
    const bulge=.32*Math.max(0,1-(x/1.4)**2)*Math.max(0,Math.sin(y/3.4*Math.PI));
    vertices.setZ(i,z+(z>-.3?bulge:-bulge));
  }
  shellGeometry.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeometry, suit); shell.name='Suit'; shell.castShadow=true; shell.receiveShadow=false; body.add(shell);
  // A dedicated resting dome keeps the face, mittens and antenna round.
  // Flatten only the underside so the suit rests on the floor without split feet.
  const restingGeometry = new THREE.SphereGeometry(1, 48, 32);
  const restingVertices = restingGeometry.attributes.position;
  for (let i=0; i<restingVertices.count; i++) restingVertices.setY(i, Math.max(-.25, restingVertices.getY(i)));
  restingGeometry.computeVertexNormals();
  const restingSuit = new THREE.Mesh(restingGeometry, suit);
  restingSuit.name = 'Resting suit'; restingSuit.castShadow = true;
  restingSuit.position.set(0,.43,0); restingSuit.scale.set(1.38,1.32,.88); body.add(restingSuit);
  const face = oval(body,'Cream face',cream,[0,2.14,.50],[.96,.78,.24]);
  const antenna = new THREE.Group(); antenna.position.set(-.44,3.03,-.04); antenna.rotation.z=.3; body.add(antenna);
  oval(antenna,'Antenna stem',suit,[0,.17,0],[.105,.28,.105]);
  const tip = oval(antenna,'Antenna tip',suit,[0,.48,0],[.235,.235,.235]);
  const arms = [-1,1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side*1.1,1.36,.12); body.add(pivot);
    oval(pivot, 'Mitten', suit, [side*.11,-.15,.1],[.29,.43,.31]); return pivot;
  });
  const eyes = [-1,1].map(side => {
    const pivot = new THREE.Group(); body.add(pivot);
    const open = oval(pivot,'Glossy eye',ink,[0,0,0],[.19,.27,.095]);
    oval(open,'Eye sparkle',white,[-.27,.45,.82],[.24,.2,.13]);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.17,0,0),new THREE.Vector3(0,.28,0),new THREE.Vector3(.17,0,0));
    const closed = new THREE.Group();
    closed.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.048,8,false),eyelidMaterial));
    for (const x of [-.17,.17]) oval(closed,'Rounded eyelid tip',eyelidMaterial,[x,0,0],[.048,.048,.048]);
    pivot.add(closed);
    return {pivot,open,closed,side};
  });
  const mouth = oval(body,'Speech mouth',ink,[0,1.74,.74],[.09,.09,.035]);
  let gazeX=0, gazeY=0;
  function update(supplied={}, time=0, delta=0, pointer={x:0,y:0}, audio=0, initial=false) {
    const c={...LUMA_DEFAULTS,...supplied};
    const asleep=c.pose==='sleep'||c.state==='sleeping';
    const mood=LUMA_EXPRESSIONS[asleep?'sleepy':c.state==='success'?'happy':c.state==='thinking'?'curious':c.expression]||LUMA_EXPRESSIONS.neutral;
    const t=c.motion?time:0;
    const follow=c.motion&&c.follow&&!asleep;
    const gx=THREE.MathUtils.clamp(c.gazeX+(follow?pointer.x*.5:0),-1,1);
    const gy=THREE.MathUtils.clamp(c.gazeY+(follow?pointer.y*.4:0),-1,1);
    gazeX=initial?gx:THREE.MathUtils.damp(gazeX,gx,6,delta); gazeY=initial?gy:THREE.MathUtils.damp(gazeY,gy,6,delta);
    suit.color.set(c.bodyColor); suit.roughness=c.roughness; cream.color.set(c.faceColor); ink.color.set(c.eyeColor); eyelidMaterial.color.set(c.eyeColor);
    const breath=asleep&&c.motion?Math.sin(t*1.5)*.012:0;
    shell.visible=!asleep; restingSuit.visible=asleep;
    restingSuit.scale.y=1.32+breath;
    face.position.set(0,asleep?.85+breath:2.14,asleep?.76:.50);
    face.scale.set(asleep?.89:.96,asleep?.64:.78,.24);
    antenna.position.set(asleep?.29:-.44,asleep?1.68+breath:3.03,-.04);
    root.rotation.set(0,c.yaw+(asleep?0:gazeX*.2),asleep?0:mood.tilt+(c.motion?Math.sin(t*1.3)*.022:0));
    root.position.y=!asleep&&c.motion?.025+Math.sin(t*2)*.022:0;
    antenna.rotation.z=asleep?-.24:.3+(c.motion?Math.sin(t*2.4)*.045:0)+(c.state==='listening'?.12:0);
    tip.scale.setScalar(.235*(1+(c.state==='listening'&&c.motion?THREE.MathUtils.clamp(audio,0,1)*.15:0)));
    arms.forEach((arm,i)=>{
      const side=i?1:-1; const wave=(c.pose==='wave'||c.state==='success')&&i===1;
      arm.rotation.z=asleep?side*.9:wave?1.9+(c.motion?Math.sin(t*5)*.25:0):side*(.1+Math.sin(t*1.6)*.035);
      arm.position.set(side*(asleep?.87:1.1),asleep?.36:wave?1.8:1.36,asleep?.85:.12);
    });
    const blink=c.motion&&c.autoBlink&&!asleep&&Math.sin(t*1.4)>.993;
    eyes.forEach(({pivot,open,closed,side})=>{
      const x=side*.39*c.eyeSpacing+(asleep?0:gazeX*.07);
      const y=asleep?.92+breath:2.22+gazeY*.06+(c.state==='thinking'&&side===1?.08:0);
      // Project the eyes onto the ellipsoidal cream panel, with a small lift.
      const z=face.position.z+.24*Math.sqrt(Math.max(.1,1-(x/face.scale.x)**2-((y-face.position.y)/face.scale.y)**2));
      pivot.position.set(x,y,z+.035);
      pivot.scale.setScalar(c.eyeSize);
      open.visible=mood.eye>0&&!blink; closed.visible=!open.visible;
      open.scale.y=.27*mood.eye;
      open.rotation.z=c.state==='error'?side*.32:0;
      closed.rotation.z=mood.curve<0?Math.PI:0;
      closed.scale.y=asleep?.6:1;
      closed.position.y=mood.curve<0?.08:-.04;
    });
    mouth.visible=!asleep&&(c.state==='speaking'||c.expression==='surprised'||c.state==='error');
    mouth.scale.y=c.state==='speaking'?.065+(c.motion?(.5+.5*Math.sin(t*12)+audio)*.1:0):.12;
  }
  update();
  return {root, eyes, update, dispose() {
    const geometries=new Set(), materials=new Set(); root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
  }};
}
