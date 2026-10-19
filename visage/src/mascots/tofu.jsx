import TofuMascot from '../TofuMascot';
import {TOFU_DEFAULTS, TOFU_EXPRESSIONS, TOFU_STATES, TOFU_POSES} from '../tofuExpressions';
const title = text => text[0].toUpperCase() + text.slice(1);
const symbols = {idle: '◌', listening: '◉', thinking: '✳', speaking: '≋', success: '✓', error: '!', sleeping: '☾'};
const range = (key, label, min, max) => ({type: 'range', key, label, min, max});

export default {
  defaults: TOFU_DEFAULTS,
  storageKey: 'mascotty-tofu-v1', transient: ['state', 'mouthOpen'],
  Renderer: TofuMascot, engine: 'Procedural three.js', capture: true,
  hint: 'Drag to orbit · Scroll to zoom', spinKey: 'autoRotate',
  caption: c => `${TOFU_EXPRESSIONS[c.expression]?.label || 'Neutral'}. Quietly expressive.`,
  states: {key: 'state', options: TOFU_STATES.map(id => ({id, label: title(id), symbol: symbols[id]}))},
  expressions: {key: 'expression', label: 'Moods', options: Object.entries(TOFU_EXPRESSIONS).map(([id, e]) => ({id, label: e.label, symbol: e.icon}))},
  panels: [
    {id: 'look', label: 'Look', controls: [
      {type: 'swatches', key: 'bodyColor', label: 'Soft vinyl', options: [['#e6dac6', 'Ivory'], ['#afc3ac', 'Sage'], ['#dfa99c', 'Peach'], ['#aebbd4', 'Periwinkle'], ['#b6a2c7', 'Lilac'], ['#55565b', 'Graphite']]},
      {type: 'color', key: 'eyeColor', label: 'Eyes & face'},
      range('roughness', 'Matte finish', .2, 1),
      {type: 'heading', label: 'Proportions'},
      range('headWidth', 'Head width', .8, 1.15), range('headHeight', 'Head height', .8, 1.15),
      range('bodyWidth', 'Body width', .85, 1.15),
      range('eyeSize', 'Eye size', .65, 1.5), range('eyeSpacing', 'Eye spacing', .7, 1.25),
    ]},
    {id: 'expression', label: 'Expression', controls: [
      range('intensity', 'Expression intensity', 0, 1.5),
      {type: 'toggle', key: 'showMouth', label: 'Mouth in neutral'},
      {type: 'note', text: 'The signature look has only dot eyes. Other moods and speech reveal a small expressive mouth.'},
      range('mouthOpen', 'Mouth openness', 0, 1),
      range('gazeX', 'Look left / right', -1, 1), range('gazeY', 'Look down / up', -1, 1),
    ]},
    {id: 'motion', label: 'Motion', controls: [
      {type: 'choice', key: 'pose', label: 'Body language', options: TOFU_POSES.map(id => ({id, label: title(id)}))},
      range('speed', 'Animation speed', .2, 2),
      {type: 'toggle', key: 'motion', label: 'Breathing & gestures'},
      {type: 'toggle', key: 'autoBlink', label: 'Natural blinking'},
    ]},
    {id: 'studio', label: 'Studio', controls: [
      {type: 'color', key: 'background', label: 'Studio backdrop'},
      range('exposure', 'Exposure', .65, 1.3), range('yaw', 'Body rotation', -3.14, 3.14),
      range('zoom', 'Camera zoom', .65, 1.25),
      {type: 'toggle', key: 'autoRotate', label: 'Orbit automatically'},
    ]},
  ],
  voice: {line: 'Hi, I’m Tofu. A little quiet, a little curious, and here to help.'},
};
