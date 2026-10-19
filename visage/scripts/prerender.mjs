import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createServer, loadEnv} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {publicSiteUrl} from '../src/site.js';

const env = {...loadEnv('production', process.cwd(), ''), ...process.env};
const base = env.VISAGE_BASE || '/';
const site = (env.VITE_PUBLIC_SITE_URL || publicSiteUrl).replace(/\/$/, '');
if (!site.startsWith('https://')) throw new Error('The canonical site URL must use HTTPS.');
const template = await readFile('dist/index.html', 'utf8');
const server = await createServer({base, mode: 'production', server: {middlewareMode: true, watch: null}, appType: 'custom'});
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const pages = [];
try {
  const {App, AppBoundary} = await server.ssrLoadModule('/src/App.jsx');
  const {docsPages} = await server.ssrLoadModule('/src/docs/navigation.js');
  const routes = [{path: 'home', title: 'Mascotty — Open-source 3D mascots for websites & AI assistants', description: 'Create expressive 3D mascots for your website or AI assistant. Explore the free MIT-licensed character studio, HTML embeds, React integration and community developer guides.'}, ...docsPages.map(page => ({...page, path: `docs/${page.id}`, title: `${page.title} — Mascotty developer documentation`}))];
  for (const page of routes) {
    const url = `${site}${page.path === 'home' ? '/' : `/${page.path}/`}`;
    const image = `${site}/images/social-card.png`;
    const body = renderToString(createElement(AppBoundary, null, createElement(App, {initialRoute: {path: page.path, query: new URLSearchParams(), key: ''}})));
    const schema = page.path === 'home' ? {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Mascotty', url, description: page.description,
      applicationCategory: 'DeveloperApplication', operatingSystem: 'Web browser with WebGL', license: `${site}/docs/license/`,
      offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'}, image,
    } : {'@context': 'https://schema.org', '@graph': [
      {'@type': 'TechArticle', headline: page.title, description: page.description, url, inLanguage: 'en', isPartOf: {'@type': 'WebSite', name: 'Mascotty', url: `${site}/`}},
      {'@type': 'BreadcrumbList', itemListElement: [
        {'@type': 'ListItem', position: 1, name: 'Mascotty', item: `${site}/`},
        {'@type': 'ListItem', position: 2, name: page.title.split(' — ')[0], item: url},
      ]},
    ]};
    const tags = [
      ['name','robots','index, follow, max-image-preview:large'],
      ['property','og:type',page.path === 'home' ? 'website' : 'article'],
      ['property','og:site_name','Mascotty'], ['property','og:title',page.title], ['property','og:description',page.description],
      ['property','og:url',url], ['property','og:image',image], ['property','og:image:width','1200'], ['property','og:image:height','630'],
      ['property','og:image:alt','Mascotty — expressive open-source 3D mascots'],
      ['name','twitter:card','summary_large_image'], ['name','twitter:title',page.title], ['name','twitter:description',page.description], ['name','twitter:image',image],
    ].map(([attr, name, content]) => `<meta ${attr}="${name}" content="${escape(content)}"/>`).join('\n    ');
    const meta = `<link rel="canonical" href="${escape(url)}"/>\n    ${tags}\n    <script type="application/ld+json">${json(schema)}</script>`;
    const html = template.replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${escape(page.description)}"/>`)
      .replace('</head>', `${meta}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const folder = page.path === 'home' ? 'dist' : `dist/${page.path}`;
    await mkdir(folder, {recursive: true});
    await writeFile(`${folder}/index.html`, html);
    pages.push(url);
  }
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(url => `<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>\n`);
  // GitHub project Pages cannot control the origin-root robots.txt; advertise the sitemap in HTML too.
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
  await writeFile('dist/404.html', template.replace(/<title>.*?<\/title>/, '<title>Page not found — Mascotty</title>').replace('</head>', '<meta name="robots" content="noindex, follow"/></head>').replace('<div id="root"></div>', `<main style="font-family:system-ui;padding:10vh 8vw"><h1>Page not found</h1><p>Choose a guide or return to the character studio.</p><a href="${base}">Mascotty home</a> · <a href="${base}docs/quick-start/">Developer documentation</a></main>`).replace(/<script type="module"[^>]*><\/script>/g, ''));
  console.log(`Pre-rendered ${pages.length} pages with canonical metadata, structured data and sitemap.`);
} finally { await server.close(); }
