# Visage — React + Three.js + Tailwind CSS

## Run locally
1. Install Node.js 20.19+ or 22.12+.
2. Open a terminal in this folder.
3. Run `npm ci`.
4. Run `npm run dev`.
5. Open the localhost URL printed in your terminal.

Production: `npm run build`; preview: `npm run preview`.

## Files
- src/Presence.jsx — reusable Three.js face, orb, shaders and particle renderer.
- src/main.jsx — React controls, states, microphone and voice preview.
- src/style.css — Tailwind CSS import and responsive styling.
- public/visage.png — original facial artwork.

## Integration
Import Presence from src/Presence.jsx and pass:
```jsx
<Presence
  state="listening"
  audioLevel={0.4}
  config={{form:0,size:1.15,scatter:0.025,speed:1,glow:0.35,sensitivity:1,scale:1,tint:'#ffffff',motion:true}}
  onError={console.error}
/>
```
The parent must have a defined height and position:relative. State accepts idle, listening, thinking, or speaking. audioLevel is amplitude, typically 0–1. Speaking uses synthetic modulation if amplitude is zero. Connect your assistant events and audio output to these props. No AI API or keys are required for this demo.

The latest version keeps the face front-facing, adds a smooth facial surface, streams fine particles outward, and uses scroll to increase particle travel with subtle depth movement. This is an image-derived surface with inferred depth rather than a full 3D head model.

Microphone audio is analysed locally. HTTPS or localhost and browser permission are required. Voice preview uses browser speech synthesis with simulated mouth motion. Appearance settings persist in localStorage; Export config downloads JSON.

## Themes
Light mode is the default. Use the header button to toggle dark mode. The theme persists locally. Presence accepts an optional `theme="light"` or `theme="dark"` prop (default dark for standalone integration).

Renderer correction: original face detail restored, reduced inferred depth to avoid distortion, original particle orb restored, black edge matting removed through shader transparency in light mode.

Speech update: Presence accepts speechCue, a React ref containing {active, text, index, stamp, boundary}. The UI updates it from browser speech start and word-boundary events. Character-based mouth-shape estimates drive lips and jaw; this is approximate animation, not phoneme-aligned lip-sync. audioLevel may be null for synthetic preview or a number for live amplitude; zero correctly represents silence. Light mode suppresses dense dark particles and uses brightness-based edge transparency.

Rendering repair: all GLSL powers of signed coordinates now use absolute bases to avoid undefined driver behaviour. Lip displacement is continuous across the mouth centre. Both actual shader programs were compiled and visually checked in an offscreen OpenGL renderer, with face geometry and particles in closed/open/rounded mouth states and both themes. Browser speech timing remains approximate.
