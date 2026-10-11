import { Text } from '../Text/Text';
import { View } from 'react-native';
import classes from './Badge.module.scss';

export type BadgeStatus = 'queued' | 'processing' | 'done' | 'failed' | 'warning';
type Props = { status: BadgeStatus; label: string; size?: 'small' | 'default' };

// Ported from take5 ui/badge. Statuses are this app's (scan states + warning); colour never carries the meaning alone: the label does.
export function Badge({ status, label, size = 'default' }: Props) {
  return (
    <View style={[classes.badge, classes[status], size === 'small' && classes.small]}>
      <Text variant="caption" style={classes[`${status}Text`]}>{label}</Text>
    </View>
  );
}
