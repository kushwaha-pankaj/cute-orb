import {useEffect, useRef} from 'react';
import SheepMascot from './SheepMascot';
import {SHEEP_DEFAULTS} from './sheepExpressions';

/** Transparent, cursor-aware Mallow for the landing hero. Mutates one config object so pointer moves never re-render. */
export default function HeroMallow({expression = 'happy', pose = 'reference', onError}) {
  const config = useRef(null);
  if (!config.current) {
    config.current = {
      ...SHEEP_DEFAULTS,
      transparent: true,
      expression,
      pose,
      zoom: 1.12,
      motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  }
  config.current.expression = expression;
  config.current.pose = pose;

  useEffect(() => {
    if (!config.current.motion) return;
    const move = e => {
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = (e.clientY / innerHeight) * 2 - 1;
      config.current.gazeX = x * 0.7;
      config.current.gazeY = -y * 0.45;
      config.current.yaw = x * 0.35;
    };
    addEventListener('pointermove', move, {passive: true});
    return () => removeEventListener('pointermove', move);
  }, []);

  return <SheepMascot config={config.current} onError={onError} />;
}
