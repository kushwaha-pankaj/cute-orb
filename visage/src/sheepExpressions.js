/** Blendable facial targets. Values are normalized; negative smile is a frown. */
export const SHEEP_EXPRESSIONS = {
  sassy: {label:'Sassy', icon:'✦', eyes:.47, smile:.65, lookX:.6, lookY:.15, tilt:.19, brow:-.15},
  neutral: {label:'Neutral', icon:'◌', eyes:.8, smile:.12},
  happy: {label:'Happy', icon:'☺', eyes:.68, smile:1, mouth:.18, tilt:.08},
  joyful: {label:'Joyful', icon:'✺', eyes:.22, smile:1, mouth:.7, bounce:.1},
  loving: {label:'Loving', icon:'♡', eyes:.55, smile:.8, tilt:.17, blush:1},
  curious: {label:'Curious', icon:'⌕', eyes:.95, smile:.22, tilt:.22, brow:.4, lookX:.25},
  surprised: {label:'Surprised', icon:'!', eyes:1, mouth:.75, round:1, brow:.8},
  confused: {label:'Confused', icon:'?', eyes:.65, smile:-.25, tilt:-.22, brow:.65, asymmetric:.5},
  concerned: {label:'Concerned', icon:'⌁', eyes:.7, smile:-.45, brow:.85},
  sad: {label:'Sad', icon:'☂', eyes:.55, smile:-.8, brow:.9, tilt:.08, lookY:-.4},
  crying: {label:'Crying', icon:'◈', eyes:.35, smile:-.9, brow:1, tears:1, mouth:.22},
  angry: {label:'Angry', icon:'ϟ', eyes:.48, smile:-.55, brow:-1, tilt:-.06},
  frustrated: {label:'Frustrated', icon:'≠', eyes:.32, smile:-.4, brow:-.65, lookX:-.6},
  skeptical: {label:'Skeptical', icon:'↗', eyes:.35, smile:.1, lookX:-.65, asymmetric:.7, brow:.3},
  embarrassed: {label:'Shy', icon:'❀', eyes:.45, smile:.4, blush:1, lookY:-.7, tilt:.18},
  proud: {label:'Proud', icon:'♛', eyes:.35, smile:.75, lookY:.4, tilt:-.12},
  sleepy: {label:'Sleepy', icon:'☾', eyes:.15, smile:.05, tilt:.18},
  sleeping: {label:'Asleep', icon:'z', eyes:0, smile:.2, tilt:.22},
  wink: {label:'Wink', icon:'✧', eyes:.75, smile:.8, wink:1, tilt:-.12},
  playful: {label:'Playful', icon:'♪', eyes:.7, smile:.9, mouth:.4, tongue:1, tilt:.16},
  laughing: {label:'Laughing', icon:'≋', eyes:.08, smile:1, mouth:.85, bounce:.08},
  relieved: {label:'Relieved', icon:'～', eyes:.12, smile:.6, brow:.2},
  excited: {label:'Excited', icon:'★', eyes:1, smile:1, mouth:.6, bounce:.12},
  bored: {label:'Bored', icon:'…', eyes:.2, smile:-.1, lookX:.5, tilt:-.1},
};
export const SHEEP_STATES = ['idle','listening','thinking','speaking','success','error','sleeping'];
export const SHEEP_DEFAULTS = {expression:'sassy',state:'idle',intensity:1,motion:true,autoBlink:true,speed:1,pose:'reference',gazeX:0,gazeY:0,mouthOpen:0,viseme:'auto',yaw:0,zoom:1,autoRotate:false,wool:'#e8e4d8',skin:'#e8a58b',background:'#d5c9be',exposure:1.02};
export const FACE_BASE = {eyes:.8,smile:.1,mouth:0,lookX:0,lookY:0,tilt:0,brow:0,asymmetric:0,blush:.4,round:0,wink:0,tears:0,tongue:0,bounce:0};
export const SHEEP_POSES = ['reference','relaxed','wave','celebrate','dance'];
export const SHEEP_VISEMES = ['auto','rest','A','E','O','U','M','F'];
