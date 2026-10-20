import LumaMascot from '../LumaMascot';
import {LUMA_DEFAULTS, LUMA_EXPRESSIONS, LUMA_STATES, LUMA_POSES} from '../lumaExpressions';
const title = text => text[0].toUpperCase() + text.slice(1);
const range = (key,label,min,max) => ({type:'range',key,label,min,max});
const symbols = {idle:'◌',listening:'◉',thinking:'✳',speaking:'≋',success:'✓',error:'!',sleeping:'☾'};
export default {
  defaults:LUMA_DEFAULTS, storageKey:'mascotty-luma-v1', transient:['state'],
  Renderer:LumaMascot, engine:'Procedural three.js', capture:true,
  hint:'Drag to orbit · Scroll to zoom', spinKey:'autoRotate',
  caption:c=>`${LUMA_EXPRESSIONS[c.expression]?.label || 'Neutral'}. A little light in your day.`,
  states:{key:'state',options:LUMA_STATES.map(id=>({id,label:title(id),symbol:symbols[id]}))},
  expressions:{key:'expression',label:'Moods',options:Object.entries(LUMA_EXPRESSIONS).map(([id,e])=>({id,label:e.label,symbol:e.icon}))},
  panels:[
    {id:'look',label:'Look',controls:[
      {type:'swatches',key:'bodyColor',label:'Soft suit',options:[['#bb8de5','Lavender'],['#91b9db','Sky'],['#b3c69c','Pistachio'],['#edb2c6','Rose']]},
      {type:'color',key:'faceColor',label:'Face panel'}, {type:'color',key:'eyeColor',label:'Glossy eyes'},
      range('roughness','Matte finish',.3,1),range('eyeSize','Eye size',.75,1.2),range('eyeSpacing','Eye spacing',.8,1.2),
      range('gazeX','Look left / right',-1,1),range('gazeY','Look down / up',-1,1),
    ]},
    {id:'motion',label:'Motion',controls:[
      {type:'choice',key:'pose',label:'Body language',options:LUMA_POSES.map(id=>({id,label:title(id)}))},
      {type:'toggle',key:'motion',label:'Breathing & gestures'}, {type:'toggle',key:'autoBlink',label:'Natural blinking'},range('speed','Animation speed',.2,2),
    ]},
    {id:'studio',label:'Studio',controls:[
      {type:'color',key:'background',label:'Studio backdrop'},range('exposure','Exposure',.65,1.3),range('yaw','Body rotation',-3.14,3.14),range('zoom','Camera zoom',.65,1.25),
      {type:'toggle',key:'autoRotate',label:'Orbit automatically'},
    ]},
  ],
  voice:{line:'Hi, I’m Luma. A little light, a little curiosity, and always happy to help.'},
};
