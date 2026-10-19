import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRenderLoop, renderPixelRatio} from '../src/renderLoop.js';

test('render loop suspends hidden/offscreen work, resumes without a time jump and cleans up', () => {
  const originals = Object.fromEntries(['document','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame'].map(key => [key, globalThis[key]]));
  const frames = new Map(), listeners = new Map(), calls = [];
  let observer, next = 0, disconnected = false;
  globalThis.document = {hidden: false, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key)};
  globalThis.IntersectionObserver = class {constructor(fn){observer=fn} observe(){} disconnect(){disconnected=true}};
  globalThis.requestAnimationFrame = fn => {frames.set(++next, fn); return next};
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const step = time => {const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));};
  try {
    const stop = createRenderLoop({}, (...args) => calls.push(args));
    step(100); step(117);
    assert.equal(calls.length, 2);
    observer([{isIntersecting: false}]); step(1000);
    assert.equal(calls.length, 2);
    assert.equal(frames.size, 0);
    observer([{isIntersecting: true}]); step(10000);
    assert.ok(calls.at(-1)[1] < .02, 'resume must not jump by the time spent offscreen');
    document.hidden = true; listeners.get('visibilitychange')();
    assert.equal(frames.size, 0);
    document.hidden = false; listeners.get('visibilitychange')(); step(20000);
    assert.equal(calls.length, 4);
    stop(); assert.equal(frames.size, 0); assert.equal(listeners.size, 0); assert.ok(disconnected);
  } finally { for (const [key, value] of Object.entries(originals)) { if(value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
});

test('large high-DPI stages have bounded drawing buffers', () => {
  assert.ok(renderPixelRatio(1280, 720, 3) <= 1.5);
  assert.ok(1920 * 1080 * renderPixelRatio(1920,1080,3) ** 2 <= 1_500_001);
  assert.equal(renderPixelRatio(320,400,1), 1);
});

test('optimised blob retains independently controllable named parts and its download budget', async () => {
  const data = await readFile(new URL('../public/green_blob.glb', import.meta.url));
  assert.ok(data.length < 4_000_000);
  const json = JSON.parse(data.subarray(20,20 + data.readUInt32LE(12)).toString());
  const names = json.nodes.map(node => node.name);
  for (const name of ['GEO_Body','GEO_Mouth_Cavity','GEO_Tongue']) assert.ok(names.includes(name), `${name} must survive optimisation`);
  const vertices = json.meshes.flatMap(mesh => mesh.primitives).reduce((sum,p) => sum + json.accessors[p.attributes.POSITION].count,0);
  assert.ok(vertices < 100_000, `blob has ${vertices} vertices`);
});

test('Mallow keeps its geometry budget and all expressions and poses produce finite vertices', async () => {
  const previous = globalThis.document;
  const context = new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), createRadialGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key] || (()=>{})});
  globalThis.document = {createElement:()=>({getContext:()=>context})};
  try {
    const {createSheepModel} = await import('../src/SheepModel.js');
    const {FACE_BASE, SHEEP_EXPRESSIONS, SHEEP_POSES} = await import('../src/sheepExpressions.js');
    const rig = createSheepModel();
    let triangles = 0;
    rig.root.traverse(o => {if(o.isMesh) triangles += (o.geometry.index?.count || o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1)});
    assert.ok(triangles < 700_000);
    const finite = () => rig.root.traverse(o => {if(o.geometry?.attributes.position) assert.ok(o.geometry.attributes.position.array.every(Number.isFinite), `${o.name} must remain finite`)});
    for(const expression of Object.values(SHEEP_EXPRESSIONS)) {rig.updateFace({...FACE_BASE,...expression,blink:0},0); finite();}
    for(const pose of SHEEP_POSES) {rig.updateArms(pose, .5, 1/30, true); finite();}
  } finally { if(previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});

test('the initial hero uses a small transparent preview matching its live pose', async () => {
  const {createServer} = await import('vite');
  const {createElement} = await import('react');
  const {renderToStaticMarkup} = await import('react-dom/server');
  const server = await createServer({server:{middlewareMode:true,watch:null},appType:'custom'});
  try {
    const {featured} = await server.ssrLoadModule('/src/mascots/index.js');
    const {heroSettings} = await server.ssrLoadModule('/src/heroSettings.js');
    const {default:Landing} = await server.ssrLoadModule('/src/Landing.jsx');
    const html = renderToStaticMarkup(createElement(Landing));
    const image = html.match(/<img[^>]*class="lp-stage-still"[^>]*>/)?.[0];
    assert.ok(image?.includes(featured.heroPoster));
    assert.ok(!image.includes(`/${featured.image}`), 'the studio portrait must not be used as a hero placeholder');
    assert.ok(image.includes('fetchPriority="high"'));
    const settings = heroSettings(featured.heroProps, false);
    assert.equal(settings.pose, featured.heroProps.pose);
    assert.equal(settings.expression, featured.heroProps.expression);
    assert.equal(settings.transparent, true);
    const poster = await readFile(new URL(`../public/images/${featured.heroPoster}`,import.meta.url));
    assert.ok(poster.length < 50_000);
    assert.equal(poster.toString('ascii',8,12),'WEBP');
    assert.equal(poster.toString('ascii',12,16),'VP8X');
    assert.ok(poster[20] & 0x10,'the first image must preserve transparency');
  } finally {await server.close();}
});
