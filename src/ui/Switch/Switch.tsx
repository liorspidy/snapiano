import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useIsRtl } from '@/hooks/useIsRtl';
import classes from './Switch.module.scss';

type Props = { checked: boolean; onChange: (checked: boolean) => void; accessibilityLabel: string; disabled?: boolean };

// Ported from take5 ui/switch. The thumb slides toward the end edge in both reading directions.
export function Switch({ checked, onChange, accessibilityLabel, disabled }: Props) {
  const slide = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: checked ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [checked, slide]);
  const distance = useIsRtl() ? -18 : 18;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={{ top: 11, bottom: 11, left: 2, right: 2 }}
      onPress={() => onChange(!checked)}
      style={[classes.track, checked && classes.trackOn, disabled && classes.disabled]}
    >
      <Animated.View style={[classes.thumb, { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, distance] }) }] }]} />
    </Pressable>
  );
}
