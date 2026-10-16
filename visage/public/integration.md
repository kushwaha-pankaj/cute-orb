# Visage integration notes

Visage is a browser character studio. There is no AI backend and no account. Drive a presence from your own app events.

## Routes

- `#home` — exhibition landing
- `#studio/portrait` — particle portrait / orb
- `#studio/blob` — Green Blob GLB mascot
- `#studio/mallow` — Mallow procedural sheep

## Mallow controller

While Experiment 003 (Mallow) is open, the playground exposes `window.mallow`:

```js
mallow.setState('listening');
mallow.setExpression('curious', 0.8);
mallow.setGaze(0.2, 0.4);   // each axis -1…1
mallow.setPose('wave');
mallow.setMouth(0.5);      // 0…1
mallow.setAudioLevel(0.6); // normalized amplitude 0…1
mallow.setViseme('O');     // auto, rest, A, E, O, U, M, F
const configuration = mallow.getConfig();
mallow.reset();
```

States: `idle`, `listening`, `thinking`, `speaking`, `success`, `error`, `sleeping`.

Poses: `reference`, `relaxed`, `wave`, `celebrate`, `dance`.

Expressions: `sassy`, `neutral`, `happy`, `joyful`, `loving`, `curious`, `surprised`, `confused`, `concerned`, `sad`, `crying`, `angry`, `frustrated`, `skeptical`, `embarrassed`, `proud`, `sleepy`, `sleeping`, `wink`, `playful`, `laughing`, `relieved`, `excited`, `bored`.

## Speech

Browser speech preview is approximate, not phoneme-aligned. Microphone audio is analysed locally and never uploaded. For precise sync, schedule `setViseme()` against your speech provider timestamps, then return to `auto`.

```js
mallow.setState('speaking');
mallow.setViseme('A');
// At playback completion:
mallow.setViseme('auto');
mallow.setAudioLevel(0);
mallow.setMouth(0);
mallow.setState('idle');
```

## React embedding

Import the mascot components from `src/` and pass config props. Each studio can export its current settings as JSON from the UI. Mallow can also capture a PNG. There is no GLB export for the procedural sheep.

## Requirements

Recent browser with WebGL and hardware acceleration. Microphone needs HTTPS or localhost. The detailed Mallow model targets desktop GPUs.
