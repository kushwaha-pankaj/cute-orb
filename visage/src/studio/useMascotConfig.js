import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

/**
 * Live settings for one mascot, shared by the studio and the embed.
 * Applies the definition's rules (update coupling, expression presets, valid states),
 * optional overrides (from a share link or embed URL) and optional local persistence.
 */

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function readSaved(def) {
  if (!def.storageKey) return {};
  try {
    return JSON.parse(localStorage.getItem(def.storageKey) || '{}') || {};
  } catch {
    return {};
  }
}

/** Keep only keys the mascot knows, with plain values. Protects against junk in links and messages. */
export function sanitize(def, values) {
  const clean = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (!(key in def.defaults)) continue;
    const kind = typeof def.defaults[key];
    if (kind === typeof value && (kind === 'number' ? Number.isFinite(value) : true)) clean[key] = value;
  }
  return clean;
}

export function initialConfig(def, {persist = true, overrides} = {}) {
  let saved = persist ? readSaved(def) : {};
  for (const key of def.transient || []) delete saved[key];
  if (def.migrate && Object.keys(saved).length) saved = def.migrate(saved);
  const config = {...def.defaults, ...saved, ...sanitize(def, overrides)};
  if ('motion' in def.defaults && !('motion' in saved) && !(overrides && 'motion' in overrides) && reducedMotion()) {
    config.motion = false;
  }
  return config;
}

export function freshConfig(def) {
  const config = {...def.defaults};
  if ('motion' in config && reducedMotion()) config.motion = false;
  return config;
}

export default function useMascotConfig(def, {persist = true, overrides} = {}) {
  const [config, setConfig] = useState(() => initialConfig(def, {persist, overrides}));
  const configRef = useRef(config);
  configRef.current = config;

  const stateKey = def.states?.key;
  const exprKey = def.expressions?.key;
  const stateIds = useMemo(() => new Set(def.states?.options.map(o => o.id)), [def]);
  const exprIds = useMemo(() => new Set(def.expressions?.options.map(o => o.id)), [def]);

  const patch = useCallback(
    (key, value) => setConfig(c => (def.update ? def.update(c, key, value) : {...c, [key]: value})),
    [def],
  );
  const setStateValue = useCallback(
    s => {
      if (!stateKey || !stateIds.has(s)) return false;
      patch(stateKey, s);
      return true;
    },
    [patch, stateKey, stateIds],
  );
  const applyExpression = useCallback(
    id => {
      if (!exprKey || !exprIds.has(id)) return false;
      setConfig(c => (def.expressions.apply ? def.expressions.apply(c, id) : {...c, [exprKey]: id}));
      return true;
    },
    [def, exprKey, exprIds],
  );
  const reset = useCallback(() => setConfig(freshConfig(def)), [def]);

  useEffect(() => {
    if (!persist || !def.storageKey) return;
    const saved = {...config};
    for (const key of def.transient || []) delete saved[key];
    try {
      localStorage.setItem(def.storageKey, JSON.stringify(saved));
    } catch {
      /* storage can be unavailable; settings still work for this visit */
    }
  }, [config, def, persist]);

  return {config, setConfig, configRef, patch, setStateValue, applyExpression, reset, stateKey, exprKey};
}
