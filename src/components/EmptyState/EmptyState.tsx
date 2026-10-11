import { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './EmptyState.module.scss';

type Props = { title: string; description?: string; action?: ReactNode; icon?: ReactNode; illustration?: ReactNode };

// Ported from take5 ui/emptyState (without its floating animation).
export function EmptyState({ title, description, action, icon, illustration }: Props) {
  return (
    <View style={classes.wrap}>
      {illustration && <View style={classes.illustration}>{illustration}</View>}
      {icon && <View style={classes.icon}>{icon}</View>}
      <Text variant="bodyLarge" accessibilityRole="header" style={classes.title}>{title}</Text>
      {description && <Text variant="body" tone="inkSecondary" style={classes.description}>{description}</Text>}
      {action && <View style={classes.action}>{action}</View>}
    </View>
  );
}
