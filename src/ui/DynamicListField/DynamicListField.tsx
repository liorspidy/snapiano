import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Text } from '../Text/Text';
import { color } from '@/theme/tokens';
import classes from './DynamicListField.module.scss';

type Props = {
  label: string;
  addLabel: string;
  removeLabel: string;
  count: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (index: number) => ReactNode;
};

// Ported from take5 ui/dynamicListField, without react-hook-form: the caller owns the list and passes count/add/remove.
export function DynamicListField({ label, addLabel, removeLabel, count, onAdd, onRemove, renderItem }: Props) {
  return (
    <View style={classes.wrap}>
      <Text variant="caption" tone="inkSecondary">{label}</Text>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={classes.row}>
          <View style={classes.rowContent}>{renderItem(i)}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} onPress={() => onRemove(i)} style={({ pressed }) => [classes.remove, pressed && classes.pressed]}>
            <X color={color.inkSecondary} size={16} />
          </Pressable>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [classes.add, pressed && classes.pressed]}>
        <Plus color={color.ink} size={16} />
        <Text variant="label">{addLabel}</Text>
      </Pressable>
    </View>
  );
}
