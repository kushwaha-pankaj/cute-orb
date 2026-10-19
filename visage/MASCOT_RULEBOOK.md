# Mascot Rulebook

How to build a mascot for Visage and bring it into the website without repeating the mistakes we already made.

Every rule here exists because something broke. The **Why** lines say what happened. Read section 1 before writing code, and run section 11 before merging.

**Contents**
1. [The integration contract](#1-the-integration-contract)
2. [Product still (the 2D image)](#2-product-still-the-2d-image)
3. [Renderer rules](#3-renderer-rules)
4. [Framing in the studio room](#4-framing-in-the-studio-room)
5. [Colour, light and theme](#5-colour-light-and-theme)
6. [Expressions and faces](#6-expressions-and-faces)
7. [AI states, voice and lip sync](#7-ai-states-voice-and-lip-sync)
8. [Cursor follow](#8-cursor-follow)
9. [Controls and saved settings](#9-controls-and-saved-settings)
10. [Optional controller API](#10-optional-controller-api)
11. [Pre-merge checklist](#11-pre-merge-checklist)
12. [Mistakes log](#12-mistakes-log)
13. [Starter template](#13-starter-template)

---

## 1. The integration contract

A mascot is exactly **three things**. Nothing else in the codebase should need to change.

| Piece | File | Loaded |
|---|---|---|
| Registry entry | `src/mascots/index.js` | On every page (keep it light) |
| Studio definition | `src/mascots/<id>.jsx` | Lazily, when its studio opens |
| Renderer | `src/<Name>.jsx` (three.js) | Lazily, through the definition |

Plus one product still in `public/images/`.

**R1.1 Never hard-code a mascot outside its own files.** No names, ids, counts or image paths in `Landing.jsx`, `Studio.jsx`, `StudioPage.jsx`, `main.jsx` or CSS. Pages read `mascots`, `featured` and `getMascot()` from the registry.
*Why:* the original landing page and three studios each repeated "Mallow", "24 moods" and "3 faces" by hand, and they drifted apart.

**R1.2 Derive numbers from data.** Counts such as moods, states, poses and `fact` strings are computed from the expression or state arrays (see `count()` in the registry). Never type `'24 moods'`.

**R1.3 Keep the registry light.** It may import small data files (expression or state lists) but never `three`, a renderer or a GLB. Heavy code goes behind `load: () => import('./<id>')`.

**R1.4 Shared UI only grows through the definition schema.** If a new mascot needs something the studio can't do, add a generic option to the definition schema (documented at the top of `src/studio/Studio.jsx`). Don't special-case `if (meta.id === 'x')`.

**R1.5 Prove it scales.** Before merging, the new mascot must appear on its own in the following places, with no other edits:
- the header switcher
- the landing cast grid
- the highlight card (with "+N more" once there are more than 3)
- the footer links
- the counts

Its route is `#studio/<id>`.

---

## 2. Product still (the 2D image)

Used for the landing cards, avatars, the header switcher and the loading screen.

**R2.1 A clean render only: no UI baked in.** No toolbars, status text, scrollbars or watermarks.
*Why:* `mallow.png` and `mallow-hero.png` were screenshots of the old studio, with "IDLE · LIVE 3D", buttons and a scrollbar. We had to crop `mallow-sassy.png` out of one.

**R2.2 Flat, even backdrop, and set `tint` to that exact colour.** Cards fill around the image with `tint`, so any mismatch shows as a visible box.

**R2.3 Face in the upper third.** Avatars crop with `object-position: 50% 30%`. A face placed lower gets its eyes cut off in round thumbnails.

**R2.4 Size:** at least 650×650 (portrait 655×880 is fine), PNG, under about 600 KB.

**R2.5 Write a real `imageAlt`** that describes the character and pose, not "mascot image".

**R2.6 Optional extras:** `secondaryImage` (a second pose, used for the landing "cue" card) and `hero` (a transparent live renderer for the landing hero; see `HeroMallow.jsx`).

---

## 3. Renderer rules

**R3.1 Mount into a `.presence` div.** The global rule makes `.presence` fill its container and makes its canvas `width:100%; height:100%`.
*Why:* Green Blob called `renderer.setSize(w, h, false)`. Without CSS sizing, the canvas drew at device pixels (2× on Retina), so the blob looked zoomed in and off-centre.

**R3.2 Build the scene once; read config every frame.** Keep props in a ref (`live.current = {config, pointer, …}`) and read them in the animation loop. Never rebuild the scene when config changes.

**R3.3 Resize with a `ResizeObserver`** on the host element, never `window.resize`. The stage changes size with panels, phone layout and focus.

**R3.4 Clean up everything on unmount:**
- cancel the animation frame
- disconnect observers
- remove listeners
- dispose geometries, materials, textures, the environment map and the renderer
- remove the canvas

Switching mascots mounts and unmounts renderers repeatedly.

**R3.5 Fail politely.**
- Wrap `new WebGLRenderer()` in try/catch and call `onError('…')` with a human sentence.
- Handle `webglcontextlost`.
- Never throw out of the effect.

**R3.6 Supported props.** Ignore the ones you don't use:

| Prop | Meaning |
|---|---|
| `config` | Full settings object (the definition's `defaults`, plus user changes) |
| `pointer` | Ref, `current = {x, y}` in -1..1 around the stage (see §8) |
| `audioLevel` | `null`, or 0..1 from the mic or API |
| `speechCue` | Ref with word timing while the browser voice speaks |
| `theme` | `'light'` or `'dark'` |
| `controlRef` | Set `{capture(), resetCamera()}` on it if you support them |
| `onReady(info?)` / `onError(message)` | Lifecycle |

**R3.7 Capture needs `preserveDrawingBuffer: true`.** Only set `capture: true` in the definition if the renderer was created with it. Otherwise "Save PNG" downloads a blank image.

**R3.8 No dependence on page scroll.** The studio is a fixed full-screen room and never scrolls.
*Why:* Portrait's "pixel dust" was driven by `window.scrollY`, so it silently stopped working in the room. It became the `release` setting.

**R3.9 Expose camera `zoom` instead of scaling the model for framing.** See §4.

**R3.10 Cap the pixel ratio at 2.** Keep shadow maps at 2048 or below, and cast shadows only from the key light.

---

## 4. Framing in the studio room

The character fills the full screen, with panels floating over it: customise on the left (~340 px), presence rail on the right (~300 px), toolbar and mood dock along the bottom.

**R4.1 Frame for the clear zone.** At 1280×800 the whole character must be visible between the panels:
- Head below the top bar.
- Feet above the toolbar.
- Body roughly 45–60% of the viewport height.
- Face around 35–45% from the top.

**R4.2 Adjust framing with camera zoom, not model scale.** Set the default in the definition (Mallow uses `zoom: 0.82`) or in its renderer adapter (Green Blob uses `ROOM_ZOOM`).
*Why:* we first shrank Green Blob with `scale`. Its feet are at the origin and the camera aims at its middle, so it shrank down onto the floor behind the toolbar. Camera zoom shrinks it around the centre.

**R4.3 Keep the top of the stage empty.** Status and captions live in the bottom toolbar.
*Why:* a status pill floating over the character's head looked cluttered and was moved.

**R4.4 Check three sizes:**
- 1280×800
- 1440×900
- 375×812 (phone)

On phones the stage is the top half, so the character must still fit.

---

## 5. Colour, light and theme

**R5.1 Compare the render with the product still, side by side.** Hue and saturation should match.
*Why:* Green Blob rendered pale mint next to its apple-green still.

**R5.2 Use `THREE.NeutralToneMapping` for saturated characters,** and keep `scene.environmentIntensity` at about 0.5 or less. ACES desaturates bright colours, and a full-strength `RoomEnvironment` washes everything out.

**R5.3 Colour hex values go through `Color.set()`.** With `outputColorSpace = SRGBColorSpace`, three.js handles the conversion; don't hand-convert.

**R5.4 Check light and dark themes.** If the renderer is transparent, give the definition a `surface(theme)` that it actually looks good on. If it only works on one surface, return that surface for both themes.
*Why:* Portrait's light mode turned its orb into faint lavender dots on lavender, effectively invisible. Its stage is now dark in both themes, while the glass controls still follow the theme.

**R5.5 Opaque renderers own their background** (for example a `studio` or `background` colour setting). Set `tint` in the registry to the same default so the loading screen doesn't flash a different colour.

---

## 6. Expressions and faces

**R6.1 Every expression must read at thumbnail size.** If you can't name the mood from a 150 px crop, it isn't done.
*Why:* Mallow's Happy, Joyful and Sad all looked like the same unimpressed face, because the smile curve never changed.

**R6.2 Opposites must look opposite.** Check these pairs next to each other:
- happy ↔ sad
- angry ↔ worried
- surprised ↔ sleepy

**R6.3 Check the sign of every facial parameter.**
*Why:* Mallow's brow tilt was inverted (`side*xx*brow` instead of `-side*xx*brow`), so every "sad" face had angry brows and every "angry" face had worried ones, for months. Positive brow means raised and worried (inner ends up); negative means angry (inner ends down).

**R6.4 Mood must reach every feature.** A smile value has to drive:
- the closed mouth (frown, through flat, to smile)
- the open mouth (D-shaped grin versus downturned)
- the eyes (cheeks lift the lower lid on big smiles)

Never only one of them.

**R6.5 Overlays sit on the surface.** Place decals and overlay meshes (mouth shapes, lids, blush) by raycasting to the skin and lifting slightly. Never offset them from an internal mesh.
*Why:* Green Blob's Smile and "O" mouth sat 0.04 in front of the mouth cavity, which is behind the body surface. When the cavity faded out, both mouths vanished inside the clay.

**R6.6 Check primitive orientation.** Rings, discs and planes must face the camera (+Z).
*Why:* the blob's "O" mouth torus was rotated 90° and showed edge-on as a flat black bar.

**R6.7 Expression data is presets, not logic.** Each expression is a plain object of facial values in `<name>Expressions.js` with a `label` and a one-character `icon`/`symbol`. The studio builds chips from it.

**R6.8 Verify with a contact sheet.** Render 6–8 moods side by side and look at them together (see the QA tips in §11).

---

## 7. AI states, voice and lip sync

**R7.1 Use the shared state vocabulary.** Use `idle`, `listening`, `thinking`, `speaking`, plus optionally `success`, `error` and `sleeping`. The voice preview drives `speaking` and `listening`, so mascots that support states must include those ids.

**R7.2 State is transient.** List it in `transient` so it never persists across visits.

**R7.3 `listening` should react to `audioLevel`,** and `speaking` should move the mouth even without a level (use an approximate rhythm, or `speechCue` timing).

**R7.4 A state must be visible.** Show it through eyes, head, mouth or energy. A state that looks identical to `idle` is a bug.

---

## 8. Cursor follow

**R8.1 Every mascot with a face follows the cursor.** Add `follow: true` to its defaults. The studio toolbar then shows a Follow cursor toggle automatically.

**R8.2 Read `pointer.current` every frame and ease toward it** (`MathUtils.damp`, ~5). Never snap.

**R8.3 Add on top of the user's settings; never replace them.** Pointer offsets are added to the gaze or yaw sliders and clamped, so manual settings still work.

**R8.4 Stop following when:**
- `config.follow` is false
- `config.motion` is false (this covers reduced motion)
- the mascot is asleep

Ease back to centre; don't jump.

**R8.5 Be subtle.** Use roughly: eyes up to 0.7, head turn ≤ 0.25 rad, body turn ≤ 0.4 rad, lean ≤ 0.1 rad. The character should look at you, not spin.

---

## 9. Controls and saved settings

**R9.1 Declare controls as data.** Use the types listed at the top of `src/studio/controls.jsx`:
- `range`, `toggle`, `swatches`, `color`
- `choice`, `select`, `parts`
- `heading`, `note`, `figure`

Don't write custom JSX in a definition.

**R9.2 Group panels by intent:** Look / Expression, Motion, Parts, Studio (light, camera, backdrop). Use 2–4 panels; one long list is too many.

**R9.3 Use `when` for dependent controls** (for example, spin speed only shows when auto-rotate is on).

**R9.4 Keep linked values consistent with `update(config, key, value)`.** For example, Green Blob's mouth style and the mouth-open slider.

**R9.5 Give every slider bounds you've actually checked.** Drag each slider to both ends. Nothing may explode, invert or leave the frame.

**R9.6 Saved settings:**
- Give each mascot its own `storageKey`, and bump the version (`-v2`) when the meaning of saved keys changes.
- Add `migrate(saved)` for old saves.
- Use `transient` for anything that shouldn't survive a reload.

**R9.7 Respect reduced motion.** If `motion` is in the defaults, the studio turns it off for reduced-motion users. Every animation must check `config.motion`.

---

## 10. Optional controller API

**R10.1 One global, named after the mascot** (`window.mallow`), declared in `meta.api.global`. The studio publishes it and removes it on leave.

**R10.2 Validate inputs.** Throw `Error('Unknown expression: x')` for bad names, and clamp numbers.

**R10.3 Put a short example in `meta.api.example`.** The landing code section and the studio's Connect card both show it, so it must run as-is.

---

## 11. Pre-merge checklist

Run `npm run dev`, open `#studio/<id>`, and tick every box.

**Integration**
- [ ] Only the registry entry, definition, renderer, data file and still were added or changed.
- [ ] The mascot appears in the header switcher, landing cast, highlight card, footer and counts.
- [ ] `grep -rn "<Name>\|'<id>'" src/Landing.jsx src/studio src/main.jsx` finds nothing.

**Still**
- [ ] No baked-in UI; the backdrop matches `tint`; the face survives the round avatar crop.

**Renderer**
- [ ] Framed inside the clear zone at 1280×800, 1440×900 and 375×812.
- [ ] Colours match the still; it looks right in light and dark themes.
- [ ] Switching between mascots 5 times leaves no errors in the console.
- [ ] Save PNG (if offered) produces a real image.

**Expressions and states**
- [ ] Contact sheet of all moods: each one is nameable at thumbnail size, and opposites look opposite.
- [ ] Brows, mouth (open and closed) and eyes all change with mood.
- [ ] Each state is visibly different from idle; Speak and Mic animate the mouth.

**Interaction**
- [ ] The character follows the cursor, the toggle turns it off, and Pause stops it.
- [ ] Every slider is fine at both ends; every toggle and choice does something visible.
- [ ] Reset restores the defaults; reload keeps settings but not the state.

**Build**
- [ ] `npm run build` passes.

**QA tips** (the browser pane renders slowly in the background, so faces ease between moods over many frames):
- Hide the controls (eye button), set camera zoom to max, then switch moods through the API or chips.
- Wait several seconds per mood before judging.
- For a contact sheet, draw the canvas into a 2D canvas after each mood (needs `preserveDrawingBuffer`) and view them together.

---

## 12. Mistakes log

| What went wrong | Mascot | Rule |
|---|---|---|
| Names and counts hard-coded across pages | All | R1.1, R1.2 |
| Product stills contained studio UI | Mallow | R2.1 |
| Canvas drew at 2× size (`setSize(…, false)`) | Green Blob | R3.1 |
| Effect tied to page scroll stopped working | Portrait | R3.8 |
| Shrunk with model scale and sank behind the toolbar | Green Blob | R4.2 |
| Status pill cluttered the top of the stage | All | R4.3 |
| ACES and a bright environment washed green to mint | Green Blob | R5.2 |
| Light theme made the orb invisible | Portrait | R5.4 |
| Orb particles ~1 px and too dark to see | Portrait | R6.1 |
| Every mood had the same smile | Mallow | R6.1, R6.4 |
| Brow tilt sign inverted | Mallow | R6.3 |
| Mouth overlays buried inside the body | Green Blob | R6.5 |
| "O" mouth torus faced up, read as a bar | Green Blob | R6.6 |

Add a row whenever something new breaks.

---

## 13. Starter template

**`src/mascots/<id>.jsx`**

```jsx
import MyMascot from '../MyMascot';
import {MY_DEFAULTS, MY_EXPRESSIONS, MY_STATES} from '../myExpressions';

function Renderer({config, pointer, audioLevel, onReady, onError, controlRef}) {
  return <MyMascot config={config} pointer={pointer} audioLevel={audioLevel ?? 0} onReady={onReady} onError={onError} controlRef={controlRef} />;
}

export default {
  defaults: {...MY_DEFAULTS, motion: true, follow: true, zoom: 0.85, state: 'idle'},
  storageKey: 'visage-<id>-v1',
  transient: ['state'],
  Renderer,
  engine: 'three.js',
  hint: 'Drag to orbit · Scroll to zoom',
  capture: true, // only if the renderer uses preserveDrawingBuffer
  caption: c => MY_EXPRESSIONS[c.expression]?.label,
  states: {key: 'state', options: MY_STATES.map(id => ({id, label: id[0].toUpperCase() + id.slice(1), symbol: '◌'}))},
  expressions: {
    key: 'expression',
    label: 'Moods',
    options: Object.entries(MY_EXPRESSIONS).map(([id, e]) => ({id, label: e.label, symbol: e.icon})),
  },
  panels: [
    {id: 'look', label: 'Look', controls: [{type: 'color', key: 'bodyColor', label: 'Body colour'}]},
    {id: 'motion', label: 'Motion', controls: [{type: 'range', key: 'speed', label: 'Animation speed', min: 0.2, max: 2}]},
  ],
  voice: {line: 'Hi, I’m <Name>.'},
};
```

**Registry entry in `src/mascots/index.js`**

```js
{
  id: '<id>',
  name: '<Name>',
  material: 'Two-word material',
  tagline: 'One sentence about the character.',
  image: '<id>.png',
  imageAlt: 'What the character looks like and is doing',
  tint: '#hex-of-the-still-backdrop',
  moods: Object.keys(MY_EXPRESSIONS).length,
  fact: `${count(Object.keys(MY_EXPRESSIONS).length, 'mood')} · ${count(MY_STATES.length, 'state')}`,
  load: () => import('./<id>'),
},
```

**Renderer skeleton essentials**

```jsx
export default function MyMascot({config, pointer, onReady, onError, controlRef}) {
  const host = useRef(null);
  const live = useRef(null);
  live.current = {config, pointer};
  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    } catch {
      onError?.('WebGL is unavailable. Enable hardware acceleration to see this character.');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    host.current.appendChild(renderer.domElement);
    // …scene, camera, lights (scene.environmentIntensity ≈ 0.5), model…
    const ro = new ResizeObserver(resize);
    ro.observe(host.current);
    let fx = 0, fy = 0, frame;
    const loop = now => {
      frame = requestAnimationFrame(loop);
      const {config: c, pointer: p} = live.current;
      const follow = !!(p?.current && c.follow && c.motion);
      fx = THREE.MathUtils.damp(fx, follow ? p.current.x : 0, 5, dt);
      fy = THREE.MathUtils.damp(fy, follow ? p.current.y : 0, 5, dt);
      // apply c.* and fx/fy on top of the user's values, then render
    };
    frame = requestAnimationFrame(loop);
    if (controlRef) controlRef.current = {capture: () => renderer.domElement.toDataURL('image/png'), resetCamera};
    onReady?.();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      /* dispose geometries, materials, textures, env map */
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div className="presence" ref={host} />;
}
```

