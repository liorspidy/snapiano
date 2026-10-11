import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, DimensionValue } from 'react-native';
import classes from './Skeleton.module.scss';

type Props = { width?: DimensionValue; height?: DimensionValue; radius?: number; circle?: boolean };

// Ported from take5 ui/skeleton. The shimmer sweep becomes a soft pulse, and stays still when the system asks for reduced motion.
export function Skeleton({ width, height = 16, radius = 12, circle = false }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[classes.skeleton, { width, height, opacity: pulse, borderRadius: circle ? 9999 : radius }]}
    />
  );
}
