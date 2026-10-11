import { Image, Modal, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useIsRtl } from '@/hooks/useIsRtl';
import { color } from '@/theme/tokens';
import classes from './ImageLightbox.module.scss';

type Props = { src: string; alt: string; closeLabel: string; onClose: () => void };

// Ported from take5 ui/imageLightbox: full-screen image on a dark backdrop; tap anywhere or the close button to leave.
export function ImageLightbox({ src, alt, closeLabel, onClose }: Props) {
  const rtl = useIsRtl();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[classes.backdrop, rtl && classes.rtl]} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel}>
        <Image source={{ uri: src }} accessibilityLabel={alt} accessibilityIgnoresInvertColors resizeMode="contain" style={classes.image} />
        <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={classes.close}>
          <X color={color.surface} size={20} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
