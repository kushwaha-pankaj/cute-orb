import SheepMascot from '../SheepMascot';
import {SHEEP_DEFAULTS, SHEEP_EXPRESSIONS, SHEEP_STATES, SHEEP_POSES, SHEEP_VISEMES} from '../sheepExpressions';

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const stateSymbols = {idle: '◌', listening: '◉', thinking: '✳', speaking: '≋', success: '✓', error: '!', sleeping: '☾'};
const title = s => s[0].toUpperCase() + s.slice(1);
const poseLabel = p => (p === 'reference' ? 'Signature' : title(p));

function Renderer({config, audioLevel, onReady, onError, controlRef}) {
  return <SheepMascot config={config} audioLevel={audioLevel ?? 0} onReady={onReady} onError={onError} controlRef={controlRef} />;
}

export default {
  // Pulled back a little so Mallow sits clear of the floating panels.
  defaults: {...SHEEP_DEFAULTS, zoom: 0.82},
  storageKey: 'visage-mallow-v1',
  transient: ['state', 'viseme', 'mouthOpen'],
  Renderer,
  engine: 'Procedural three.js',
  hint: 'Drag to orbit · Scroll to zoom',
  capture: true,
  caption: c => `${SHEEP_EXPRESSIONS[c.expression]?.label || 'Sassy'} by nature.`,
  spinKey: 'autoRotate',

  states: {
    key: 'state',
    options: SHEEP_STATES.map(id => ({id, label: title(id), symbol: stateSymbols[id]})),
  },
  expressions: {
    key: 'expression',
    label: 'Moods',
    options: Object.entries(SHEEP_EXPRESSIONS).map(([id, e]) => ({id, label: e.label, symbol: e.icon})),
  },

  panels: [
    {
      id: 'expression',
      label: 'Expression',
      controls: [
        {type: 'range', key: 'intensity', label: 'Expression intensity', min: 0, max: 1.5},
        {type: 'heading', label: 'Gaze & mouth'},
        {type: 'range', key: 'gazeX', label: 'Look left / right', min: -1, max: 1},
        {type: 'range', key: 'gazeY', label: 'Look down / up', min: -1, max: 1},
        {type: 'range', key: 'mouthOpen', label: 'Mouth openness', min: 0, max: 1},
        {type: 'select', key: 'viseme', label: 'Mouth shape', options: SHEEP_VISEMES.map(v => ({id: v, label: v}))},
        {type: 'note', text: 'Choose auto for expression and audio control. Fixed mouth shapes override mouth animation.'},
      ],
    },
    {
      id: 'motion',
      label: 'Motion',
      controls: [
        {type: 'choice', key: 'pose', label: 'Body language', options: SHEEP_POSES.map(id => ({id, label: poseLabel(id)}))},
        {type: 'range', key: 'speed', label: 'Animation speed', min: 0.2, max: 2},
        {type: 'toggle', key: 'motion', label: 'Breathing & gestures'},
        {type: 'toggle', key: 'autoBlink', label: 'Natural blinking'},
      ],
    },
    {
      id: 'studio',
      label: 'Studio',
      controls: [
        {type: 'heading', label: 'Material'},
        {type: 'color', key: 'wool', label: 'Ivory fleece'},
        {type: 'color', key: 'skin', label: 'Peach skin'},
        {type: 'color', key: 'background', label: 'Studio backdrop'},
        {type: 'heading', label: 'Light & camera'},
        {type: 'range', key: 'exposure', label: 'Exposure', min: 0.6, max: 1.8},
        {type: 'range', key: 'yaw', label: 'Body rotation', min: -3.14, max: 3.14},
        {type: 'range', key: 'zoom', label: 'Camera zoom', min: 0.65, max: 1.5},
        {type: 'toggle', key: 'autoRotate', label: 'Orbit automatically'},
        {
          type: 'figure',
          src: `${import.meta.env.BASE_URL}sheep-reference.jpg`,
          alt: 'Original sheep reference: ivory wool, peach face, crossed arms and raised hoof',
          caption: 'The inspiration. A sculptural study in softness.',
        },
      ],
    },
  ],

  voice: {line: 'Hello, I’m Mallow. A little wool, a little attitude, and a lot of ideas.'},

  // Controller published on window[meta.api.global] while the studio is open.
  api: ({setConfig, patch, get, reset, setAudioLevel}) => ({
    setExpression(name, intensity = 1) {
      if (!SHEEP_EXPRESSIONS[name]) throw new Error('Unknown expression: ' + name);
      setConfig(c => ({...c, expression: name, intensity: clamp(intensity, 0, 1.5)}));
    },
    setState(state) {
      if (!SHEEP_STATES.includes(state)) throw new Error('Unknown state: ' + state);
      patch('state', state);
    },
    setGaze(x, y) {
      setConfig(c => ({...c, gazeX: clamp(x, -1, 1), gazeY: clamp(y, -1, 1)}));
    },
    setMouth(value) {
      patch('mouthOpen', clamp(value, 0, 1));
    },
    setViseme(viseme) {
      if (!SHEEP_VISEMES.includes(viseme)) throw new Error('Unknown viseme: ' + viseme);
      patch('viseme', viseme);
    },
    setPose(pose) {
      if (!SHEEP_POSES.includes(pose)) throw new Error('Unknown pose: ' + pose);
      patch('pose', pose);
    },
    setAudioLevel(value) {
      setAudioLevel(clamp(value, 0, 1));
    },
    getConfig: get,
    reset,
  }),
};
