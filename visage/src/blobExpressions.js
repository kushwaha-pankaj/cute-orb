/**
 * Expression presets from inspiration/green-blob-technical-sheet.jpg
 *
 * These write directly into the same face controls as the sliders
 * (lookX/Y, mouthOpen, blink, mouthStyle) so expressions and knobs stay in sync.
 */
export const SHEET_EXPRESSIONS = [
  {
    id: 'happy',
    label: 'Happy',
    caption: 'Tongue out — default sheet pose',
    symbol: '☺',
    lookX: 0.08,
    lookY: 0.22,
    mouthOpen: 1,
    blink: 0,
    mouthStyle: 'open',
  },
  {
    id: 'smile',
    label: 'Smile',
    caption: 'Mouth closed smile',
    symbol: '◡',
    lookX: 0.05,
    lookY: 0.14,
    mouthOpen: 0,
    blink: 0,
    mouthStyle: 'smile',
  },
  {
    id: 'surprised',
    label: 'Surprised',
    caption: 'Small O mouth',
    symbol: '○',
    lookX: 0.02,
    lookY: 0.24,
    mouthOpen: 0.55,
    blink: 0,
    mouthStyle: 'o',
  },
  {
    id: 'lookLeft',
    label: 'Look Left',
    caption: 'Pupils to the left',
    symbol: '←',
    lookX: -0.85,
    lookY: 0.08,
    mouthOpen: 1,
    blink: 0,
    mouthStyle: 'open',
  },
  {
    id: 'lookRight',
    label: 'Look Right',
    caption: 'Pupils to the right',
    symbol: '→',
    lookX: 0.85,
    lookY: 0.08,
    mouthOpen: 1,
    blink: 0,
    mouthStyle: 'open',
  },
  {
    id: 'lookUp',
    label: 'Look Up',
    caption: 'Pupils upward',
    symbol: '↑',
    lookX: 0.05,
    lookY: 0.9,
    mouthOpen: 1,
    blink: 0,
    mouthStyle: 'open',
  },
  {
    id: 'lookDown',
    label: 'Look Down',
    caption: 'Pupils downward',
    symbol: '↓',
    lookX: 0.05,
    lookY: -0.75,
    mouthOpen: 1,
    blink: 0,
    mouthStyle: 'open',
  },
  {
    id: 'blink',
    label: 'Blink',
    caption: 'Eyes closed arcs',
    symbol: '◡◡',
    lookX: 0,
    lookY: 0,
    mouthOpen: 1,
    blink: 1,
    mouthStyle: 'open',
  },
];

export function getExpression(id) {
  return SHEET_EXPRESSIONS.find((e) => e.id === id) || SHEET_EXPRESSIONS[0];
}

/** Apply a sheet preset onto the live face config (sliders update too). */
export function applyExpressionToConfig(config, expressionId) {
  const preset = getExpression(expressionId);
  return {
    ...config,
    lookX: preset.lookX,
    lookY: preset.lookY,
    mouthOpen: preset.mouthOpen,
    blink: preset.blink,
    mouthStyle: preset.mouthStyle,
  };
}
