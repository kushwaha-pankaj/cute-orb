import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {createElement, Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {docsPages, docsHref, docsText, getDocsPage, searchDocs} from '../src/docs/navigation.js';

test('documentation navigation, search and deep links resolve consistently', () => {
  assert.equal(new Set(docsPages.map(page => page.id)).size, docsPages.length);
  assert.equal(getDocsPage().id, 'quick-start');
  assert.equal(getDocsPage('missing'), undefined);
  assert.equal(docsHref('api', 'instance-methods'), '/docs/api/#docs-instance-methods');
  assert.equal(searchDocs(' REACT ')[0].id, 'react');
  assert.ok(searchDocs('audio').some(page => page.id === 'assistant'));
  assert.ok(searchDocs('github pages').some(page => page.id === 'deployment'));
  assert.deepEqual(searchDocs('no-such-term-xyz'), []);
  assert.equal(searchDocs('').length, docsPages.length);
});

test('every guide renders for every mascot and its documentation links resolve', async () => {
  globalThis.location = {origin: 'https://example.com', hostname: 'example.com'};
  const server = await createServer({server: {middlewareMode: true}, appType: 'custom'});
  try {
    const {getSections} = await server.ssrLoadModule('/src/docs/content.jsx');
    const {mascots} = await server.ssrLoadModule('/src/mascots/index.js');
    for (const mascot of mascots) {
      const pageSections = new Map(docsPages.map(page => [page.id, getSections(page.id, mascot)]));
      const searchIndex = Object.fromEntries([...pageSections].map(([id, sections]) => [id, sections.map(section => docsText(section.body)).join(' ')]));
      assert.ok(searchDocs('VITE_PUBLIC_SITE_URL', searchIndex).some(page => page.id === 'deployment'));
      assert.ok(searchDocs('data-config', searchIndex).some(page => page.id === 'configuration'));
      for (const page of docsPages) {
        const sections = pageSections.get(page.id);
        assert.ok(sections.length >= 3, `${page.id} must contain a complete guide`);
        assert.equal(new Set(sections.map(section => section.id)).size, sections.length);
        const html = renderToStaticMarkup(createElement(Fragment, null, ...sections.map(section => section.body)));
        assert.doesNotMatch(html, /localhost|127\.0\.0\.1|href="[^\"]*\.md(?:["?#])/);
        for (const [, pageId, sectionId] of html.matchAll(/href="(?:[^\"]*)\/docs\/([a-z-]+)\/(?:#docs-([a-z-]+))?"/g)) {
          assert.ok(getDocsPage(pageId), `Unknown linked guide ${pageId}`);
          if (sectionId) assert.ok(pageSections.get(pageId).some(section => section.id === sectionId));
        }
      }
    }
  } finally {
    await server.close();
  }
});

test('public assets contain no Markdown and site entry points link to documentation pages', async () => {
  const files = await readdir(new URL('../public/', import.meta.url), {recursive: true});
  assert.deepEqual(files.filter(file => /\.md$/i.test(file)), []);
  for (const file of ['src/Landing.jsx', 'src/studio/Studio.jsx', 'src/studio/IntegratePanel.jsx']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:href|notes)[^\n]*\.md/);
    assert.match(source, /docsHref\(/);
  }
});
