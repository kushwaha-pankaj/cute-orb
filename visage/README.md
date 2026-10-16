# Visage — soft faces for sharp systems

Browser character exhibition for three interactive AI presences: a particle portrait, a green clay blob, and Mallow the wool sheep.

## Run

```bash
npm ci
npm run dev
```

Production: `npm run build` then `npm run preview`.

## Routes

| Hash | What you get |
|---|---|
| `#home` | Exhibition landing |
| `#studio/portrait` | Particle portrait / orb |
| `#studio/blob` | Green Blob GLB studio |
| `#studio/mallow` | Mallow sheep studio |

## Brand

Direction: **one-motif** (Visage’s round presence) · palette teal on paper · Stack Sans.  
Live thing on the landing: swap the cast on the disc; bring Mallow to life.

## Files

- `src/Landing.jsx` + `Landing.css` — exhibition
- `src/VisageStudio.jsx` · `GreenBlobStudio.jsx` · `SheepStudio.jsx` — studios
- `public/integration.md` — controller notes
- `public/images/` · `public/media/` — product stills and credited clay-wheel footage

See `MALLOW.md` for the `window.mallow` API.
