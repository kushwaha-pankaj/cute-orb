# Visage — soft faces for sharp systems

Browser character studio for interactive AI presences. Today's cast: Mallow the wool sheep, the Green Blob, and a particle Portrait.

## Run

```bash
npm ci
npm run dev
```

Production: `npm run build` then `npm run preview`.

## Routes

| Hash | What you get |
|---|---|
| `#home` | Landing page |
| `#studio/<id>` | Studio for any mascot in the registry (`mallow`, `blob`, `portrait`) |

## How it fits together

- `src/mascots/index.js` — **the registry.** Name, tagline, images, tint, counts and a lazy `load()` for each mascot. The landing page, header switcher, routes and studio all read from it.
- `src/mascots/<id>.jsx` — a mascot's **studio definition**: renderer, defaults, control panels, states, expressions, voice and API.
- `src/studio/Studio.jsx` — the one studio that renders any definition. `controls.jsx` holds the schema-driven controls, `useVoice.js` the speech and microphone preview.
- `src/Landing.jsx` + `Landing.css` — landing page.
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

- `public/integration.md` — controller notes
- `public/images/` · `public/media/` — product stills and footage

See `MALLOW.md` for the `window.mallow` API.
