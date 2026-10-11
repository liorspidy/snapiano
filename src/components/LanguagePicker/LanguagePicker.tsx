import { useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { Flag } from '../Flags/Flags';
import { Select } from '../Select/Select';
import { Text } from '../Text/Text';
import { changeLanguage, Lang } from '@/i18n';
import { supabase } from '@/lib/supabase';

export const LANG_KEY = 'snapiano.lang';
// Each language is named in itself so people can always find theirs.
const LANGS = [['he', 'עברית', 'עב'], ['en', 'English', 'EN'], ['fr', 'Français', 'FR'], ['ar', 'العربية', 'عر'], ['ru', 'Русский', 'RU']]
  .map(([value, label, short]) => ({ value, label, short, icon: <Flag code={value} /> }));

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const [note, setNote] = useState<string>();

  const pick = async (lng: string) => {
    await AsyncStorage.setItem(LANG_KEY, lng);
    if (session) supabase.from('profiles').update({ locale: lng }).eq('id', session.user.id).then(() => {});
    if (await changeLanguage(lng as Lang)) {
      try { await Updates.reloadAsync(); } catch { setNote(t('lang.restart')); }
    }
  };

  return (
    <View>
      <Select compact label={t('lang.title')} options={LANGS} value={i18n.language} onChange={pick} />
      {note && <Text variant="body" tone="inkSecondary">{note}</Text>}
    </View>
  );
}
