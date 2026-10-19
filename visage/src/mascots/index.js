/**
 * The cast. Every page reads mascots from this list, so adding a character means
 * adding one entry here and one studio definition file next to it.
 *
 * Keep entries light: they load on the landing page. Anything that pulls in
 * three.js or a renderer belongs in the lazily loaded `load()` definition.
 */
import {SHEEP_EXPRESSIONS, SHEEP_STATES, SHEEP_POSES} from '../sheepExpressions';
import {SHEET_EXPRESSIONS} from '../blobExpressions';
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
