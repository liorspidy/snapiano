import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.module.scss') ? [p] : [];
});

for (const file of walk('src')) {
  const css = sass.compile(file).css;
  const names = [...new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]))];
  const body = names.map((n) => `  readonly '${n}': Style;`).join('\n');
  writeFileSync(`${file}.d.ts`, `import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';\ntype Style = ViewStyle & TextStyle & ImageStyle;\ndeclare const classes: {\n${body}\n};\nexport default classes;\n`);
}
