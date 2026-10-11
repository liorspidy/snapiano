import { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './FormSection.module.scss';

type Props = { title: string; hint?: string; children: ReactNode };

// Ported from take5 ui/formSection. take5's responsive grid becomes one column on a phone.
export function FormSection({ title, hint, children }: Props) {
  return (
    <View style={classes.section}>
      <View style={classes.header}>
        <Text variant="bodyLarge" accessibilityRole="header">{title}</Text>
        {hint && <Text variant="caption" tone="inkSecondary">{hint}</Text>}
      </View>
      <View style={classes.fields}>{children}</View>
    </View>
  );
}
