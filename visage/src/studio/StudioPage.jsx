import {Component, useEffect, useState} from 'react';
import {Moon, Sun} from 'lucide-react';
import {mascots} from '../mascots';
import Studio from './Studio';
import '@fontsource-variable/urbanist';
import './Studio.css';

const asset = name => `${import.meta.env.BASE_URL}images/${name}`;
const notes = `${import.meta.env.BASE_URL}integration.md`;

class StudioBoundary extends Component {
  state = {error: false};
  static getDerivedStateFromError() {
    return {error: true};
  }
  render() {
    if (this.state.error) {
      return (
        <div className="st-fallback" role="alert">
          <h2>The studio needs a reset.</h2>
          <p>Reload to try again. A recent browser with WebGL and hardware acceleration is required.</p>
          <button type="button" className="st-cta" onClick={() => location.reload()}>
            Reload studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function readTheme() {
  try {
    return localStorage.getItem('visage-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function StudioPage({meta, notice, onNotice}) {
  const [theme, setTheme] = useState(readTheme);
  const [focus, setFocus] = useState(false);
  const [loaded, setLoaded] = useState({id: null, def: null, error: false});

  useEffect(() => {
    let alive = true;
    setFocus(false);
    setLoaded({id: meta.id, def: null, error: false});
    meta
      .load()
      .then(mod => alive && setLoaded({id: meta.id, def: mod.default, error: false}))
      .catch(() => alive && setLoaded({id: meta.id, def: null, error: true}));
    return () => {
      alive = false;
    };
  }, [meta]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.background = theme === 'dark' ? '#141217' : '#f8f3ee';
    root.style.colorScheme = theme;
    try {
      localStorage.setItem('visage-theme', theme);
    } catch {
      /* theme still applies for this visit */
    }
    return () => {
      root.style.background = '';
      root.style.colorScheme = '';
    };
  }, [theme]);

  useEffect(() => {
    const escape = e => e.key === 'Escape' && setFocus(false);
    window.addEventListener('keydown', escape);
    document.body.style.overflow = focus ? 'hidden' : '';
    return () => {
      window.removeEventListener('keydown', escape);
      document.body.style.overflow = '';
    };
  }, [focus]);

  const def = loaded.id === meta.id ? loaded.def : null;

  return (
    <div className="st" data-theme={theme}>
      <a className="skip-link" href="#studio-content">
        Skip to studio
      </a>
      <header className="st-header">
        <a className="st-logo" href="#home" aria-label="Visage home">
          <img src={asset(mascots[0].image)} alt="" width="34" height="34" />
          Visage
        </a>
        <nav className="st-switch" aria-label="Choose a character">
          {mascots.map(m => (
            <a key={m.id} href={`#studio/${m.id}`} aria-current={m.id === meta.id ? 'page' : undefined}>
              <img src={asset(m.image)} alt="" width="28" height="28" style={{background: m.tint}} />
              <span>{m.name}</span>
            </a>
          ))}
        </nav>
        <div className="st-header-end">
          <a className="st-link" href={notes} download>
            Docs
          </a>
          <button
            type="button"
            className="st-icon"
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </header>

      <main id="studio-content" className="st-main" tabIndex={-1}>
        {def ? (
          <StudioBoundary key={meta.id}>
            <Studio key={meta.id} meta={meta} def={def} theme={theme} focus={focus} setFocus={setFocus} onNotice={onNotice} />
          </StudioBoundary>
        ) : loaded.error ? (
          <div className="st-fallback" role="alert">
            <h2>{meta.name} could not load.</h2>
            <p>Check your connection and reload the page.</p>
            <button type="button" className="st-cta" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        ) : (
          <div className="st-loading" role="status">
            <img src={asset(meta.image)} alt="" style={{background: meta.tint}} />
            <p>Opening {meta.name}…</p>
          </div>
        )}
      </main>

      <footer className="st-footer">
        <span>Visage · Made to move. Yours to direct.</span>
        <nav aria-label="Footer">
          <a href="#home">Home</a>
          <a href="#cast">All characters</a>
          <a href={notes} download>
            Integration notes
          </a>
        </nav>
      </footer>

      {notice && (
        <div className="toast" role="status">
          {notice}
          <button type="button" aria-label="Dismiss notification" onClick={() => onNotice('')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
