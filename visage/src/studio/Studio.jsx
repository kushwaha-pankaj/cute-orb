import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Moon,
  Orbit,
  Pause,
  Play,
  Rotate3d,
  RotateCcw,
  Square,
  Sun,
  Volume2,
} from 'lucide-react';
import {mascots} from '../mascots';
import {ControlList} from './controls';
import useVoice from './useVoice';

/**
 * One studio for every mascot: the character fills the room and the controls float over it.
 * `meta` comes from the registry (src/mascots/index.js); `def` is the mascot's lazily loaded
 * studio definition:
 *
 *   defaults        full config object the renderer understands
 *   Renderer        ({config, audioLevel, speechCue, theme, onReady, onError, controlRef}) => JSX
 *   panels          [{id, label, controls: [...schema, see controls.jsx]}]
 *   states?         {key, options: [{id, label, symbol, caption?}]}     AI presence states
 *   expressions?    {key, label, options: [{id, label, symbol}], apply?(config, id)}
 *   voice?          {line}                                              speech + microphone card
 *   api?            (ctx) => methods, published on window[meta.api.global]
 *   storageKey?, transient?, migrate?(saved), update?(config, key, value)
 *   engine, hint, caption?(config), surface?(theme), capture?, spinKey?,
 *   stageAction?: {label(config), apply(config)}, downloads?: [{label, href}]
 */

const asset = name => `${import.meta.env.BASE_URL}images/${name}`;
const notes = `${import.meta.env.BASE_URL}integration.md`;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadConfig(def) {
  let saved = {};
  if (def.storageKey) {
    try {
      saved = JSON.parse(localStorage.getItem(def.storageKey) || '{}') || {};
    } catch {
      saved = {};
    }
  }
  for (const key of def.transient || []) delete saved[key];
  if (def.migrate && Object.keys(saved).length) saved = def.migrate(saved);
  const config = {...def.defaults, ...saved};
  if ('motion' in def.defaults && !('motion' in saved) && reducedMotion()) config.motion = false;
  return config;
}

function freshConfig(def) {
  const config = {...def.defaults};
  if ('motion' in config && reducedMotion()) config.motion = false;
  return config;
}

function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

function IconButton({label, onClick, children, pressed, className = ''}) {
  return (
    <button type="button" className={`st-icon ${className}`} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

/** Floating top bar: brand, cast switcher, and whatever actions the page passes in. */
export function StudioTopBar({meta, theme, setTheme, children}) {
  return (
    <header className="st-top">
      <div className="st-top-start">
        <a className="st-logo st-glass" href="#home" aria-label="Visage home">
          <img src={asset(mascots[0].image)} alt="" width="30" height="30" />
          <span>Visage</span>
        </a>
        <nav className="st-switch st-glass" aria-label="Choose a character">
          {mascots.map(m => (
            <a key={m.id} href={`#studio/${m.id}`} aria-current={m.id === meta.id ? 'page' : undefined}>
              <img src={asset(m.image)} alt="" width="26" height="26" style={{background: m.tint}} />
              <span>{m.name}</span>
            </a>
          ))}
        </nav>
      </div>
      <div className="st-top-end">
        {children}
        <IconButton
          className="st-glass"
          label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </IconButton>
      </div>
    </header>
  );
}

export default function Studio({meta, def, theme, setTheme, onNotice}) {
  const [config, setConfig] = useState(() => loadConfig(def));
  const [tab, setTab] = useState(def.panels[0]?.id);
  const [tour, setTour] = useState(null);
  const [clean, setClean] = useState(false);
  const [readyInfo, setReadyInfo] = useState(null);
  const [externalLevel, setExternalLevel] = useState(null);
  const [line, setLine] = useState(def.voice?.line || '');
  const [copied, setCopied] = useState(false);
  const controlRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;

  const stateKey = def.states?.key;
  const exprKey = def.expressions?.key;
  const stateIds = useMemo(() => new Set(def.states?.options.map(o => o.id)), [def]);

  const patch = useCallback(
    (key, value) => setConfig(c => (def.update ? def.update(c, key, value) : {...c, [key]: value})),
    [def],
  );
  const setStateValue = useCallback(s => stateKey && stateIds.has(s) && patch(stateKey, s), [patch, stateKey, stateIds]);
  const applyExpression = useCallback(
    id => setConfig(c => (def.expressions.apply ? def.expressions.apply(c, id) : {...c, [exprKey]: id})),
    [def, exprKey],
  );
  const reset = useCallback(() => {
    setConfig(freshConfig(def));
    setExternalLevel(null);
    controlRef.current?.resetCamera?.();
  }, [def]);

  const voice = useVoice({onState: setStateValue, onNotice});

  useEffect(() => {
    if (!def.storageKey) return;
    const saved = {...config};
    for (const key of def.transient || []) delete saved[key];
    try {
      localStorage.setItem(def.storageKey, JSON.stringify(saved));
    } catch {
      /* storage can be unavailable; settings still work for this visit */
    }
  }, [config, def]);

  useEffect(() => {
    const escape = e => e.key === 'Escape' && setClean(false);
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  // Guided tours step through expressions or states.
  useEffect(() => {
    if (!tour) return;
    const source = tour === 'states' ? def.states : def.expressions;
    const ids = source.options.map(o => o.id);
    let index = ids.indexOf(configRef.current[source.key]);
    const id = setInterval(() => {
      const next = ids[++index % ids.length];
      if (tour === 'states') patch(source.key, next);
      else applyExpression(next);
    }, tour === 'states' ? 3200 : 2400);
    return () => clearInterval(id);
  }, [tour, def, patch, applyExpression]);

  // Publish the mascot's controller while the studio is open.
  useEffect(() => {
    const name = meta.api?.global;
    if (!def.api || !name) return;
    const api = def.api({
      setConfig,
      patch,
      get: () => ({...configRef.current}),
      reset,
      setAudioLevel: setExternalLevel,
    });
    window[name] = api;
    return () => {
      if (window[name] === api) delete window[name];
    };
  }, [def, meta, patch, reset]);

  function exportConfig() {
    const blob = new Blob([JSON.stringify({version: 1, mascot: meta.id, ...config}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    download(url, `${meta.id}.config.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice(`${meta.name} settings exported.`);
  }

  function capture() {
    const image = controlRef.current?.capture?.();
    if (image) download(image, `${meta.id}.png`);
    else onNotice('Capture is not ready yet. Try again in a moment.');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(meta.api.example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotice('Select the code and copy it with your keyboard.');
    }
  }

  const {Renderer} = def;
  const currentState = def.states?.options.find(o => o.id === config[stateKey]);
  const currentExpr = def.expressions?.options.find(o => o.id === config[exprKey]);
  const status = currentState?.label || currentExpr?.label || 'Live';
  const panel = def.panels.find(p => p.id === tab) || def.panels[0];
  const showApi = !!(def.api && meta.api);
  const hasRail = !!(def.states || def.voice || showApi);
  const roomClass = ['st-room', clean && 'is-clean', !hasRail && 'no-rail', !def.expressions && 'no-dock'].filter(Boolean).join(' ');

  return (
    <div className={roomClass} style={{'--surface': def.surface ? def.surface(theme) : meta.tint}}>
      <div className="st-canvas" aria-label={`${meta.name}, interactive 3D preview`}>
        <Renderer
          config={config}
          theme={theme}
          audioLevel={voice.mic ? voice.level : externalLevel}
          speechCue={voice.speechCue}
          controlRef={controlRef}
          onReady={setReadyInfo}
          onError={onNotice}
        />
      </div>

      <div className="st-overlay">
        <StudioTopBar meta={meta} theme={theme} setTheme={setTheme}>
          {def.downloads?.map(d => (
            <a key={d.href} className="st-pill st-glass st-hide-sm" href={d.href} download>
              <Download size={16} /> {d.label}
            </a>
          ))}
          {def.capture && (
            <IconButton className="st-glass" label="Save PNG" onClick={capture}>
              <Camera size={17} />
            </IconButton>
          )}
          <button type="button" className="st-cta small" onClick={exportConfig}>
            <Download size={16} /> <span className="st-hide-sm">Export</span>
          </button>
        </StudioTopBar>

        <div className="st-sheet">
          <aside className="st-panel st-glass" aria-label={`${meta.name} settings`}>
            <div className="st-panel-head">
              <div>
                <p className="st-kicker">{meta.material}</p>
                <h1>{meta.name}</h1>
              </div>
              <IconButton
                label="Reset to defaults"
                onClick={() => {
                  voice.stopAll();
                  setTour(null);
                  reset();
                  onNotice(`${meta.name} defaults restored.`);
                }}
              >
                <RotateCcw size={15} />
              </IconButton>
            </div>
            {def.panels.length > 1 && (
              <div className="st-tabs" role="tablist">
                {def.panels.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    id={`tab-${p.id}`}
                    aria-selected={p.id === panel.id}
                    aria-controls="st-tabpanel"
                    onClick={() => setTab(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="st-controls" id="st-tabpanel" role="tabpanel" aria-labelledby={`tab-${panel.id}`}>
              <ControlList controls={panel.controls} config={config} patch={patch} setConfig={setConfig} readyInfo={readyInfo} />
            </div>
          </aside>

          {def.expressions && (
            <section className="st-dock st-glass" aria-labelledby="st-expr-title">
              <div className="st-dock-head">
                <h2 id="st-expr-title">
                  {def.expressions.label} <span>{def.expressions.options.length}</span>
                </h2>
                <button
                  type="button"
                  className="st-mini"
                  aria-pressed={tour === 'expressions'}
                  onClick={() => setTour(t => (t === 'expressions' ? null : 'expressions'))}
                >
                  {tour === 'expressions' ? <Square size={11} /> : <Play size={11} />}
                  {tour === 'expressions' ? 'Stop' : 'Tour'}
                </button>
              </div>
              <div
                className="st-chips st-scroll-x"
                onWheel={e => {
                  // Let a plain mouse wheel browse the row sideways.
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
                }}
              >
                {def.expressions.options.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={config[exprKey] === o.id}
                    onClick={() => {
                      setTour(null);
                      applyExpression(o.id);
                    }}
                  >
                    <span aria-hidden="true">{o.symbol}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {hasRail && (
            <aside className="st-rail" aria-label="Presence">
              {def.states && (
                <section className="st-card st-glass" aria-labelledby="st-states-title">
                  <div className="st-card-head">
                    <h2 id="st-states-title">AI state</h2>
                    <button type="button" className="st-mini" aria-pressed={tour === 'states'} onClick={() => setTour(t => (t === 'states' ? null : 'states'))}>
                      {tour === 'states' ? <Square size={11} /> : <Play size={11} />}
                      {tour === 'states' ? 'Stop' : 'Cycle'}
                    </button>
                  </div>
                  <div className="st-chips st-states">
                    {def.states.options.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={config[stateKey] === o.id}
                        onClick={() => {
                          setTour(null);
                          voice.stopAll();
                          patch(stateKey, o.id);
                        }}
                      >
                        <span aria-hidden="true">{o.symbol}</span>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {def.voice && (
                <section className="st-card st-glass" aria-labelledby="st-voice-title">
                  <div className="st-card-head">
                    <h2 id="st-voice-title">Voice</h2>
                  </div>
                  <textarea rows={3} aria-label={`${meta.name} voice preview text`} maxLength={500} value={line} onChange={e => setLine(e.target.value)} />
                  <div className="st-row">
                    <button type="button" className="st-cta small" disabled={!line.trim()} onClick={() => voice.speak(line)}>
                      <Volume2 size={15} /> {voice.speaking ? 'Stop' : 'Speak'}
                    </button>
                    <button type="button" className="st-pill" aria-pressed={voice.mic} onClick={voice.toggleMic}>
                      {voice.mic ? <MicOff size={15} /> : <Mic size={15} />} {voice.mic ? 'Stop mic' : 'Mic'}
                    </button>
                  </div>
                  {voice.mic && <meter aria-label="Microphone level" min="0" max="1" value={voice.level} />}
                  <small>Audio stays in your browser.</small>
                </section>
              )}

              {showApi && (
                <details className="st-card st-glass st-code">
                  <summary>
                    <h2>Connect {meta.name}</h2>
                    <span>window.{meta.api.global}</span>
                  </summary>
                  <pre>
                    <code>{meta.api.example}</code>
                  </pre>
                  <div className="st-row">
                    <button type="button" className="st-pill" onClick={copyCode}>
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    <a className="st-pill" href={notes} download>
                      Notes ↗
                    </a>
                  </div>
                </details>
              )}
            </aside>
          )}
        </div>

        <div className="st-center">
          <p className="st-status st-glass" role="status">
            <i className={`st-dot ${config[stateKey] || ''}`} aria-hidden="true" />
            <b>{status}</b>
            {def.caption && <span>{def.caption(config)}</span>}
          </p>
          <div className="st-toolbar st-glass" role="toolbar" aria-label="Stage">
            {'motion' in config && (
              <IconButton label={config.motion ? 'Pause animation' : 'Play animation'} onClick={() => patch('motion', !config.motion)}>
                {config.motion ? <Pause size={16} /> : <Play size={16} />}
              </IconButton>
            )}
            {def.spinKey && (
              <IconButton label={config[def.spinKey] ? 'Stop spin' : 'Auto spin'} pressed={!!config[def.spinKey]} onClick={() => patch(def.spinKey, !config[def.spinKey])}>
                <Rotate3d size={16} />
              </IconButton>
            )}
            {def.capture && (
              <IconButton label="Reset view" onClick={() => controlRef.current?.resetCamera?.()}>
                <RotateCcw size={16} />
              </IconButton>
            )}
            {def.stageAction && (
              <button type="button" className="st-mini" onClick={() => setConfig(def.stageAction.apply)}>
                <Orbit size={14} /> {def.stageAction.label(config)}
              </button>
            )}
            <span className="st-hint">{def.hint}</span>
            <IconButton label="Hide controls" onClick={() => setClean(true)}>
              <EyeOff size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      {clean && (
        <button type="button" className="st-show st-glass" onClick={() => setClean(false)}>
          <Eye size={16} /> Show controls
        </button>
      )}
    </div>
  );
}
