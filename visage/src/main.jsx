import React, {Component, Suspense, lazy, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight, ArrowLeft, Sun, Moon, X} from 'lucide-react';
import Landing from './Landing';
import './style.css';

const studios = {
  portrait: lazy(() => import('./VisageStudio')),
  blob: lazy(() => import('./GreenBlobStudio')),
  mallow: lazy(() => import('./SheepStudio')),
};
const PortraitCapture = lazy(() => import('./PortraitCapture'));
const names = {portrait: 'Portrait', blob: 'Green Blob', mallow: 'Mallow'};
function readRoute() { return location.hash.slice(1) || 'home'; }
class StudioBoundary extends Component {
  state = {error: false};
  static getDerivedStateFromError() { return {error: true}; }
  render() {
    if (this.state.error) return <div className="studio-fallback"><h1>The studio needs a reset.</h1><p>Reload to try again. A recent browser with WebGL and hardware acceleration is required.</p><button className="button" onClick={() => location.reload()}>Reload studio</button><a href="#home">Back to the exhibition</a></div>;
    return this.props.children;
  }
}
function App() {
  const [route, setRoute] = useState(readRoute);
  const [theme, setTheme] = useState(() => {try {return localStorage.getItem('visage-theme') === 'dark' ? 'dark' : 'light';} catch {return 'light';}});
  const [focus, setFocus] = useState(false);
  const [notice, setNotice] = useState('');
  const character = route.startsWith('studio/') ? route.split('/')[1] : null;
  const Studio = studios[character];
  useEffect(() => {
    const change = () => {setRoute(readRoute()); setFocus(false); setNotice('');};
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = Studio ? theme : 'exhibit';
    document.documentElement.style.colorScheme = Studio ? theme : 'light';
    document.documentElement.style.background = Studio ? '' : '#f7f9f8';
    try {localStorage.setItem('visage-theme', theme);} catch {}
  }, [theme, Studio]);
  useEffect(() => {
    document.title = Studio ? `${names[character]} studio — Visage` : 'Visage — Soft faces for sharp systems';
    if (Studio || route === 'home' || route.startsWith('portrait/')) window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(route)?.scrollIntoView({block: 'start'}));
  }, [route, Studio, character]);
  useEffect(() => {
    const escape = e => {if (e.key === 'Escape') setFocus(false);};
    window.addEventListener('keydown', escape);
    document.body.style.overflow = focus ? 'hidden' : '';
    return () => {window.removeEventListener('keydown', escape); document.body.style.overflow = '';};
  }, [focus]);
  useEffect(() => {if (!notice) return; const id = setTimeout(() => setNotice(''), 7000); return () => clearTimeout(id);}, [notice]);
  if (import.meta.env.DEV && route.startsWith('portrait/')) {
    const shot = route.split('/')[1];
    return <Suspense fallback={<p>Preparing render…</p>}><PortraitCapture key={shot} name={shot}/></Suspense>;
  }
  if (!Studio) return <Landing onNotice={setNotice} notice={notice}/>;
  return <div className={`app studio-app ${focus ? 'focused' : ''}`} data-ui>
    <a className="skip-link" href="#studio-content">Skip to studio</a>
    <header className="studio-header">
      <a className="brand" href="#home" aria-label="Visage home">visage<span className="brand-dot"/></a>
      <nav className="exp-nav" aria-label="Choose a character">{Object.entries(names).map(([id, label]) => <a key={id} href={`#studio/${id}`} aria-current={character === id ? 'page' : undefined}>{label}</a>)}</nav>
      <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button>
    </header>
    <main id="studio-content" className="studio-main" tabIndex={-1}>
      <a className="back-link" href="#characters"><ArrowLeft size={16}/> All characters</a>
      <StudioBoundary key={character}><Suspense fallback={<div className="studio-loading" role="status"><span className="loading-mark"/><h1>Opening {names[character]}.</h1><p>Preparing your interactive 3D studio.</p></div>}><Studio theme={theme} focus={focus} setFocus={setFocus} onNotice={setNotice}/></Suspense></StudioBoundary>
    </main>
    <footer className="studio-footer"><a href="#home">Visage</a><span>Made to move. Yours to direct.</span><a href="#integration">Integration guide <ArrowUpRight size={14}/></a></footer>
    {focus && <button className="exit-focus" onClick={() => setFocus(false)}><X size={18}/> Exit focus</button>}
    {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16}/></button></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
