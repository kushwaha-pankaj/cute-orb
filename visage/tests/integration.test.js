import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transformWithEsbuild} from 'vite';
import vm from 'node:vm';

const integrationSource = await readFile(new URL('../src/integration.js', import.meta.url), 'utf8');
async function integration(env = {}, hostname = 'example.com') {
  const source = integrationSource.replace("'./site'", JSON.stringify(new URL('../src/site.js', import.meta.url).href))
    .replaceAll('import.meta.env', JSON.stringify({BASE_URL: '/studio/', DEV: false, ...env}));
  globalThis.location = {origin: `https://${hostname}`, hostname};
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('portable embed URLs use deployment paths, preview fallback and explicit HTTPS override', async () => {
  assert.equal((await integration()).hostUrl(), 'https://example.com/studio');
  assert.equal((await integration({DEV: true})).hostUrl(), 'https://kushwaha-pankaj.github.io/cute-orb');
  assert.equal((await integration({}, 'localhost')).hostUrl(), 'https://kushwaha-pankaj.github.io/cute-orb');
  assert.equal((await integration({VITE_PUBLIC_SITE_URL: 'https://cdn.example.com/mascots/'})).hostUrl(), 'https://cdn.example.com/mascots');
  const invalid = await integration({VITE_PUBLIC_SITE_URL: 'http://example.com'});
  assert.throws(() => invalid.hostUrl(), /HTTPS/);
  for (const url of ['https://example.com/?v=1', 'https://example.com/#section', 'https://user:pass@example.com']) {
    assert.throws((await integration({VITE_PUBLIC_SITE_URL: url})).hostUrl, /origin and optional path/);
  }
});

test('settings codec preserves unicode and rejects malformed settings', async () => {
  const {encodeConfig, decodeConfig} = await integration();
  const settings = {expression: 'happy', note: 'Hello 👋 नमस्ते', intensity: 0.8};
  assert.deepEqual(decodeConfig(encodeConfig(settings)), settings);
  assert.equal(encodeConfig({}), '');
  for (const text of ['bad!', 'W10', 'bnVsbA', 'IjEi']) assert.equal(decodeConfig(text), null);
});

test('generated examples compile and contain portable branded URLs for every mascot', async () => {
  const api = await integration({DEV: true});
  for (const mascot of [
    {id: 'mallow', name: 'Mallow', states: ['idle', 'listening', 'thinking', 'speaking'], expressions: ['happy']},
    {id: 'tofu', name: 'Tofu', states: ['idle', 'listening', 'thinking', 'speaking'], expressions: ['neutral', 'happy']},
    {id: 'blob', name: 'Green Blob', states: [], expressions: ['happy']},
    {id: 'portrait', name: 'Portrait', states: ['idle', 'speaking'], expressions: []},
  ]) {
    const first = api.firstEventSnippet(mascot);
    new vm.Script(first);
    if (mascot.states.length) assert.match(first, /setState/);
    else assert.doesNotMatch(first, /setState/);
    const html = api.htmlSnippet(mascot), js = api.jsSnippet(mascot), react = api.reactSnippet(mascot), agent = api.agentPrompt(mascot);
    for (const snippet of [html, js, react, agent, api.studioLink(mascot.id, ''), api.embedUrl(mascot.id)]) {
      assert.doesNotMatch(snippet, /localhost|127\.0\.0\.1|this computer|window\.Visage/);
    }
    assert.match(html, /data-mascotty=/);
    assert.match(html, /https:\/\/kushwaha-pankaj.github.io\/cute-orb\/mascotty.js/);
    assert.doesNotMatch(html, /\bdefer\b/);
    new vm.Script(js);
    await transformWithEsbuild(react, 'MascottyMascot.jsx', {loader: 'jsx', jsx: 'automatic'});
    if (!mascot.states.length) assert.doesNotMatch(js, /setState/);
  }
});

test('public pages and developer guides contain no preview-host wording', async () => {
  for (const file of ['src/Landing.jsx', 'src/studio/IntegratePanel.jsx', 'src/docs/content.jsx', 'src/docs/DocsPage.jsx']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /localhost|127\.0\.0\.1|this computer|Served from/);
  }
});

test('React script loader shares pending requests, reports failures and retries', async () => {
  const api = await integration({DEV: true});
  const snippet = api.reactSnippet({id: 'mallow'});
  const helper = snippet.slice(snippet.indexOf('const MASCOTTY'), snippet.indexOf('/** Drive'));
  const scripts = [];
  const window = {};
  const document = {createElement: () => ({remove() { this.removed = true; }}), head: {appendChild: script => scripts.push(script)}};
  const context = vm.createContext({window, document});
  vm.runInContext(helper, context);
  const first = context.loadMascotty();
  assert.equal(first, context.loadMascotty());
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /could not load/);
  assert.equal(scripts[0].removed, true);
  const retry = context.loadMascotty();
  assert.equal(scripts.length, 2);
  window.Mascotty = {mount() {}};
  scripts[1].onload();
  assert.equal(await retry, window.Mascotty);
  assert.equal(await context.loadMascotty(), window.Mascotty);
  assert.equal(scripts.length, 2);
});

function loaderHarness(file, attribute = 'data-mascotty') {
  const listeners = new Map();
  const posts = [];
  const element = {nodeType: 1, style: {}, innerHTML: '', getAttribute: key => key === attribute ? 'mallow' : null,
    appendChild(frame) { this.frame = frame; }};
  const window = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  };
  const document = {currentScript: {src: `https://mascots.example/sub/${file}?v=1`}, readyState: 'complete',
    querySelectorAll: () => [element], querySelector: () => element,
    createElement: () => ({style: {}, setAttribute() {}, remove() {this.removed = true;},
      contentWindow: {postMessage(message, origin) { posts.push({message, origin}); }}}),
  };
  const context = vm.createContext({window, document, URL, location: {href: 'https://host.example/'}, console});
  const message = (data, origin = 'https://mascots.example', source = element.frame.contentWindow) => {
    for (const fn of listeners.get('message') || []) fn({data, origin, source});
  };
  return {window, document, context, element, listeners, posts, message};
}

for (const file of ['mascotty.js', 'visage.js']) {
  test(`${file}: modern and legacy embeds queue calls, validate origin and remount after cleanup`, async () => {
    const source = await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');
    for (const attr of ['data-mascotty', 'data-visage']) {
      const h = loaderHarness(file, attr);
      vm.runInContext(source, h.context);
      const api = h.window.Mascotty, mascot = api.get('mallow');
      assert.equal(api, h.window.Visage);
      assert.equal(api.host, 'https://mascots.example/sub');
      assert.equal(h.element.frame.src, 'https://mascots.example/sub/#embed/mallow');
      mascot.setState('thinking');
      assert.equal(h.posts.length, 0);
      h.message({visage: 1, event: 'ready', info: {}}, 'https://untrusted.example');
      h.message({visage: 1, event: 'ready', info: {}}, 'https://mascots.example', {});
      assert.equal(h.posts.length, 0);
      h.message({visage: 1, event: 'ready', info: {states: ['thinking']}});
      assert.equal(h.posts[0].message.method, 'setState');
      assert.equal(h.posts[0].origin, 'https://mascots.example');
      const errors = [];
      mascot.on('error', error => errors.push(error));
      h.message({visage: 1, event: 'error', error: 'Renderer unavailable'});
      assert.deepEqual(errors, ['Renderer unavailable']);
      mascot.destroy(); mascot.destroy();
      assert.equal(api.get(h.element), null);
      assert.equal(h.listeners.get('message').size, 0);
      assert.equal(h.listeners.get('pointermove').size, 0);
      const count = h.posts.length;
      mascot.setState('idle');
      assert.equal(h.posts.length, count);
      const remounted = api.get('mallow');
      assert.notEqual(remounted, mascot);
      vm.runInContext(source, h.context);
      assert.equal(h.window.Mascotty, api);
      remounted.destroy();
    }
  });
}

test('shared and saved settings clamp ranges and reject unknown or unsafe values', async () => {
  const source = (await readFile(new URL('../src/studio/useMascotConfig.js', import.meta.url), 'utf8'))
    .replace("'react'", JSON.stringify(import.meta.resolve('react')));
  const {sanitize, initialConfig} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const def = {defaults: {size: 1, motion: true, tint: '#ffffff', state: 'idle'}, storageKey: 'test', transient: ['state'],
    states: {key: 'state', options: [{id: 'idle'}]}, panels: [{controls: [
      {key: 'size', type: 'range', min: 0.5, max: 2}, {key: 'tint', type: 'color'},
    ]}]};
  assert.deepEqual(sanitize(def, {size: 999, motion: 'true', tint: 'red', state: 'not-a-state', unknown: 2}), {size: 2});
  assert.deepEqual(sanitize(def, {size: Infinity}), {});
  assert.deepEqual(sanitize(def, JSON.parse('{"__proto__":{"polluted":true}}')), {});
  assert.deepEqual(sanitize(def, ['bad']), {});
  globalThis.localStorage = {getItem: () => '{"size":-99,"state":"bad","unknown":1}'};
  assert.deepEqual(initialConfig(def, {overrides: {tint: '#abc'}}), {size: 0.5, motion: true, tint: '#abc', state: 'idle'});
});
