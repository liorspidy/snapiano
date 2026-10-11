import { useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '../Text/Text';
import { initials } from '@/lib/format';
import classes from './Avatar.module.scss';

type Props = { name: string; src?: string | null; size?: number };

// Ported from take5 ui/avatar: photo when it loads, initials otherwise.
export function Avatar({ name, src, size = 48 }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[classes.avatar, { width: size, height: size, borderRadius: size / 2 }]} accessible accessibilityLabel={name} accessibilityRole="image">
      {src && !failed
        ? <Image source={{ uri: src }} style={classes.image} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
        : <Text style={[classes.initials, { fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }]}>{initials(name)}</Text>}
    </View>
  );
}
