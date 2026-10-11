import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../Text/Text';
import classes from './Tabs.module.scss';

type Tab<T extends string> = { id: T; title: string; count?: number };
type Props<T extends string> = { tabs: Tab<T>[]; active: T; onChange: (id: T) => void; accessibilityLabel?: string; underline?: boolean };

// Ported from take5 ui/tabs: chip tabs by default, `underline` for the underlined style. Scrolls sideways when tabs do not fit.
export function Tabs<T extends string>({ tabs, active, onChange, accessibilityLabel, underline = false }: Props<T>) {
  return (
    <ScrollView horizontal style={classes.scroll} showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}
      contentContainerStyle={[classes.tabs, underline && classes.underlineTabs]}>
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [classes.tab, underline && classes.underlineTab, on && (underline ? classes.underlineTabOn : classes.tabOn), pressed && classes.pressed]}
          >
            <Text variant="label" style={[classes.label, on && (underline ? classes.underlineLabelOn : classes.labelOn)]}>{tab.title}</Text>
            {typeof tab.count === 'number' && (
              <View style={[classes.count, on && !underline && classes.countOn]}>
                <Text variant="caption" style={on && !underline ? classes.countTextOn : classes.countText}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
