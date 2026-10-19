import {useEffect, useRef} from 'react';
import SheepMascot from './SheepMascot';
import {heroSettings} from './heroSettings';

/** Transparent, cursor-aware Mallow for the landing hero. The cursor feeds a ref, so pointer moves never re-render. */
export default function HeroMallow({expression = 'happy', pose = 'reference', onError, onReady}) {
  const config = useRef(null);
  const pointer = useRef({x: 0, y: 0});
  if (!config.current) {
    config.current = heroSettings({expression, pose}, !matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  config.current.expression = expression;
  config.current.pose = pose;

  useEffect(() => {
    const move = e => {
      pointer.current = {x: (e.clientX / innerWidth) * 2 - 1, y: -((e.clientY / innerHeight) * 2 - 1)};
    };
    const leave = () => (pointer.current = {x: 0, y: 0});
    addEventListener('pointermove', move, {passive: true});
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  return <SheepMascot config={config.current} pointer={pointer} onError={onError} onReady={onReady} />;
}
