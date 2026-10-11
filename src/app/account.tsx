import { useEffect, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button/Button';
import { LanguagePicker } from '@/components/LanguagePicker/LanguagePicker';
import { Text } from '@/components/Text/Text';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';
import classes from '@/styles/Account.module.scss';

export default function Account() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const [plan, setPlan] = useState<string>();
  const [code, setCode] = useState('');
  const [note, setNote] = useState<{ text: string; ok: boolean }>();

  const loadPlan = () => supabase.rpc('my_entitlements').then(({ data }) => setPlan(data?.plan));
  useEffect(() => { loadPlan(); }, []);

  const redeem = async () => {
    const { error } = await supabase.rpc('redeem_code', { p_code: code });
    setNote(error ? { text: t('account.codeBad'), ok: false } : { text: t('account.codeOk'), ok: true });
    if (!error) { setCode(''); loadPlan(); }
  };

  const remove = () => Alert.alert(t('account.delete'), t('account.deleteConfirm'), [
    { text: t('account.cancel'), style: 'cancel' },
    { text: t('account.delete'), style: 'destructive', onPress: async () => {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) setNote({ text: t('error.generic'), ok: false });
      else await signOut();
    } },
  ]);

  return (
    <SafeAreaView style={classes.screen}>
      <ScrollView contentContainerStyle={classes.content}>
        <Text variant="display" accessibilityRole="header">{t('account.title')}</Text>
        <Text variant="bodyLarge" tone="inkSecondary">{session?.user.email}</Text>
        {plan && <Text variant="body" tone="inkSecondary">{t('account.plan')}: {plan}</Text>}

        <View style={classes.section}><LanguagePicker /></View>

        <Text variant="title" accessibilityRole="header" style={classes.section}>{t('account.code')}</Text>
        <TextInput style={classes.input} value={code} onChangeText={setCode} autoCapitalize="characters"
          placeholder="PIANO-XXXX" placeholderTextColor={color.inkMuted} accessibilityLabel={t('account.code')} />
        <Button secondary onPress={redeem} disabled={!code.trim()}>{t('account.redeem')}</Button>
        {note && <Text variant="body" tone={note.ok ? 'success' : 'error'}>{note.text}</Text>}
      </ScrollView>
      <View style={classes.actions}>
        <Button secondary onPress={remove}>{t('account.delete')}</Button>
        <Button onPress={signOut}>{t('account.logout')}</Button>
      </View>
    </SafeAreaView>
  );
}
