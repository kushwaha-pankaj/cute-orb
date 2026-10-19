/** Small, renderer-free data shared by the registry, studio and embed. */
export const TOFU_EXPRESSIONS = {
  neutral: {label: 'Neutral', icon: '·', eyes: 1, smile: 0, mouth: 0, brow: 0, tilt: 0},
  happy: {label: 'Happy', icon: '☺', eyes: .75, smile: 1, mouth: 0, brow: .15, tilt: .035},
  sad: {label: 'Sad', icon: '☂', eyes: .8, smile: -1, mouth: 0, brow: .8, tilt: -.09},
  angry: {label: 'Angry', icon: '!', eyes: .6, smile: -.6, mouth: 0, brow: -.9, tilt: 0},
  worried: {label: 'Worried', icon: '〰', eyes: 1.15, smile: -.6, mouth: .15, brow: 1, tilt: -.1},
  surprised: {label: 'Surprised', icon: '○', eyes: 1.4, smile: 0, mouth: .8, brow: .5, tilt: 0},
  sleepy: {label: 'Sleepy', icon: '☾', eyes: .15, smile: 0, mouth: 0, brow: 0, tilt: .13},
  curious: {label: 'Curious', icon: '?', eyes: 1.1, smile: .2, mouth: 0, brow: .45, tilt: -.17},
};
export const TOFU_STATES = ['idle', 'listening', 'thinking', 'speaking', 'success', 'error', 'sleeping'];
export const TOFU_POSES = ['stand', 'wave', 'welcome', 'dance'];
export const TOFU_DEFAULTS = {
  bodyColor: '#e6dac6', eyeColor: '#252620', background: '#f5ece2', roughness: .62,
  headWidth: 1, headHeight: 1, bodyWidth: 1, eyeSize: 1, eyeSpacing: 1,
  expression: 'neutral', intensity: 1, pose: 'stand', state: 'idle',
  showMouth: false, mouthOpen: 0, gazeX: 0, gazeY: 0,
  motion: true, follow: true, autoBlink: true, speed: 1,
  yaw: 0, zoom: .85, exposure: 1, autoRotate: false, transparent: false,
};
