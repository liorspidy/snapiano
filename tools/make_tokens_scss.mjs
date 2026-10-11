import { writeFileSync } from 'node:fs';
import { brand, color, space, radius, touch } from '../src/theme/tokens.ts';

const px = (obj, prefix) => Object.entries(obj).map(([k, v]) => `$${prefix}-${k}: ${v}px;`).join('\n');
const out = [
  ...Object.entries(color).map(([k, v]) => `$${k}: ${v};`),
  ...Object.entries(brand).map(([k, v]) => `$brand-${k}: ${v};`),
  `$colors: (\n${Object.keys(color).map((k) => `  ${k}: $${k}`).join(',\n')}\n);`,
  px(space, 'space'),
  px(radius, 'radius'),
  px(touch, 'touch'),
].join('\n');
writeFileSync(new URL('../src/theme/_tokens.scss', import.meta.url), out + '\n');
