import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { color } from '@/theme/tokens';
import classes from './Loader.module.scss';

type Props = { size?: number; onAccent?: boolean; label: string };

const SPIN_MS = 1500;
const PHASE_DEG = 55;

function Note({ size, tint }: { size: number; tint: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx="8" cy="18" rx="4.6" ry="3.4" fill={tint} transform="rotate(-20 8 18)" />
      <Rect x="11.6" y="3.5" width="1.9" height="14.6" fill={tint} />
      <Path d="M13.5 3.5C16.4 5.4 19.4 6.8 19.4 11.4C17.6 9.4 15.8 8.8 13.5 8.8Z" fill={tint} />
    </Svg>
  );
}

// Musical notes spinning in 3D (turning around their vertical axis). Small sizes show one note, larger ones three
// with staggered phases. It holds still when the system asks for reduced motion. onAccent: white, for the ink button.
export function Loader({ size = 16, onAccent = false, label }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);
  const tint = onAccent ? color.surface : color.ink;
  const count = size >= 40 ? 3 : 1;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { setStill(true); return; }
      loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SPIN_MS, easing: (t) => t, useNativeDriver: true }));
      loop.start();
    });
    return () => loop?.stop();
  }, [spin]);

  const noteSize = count === 1 ? size : size * 0.62;
  return (
    <View style={classes.loader} accessibilityRole="progressbar" accessibilityLabel={label} accessible>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            transform: [
              { perspective: 300 },
              { rotateY: still ? '25deg' : spin.interpolate({ inputRange: [0, 1], outputRange: [`${i * PHASE_DEG}deg`, `${360 + i * PHASE_DEG}deg`] }) },
            ],
          }}
        >
          <Note size={noteSize} tint={tint} />
        </Animated.View>
      ))}
    </View>
  );
}
