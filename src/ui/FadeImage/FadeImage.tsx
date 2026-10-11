import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Skeleton } from '../Skeleton/Skeleton';
import classes from './FadeImage.module.scss';

type Props = { src?: string | null; alt?: string; radius?: number };

// Ported from take5 ui/fadeImage: a skeleton until the image has loaded, then it fades in.
export function FadeImage({ src, alt = '', radius }: Props) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { setLoaded(false); opacity.setValue(0); }, [src, opacity]);
  useEffect(() => {
    if (loaded) Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [loaded, opacity]);

  if (!src) return null;
  return (
    <View style={classes.wrap}>
      {!loaded && <View style={classes.skeleton}><Skeleton width="100%" height="100%" radius={radius} /></View>}
      <Animated.Image
        source={{ uri: src }}
        accessibilityLabel={alt}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        style={[classes.image, { opacity }]}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </View>
  );
}
