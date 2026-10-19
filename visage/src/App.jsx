import {Component, Suspense, lazy, useEffect, useState} from 'react';
import Landing from './Landing';
import {getMascot} from './mascots';
import './style.css';

import DocsPage from './docs/DocsPage';
const StudioPage = lazy(() => import('./studio/StudioPage'));
const EmbedPage = lazy(() => import('./embed/EmbedPage'));
const PortraitCapture = lazy(() => import('./PortraitCapture'));

export class AppBoundary extends Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() {
    if (location.hash.startsWith('#embed/') && window.parent !== window) {
      window.parent.postMessage({visage: 1, event: 'error', error: 'The mascot could not render.'}, '*');
    }
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="page-error" role="alert">
      <h1>Mascotty could not load.</h1>
      <p>Check your connection, then reload to get the latest version.</p>
      <button type="button" onClick={() => location.reload()}>Reload Mascotty</button>
      <a href={import.meta.env.BASE_URL}>Back to home</a>
    </main>;
  }
}

function UnknownEmbed() {
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({visage: 1, event: 'error', error: 'Unknown mascot. Choose a character from the Mascotty studio.'}, '*');
  }, []);
  return <p className="embed-error">Unknown mascot.</p>;
}

/** Hash routes: #home, #<section>, #studio/<id>?c=…, #embed/<id>?c=…&bg=… */
export function readRoute() {
  const base = import.meta.env.BASE_URL;
  const relative = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : '';
  const hash = location.hash.slice(1);
  const legacy = /^(docs|studio|embed|portrait)(?:\/|$)/.test(hash) || hash === 'home';
  const [path, search = ''] = (legacy ? hash : relative.startsWith('docs/') ? relative.replace(/\/$/, '') : hash || 'home').split('?');
  return {path, query: new URLSearchParams(search || location.search.slice(1)), key: location.href};
}

export function App({initialRoute}) {
  const [route, setRoute] = useState(() => initialRoute || readRoute());
  const [notice, setNotice] = useState('');
  const [section, id] = route.path.split('/');
  const meta = section === 'studio' || section === 'embed' ? getMascot(id) : null;

  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      setNotice('');
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  useEffect(() => {
    if (section === 'docs') return;
    const robots = document.querySelector('meta[name=robots]');
    if(robots) robots.content = section === 'studio' || section === 'embed' ? 'noindex, follow' : 'index, follow';
    document.title = meta ? `${meta.name} ${section === 'embed' ? 'mascot' : 'studio'} — Mascotty` : 'Mascotty — Open-source 3D mascots for websites & AI assistants';
    if (section === 'embed') return;
    if (meta || route.path === 'home' || section === 'portrait') window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(route.path)?.scrollIntoView({block: 'start'}));
  }, [route, meta, section]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (section === 'docs') return (
    <DocsPage pageId={id} sectionId={route.query.get('section') || (locationSafeHash())} />
  );

  if (import.meta.env.DEV && section === 'portrait') {
    return (
      <Suspense fallback={<p>Preparing render…</p>}>
        <PortraitCapture key={id} name={id} />
      </Suspense>
    );
  }

  if (section === 'embed') {
    if (!meta) return <UnknownEmbed />;
    return (
      <Suspense fallback={null}>
        <EmbedPage key={route.key} meta={meta} query={route.query} />
      </Suspense>
    );
  }

  if (!meta && section === 'studio') return <main className="page-error">
    <h1>That character isn't in the cast.</h1>
    <p>Head back to Mascotty and choose a character from the studio.</p>
    <a href="#home">Meet the cast</a>
  </main>;

  if (!meta) return <Landing onNotice={setNotice} notice={notice} />;

  return (
    <Suspense fallback={<p className="page-loading">Opening {meta.name}…</p>}>
      <StudioPage key={route.key} meta={meta} query={route.query} notice={notice} onNotice={setNotice} />
    </Suspense>
  );
}

function locationSafeHash(){ return typeof location !== 'undefined' && location.hash.startsWith('#docs-') ? location.hash.slice(6) : null; }
