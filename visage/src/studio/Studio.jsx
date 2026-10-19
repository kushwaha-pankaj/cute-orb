import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import {ControlList} from './controls';
import useVoice from './useVoice';

/**
 * One studio for every mascot. `meta` comes from the registry (src/mascots/index.js);
 * `def` is the mascot's lazily loaded studio definition:
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

function IconButton({label, onClick, children, pressed}) {
  return (
    <button type="button" className="st-icon" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Studio({meta, def, theme, focus, setFocus, onNotice}) {
  const [config, setConfig] = useState(() => loadConfig(def));
  const [tab, setTab] = useState(def.panels[0]?.id);
  const [tour, setTour] = useState(null);
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
  const hasCards = def.states || def.voice || (def.api && meta.api);

  return (
    <>
      <section className="st-title">
        <div>
          <a className="st-back" href="#cast">
            ← All characters
          </a>
          <p className="st-kicker">
            Studio <span aria-hidden="true">·</span> {meta.material}
          </p>
          <h1>{meta.name}</h1>
          <p className="st-tagline">{meta.tagline}</p>
        </div>
        <div className="st-title-actions">
          {def.downloads?.map(d => (
            <a key={d.href} className="st-ghost" href={d.href} download>
              <Download size={16} /> {d.label}
            </a>
          ))}
          {def.capture && (
            <button type="button" className="st-ghost" onClick={capture}>
              <Camera size={16} /> Save PNG
            </button>
          )}
          <button type="button" className="st-cta" onClick={exportConfig}>
            <Download size={16} /> Export settings
          </button>
        </div>
      </section>

      <div className="st-work">
        <section
          className={`st-stage ${focus ? 'is-focus' : ''}`}
          style={def.surface ? {'--surface': def.surface(theme)} : {background: meta.tint}}
          aria-label={`${meta.name} preview`}
        >
          <div className="st-stage-top">
            <span className="st-status">
              <i className={`st-dot ${config[stateKey] || ''}`} aria-hidden="true" />
              {status}
              <b aria-hidden="true">·</b>
              <span>{def.engine}</span>
            </span>
            <div className="st-icons">
              {'motion' in config && (
                <IconButton label={config.motion ? 'Pause animation' : 'Play animation'} onClick={() => patch('motion', !config.motion)}>
                  {config.motion ? <Pause size={16} /> : <Play size={16} />}
                </IconButton>
              )}
              {def.capture && (
                <IconButton label="Save PNG" onClick={capture}>
                  <Camera size={16} />
                </IconButton>
              )}
              <IconButton label={focus ? 'Exit focus mode' : 'Focus mode'} onClick={() => setFocus(!focus)}>
                {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </IconButton>
            </div>
          </div>

          <div className="st-canvas">
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

          <div className="st-stage-bottom">
            <div className="st-caption">
              {def.caption && <h2>{def.caption(config)}</h2>}
              <p>{def.hint}</p>
            </div>
            <div className="st-stage-actions">
              {def.stageAction && (
                <button type="button" className="st-chip-btn" onClick={() => setConfig(def.stageAction.apply)}>
                  {def.stageAction.label(config)}
                </button>
              )}
              {def.spinKey && (
                <button type="button" className="st-chip-btn" aria-pressed={!!config[def.spinKey]} onClick={() => patch(def.spinKey, !config[def.spinKey])}>
                  {config[def.spinKey] ? 'Stop spin' : 'Auto spin'}
                </button>
              )}
              {def.capture && (
                <button type="button" className="st-chip-btn" onClick={() => controlRef.current?.resetCamera?.()}>
                  <RotateCcw size={13} /> Reset view
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="st-panel" aria-label={`${meta.name} settings`}>
          <div className="st-panel-head">
            <h2>Make it yours</h2>
            <div>
              <IconButton label="Export settings" onClick={exportConfig}>
                <Download size={15} />
              </IconButton>
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
      </div>

      {def.expressions && (
        <section className="st-strip" aria-labelledby="st-expr-title">
          <div className="st-strip-head">
            <h2 id="st-expr-title">
              {def.expressions.label} <span>{def.expressions.options.length}</span>
            </h2>
            <button type="button" className="st-chip-btn" aria-pressed={tour === 'expressions'} onClick={() => setTour(t => (t === 'expressions' ? null : 'expressions'))}>
              {tour === 'expressions' ? <Square size={12} /> : <Play size={12} />}
              {tour === 'expressions' ? 'Stop tour' : 'Tour all'}
            </button>
          </div>
          <div className="st-chips">
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

      {hasCards && (
        <div className="st-cards">
          {def.states && (
            <section className="st-card lilac" aria-labelledby="st-states-title">
              <h2 id="st-states-title">AI states</h2>
              <p>One identity. Different energies.</p>
              <div className="st-chips">
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
              <button type="button" className="st-chip-btn" aria-pressed={tour === 'states'} onClick={() => setTour(t => (t === 'states' ? null : 'states'))}>
                {tour === 'states' ? <Square size={12} /> : <Play size={12} />}
                {tour === 'states' ? 'Stop cycle' : 'Auto cycle'}
              </button>
            </section>
          )}

          {def.voice && (
            <section className="st-card peach" aria-labelledby="st-voice-title">
              <h2 id="st-voice-title">A voice to match</h2>
              <p>Try a line and watch {meta.name} respond.</p>
              <textarea aria-label={`${meta.name} voice preview text`} maxLength={500} value={line} onChange={e => setLine(e.target.value)} />
              <div className="st-row">
                <button type="button" className="st-cta small" disabled={!line.trim()} onClick={() => voice.speak(line)}>
                  <Volume2 size={16} /> {voice.speaking ? 'Stop voice' : 'Speak preview'}
                </button>
                <button type="button" className="st-ghost small" aria-pressed={voice.mic} onClick={voice.toggleMic}>
                  {voice.mic ? <MicOff size={16} /> : <Mic size={16} />} {voice.mic ? 'Stop microphone' : 'Live microphone'}
                </button>
              </div>
              {voice.mic && <meter aria-label="Microphone level" min="0" max="1" value={voice.level} />}
              <small>Browser voice uses approximate mouth motion. Audio stays in your browser.</small>
            </section>
          )}

          {def.api && meta.api && (
            <section className="st-card code" aria-labelledby="st-api-title">
              <div className="st-code-head">
                <h2 id="st-api-title">Connect {meta.name}</h2>
                <button type="button" onClick={copyCode} aria-label="Copy code">
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p>
                Live on <code>window.{meta.api.global}</code> while this studio is open.
              </p>
              <pre>
                <code>{meta.api.example}</code>
              </pre>
              <a href={notes} download>
                Integration notes ↗
              </a>
            </section>
          )}
        </div>
      )}
    </>
  );
}
