import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { Text } from '../Text/Text';
import { placeMenu } from '@/lib/placeMenu';
import { color, touch } from '@/theme/tokens';
import classes from './Select.module.scss';

export type Option = { value: string; label: string; short?: string; icon?: ReactNode };
type Props = {
  label: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  compact?: boolean;
};

const GAP = 6;
const MENU_MAX = 264;
const MENU_MIN_COMPACT = 132;

// Dropdown ported from the take5 design system. compact: no visible label, no chevron, short values.
export function Select({ label, options, value, onChange, error, compact = false }: Props) {
  const trigger = useRef<View>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number }>();
  const open = !!box;
  const selected = options.find((o) => o.value === value);
  const floated = useRef(new Animated.Value(selected || open ? 1 : 0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const text = (o: Option) => (compact ? o.short ?? o.label : o.label);

  useEffect(() => {
    Animated.timing(floated, { toValue: selected || open ? 1 : 0, duration: 140, useNativeDriver: false }).start();
    Animated.timing(spin, { toValue: open ? 1 : 0, duration: 140, useNativeDriver: true }).start();
  }, [selected, open, floated, spin]);

  const show = () => trigger.current?.measureInWindow((x, y, w, h) => setBox({ x, y, w, h }));
  const close = () => setBox(undefined);
  const choose = (v: string) => { close(); onChange(v); };

  const screen = Dimensions.get('window');
  const menuSize = { width: box ? Math.max(box.w, compact ? MENU_MIN_COMPACT : 0) : 0, height: Math.min(MENU_MAX, options.length * touch.min + 12) };
  const place = box && placeMenu({ top: box.y, bottom: box.y + box.h, left: box.x, right: box.x + box.w }, menuSize, screen, { align: 'start', gap: GAP });

  return (
    <View>
      <Pressable
        ref={trigger}
        onPress={open ? close : show}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label }}
        accessibilityState={{ expanded: open }}
        style={[classes.trigger, compact && classes.compactTrigger, open && classes.open, !!error && classes.invalid]}
      >
        {!compact && (
          <Animated.Text
            style={[classes.label, {
              top: floated.interpolate({ inputRange: [0, 1], outputRange: [17, 7] }),
              fontSize: floated.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
            }]}
          >
            {label}
          </Animated.Text>
        )}
        <View style={classes.valueRow}>
          {selected?.icon}
          <Text variant={compact ? 'label' : 'bodyLarge'} numberOfLines={1} style={classes.value}>{selected ? text(selected) : ' '}</Text>
        </View>
        {!compact && (
          <Animated.View style={[classes.chevron, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
            <ChevronDown color={color.inkSecondary} size={20} />
          </Animated.View>
        )}
      </Pressable>
      {error && <Text variant="caption" tone="error" accessibilityRole="alert">{error}</Text>}

      <Modal transparent visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={classes.backdrop} onPress={close} accessibilityLabel={label} accessibilityRole="button" />
        {place && (
          <View
            accessibilityRole="menu"
            style={[classes.menu, { left: place.left, width: menuSize.width }, place.below ? { top: place.top } : { bottom: place.bottom }]}
          >
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="menuitem"
                  accessibilityLabel={o.label}
                  accessibilityState={{ selected: on }}
                  onPress={() => choose(o.value)}
                  style={({ pressed }) => [classes.option, (on || pressed) && classes.optionOn]}
                >
                  {o.icon}
                  <Text variant="bodyLarge" style={[classes.optionText, on && classes.optionTextOn]}>{text(o)}</Text>
                  {on && <Check color={color.ink} size={20} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
    </View>
  );
}
