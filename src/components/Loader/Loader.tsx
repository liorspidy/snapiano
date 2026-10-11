import { ActivityIndicator, View } from 'react-native';
import { color } from '@/theme/tokens';
import classes from './Loader.module.scss';

type Props = { size?: number; accent?: boolean; onAccent?: boolean; label: string };

// onAccent: the spinner sits on the ink primary button, so it turns white to stay visible.
export function Loader({ size = 16, accent = false, onAccent = false, label }: Props) {
  const tint = onAccent ? color.surface : accent ? color.ink : color.ink;
  return (
    <View style={[classes.loader, { width: size, height: size }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size={size} color={tint} />
    </View>
  );
}
