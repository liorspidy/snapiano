import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../Text/Text';
import { color, handColor } from '@/theme/tokens';
import classes from './Keyboard.module.scss';

const BLACK = [1, 3, 6, 8, 10];
const SOLFEGE = ['דו', 'דו#', 'רה', 'רה#', 'מי', 'פה', 'פה#', 'סול', 'סול#', 'לה', 'לה#', 'סי'];
const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const noteName = (midi: number, lang: string) => (lang === 'he' ? SOLFEGE : LETTERS)[midi % 12];

/** Horizontal centre of a key as a percentage of the keyboard width, and its width in %. */
export function keyBox(midi: number, low: number, high: number) {
  let whites = 0, below = 0;
  for (let m = low; m <= high; m++) if (!BLACK.includes(m % 12)) { whites++; if (m < midi) below++; }
  const w = 100 / whites;
  return BLACK.includes(midi % 12) ? { x: below * w, w: w * 0.6 } : { x: below * w + w / 2, w };
}

/** lit: midi -> hand. Always left-to-right, low notes on the left, even in RTL. */
export function Keyboard({ low, high, lit }: { low: number; high: number; lit: Map<number, 'R' | 'L'> }) {
  const { i18n } = useTranslation();
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!BLACK.includes(m % 12)) whites.push(m);
  const w = 100 / whites.length;
  const keyColor = (m: number, base: string) => (lit.has(m) ? handColor(lit.get(m)!) : base);

  return (
    <View style={classes.row}>
      {whites.map((m) => (
        <View key={m} accessible accessibilityLabel={lit.has(m) ? noteName(m, i18n.language) : undefined}
          style={[classes.white, { width: `${w}%`, backgroundColor: keyColor(m, color.surface) }]}>
          {lit.has(m) && <Text variant="caption" style={lit.get(m) === 'R' ? classes.labelRight : classes.labelLeft}>{noteName(m, i18n.language)}</Text>}
        </View>
      ))}
      {whites.map((m, i) => {
        const b = m + 1;
        if (!BLACK.includes(b % 12) || b > high) return null;
        return <View key={`b${b}`} style={[classes.black, { left: `${(i + 1) * w - w * 0.3}%`, width: `${w * 0.6}%`, backgroundColor: keyColor(b, color.ink) }]} />;
      })}
    </View>
  );
}
