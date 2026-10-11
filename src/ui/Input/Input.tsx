import { useEffect, useRef, useState } from 'react';
import { Animated, TextInput, TextInputProps, View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './Input.module.scss';

type Props = TextInputProps & { label: string; error?: string };

// Text field ported from the take5 design system: label floats up once focused or filled.
export function Input({ label, error, value, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const up = focused || !!value;
  const floated = useRef(new Animated.Value(up ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(floated, { toValue: up ? 1 : 0, duration: 140, useNativeDriver: false }).start();
  }, [up, floated]);

  return (
    <View>
      <View style={[classes.box, focused && classes.focused, !!error && classes.invalid]}>
        <Animated.Text
          pointerEvents="none"
          style={[classes.label, {
            top: floated.interpolate({ inputRange: [0, 1], outputRange: [17, 7] }),
            fontSize: floated.interpolate({ inputRange: [0, 1], outputRange: [16, 13] }),
          }]}
        >
          {label}
        </Animated.Text>
        <TextInput
          {...rest}
          value={value}
          accessibilityLabel={label}
          style={classes.input}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
      </View>
      {error && <Text variant="caption" tone="error" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
