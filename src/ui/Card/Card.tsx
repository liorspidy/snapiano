import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import classes from './Card.module.scss';

type Props = { children: ReactNode; interactive?: boolean; onPress?: () => void; accessibilityLabel?: string };

// Ported from take5 ui/card. Pressable (a button) when interactive or given onPress.
export function Card({ children, interactive = false, onPress, accessibilityLabel }: Props) {
  if (interactive || onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [classes.card, classes.interactive, pressed && classes.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={classes.card} accessibilityLabel={accessibilityLabel}>{children}</View>;
}
