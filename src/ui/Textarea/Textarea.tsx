import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './Textarea.module.scss';

type Props = TextInputProps & { label: string; error?: string; hint?: string; rows?: number; required?: boolean };

// Ported from take5 ui/textarea: label above, optional hint, error text replaces the hint.
export function Textarea({ label, error, hint, rows = 4, required, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={classes.field}>
      <Text variant="caption" tone="inkSecondary">{required ? '* ' : ''}{label}</Text>
      <TextInput
        {...rest}
        multiline
        numberOfLines={rows}
        accessibilityLabel={label}
        placeholderTextColor="#47536C"
        style={[classes.input, focused && classes.focused, !!error && classes.invalid]}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
      {hint && !error && <Text variant="caption" tone="inkMuted">{hint}</Text>}
      {error && <Text variant="caption" tone="error" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
