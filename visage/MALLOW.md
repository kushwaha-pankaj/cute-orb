# Mallow — Experiment 003

Run `npm run dev` in `visage`, then choose **003 Mallow**. Production output: `npm run build`.

The reference is interpreted as a procedural, fully orbitable 3D sheep. This is not a pixel-identical reconstruction of the photograph. No Blender install or generated bitmap is needed at runtime. The reference image is shown only in the Studio panel.

## Files

- `src/SheepMascot.jsx`: Three.js scene, studio lighting, camera, expression blending, secondary motion and cleanup.
- `src/SheepModel.js`: sculpted procedural anatomy, instanced fleece, fine fibres, volumetric face parts and reusable mesh deformation.
- `src/sheepExpressions.js`: 24 blendable expression presets, seven AI states and defaults.
- `src/SheepStudio.jsx`: React controls, browser speech, microphone RMS analysis, capture and configuration export, public controller.

## React integration

```jsx
import {useRef, useState} from 'react';
import SheepMascot from './src/SheepMascot';
import {SHEEP_DEFAULTS} from './src/sheepExpressions';

function Avatar() {
  const [config, setConfig] = useState({...SHEEP_DEFAULTS});
  const controls = useRef();
  return <div style={{position: 'relative', height: 600}}>
    <SheepMascot config={config} audioLevel={0} controlRef={controls}
      onError={console.error} />
  </div>;
}
```

Include the `.presence` / `.sheep-canvas` positioning rules from `style.css`, or give the component's host an explicit width and height. Update `config` through React state; the renderer reads current props without rebuilding the scene. `controlRef.current` offers `resetCamera()` and `capture()` (PNG data URL).

## Controller

The playground exposes `window.mallow` only while Experiment 003 is mounted:

```js
mallow.setState('listening');
mallow.setExpression('curious', 0.8);
mallow.setGaze(0.2, 0.4);          // each axis -1…1
mallow.setPose('wave');
mallow.setMouth(0.5);             // 0…1
mallow.setAudioLevel(0.6);        // normalized audio amplitude, 0…1
mallow.setViseme('O');            // auto, rest, A, E, O, U, M, F
const configuration = mallow.getConfig();
mallow.reset();
```

States: `idle`, `listening`, `thinking`, `speaking`, `success`, `error`, `sleeping`.

Poses: `reference` (crossed arms, raised hoof), `relaxed`, `wave`, `celebrate`, `dance`.

Expressions: `sassy`, `neutral`, `happy`, `joyful`, `loving`, `curious`, `surprised`, `confused`, `concerned`, `sad`, `crying`, `angry`, `frustrated`, `skeptical`, `embarrassed`, `proud`, `sleepy`, `sleeping`, `wink`, `playful`, `laughing`, `relieved`, `excited`, `bored`.

## Speech integration

Browser speech preview is synthesized by the browser and uses approximate procedural mouth movement. It is not phoneme-aligned lip sync. Browser/OS voice availability varies; errors are displayed in the studio. Microphone input never goes to speakers or a server; the local analyser drives mouth openness. Microphone tracks, animation callbacks and audio contexts are released when stopped or unmounted.

For precise synchronization, schedule `setViseme()` against timestamps from your speech provider, then select `auto` to release the mouth. Fixed visemes override expression, audio and simulated mouth movement. In `auto`, expressions, the manual mouth slider and audio level combine by maximum openness; the `speaking` state adds simulated movement. Use `idle` with a neutral expression for pure amplitude-driven mouth control. Reset audio level and mouth openness to zero at the end of external playback.

```js
mallow.setState('speaking');
mallow.setViseme('A'); // at an audio-aligned phoneme timestamp
// At playback completion:
mallow.setViseme('auto');
mallow.setAudioLevel(0);
mallow.setMouth(0);
mallow.setState('idle');
```

## Rendering and limitations

- Geometry and materials are generated once; wool locks and fine fibres are instanced.
- Animation uses time-based damping, natural blinking and a low-frequency breathing cycle.
- Facial geometry updates every other frame: curved eye apertures, raised eyelid rims, gaze-controlled irises, nose and nostrils, lip curves, a masked mouth opening with an interior, teeth and tongue. Only iris colour and cheek blush use painted textures. The face silhouette does not change with expressions.
- The fleece suit includes a collar, rolled sleeve cuffs, a rear seam and a wool tail. Arms have shaped elbows, palms, thumbs and small fingers; hooves have flat soles and a central cleft.
- Breathing expands the torso without sliding the supporting foot. Small gaze shifts, ear movement, tail movement and speech nods add secondary motion.
- This detailed model contains about 1.34 million rendered triangles plus fine fibre lines, so it targets hardware-accelerated desktop browsers. Mobile performance may vary.
- Reduced-motion preference disables initial body animation. The pause control freezes procedural motion; controls can still blend to new target expressions.
- Front and three-quarter views best match the reference. The unseen sides are inferred, not recovered from the image.
- PNG capture and JSON configuration export are available in the controls. There is no GLB export or Blender rig in this experiment.
