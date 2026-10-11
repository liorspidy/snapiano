import { ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Loader } from '../Loader/Loader';
import { Text } from '../Text/Text';
import classes from './Button.module.scss';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
  primary?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  isPending?: boolean;
  size?: 'L' | 'S';
  sizeFormat?: 'full' | 'fitContent';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  expanded?: boolean;
  pending?: string;
  iconOnly?: boolean;
};

// Ported from take5 ui/button. Heights follow this app's touch rules (48 / 56) instead of take5's 46 / 40.
export function Button({
  children, onPress, primary = true, secondary = false, destructive = false, disabled = false, isPending = false,
  size = 'L', sizeFormat = 'full', style, accessibilityLabel, expanded, pending = '', iconOnly = false,
}: Props) {
  if (iconOnly) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded }}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [classes.icon, pressed && classes.pressed, disabled && classes.disabled, style]}
      >
        {children}
      </Pressable>
    );
  }

  const isPrimary = primary && !secondary && !destructive;
  const labelStyle = isPrimary ? [classes.labelPrimary, disabled && classes.labelPrimaryDisabled] : destructive ? classes.labelDestructive : classes.labelSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || isPending, busy: isPending, expanded }}
      onPress={onPress}
      disabled={disabled || isPending}
      style={({ pressed }) => [
        classes.button,
        isPrimary && classes.primary,
        isPrimary && disabled && classes.primaryDisabled,
        secondary && classes.secondary,
        destructive && classes.destructive,
        size === 'S' && classes.small,
        sizeFormat === 'fitContent' && classes.fitContent,
        disabled && classes.disabled,
        pressed && !disabled && classes.pressed,
        style,
      ]}
    >
      <View style={[classes.content, isPending && classes.contentHidden]}>
        {typeof children === 'string'
          ? <Text variant={size === 'S' ? 'caption' : 'label'} style={labelStyle}>{children}</Text>
          : children}
      </View>
      {isPending && <View style={classes.spinner}><Loader size={18} onAccent={isPrimary} label={pending} /></View>}
    </Pressable>
  );
}
