import {Suspense, lazy, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Landing from './Landing';
import {getMascot} from './mascots';
import './style.css';

const StudioPage = lazy(() => import('./studio/StudioPage'));
const EmbedPage = lazy(() => import('./embed/EmbedPage'));
const PortraitCapture = lazy(() => import('./PortraitCapture'));

/** Hash routes: #home, #<section>, #studio/<id>?c=…, #embed/<id>?c=…&bg=… */
function readRoute() {
  const [path, search = ''] = (location.hash.slice(1) || 'home').split('?');
  return {path, query: new URLSearchParams(search), key: location.hash};
}

function App() {
  const [route, setRoute] = useState(readRoute);
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
    if (section === 'embed') return;
    document.title = meta ? `${meta.name} studio — Visage` : 'Visage — Soft faces for sharp systems';
    if (meta || route.path === 'home' || section === 'portrait') window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(route.path)?.scrollIntoView({block: 'start'}));
  }, [route, meta, section]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (import.meta.env.DEV && section === 'portrait') {
    return (
      <Suspense fallback={<p>Preparing render…</p>}>
        <PortraitCapture key={id} name={id} />
      </Suspense>
    );
  }

  if (section === 'embed') {
    if (!meta) return <p className="embed-error">Unknown mascot.</p>;
    return (
      <Suspense fallback={null}>
        <EmbedPage key={route.key} meta={meta} query={route.query} />
      </Suspense>
    );
  }

  if (!meta) return <Landing onNotice={setNotice} notice={notice} />;

  return (
    <Suspense fallback={<p className="page-loading">Opening {meta.name}…</p>}>
      <StudioPage meta={meta} query={route.query} notice={notice} onNotice={setNotice} />
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(<App />);
