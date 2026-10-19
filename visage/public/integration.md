# Visage integration guide

Put a Visage mascot on any website and drive it from your AI assistant. There's no account, no API key and no build step: one div and one script tag.

The quickest path is the studio. Open `#studio/<mascot>`, customise it, press **Use on your site** and copy the HTML, React or AI-agent tab. Everything below is what those snippets do.

## 1. Embed

```html
<div data-visage="mallow" style="width: 320px; height: 400px"></div>
<script src="https://YOUR-VISAGE-HOST/visage.js"></script>
```

- `data-visage`: the mascot id (`mallow`, `blob`, `portrait`, …).
- `data-config`: optional settings code from the studio (Use on your site → Settings). It bakes in your customisation.
- `data-background="transparent"`: optional; blends the mascot into your page instead of its studio backdrop.
- `data-follow-page="false"`: optional; only follow the cursor while it's over the mascot. By default the mascot looks at the cursor anywhere on the page.
- `data-title`: optional accessible name for the frame.

Size the div with CSS; the mascot fills it. Each mascot renders in its own iframe, so it can't clash with your CSS or scripts. Load the script **without `defer`** (or wait for it to load) before calling `Visage` from your own scripts.

## 2. Drive it

```js
const mascot = Visage.get('mallow');   // or Visage.get(element)

mascot.setState('listening');   // user is typing or talking
mascot.setState('thinking');    // waiting for the model
mascot.setState('speaking');    // reply streaming or being read aloud
mascot.setAudioLevel(0.6);      // 0..1 every frame from your TTS audio (AnalyserNode)
mascot.setState('idle');        // done

mascot.setExpression('happy');  // any expression the mascot has
mascot.set({follow: false});    // change any setting live
mascot.reset();                 // back to the embed's starting settings
mascot.on('ready', info => console.log(info));
mascot.on('error', message => console.warn(message));
mascot.destroy();
```

Calls made before the mascot has loaded are queued. Unknown states, expressions or methods don't throw on your page; they emit `error` with the list of valid names.

`info` (from `ready`) looks like this:

```json
{
  "mascot": "mallow",
  "name": "Mallow",
  "states": ["idle", "listening", "thinking", "speaking", "success", "error", "sleeping"],
  "expressions": ["sassy", "neutral", "happy", "…"],
  "settings": ["expression", "intensity", "pose", "…"],
  "methods": ["setGaze", "setViseme", "setPose", "…"]
}
```

Mascot-specific extras listed in `methods` are reached with `call`:

```js
mascot.call('setPose', 'wave');
mascot.call('setViseme', 'O');    // auto, rest, A, E, O, U, M, F
mascot.call('setGaze', 0.3, 0.2); // -1..1 each
```

Mascots without AI states (for example the Green Blob) still take expressions and settings.

## 3. Mount from code (React, Vue, …)

```js
const mascot = Visage.mount(element, {
  mascot: 'mallow',
  config: 'eyJ…',              // optional settings code
  background: 'transparent',   // optional
  followPage: true,            // optional
});
// later: mascot.destroy();
```

The studio's React tab has a ready-made `<VisageMascot state="thinking" />` component.

## 4. Let your AI coding agent do it

Open the studio, press **Use on your site → AI agent** and paste the prompt into Claude Code, Cursor or any coding agent working in your project. It contains the snippet, the mascot's real states and expressions, and how to map your assistant's lifecycle to them.

## Under the hood

`visage.js` creates `<iframe src="https://YOUR-VISAGE-HOST/#embed/<id>?c=<settings>&bg=transparent">` and talks to it with `postMessage`:

- page → mascot: `{visage: 1, id, method, args}`, where `method` is one of `setState`, `setExpression`, `set`, `setAudioLevel`, `reset`, `pointer`, `call`
- mascot → page: `{visage: 1, event: 'ready', info}` once, then `{visage: 1, event: 'result', id, ok, error}`

Messages are checked against the frame's origin, and settings are filtered to the mascot's known keys and types.

## Hosting

Snippets point at wherever Visage is served. Build it with `npm run build` and serve `dist/` from any static host over HTTPS; routing is hash-based, so no server rules are needed. If your site sets a Content-Security-Policy, allow the Visage origin in `script-src` and `frame-src`.

## Privacy and requirements

There's no tracking and no backend. Audio levels you send stay in the browser. The studio's microphone preview is analysed locally and never uploaded.

It needs a recent browser with WebGL and hardware acceleration. The detailed characters prefer desktop GPUs, and reduced-motion preferences are respected.
