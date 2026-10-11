import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './VerticalSlider.module.scss';

type Props = { label: string; value: number; onChange: (v: number) => void; height?: number };

const THUMB = 28;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// Mixer-style fader, 0 (bottom) to 1 (top). Drag anywhere on the track; TalkBack uses increase/decrease.
// ponytail: JS-only PanResponder (no native slider dependency, so no rebuild).
export function VerticalSlider({ label, value, onChange, height = 220 }: Props) {
  const [laidOut, setLaidOut] = useState(height);
  const track = useRef({ height });
  track.current.height = laidOut;
  const change = useRef(onChange);
  change.current = onChange;

  // Position comes from the touch-down point plus the finger's travel (dy), not from locationY, which jumps once the finger leaves the track.
  const start = useRef(0);
  const range = () => Math.max(1, track.current.height - THUMB);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        start.current = clamp(1 - (e.nativeEvent.locationY - THUMB / 2) / range());
        change.current(start.current);
      },
      onPanResponderMove: (_, g) => change.current(clamp(start.current - g.dy / range())),
    }),
  ).current;

  const percent = Math.round(value * 100);
  return (
    <View style={classes.column}>
      <Text variant="label">{label}</Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)))}
        style={[classes.touch, { height }]}
        onLayout={(e) => setLaidOut(e.nativeEvent.layout.height)}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={classes.rail} />
        <View pointerEvents="none" style={[classes.fill, { height: value * (laidOut - THUMB) + THUMB / 2 }]} />
        <View pointerEvents="none" style={[classes.thumb, { bottom: value * (laidOut - THUMB) }]} />
      </View>
      <Text variant="caption" tone="inkSecondary" style={classes.value}>{percent}</Text>
    </View>
  );
}
