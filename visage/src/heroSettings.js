import {SHEEP_DEFAULTS} from './sheepExpressions';

// The preview and live hero must use the same camera, appearance and initial pose.
export const heroSettings = ({expression = 'happy', pose = 'reference'} = {}, motion = true) => ({
  ...SHEEP_DEFAULTS,
  transparent: true,
  follow: true,
  expression,
  pose,
  zoom: .92,
  motion,
});
