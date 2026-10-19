import {Component, useEffect, useMemo, useState} from 'react';
import Studio, {StudioTopBar} from './Studio';
import {decodeConfig} from '../integration';
import '@fontsource-variable/urbanist';
import './Studio.css';

const asset = name => `${import.meta.env.BASE_URL}images/${name}`;

class StudioBoundary extends Component {
  state = {error: false};
  static getDerivedStateFromError() {
    return {error: true};
  }
  render() {
    if (this.state.error) {
      return (
        <div className="st-message" role="alert">
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

export default function StudioPage({meta, query, notice, onNotice}) {
  // A share link (#studio/<id>?c=…) opens with those settings applied once.
  const overrides = useMemo(() => decodeConfig(query?.get('c')), [query]);
  const [theme, setTheme] = useState(readTheme);
  const [loaded, setLoaded] = useState({id: null, def: null, error: false});

  useEffect(() => {
    let alive = true;
    setLoaded({id: meta.id, def: null, error: false});
    meta
      .load()
      .then(mod => alive && setLoaded({id: meta.id, def: mod.default, error: false}))
      .catch(() => alive && setLoaded({id: meta.id, def: null, error: true}));
    return () => {
      alive = false;
    };
  }, [meta]);

  // The studio is a full-screen room: the page itself never scrolls.
  useEffect(() => {
    const root = document.documentElement;
    root.style.background = theme === 'dark' ? '#141217' : '#f8f3ee';
    root.style.colorScheme = theme;
    document.body.style.overflow = 'hidden';
    try {
      localStorage.setItem('visage-theme', theme);
    } catch {
      /* theme still applies for this visit */
    }
    return () => {
      root.style.background = '';
      root.style.colorScheme = '';
      document.body.style.overflow = '';
    };
  }, [theme]);

  const def = loaded.id === meta.id ? loaded.def : null;

  return (
    <div className="st" data-theme={theme}>
      <main id="studio-content" tabIndex={-1}>
        {def ? (
          <StudioBoundary key={meta.id}>
            <Studio key={meta.id} meta={meta} def={def} theme={theme} setTheme={setTheme} onNotice={onNotice} overrides={overrides} />
          </StudioBoundary>
        ) : (
          <div className="st-room is-loading" style={{'--surface': meta.tint}}>
            <div className="st-overlay">
              <StudioTopBar meta={meta} theme={theme} setTheme={setTheme} />
            </div>
            {loaded.error ? (
              <div className="st-message" role="alert">
                <h2>{meta.name} could not load.</h2>
                <p>Check your connection and reload the page.</p>
                <button type="button" className="st-cta" onClick={() => location.reload()}>
                  Reload
                </button>
              </div>
            ) : (
              <div className="st-message" role="status">
                <img src={asset(meta.image)} alt="" />
                <p>Opening {meta.name}…</p>
              </div>
            )}
          </div>
        )}
      </main>

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
