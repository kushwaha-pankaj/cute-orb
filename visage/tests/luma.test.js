import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLumaModel} from '../src/LumaModel.js';
import {LUMA_DEFAULTS, LUMA_EXPRESSIONS, LUMA_STATES, LUMA_POSES} from '../src/lumaExpressions.js';

test('Luma has stable geometry, visible eyes and finite transforms in every mood, pose and state',()=>{
  const rig=createLumaModel();
  try {
    const geometries=new Set();rig.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry)});
    for(const expression of Object.keys(LUMA_EXPRESSIONS)) for(const pose of LUMA_POSES) for(const state of LUMA_STATES) {
      rig.update({...LUMA_DEFAULTS,expression,pose,state,eyeSize:1.2,eyeSpacing:1.2},2,.016,{x:1,y:1},1,true);
      rig.root.updateMatrixWorld(true);
      rig.root.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.geometry)assert.ok(geometries.has(o.geometry));});
      assert.ok(rig.eyes.every(e=>e.pivot.position.z>.6));
    }
  } finally {rig.dispose();}
});
test('Luma freezes motion, keeps neutral mouthless, and distinguishes assistant states',()=>{
  const rig=createLumaModel();
  const snapshot=()=>{rig.root.updateMatrixWorld(true);const a=[];rig.root.traverse(o=>a.push(o.visible,...o.matrixWorld.elements));return JSON.stringify(a)};
  try {
    rig.update(LUMA_DEFAULTS,0,0,undefined,0,true);
    assert.equal(rig.root.getObjectByName('Speech mouth').visible,false);
    const states=new Set();for(const state of LUMA_STATES){rig.update({...LUMA_DEFAULTS,state},2,.016,undefined,.7,true);states.add(snapshot())}
    assert.equal(states.size,LUMA_STATES.length);
    rig.update({...LUMA_DEFAULTS,motion:false,pose:'wave'},1,1,{x:1,y:1},1,true);const before=snapshot();
    rig.update({...LUMA_DEFAULTS,motion:false,pose:'wave'},8,1,{x:-1,y:-1},0,true);assert.equal(snapshot(),before);
  } finally {rig.dispose();}
});


test('Sleeping uses a resting body without flattening the face or antenna, and restores standing',()=>{
  const rig=createLumaModel();
  const snapshot=()=>{rig.root.updateMatrixWorld(true);const values=[];rig.root.traverse(o=>values.push(o.visible,...o.matrixWorld.elements));return values;};
  try {
    const still={...LUMA_DEFAULTS,motion:false};
    rig.update(still,0,0,undefined,0,true); const standing=snapshot();
    rig.update({...still,pose:'sleep'},0,0,undefined,0,true);
    assert.equal(rig.root.getObjectByName('Suit').visible,false);
    assert.equal(rig.root.getObjectByName('Resting suit').visible,true);
    const face=rig.root.getObjectByName('Cream face');
    assert.ok(face.scale.y/face.scale.x>.65, 'The sleeping face stays rounded');
    const tip=rig.root.getObjectByName('Antenna tip');
    assert.equal(tip.scale.x,tip.scale.y);
    assert.ok(rig.eyes.every(e=>!e.open.visible&&e.closed.visible));
    const sleeping=snapshot();
    rig.update({...still,state:'sleeping'},0,0,undefined,0,true);
    assert.deepEqual(snapshot(),sleeping,'Pose and assistant state use the same sleeping rig');
    rig.update(still,0,0,undefined,0,true);
    assert.deepEqual(snapshot(),standing);
  } finally {rig.dispose();}
});
