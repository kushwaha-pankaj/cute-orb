/**
 * Everything a developer copies: config encoding, share links, embed snippets and the AI-agent prompt.
 * Snippets point at wherever this Visage build is served (`hostUrl()`), so deploy it before sharing them.
 */

export const hostUrl = () => new URL(import.meta.env.BASE_URL, location.origin).href.replace(/\/$/, '');
export const isLocalHost = () => /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);

// ---------- settings codec: JSON -> base64url ----------

export function encodeConfig(values) {
  if (!values || !Object.keys(values).length) return '';
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfig(text) {
  if (!text) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const json = new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
    const value = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Only what the user changed, minus transient keys, so links and snippets stay short. */
export function changedSettings(def, config) {
  const out = {};
  for (const [key, value] of Object.entries(config)) {
    if ((def.transient || []).includes(key)) continue;
    if (key in def.defaults && def.defaults[key] !== value) out[key] = value;
  }
  return out;
}

// ---------- links ----------

export const studioLink = (id, encoded) => `${hostUrl()}/#studio/${id}${encoded ? `?c=${encoded}` : ''}`;
export const embedUrl = (id, encoded, background) =>
  `${hostUrl()}/#embed/${id}${encoded || background ? '?' : ''}${[encoded && `c=${encoded}`, background && `bg=${encodeURIComponent(background)}`]
    .filter(Boolean)
    .join('&')}`;

// ---------- snippets ----------

const attr = (name, value) => (value ? ` ${name}="${value}"` : '');

export function htmlSnippet({id, encoded, background}) {
  return `<!-- Visage mascot: size the div however you like -->
<div data-visage="${id}"${attr('data-config', encoded)}${attr('data-background', background)} style="width: 320px; height: 400px"></div>
<script src="${hostUrl()}/visage.js"></script>`;
}

export function jsSnippet({id, states = [], expressions = []}) {
  const has = s => states.includes(s);
  const lines = [`const mascot = Visage.get('${id}');`, ''];
  if (has('listening')) lines.push(`mascot.setState('listening');   // user is typing or talking`);
  if (has('thinking')) lines.push(`mascot.setState('thinking');    // waiting for the model`);
  if (has('speaking')) lines.push(`mascot.setState('speaking');    // reply is streaming or being read aloud`, `mascot.setAudioLevel(0.6);     // 0..1, every frame from your TTS audio`);
  if (has('idle')) lines.push(`mascot.setState('idle');        // done`);
  if (expressions.length) lines.push('', `mascot.setExpression('${expressions.includes('happy') ? 'happy' : expressions[0]}');`);
  lines.push(`mascot.set({ follow: true });  // change any setting live`);
  return lines.join('\n');
}

export function reactSnippet({id, encoded, background}) {
  return `import {useEffect, useRef} from 'react';

const VISAGE = '${hostUrl()}/visage.js';

function loadVisage() {
  if (window.Visage) return Promise.resolve(window.Visage);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = VISAGE;
    s.onload = () => resolve(window.Visage);
    document.head.appendChild(s);
  });
}

/** <VisageMascot state="thinking" /> — drive state and expression from your assistant. */
export function VisageMascot({state = 'idle', expression, audioLevel, style}) {
  const host = useRef(null);
  const mascot = useRef(null);

  useEffect(() => {
    let alive = true;
    loadVisage().then(Visage => {
      if (alive) mascot.current = Visage.mount(host.current, {mascot: '${id}'${encoded ? `, config: '${encoded}'` : ''}${background ? `, background: '${background}'` : ''}});
    });
    return () => {
      alive = false;
      mascot.current?.destroy();
    };
  }, []);

  useEffect(() => mascot.current?.setState(state), [state]);
  useEffect(() => { if (expression) mascot.current?.setExpression(expression); }, [expression]);
  useEffect(() => { if (audioLevel != null) mascot.current?.setAudioLevel(audioLevel); }, [audioLevel]);

  return <div ref={host} style={{width: 320, height: 400, ...style}} />;
}`;
}

/** A prompt a coding agent (Claude Code, Cursor, Copilot…) can follow end to end. */
export function agentPrompt({name, id, encoded, background, states = [], expressions = [], settings = []}) {
  const has = s => states.includes(s);
  const map = [
    has('listening') && `- The user is typing or recording → mascot.setState('listening')`,
    has('thinking') && `- A request is sent and you're waiting for the first token → mascot.setState('thinking')`,
    has('speaking') && `- The reply is streaming or text-to-speech is playing → mascot.setState('speaking'). If you play TTS audio, feed an AnalyserNode's level (0..1) to mascot.setAudioLevel(level) every animation frame.`,
    has('success') && `- A task completed → mascot.setState('success')`,
    has('error') && `- A request failed → mascot.setState('error')`,
    has('idle') && `- Nothing is happening → mascot.setState('idle')`,
  ].filter(Boolean);

  return `Add the "${name}" mascot from Visage to this project and connect it to our AI assistant.

## 1. Embed it
Place this where the mascot should appear (it renders inside a sandboxed iframe; size the div with CSS):

${htmlSnippet({id, encoded, background})}

If the project is React, use a small component that loads ${hostUrl()}/visage.js once, calls Visage.mount(element, {mascot: '${id}'${encoded ? `, config: '${encoded}'` : ''}${background ? `, background: '${background}'` : ''}}) on mount and .destroy() on unmount.

## 2. Drive it from the assistant
The script exposes window.Visage. Get the mascot with Visage.get('${id}') (or keep the object returned by Visage.mount). Calls made before it loads are queued.
${map.length ? `\nMap the assistant's lifecycle to states:\n${map.join('\n')}\n` : ''}
Available API:
- mascot.setState(name)${states.length ? ` — states: ${states.join(', ')}` : ' — this mascot has no AI states'}
- mascot.setExpression(name)${expressions.length ? ` — expressions: ${expressions.join(', ')}` : ' — this mascot has no expression presets'}
- mascot.setAudioLevel(0..1) — mouth/energy from your audio
- mascot.set({key: value}) — change settings live${settings.length ? ` (keys: ${settings.join(', ')})` : ''}
- mascot.on('ready', info => …) — info lists the states, expressions and settings above
- mascot.destroy() — remove it

## 3. Rules
- Keep the script URL exactly as given; it is where Visage is hosted. Don't copy Visage's files into this project.
- If the site sets a Content-Security-Policy, allow ${new URL(hostUrl()).origin} in script-src and frame-src.
- Put state changes in the existing assistant/chat code paths. Don't add polling or new timers to do it.
- The mascot handles reduced motion and cleans up after itself; don't animate the container.
- Verify by sending a message: the mascot should go listening → thinking → speaking → idle.`;
}
