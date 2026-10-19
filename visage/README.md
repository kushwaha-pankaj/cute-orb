# Mascotty — soft faces for sharp systems

Browser character studio for interactive AI presences. Today's cast: Mallow the wool sheep, the Green Blob, and a particle Portrait.

## Run

```bash
npm ci
npm run dev
```

Checks: `npm test`. Production build: `npm run build`; verify it with `npm run preview` and deploy the complete `dist/` directory over HTTPS.

Use Node.js 22 or later. The GitHub Pages workflow sets `VISAGE_BASE` for subdirectory hosting. To serve embeds from a different published origin, set `VITE_PUBLIC_SITE_URL=https://your-host.example/path` at build time. Preview-generated snippets use the project's published address rather than a preview-only origin.

## Community and license

Mascotty is an open-source project for the community, licensed under [MIT](../LICENSE). See [CONTRIBUTING.md](../CONTRIBUTING.md) to get involved. Third-party dependencies and reference artwork retain their original licenses.

## Routes

| Hash | What you get |
|---|---|
| `#home` | Landing page |
| `#docs/quick-start` | Built-in developer documentation |
| `#docs/<guide>?section=<heading>` | A guide with a direct section link |
| `#studio/<id>` | Studio for any mascot in the registry (`mallow`, `blob`, `portrait`) |
| `#studio/<id>?c=…` | Studio opened with shared settings (from Use on your site → Settings) |
| `#embed/<id>?c=…&bg=transparent` | Chromeless mascot used by `public/mascotty.js` on other websites |

## Put a mascot on another website

```html
<div data-mascotty="mallow" style="width: 320px; height: 400px"></div>
<script src="https://kushwaha-pankaj.github.io/cute-orb/mascotty.js"></script>
<script>Mascotty.get('mallow').setState('thinking');</script>
```

The studio's **Use on your site** button generates this (plus React and an AI-agent prompt) with your settings baked in. The built-in documentation starts at `#docs/quick-start` and includes API, React, deployment and contribution guides. Snippets point at wherever Mascotty is hosted, so deploy `dist/` to a static HTTPS host first.

## How it fits together

- `src/mascots/index.js` — **the registry.** Name, tagline, images, tint, counts and a lazy `load()` for each mascot. The landing page, header switcher, routes and studio all read from it.
- `src/mascots/<id>.jsx` — a mascot's **studio definition**: renderer, defaults, control panels, states, expressions, voice and API.
- `src/studio/Studio.jsx` — the one studio that renders any definition. `controls.jsx` holds the schema-driven controls, `useVoice.js` the speech and microphone preview.
- `src/Landing.jsx` + `Landing.css` — landing page.
- `src/integration.js` — settings codes, share links and every snippet/prompt (one source for studio, landing and docs).
- `src/embed/EmbedPage.jsx` + `public/mascotty.js` — the embed route and the loader other websites include.
- Renderers: `SheepMascot.jsx` (Mallow), `GreenBlob.jsx`, `Presence.jsx` (Portrait), `HeroMallow.jsx` (transparent hero).

## Adding a mascot

Read **[MASCOT_RULEBOOK.md](MASCOT_RULEBOOK.md)** first: it has the rules, the mistakes we already made, a pre-merge checklist and a starter template. The short version:

1. Put a still in `public/images/` (a clean render on a flat backdrop works best).
2. Write `src/mascots/<id>.jsx` that exports a definition. At minimum:

   ```jsx
   export default {
     defaults: {motion: true /* …whatever your renderer reads */},
     Renderer: ({config, onReady, onError}) => <MyRenderer config={config} onReady={onReady} onError={onError} />,
     engine: 'three.js',
     hint: 'Drag to orbit',
     panels: [{id: 'look', label: 'Look', controls: [{type: 'range', key: 'scale', label: 'Scale', min: 0.5, max: 1.5}]}],
   };
   ```

   Optional: `states`, `expressions`, `voice`, `api`, `capture`, `spinKey`, `stageAction`, `downloads`, `storageKey`. The full list is documented at the top of `src/studio/Studio.jsx`, and control types are listed at the top of `src/studio/controls.jsx`.
3. Add an entry to `src/mascots/index.js` with `id`, `name`, `material`, `tagline`, `image`, `imageAlt`, `tint` and `load: () => import('./<id>')`.

The renderer should mount into an element with the `presence` class, which fills the stage.

To make a mascot cursor-reactive, add `follow: true` to its defaults and read the `pointer` prop in the renderer: a ref whose `current` is `{x, y}` in -1..1 around the stage. Ease toward it each frame while `config.follow` and `config.motion` are on. The studio toolbar shows a Follow cursor toggle for any mascot with a `follow` key.

## Files

- `src/docs/` — built-in developer documentation, navigation and examples
- `public/images/` · `public/media/` — product stills and footage

See `MALLOW.md` for the `window.mallow` API.
