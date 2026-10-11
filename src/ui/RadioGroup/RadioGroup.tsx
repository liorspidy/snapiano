import { Pressable, View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './RadioGroup.module.scss';

type Option = { label: string; value: string };
type Props = { label?: string; options: Option[]; value?: string; onChange?: (value: string) => void; error?: string };

// Ported from take5 ui/radioGroup: options as selectable chips. Selected = filled; the radio state is also announced, not only coloured.
export function RadioGroup({ label, options, value, onChange, error }: Props) {
  return (
    <View style={classes.field}>
      {label && <Text variant="caption" tone="inkSecondary">{label}</Text>}
      <View style={classes.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange?.(o.value)}
              style={({ pressed }) => [classes.option, error && classes.optionError, on && classes.optionOn, on && error && classes.optionOnError, pressed && classes.pressed]}
            >
              <Text variant="label" style={on ? classes.labelOn : undefined}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text variant="caption" tone="error" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
