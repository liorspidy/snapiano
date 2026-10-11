import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useIsRtl } from '@/hooks/useIsRtl';
import { color } from '@/theme/tokens';
import classes from './BackButton.module.scss';

// Goes back one screen. Sits at the end of the line and points toward the end (right in English, left in Hebrew and Arabic).
export function BackButton() {
  const { t } = useTranslation();
  const rtl = useIsRtl();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [classes.button, pressed && classes.pressed]}
    >
      <Arrow color={color.ink} size={24} />
    </Pressable>
  );
}
