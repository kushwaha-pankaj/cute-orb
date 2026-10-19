import {useRef, useState} from 'react';
import {featured} from './mascots';
import {heroSettings} from './heroSettings';
// Development-only full-frame model render, used to capture genuine product imagery.
import SheepMascot from './SheepMascot';
import Presence from './Presence';
import {SHEEP_DEFAULTS} from './sheepExpressions';

const sheepShots = {
  hero: {background: '#171717', expression: 'sassy', pose: 'reference', zoom: 0.95},
  // Joyful reads clearer than happy in still product shots (open smile, softer eyes).
  happy: {background: '#d5c9be', expression: 'joyful', pose: 'reference', zoom: 0.95},
  mallow: {background: '#d5c9be', expression: 'sassy', pose: 'reference', zoom: 0.95},
};

export default function PortraitCapture({name}) {
  if (name === 'hero-poster') return <HeroPosterCapture />;
  if (name === 'portrait') {
    return (
      <div className="portrait-capture" style={{position: 'fixed', inset: 0, background: '#121212'}}>
        <Presence
          config={{form: 0, size: 1.15, scatter: 0.025, speed: 1, glow: 0.35, sensitivity: 1, scale: 1, tint: '#ffffff', motion: false}}
          state="idle"
          theme="dark"
          onError={console.error}
        />
      </div>
    );
  }
  const shot = sheepShots[name] || sheepShots.mallow;
  return (
    <div className="portrait-capture" style={{position: 'fixed', inset: 0, background: shot.background}}>
      <SheepMascot
        config={{...SHEEP_DEFAULTS, ...shot, motion: true, autoBlink: false, autoRotate: false, speed: 0.35}}
        onError={console.error}
      />
    </div>
  );
}

// Capture through the renderer's supported PNG API, with the hero's exact initial setup.
function HeroPosterCapture() {
  const controls = useRef(null);
  const [png, setPng] = useState('');
  return <>
    <div style={{position: 'fixed', top: 0, left: 0, width: 768, height: 768}}>
      <SheepMascot config={heroSettings(featured.heroProps, false)} controlRef={controls}
        onReady={() => setPng(controls.current.capture())} onError={console.error} />
    </div>
    {png && <a id="hero-poster-download" href={png} download="hero-poster.png" style={{position: 'fixed', bottom: 0, left: 0, zIndex: 10}}>Download matching hero preview</a>}
  </>;
}
