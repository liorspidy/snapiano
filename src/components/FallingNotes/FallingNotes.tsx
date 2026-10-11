import { View } from 'react-native';
import { keyBox } from '../Keyboard/Keyboard';
import type { Mark } from '@/lib/piece';
import { color, handColor } from '@/theme/tokens';
import classes from './FallingNotes.module.scss';

const AHEAD = 4; // quarter notes visible above the hit line

/** Notes slide down to the hit line at the bottom, in the same columns as the keys below. Always left-to-right. */
export function FallingNotes({ notes, pos, low, high }: { notes: Mark[]; pos: number; low: number; high: number }) {
  const coming = notes.filter((n) => n.s + n.d > pos && n.s < pos + AHEAD);
  return (
    <View style={classes.box}>
      {coming.map((n, i) => {
        const { x, w } = keyBox(n.m, low, high);
        const bottom = Math.max(0, ((n.s - pos) / AHEAD) * 100); // % from the hit line
        const top = Math.min(100, ((n.s + n.d - pos) / AHEAD) * 100);
        return (
          <View key={i} style={[classes.note, {
            left: `${x - w / 2}%`, width: `${w}%`, bottom: `${bottom}%`, height: `${top - bottom}%`,
            backgroundColor: handColor(n.h),
          }]} />
        );
      })}
      <View style={classes.hit} />
    </View>
  );
}
