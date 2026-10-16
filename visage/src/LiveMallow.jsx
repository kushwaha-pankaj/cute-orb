import {useMemo} from 'react';
import SheepMascot from './SheepMascot';
import {SHEEP_DEFAULTS} from './sheepExpressions';
export default function LiveMallow({expression = 'sassy', onError}) {
  const config = useMemo(() => ({
    ...SHEEP_DEFAULTS,
    background: '#0a3f47',
    expression,
    zoom: 1.05,
    motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  }), [expression]);
  return <SheepMascot config={config} onError={onError}/>;
}
