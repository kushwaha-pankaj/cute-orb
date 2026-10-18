import {useMemo} from 'react';
import SheepMascot from './SheepMascot';
import {SHEEP_DEFAULTS} from './sheepExpressions';
export default function LiveMallow({expression = 'sassy', background = '#0a3f47', onError}) {
  const config = useMemo(() => ({
    ...SHEEP_DEFAULTS,
    background,
    expression,
    zoom: 1.05,
    motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  }), [expression, background]);
  return <SheepMascot config={config} onError={onError}/>;
}
