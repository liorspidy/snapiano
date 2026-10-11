import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Rubik_400Regular, Rubik_500Medium, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANG_KEY } from '@/components/LanguagePicker/LanguagePicker';
import { initI18n, Lang } from '@/i18n';
import classes from '@/styles/Layout.module.scss';

function Routes() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: classes.screen }}>
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
