import { useEffect, useState } from 'react';
import { Easing, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/js-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Rubik_400Regular, Rubik_500Medium, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANG_KEY } from '@/components/LanguagePicker/LanguagePicker';
import { useBlurOnOutsidePress } from '@/hooks/useBlurOnOutsidePress';
import { initI18n, isRTL, Lang } from '@/i18n';
import classes from '@/styles/Layout.module.scss';

// The native stack ignores durations on Android, so screens use the JavaScript stack to get an exact 200 ms slide.
const SLIDE = { animation: 'timing', config: { duration: 200, easing: Easing.out(Easing.cubic) } } as const;

function Routes() {
  const { session, loading } = useAuth();
  const { i18n } = useTranslation();
  const blurOnOutsidePress = useBlurOnOutsidePress();
  if (loading) return null;
  return (
    <View style={[classes.root, isRTL(i18n.language as Lang) ? classes.rtl : classes.ltr]} {...blurOnOutsidePress}>
    <Stack screenOptions={{ headerShown: false, cardStyle: classes.screen, animation: 'slide_from_right', transitionSpec: { open: SLIDE, close: SLIDE } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="process" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsReady] = useFonts({ Rubik_400Regular, Rubik_500Medium, Rubik_700Bold });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => initI18n((saved as Lang) ?? undefined)).then(() => setI18nReady(true));
  }, []);

  if (!fontsReady || !i18nReady) return null;
  return (
    <>
      <StatusBar style="dark" />
      <AuthProvider><Routes /></AuthProvider>
    </>
  );
}
