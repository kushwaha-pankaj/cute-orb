import {useCallback, useEffect, useRef, useState} from 'react';
import useMascotConfig, {initialConfig, sanitize} from '../studio/useMascotConfig';
import {decodeConfig} from '../integration';

/**
 * #embed/<id>?c=<settings>&bg=transparent
 *
 * A chromeless mascot for other websites, loaded in an iframe by public/visage.js.
 * The host page talks to it with postMessage: {visage: 1, id, method, args}.
 * It answers {visage: 1, event: 'ready', info} once, then {visage: 1, event: 'result', id, ok, error}.
 */

const clamp = (v, min = -1, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));

export default function EmbedPage({meta, query}) {
  const [def, setDef] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    let alive = true;
    meta
      .load()
      .then(mod => alive && setDef(mod.default))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [meta]);

  if (failed) return <p className="embed-error">This mascot could not load.</p>;
  return def ? <Embed meta={meta} def={def} query={query} /> : null;
}

function Embed({meta, def, query}) {
  const transparent = query.get('bg') === 'transparent';
  const [overrides] = useState(() => decodeConfig(query.get('c')));
  const {config, setConfig, patch, setStateValue, applyExpression} = useMascotConfig(def, {persist: false, overrides});
  // reset() returns to the embed's starting settings (defaults + its data-config), not bare defaults.
  const reset = useCallback(() => setConfig(initialConfig(def, {persist: false, overrides})), [def, overrides, setConfig]);
  const [level, setLevel] = useState(null);
  const pointerRef = useRef({x: 0, y: 0});
  const controlRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Inside the frame the cursor is tracked here; outside it, visage.js forwards it. Both use the
  // same scale (offset from the face, in thirds of the frame) so the gaze never jumps at the edge.
  useEffect(() => {
    const move = e =>
      (pointerRef.current = {
        x: clamp((e.clientX - innerWidth / 2) / (innerWidth / 2) / 3),
        y: clamp(-(e.clientY - innerHeight * 0.42) / (innerHeight / 2) / 3),
      });
    addEventListener('pointermove', move, {passive: true});
    return () => removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const extra = def.api && meta.api ? def.api({setConfig, patch, get: () => ({...configRef.current}), reset, setAudioLevel: v => setLevel(clamp(v, 0, 1))}) : {};
    const methods = {
      setState(name) {
        if (!setStateValue(name)) throw new Error(`Unknown state "${name}". Try: ${def.states?.options.map(o => o.id).join(', ') || 'none'}`);
      },
      setExpression(name, intensity) {
        if (!applyExpression(name)) throw new Error(`Unknown expression "${name}". Try: ${def.expressions?.options.map(o => o.id).join(', ') || 'none'}`);
        if (intensity != null && 'intensity' in def.defaults) patch('intensity', clamp(intensity, 0, 1.5));
      },
      set(values) {
        setConfig(c => ({...c, ...sanitize(def, values)}));
      },
      setAudioLevel(value) {
        setLevel(value == null ? null : clamp(value, 0, 1));
      },
      reset() {
        reset();
        setLevel(null);
      },
      pointer(x, y) {
        pointerRef.current = {x: clamp(x), y: clamp(y)};
      },
      call(name, ...args) {
        if (!Object.hasOwn(extra, name) || typeof extra[name] !== 'function') throw new Error(`Unknown method "${name}"`);
        return extra[name](...args);
      },
    };

    const reply = message => window.parent !== window && window.parent.postMessage({visage: 1, ...message}, '*');
    const onMessage = e => {
      if (e.source !== window.parent) return;
      const data = e.data;
      if (!data || data.visage !== 1 || typeof data.method !== 'string' || !Object.hasOwn(methods, data.method)) return;
      try {
        methods[data.method](...(Array.isArray(data.args) ? data.args : []));
        if (data.id != null) reply({event: 'result', id: data.id, ok: true});
      } catch (error) {
        reply({event: 'result', id: data.id, ok: false, error: String(error.message || error)});
      }
    };
    addEventListener('message', onMessage);
    reply({
      event: 'ready',
      info: {
        mascot: meta.id,
        name: meta.name,
        states: def.states?.options.map(o => o.id) || [],
        expressions: def.expressions?.options.map(o => o.id) || [],
        settings: Object.keys(def.defaults).filter(k => !(def.transient || []).includes(k)),
        methods: Object.keys(extra),
      },
    });
    return () => removeEventListener('message', onMessage);
  }, [def, meta, setConfig, patch, setStateValue, applyExpression, reset]);

  const {Renderer} = def;
  const surface = transparent ? 'transparent' : def.surface ? def.surface('dark') : meta.tint;
  return (
    <div className="embed-stage" style={{background: surface}} aria-label={`${meta.name}, animated mascot`}>
      <Renderer
        config={transparent ? {...config, transparent: true} : config}
        theme="dark"
        audioLevel={level}
        pointer={pointerRef}
        controlRef={controlRef}
        onReady={() => {}}
        onError={message => console.warn(`[visage] ${message}`)}
      />
    </div>
  );
}
