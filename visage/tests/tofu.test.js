import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTofuModel} from '../src/TofuModel.js';
import {TOFU_DEFAULTS, TOFU_EXPRESSIONS, TOFU_STATES, TOFU_POSES} from '../src/tofuExpressions.js';
import {Box3} from 'three';

test('Tofu stays within a lightweight geometry budget and changes proportions without replacing geometry', () => {
  const rig = createTofuModel();
  try {
    const geometry = new Map(); let triangles = 0;
    rig.root.traverse(o => {if (o.geometry) {geometry.set(o.uuid, o.geometry.uuid); triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;}});
    assert.ok(triangles < 30_000, `${triangles} triangles`);
    for (const expression of Object.keys(TOFU_EXPRESSIONS)) for (const pose of TOFU_POSES) for (const edge of [-1, 1]) {
      rig.update({...TOFU_DEFAULTS, expression, pose, headWidth: edge < 0 ? .8 : 1.15, headHeight: edge < 0 ? .8 : 1.15, bodyWidth: edge < 0 ? .85 : 1.15, eyeSize: edge < 0 ? .65 : 1.5, eyeSpacing: edge < 0 ? .7 : 1.25, intensity: 1.5}, 2, 1/30, {x: edge, y: edge}, 1, true);
      rig.root.updateMatrixWorld(true);
      rig.root.traverse(o => {
        assert.ok(o.matrixWorld.elements.every(Number.isFinite));
        if (o.geometry) { assert.equal(o.geometry.uuid, geometry.get(o.uuid)); assert.ok(o.geometry.attributes.position.array.every(Number.isFinite)); }
      });
      const box = new Box3().setFromObject(rig.root);
      assert.ok(box.max.y < 4.75 && box.min.y >= -.1);
      // Eyes must remain above the head surface, even at maximum spacing.
      assert.ok(rig.eyes.every(eye => eye.position.z > .7));
    }
  } finally {rig.dispose();}
});

test('Tofu preserves the mouthless reference, distinguishes every state and freezes motion when paused', () => {
  const rig = createTofuModel();
  try {
    rig.update(TOFU_DEFAULTS, 0, 0, undefined, 0, true);
    assert.equal(rig.root.getObjectByName('Expression curve').visible, false);
    assert.equal(rig.root.getObjectByName('Open mouth').visible, false);
    const signatures = new Set();
    for (const state of TOFU_STATES) {
      rig.update({...TOFU_DEFAULTS, state}, 1.8, 1/30, {x:0,y:0}, .8, true);
      signatures.add(JSON.stringify([rig.head.rotation.toArray(),rig.eyes[0].scale.toArray(),rig.eyes[0].position.toArray(),rig.root.position.toArray(),rig.root.getObjectByName('Open mouth').visible,rig.root.getObjectByName('Expression curve').visible]));
    }
    assert.equal(signatures.size, TOFU_STATES.length);
    const freeze = () => {const values=[];rig.root.updateMatrixWorld(true);rig.root.traverse(o=>values.push(...o.matrixWorld.elements));return values};
    rig.update({...TOFU_DEFAULTS, motion:false, pose:'dance'}, 2, 1, {x:1,y:1}, .9, true); const before=freeze();
    rig.update({...TOFU_DEFAULTS, motion:false, pose:'dance'}, 8, 1, {x:-1,y:-1}, .1, true); assert.deepEqual(freeze(),before);
    rig.update({...TOFU_DEFAULTS, bodyColor:'#afc3ac', headWidth:1.15},0,0,undefined,0,true);
    assert.equal(rig.root.getObjectByName('Body').material.color.getHexString(),'afc3ac');
    assert.equal(rig.head.scale.x,1.15);
  } finally {rig.dispose();}
});

test('Tofu studio schema sanitizes embed inputs and exposes every supported expression and pose', async () => {
  const {createServer} = await import('vite');
  const server = await createServer({server:{middlewareMode:true,watch:null,ws:false},appType:'custom'});
  try {
    const {default:def} = await server.ssrLoadModule('/src/mascots/tofu.jsx');
    const {sanitize, initialConfig} = await server.ssrLoadModule('/src/studio/useMascotConfig.js');
    const {getMascot} = await server.ssrLoadModule('/src/mascots/index.js');
    assert.deepEqual([...getMascot('tofu').expressions], Object.keys(TOFU_EXPRESSIONS));
    assert.deepEqual([...def.states.options.map(o=>o.id)],TOFU_STATES);
    const clean = sanitize(def, {headWidth: 500, eyeSize: -4, bodyColor:'garbage',pose:'explode',state:'unknown',expression:'missing',speed:NaN,follow:false});
    assert.deepEqual({...clean},{headWidth:1.15,eyeSize:.65,follow:false});
    assert.equal(initialConfig(def,{persist:false,overrides:{pose:'wave'}}).pose,'wave');
    assert.ok(def.transient.includes('state'));
    assert.equal(def.capture,true);
  } finally {await server.close();}
});
