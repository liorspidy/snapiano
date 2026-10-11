import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal as RNModal, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Text } from '../Text/Text';
import { useIsRtl } from '@/hooks/useIsRtl';
import { color } from '@/theme/tokens';
import classes from './Modal.module.scss';

type Props = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  title?: string;
  titleIcon?: string;
  hasCloseBtn?: boolean;
  closeLabel?: string;
  maxWidth?: number;
  mobileCard?: boolean;
};

const ANIMATION_MS = 200;

// Ported from take5 ui/modal: centered dialog, or a bottom sheet with mobileCard. Stays mounted until the exit animation ends.
export function Modal({ open, onClose, children, footer, title, titleIcon, hasCloseBtn = false, closeLabel = '', maxWidth = 632, mobileCard = false }: Props) {
  const rtl = useIsRtl();
  const [mounted, setMounted] = useState(open);
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(shown, { toValue: 1, duration: ANIMATION_MS, useNativeDriver: true }).start();
    } else {
      Animated.timing(shown, { toValue: 0, duration: ANIMATION_MS, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [open, shown]);

  const motion = mobileCard
    ? { transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] }
    : { transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] };

  return (
    <RNModal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={[classes.root, mobileCard && classes.rootSheet, rtl && classes.rtl]}>
        <Animated.View style={[classes.overlay, { opacity: shown }]}>
          <Pressable style={classes.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[classes.dialog, mobileCard ? classes.sheet : classes.dialogCentered, { maxWidth: mobileCard ? undefined : maxWidth, opacity: shown }, motion]}
        >
          {(title || hasCloseBtn) && (
            <View style={classes.header}>
              {title && (
                <View style={classes.titleRow}>
                  {titleIcon && <Image source={{ uri: titleIcon }} style={classes.titleIcon} accessibilityIgnoresInvertColors />}
                  <Text variant={mobileCard ? 'title' : 'bodyLarge'} accessibilityRole="header">{title}</Text>
                </View>
              )}
              {hasCloseBtn && (
                <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={({ pressed }) => [classes.close, pressed && classes.pressed]}>
                  <X color={color.inkSecondary} size={20} />
                </Pressable>
              )}
            </View>
          )}
          <ScrollView style={classes.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer && <View style={classes.footer}>{footer}</View>}
        </Animated.View>
      </View>
    </RNModal>
  );
}
