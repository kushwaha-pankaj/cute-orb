import {Suspense, lazy, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Landing from './Landing';
import {getMascot} from './mascots';
import './style.css';

const StudioPage = lazy(() => import('./studio/StudioPage'));
const PortraitCapture = lazy(() => import('./PortraitCapture'));

function readRoute() {
  return location.hash.slice(1) || 'home';
}

function App() {
  const [route, setRoute] = useState(readRoute);
  const [notice, setNotice] = useState('');
  const meta = route.startsWith('studio/') ? getMascot(route.split('/')[1]) : null;

  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      setNotice('');
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  useEffect(() => {
    document.title = meta ? `${meta.name} studio — Visage` : 'Visage — Soft faces for sharp systems';
    if (meta || route === 'home' || route.startsWith('portrait/')) window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(route)?.scrollIntoView({block: 'start'}));
  }, [route, meta]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  if (import.meta.env.DEV && route.startsWith('portrait/')) {
    const shot = route.split('/')[1];
    return (
      <Suspense fallback={<p>Preparing render…</p>}>
        <PortraitCapture key={shot} name={shot} />
      </Suspense>
    );
  }

  if (!meta) return <Landing onNotice={setNotice} notice={notice} />;

  return (
    <Suspense fallback={<p className="page-loading">Opening {meta.name}…</p>}>
      <StudioPage meta={meta} notice={notice} onNotice={setNotice} />
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(<App />);
