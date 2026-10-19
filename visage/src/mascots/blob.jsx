import GreenBlob from '../GreenBlob';
import {SHEET_EXPRESSIONS, applyExpressionToConfig, getExpression} from '../blobExpressions';

const applyLook = (config, id) => ({...applyExpressionToConfig(config, id), expression: id});

const defaults = applyLook(
  {
    scale: 1,
    yaw: 0,
    bodyColor: '#4BCB6F',
    studio: '#6FB882',
    floor: '#62A874',
    showFloor: true,
    ambient: 0.55,
    keyLight: 2.1,
    fillLight: 0.85,
    rimLight: 0.7,
    exposure: 1.05,
    motion: true,
    autoRotate: false,
    spinSpeed: 1.2,
    bobAmount: 0.035,
    bobSpeed: 1.4,
    autoBlink: true,
    showEyes: true,
    showMouth: true,
    showTongue: true,
    showArms: true,
    showFeet: true,
    showBumps: true,
  },
  'happy',
);

// Pull the camera back so the blob sits clear of the floating studio panels.
const ROOM_ZOOM = 0.66;

function Renderer({config, onReady, onError}) {
  return <GreenBlob config={{...config, zoom: ROOM_ZOOM}} onReady={onReady} onError={onError} />;
}

export default {
  defaults,
  storageKey: 'greenblob-config-v1',
  // Older saves lacked mouthStyle; settle them onto the default look.
  migrate: saved => (saved.mouthStyle ? saved : applyLook(saved, 'happy')),
  Renderer,
  engine: 'three.js · GLB',
  hint: 'Drag to orbit · Scroll to zoom',
  caption: c => getExpression(c.expression).caption,
  spinKey: 'autoRotate',

  // Keep the mouth style and openness slider in agreement.
  update(c, key, value) {
    const next = {...c, [key]: value};
    if (key === 'mouthOpen' && value > 0.05 && c.mouthStyle === 'smile') next.mouthStyle = 'open';
    if (key === 'mouthOpen' && value <= 0.02 && c.mouthStyle === 'open') next.mouthStyle = 'smile';
    return next;
  },

  expressions: {
    key: 'expression',
    label: 'Looks',
    options: SHEET_EXPRESSIONS.map(e => ({id: e.id, label: e.label, symbol: e.symbol})),
    apply: applyLook,
  },

  panels: [
    {
      id: 'look',
      label: 'Look',
      controls: [
        {
          type: 'swatches',
          key: 'bodyColor',
          label: 'Body colour',
          options: [
            ['#4BCB6F', 'Apple'],
            ['#34A853', 'Emerald'],
            ['#7BE07A', 'Lime'],
            ['#2E8B57', 'Sea'],
            ['#A8E063', 'Chartreuse'],
          ],
        },
        {
          type: 'choice',
          key: 'mouthStyle',
          label: 'Mouth',
          options: [
            {id: 'open', label: 'Open'},
            {id: 'smile', label: 'Smile'},
            {id: 'o', label: 'O'},
          ],
          apply: (c, id) => ({...c, mouthStyle: id, mouthOpen: id === 'smile' ? 0 : id === 'o' ? 0.55 : Math.max(c.mouthOpen, 1)}),
        },
        {type: 'range', key: 'mouthOpen', label: 'Mouth open', min: 0, max: 1},
        {type: 'range', key: 'blink', label: 'Eyes closed', min: 0, max: 1},
        {type: 'range', key: 'lookX', label: 'Eyes look left / right', min: -1, max: 1},
        {type: 'range', key: 'lookY', label: 'Eyes look down / up', min: -1, max: 1},
        {type: 'range', key: 'scale', label: 'Scale', min: 0.55, max: 1.45},
        {type: 'range', key: 'yaw', label: 'Yaw', min: -45, max: 45, step: 1},
        {type: 'toggle', key: 'autoBlink', label: 'Auto blink'},
      ],
    },
    {
      id: 'motion',
      label: 'Motion',
      controls: [
        {type: 'toggle', key: 'motion', label: 'Idle bob'},
        {type: 'range', key: 'bobAmount', label: 'Bob amount', min: 0, max: 0.12},
        {type: 'range', key: 'bobSpeed', label: 'Bob speed', min: 0.2, max: 3},
        {type: 'toggle', key: 'autoRotate', label: 'Auto rotate'},
        {type: 'range', key: 'spinSpeed', label: 'Spin speed', min: 0.2, max: 4, when: c => c.autoRotate},
      ],
    },
    {
      id: 'parts',
      label: 'Parts',
      controls: [
        {
          type: 'parts',
          label: 'Elements',
          options: [
            {key: 'showEyes', label: 'Eyes'},
            {key: 'showMouth', label: 'Mouth'},
            {key: 'showTongue', label: 'Tongue'},
            {key: 'showArms', label: 'Arms'},
            {key: 'showFeet', label: 'Feet'},
            {key: 'showBumps', label: 'Bumps'},
          ],
        },
        {
          type: 'note',
          text: (c, info) =>
            info
              ? `Mesh groups exported from Blender (GEO_*). Loaded ${info.meshes?.length || 0} meshes${info.morphs?.length ? ` · morphs: ${info.morphs.join(', ')}` : ''}.`
              : 'Mesh groups exported from Blender (GEO_*).',
        },
      ],
    },
    {
      id: 'studio',
      label: 'Studio',
      controls: [
        {
          type: 'swatches',
          key: 'studio',
          label: 'Backdrop',
          options: [
            ['#6FB882', 'Sage'],
            ['#8AD28A', 'Mint'],
            ['#5FA872', 'Moss'],
            ['#B8E0C0', 'Pale'],
            ['#3D7A52', 'Forest'],
          ],
        },
        {type: 'toggle', key: 'showFloor', label: 'Show floor'},
        {type: 'color', key: 'floor', label: 'Floor colour', when: c => c.showFloor},
        {type: 'heading', label: 'Lights'},
        {type: 'range', key: 'ambient', label: 'Ambient', min: 0, max: 1.5},
        {type: 'range', key: 'keyLight', label: 'Key light', min: 0, max: 4},
        {type: 'range', key: 'fillLight', label: 'Fill light', min: 0, max: 2.5},
        {type: 'range', key: 'rimLight', label: 'Rim light', min: 0, max: 2.5},
        {type: 'range', key: 'exposure', label: 'Exposure', min: 0.5, max: 1.8},
      ],
    },
  ],

  downloads: [{label: 'Download GLB', href: `${import.meta.env.BASE_URL}green_blob.glb`}],
};
