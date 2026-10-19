import assert from 'node:assert/strict';
import {readFile, access, readdir} from 'node:fs/promises';
import {docsPages} from '../src/docs/navigation.js';
import {publicSiteUrl} from '../src/site.js';
import {loadEnv} from 'vite';
const env = {...loadEnv('production', process.cwd(), ''), ...process.env};
const base = env.VISAGE_BASE || '/';
const site = (env.VITE_PUBLIC_SITE_URL || publicSiteUrl).replace(/\/$/, '');
const titles = new Set(), descriptions = new Set();
for (const path of ['', ...docsPages.map(p => `docs/${p.id}/`)]) {
  const html = await readFile(`dist/${path}index.html`, 'utf8');
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${path}: one primary heading`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  assert.ok(title && description); assert.ok(!titles.has(title)); assert.ok(!descriptions.has(description));
  titles.add(title); descriptions.add(description);
  assert.ok(html.includes(`<link rel="canonical" href="${site}/${path}"`));
  assert.ok(html.includes('property="og:image"')); assert.ok(html.includes('name="twitter:card"'));
  assert.doesNotMatch(html,/localhost|127\.0\.0\.1|href="[^"]*\.md(?:["?#])/);
  for(const [,data] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) assert.ok(JSON.parse(data)['@context']);
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if(url.startsWith(base) && !url.startsWith('//')) {
      const relative=url.slice(base.length).split(/[?#]/)[0];
      if(relative) await access(`dist/${relative}${relative.endsWith('/')?'index.html':''}`);
    }
  }
}
const files = await readdir('dist',{recursive:true});
assert.equal(files.filter(p=>p.endsWith('.md')).length,0);
assert.equal((await readFile('dist/sitemap.xml','utf8')).match(/<loc>/g).length,docsPages.length+1);
assert.match(await readFile('dist/404.html','utf8'),/noindex, follow/);
console.log(`Validated ${titles.size} crawlable pages, unique metadata, structured data, internal assets and sitemap.`);
