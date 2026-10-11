import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { Flag } from '../Flags/Flags';
import { Select } from '@/ui/Select/Select';
import { changeLanguage, Lang } from '@/i18n';
import { supabase } from '@/lib/supabase';

export const LANG_KEY = 'snapiano.lang';
// Each language is named in itself so people can always find theirs.
const LANGS = [['he', 'עברית', 'עב'], ['en', 'English', 'EN'], ['fr', 'Français', 'FR'], ['ar', 'العربية', 'عر'], ['ru', 'Русский', 'RU']]
  .map(([value, label, short]) => ({ value, label, short, icon: <Flag code={value} /> }));

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();

  const pick = async (lng: string) => {
    await AsyncStorage.setItem(LANG_KEY, lng);
    if (session) supabase.from('profiles').update({ locale: lng }).eq('id', session.user.id).then(() => {});
    await changeLanguage(lng as Lang);
  };

  return <Select compact label={t('lang.title')} options={LANGS} value={i18n.language} onChange={pick} />;
}
