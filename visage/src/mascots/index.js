/**
 * The cast. Every page reads mascots from this list, so adding a character means
 * adding one entry here and one studio definition file next to it.
 *
 * Keep entries light: they load on the landing page. Anything that pulls in
 * three.js or a renderer belongs in the lazily loaded `load()` definition.
 */
import {SHEEP_EXPRESSIONS, SHEEP_STATES, SHEEP_POSES} from '../sheepExpressions';
import {SHEET_EXPRESSIONS} from '../blobExpressions';
import {TOFU_EXPRESSIONS, TOFU_STATES, TOFU_POSES} from '../tofuExpressions';
import {LUMA_EXPRESSIONS, LUMA_STATES, LUMA_POSES} from '../lumaExpressions';
import {PORTRAIT_STATES} from './portraitData';

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const mascots = [
  {
    id: 'mallow',
    name: 'Mallow',
    material: 'Wool and attitude',
    tagline: 'Soft wool. A sideways glance. Make every expression your own.',
    image: 'mallow-happy.webp',
    imageAlt: 'Mallow the ivory wool sheep with arms crossed',
    tint: '#d4cac0',
    states: SHEEP_STATES,
    expressions: Object.keys(SHEEP_EXPRESSIONS),
    moods: Object.keys(SHEEP_EXPRESSIONS).length,
    fact: [
      count(Object.keys(SHEEP_EXPRESSIONS).length, 'mood'),
      count(SHEEP_STATES.length, 'AI state'),
      count(SHEEP_POSES.length, 'pose'),
    ].join(' · '),
    // Optional: a transparent, cursor-aware renderer for the landing hero and cast card.
    hero: () => import('../HeroMallow'),
    heroProps: {expression: 'excited', pose: 'wave'},
    heroExpressions: ['excited', 'curious', 'sleepy'].map(id => ({id, label: SHEEP_EXPRESSIONS[id].label})),
    heroPoster: 'mallow-hero-poster.webp',
    heroPosterAlt: 'Mallow the ivory wool sheep smiling and waving',
    // Studio-only console controller (window.mallow). Websites use visage.js instead (see integration.js).
    api: {
      global: 'mallow',
      example: `mallow.setState('listening');
mallow.setExpression('curious', 0.8);
mallow.setGaze(0.3, 0.2);

mallow.setState('speaking');
mallow.setViseme('O');
mallow.setAudioLevel(0.6);`,
    },
    load: () => import('./mallow'),
  },
  {
    id: 'tofu',
    name: 'Tofu',
    material: 'Soft vinyl',
    tagline: 'A quiet little companion. Rounded edges, dot eyes, and room to make it yours.',
    image: 'tofu.webp',
    imageAlt: 'Tofu, an ivory 3D companion with a large rounded head and tiny dot eyes',
    tint: '#f5ece2',
    states: TOFU_STATES,
    expressions: Object.keys(TOFU_EXPRESSIONS),
    moods: Object.keys(TOFU_EXPRESSIONS).length,
    fact: [count(Object.keys(TOFU_EXPRESSIONS).length, 'mood'), count(TOFU_STATES.length, 'AI state'), count(TOFU_POSES.length, 'pose')].join(' · '),
    customization: {
      description: 'Generated entirely from 3D geometry, with no model download. Neutral preserves the reference’s dot-eye face; expressions and speech reveal a small mouth. Colours, proportions, roughness, gaze and poses update without rebuilding the scene.',
      example: `const tofu = Mascotty.get('tofu');
tofu.set({
  bodyColor: '#afc3ac', eyeColor: '#252620', roughness: 0.7,
  headWidth: 1.05, headHeight: 0.95, bodyWidth: 1,
  eyeSize: 1.1, eyeSpacing: 0.9, pose: 'wave'
});
tofu.setExpression('happy');
tofu.setState('listening');
// Keep the reference's quiet face:
// tofu.setExpression('neutral');
// tofu.set({showMouth: false, pose: 'stand'});`,
    },
    load: () => import('./tofu'),
  },
  {
    id: 'luma', name: 'Luma', material: 'Lavender soft vinyl',
    tagline: 'A little light in your day. Big curious eyes, soft mittens, and a friendly wave.',
    image: 'luma.png', imageAlt: 'Luma, a lavender companion with a cream face, glossy oval eyes and a round antenna',
    tint: '#fcf8f2', states: LUMA_STATES, expressions: Object.keys(LUMA_EXPRESSIONS),
    moods: Object.keys(LUMA_EXPRESSIONS).length,
    fact: [count(Object.keys(LUMA_EXPRESSIONS).length, 'mood'), count(LUMA_STATES.length, 'AI state'), count(LUMA_POSES.length, 'pose')].join(' · '),
    load: () => import('./luma'),
  },
  {
    id: 'blob',
    name: 'Green Blob',
    material: 'Soft clay',
    tagline: 'A little bounce, a big grin. Shape its look and body language.',
    image: 'blob.webp',
    imageAlt: 'Green three-dimensional blob mascot with a wide grin',
    tint: '#9cc08f',
    states: [],
    expressions: SHEET_EXPRESSIONS.map(e => e.id),
    moods: SHEET_EXPRESSIONS.length,
    fact: `${count(SHEET_EXPRESSIONS.length, 'look')} · parts you can hide`,
    load: () => import('./blob'),
  },
  {
    id: 'portrait',
    name: 'Portrait',
    material: 'Pixel dust',
    tagline: 'A portrait made of particles. A presence that reacts to you.',
    image: 'portrait.webp',
    imageAlt: 'Particle portrait presence glowing blue on black',
    tint: '#121212',
    dark: true,
    states: PORTRAIT_STATES.map(s => s.id),
    expressions: [],
    moods: PORTRAIT_STATES.length,
    fact: `Face to orb · ${count(PORTRAIT_STATES.length, 'state')} · reacts to voice`,
    load: () => import('./portrait'),
  },
];

export const getMascot = id => mascots.find(m => m.id === id);

/** The first mascot that ships a hero renderer leads the landing page. */
export const featured = mascots.find(m => m.hero) || mascots[0];

export const totalMoods = mascots.reduce((sum, m) => sum + (m.moods || 0), 0);
