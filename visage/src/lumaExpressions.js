/** Lightweight character data; safe to import without loading WebGL. */
export const LUMA_EXPRESSIONS = {
  neutral: {label: 'Neutral', icon: '·', eye: 1, curve: 0, tilt: 0},
  happy: {label: 'Happy', icon: '☺', eye: 0, curve: 1, tilt: .06},
  curious: {label: 'Curious', icon: '?', eye: 1.05, curve: 0, tilt: -.16},
  surprised: {label: 'Surprised', icon: '○', eye: 1.25, curve: 0, tilt: 0},
  sleepy: {label: 'Sleepy', icon: '☾', eye: 0, curve: -1, tilt: .08},
};
export const LUMA_STATES = ['idle', 'listening', 'thinking', 'speaking', 'success', 'error', 'sleeping'];
export const LUMA_POSES = ['stand', 'wave', 'sleep'];
export const LUMA_DEFAULTS = {
  bodyColor: '#bb8de5', faceColor: '#fff0db', eyeColor: '#302522', background: '#fcf8f2', roughness: .65,
  eyeSize: 1, eyeSpacing: 1, expression: 'neutral', pose: 'stand', state: 'idle',
  gazeX: 0, gazeY: 0, motion: true, follow: true, autoBlink: true, speed: 1,
  yaw: 0, zoom: .85, exposure: 1, autoRotate: false, transparent: false,
};
