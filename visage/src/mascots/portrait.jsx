import Presence from '../Presence';
import {PORTRAIT_STATES} from './portraitData';

// Portrait is a glowing figure: its light-mode rendering washed the orb out to near-invisible,
// so the stage stays dark in both themes (the floating controls still follow the theme).
function Renderer({config, audioLevel, speechCue, pointer, onError}) {
  return <Presence config={config} state={config.state} theme="dark" audioLevel={audioLevel} speechCue={speechCue} pointer={pointer} onError={onError} />;
}

export default {
  defaults: {form: 0, size: 1.15, scatter: 0.025, speed: 1, glow: 0.35, sensitivity: 1, scale: 1, tint: '#ffffff', motion: true, follow: true, release: 0, state: 'idle'},
  storageKey: 'visage-config-v2',
  transient: ['state'],
  Renderer,
  engine: 'WebGL particles',
  hint: 'Move your cursor to explore',
  // The particle renderer is transparent, so the stage supplies its own surface.
  surface: () => '#0e0e12',
  caption: c => PORTRAIT_STATES.find(s => s.id === c.state)?.caption,
  stageAction: {
    label: c => (c.form > 0.5 ? 'Transform to face' : 'Transform to orb'),
    apply: c => ({...c, form: c.form > 0.5 ? 0 : 1}),
  },

  states: {key: 'state', options: PORTRAIT_STATES},

  panels: [
    {
      id: 'appearance',
      label: 'Appearance',
      controls: [
        {
          type: 'choice',
          key: 'form',
          label: 'Form',
          options: [
            {id: 0, label: 'Face'},
            {id: 1, label: 'Orb'},
          ],
          isActive: (c, id) => (id === 1 ? c.form >= 0.5 : c.form < 0.5),
        },
        {type: 'range', key: 'form', label: 'Face → orb', min: 0, max: 1},
        {type: 'heading', label: 'Particles'},
        {type: 'range', key: 'size', label: 'Particle size', min: 0.6, max: 4},
        {type: 'range', key: 'scatter', label: 'Dispersion', min: 0, max: 1},
        {type: 'range', key: 'glow', label: 'Luminosity', min: 0, max: 1.5},
        {type: 'range', key: 'release', label: 'Pixel dust', min: 0, max: 1},
        {
          type: 'swatches',
          key: 'tint',
          label: 'Colour mood',
          options: [
            ['#ffffff', 'Original'],
            ['#a8baff', 'Indigo'],
            ['#b3ffed', 'Glacier'],
            ['#ffb8e9', 'Rose'],
            ['#ffd7a6', 'Amber'],
          ],
        },
        {type: 'note', text: 'A subtle tint over the original palette.'},
      ],
    },
    {
      id: 'behaviour',
      label: 'Behaviour',
      controls: [
        {type: 'range', key: 'speed', label: 'Animation speed', min: 0.1, max: 2.5},
        {type: 'range', key: 'sensitivity', label: 'Audio sensitivity', min: 0.2, max: 3},
        {type: 'range', key: 'scale', label: 'Presence scale', min: 0.65, max: 1.3},
        {type: 'toggle', key: 'motion', label: 'Animate particles'},
      ],
    },
  ],

  voice: {line: 'Hello. I am Mascotty. A digital presence, brought to life.'},
};
