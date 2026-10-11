import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button/Button';
import { GoogleIcon } from '@/components/GoogleIcon/GoogleIcon';
import { Input } from '@/components/Input/Input';
import { LanguagePicker } from '@/components/LanguagePicker/LanguagePicker';
import { Logo } from '@/components/Logo/Logo';
import { Text } from '@/components/Text/Text';
import { Wordmark } from '@/components/Wordmark/Wordmark';
import classes from '@/styles/Login.module.scss';

export default function Login() {
  const { t } = useTranslation();
  const { signInWithGoogle, sendLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();

  const run = async (fn: () => Promise<void>) => {
    setError(undefined);
    try { await fn(); } catch { setError(t('error.generic')); }
  };
  const send = () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError(t('auth.invalidEmail'));
    run(async () => { await sendLink(address); setSentTo(address); });
  };

  return (
    <SafeAreaView style={classes.screen}>
      <ScrollView contentContainerStyle={classes.scroll} keyboardShouldPersistTaps="handled">
        <View style={classes.language}><LanguagePicker /></View>
        <View style={classes.card}>
          <View style={classes.brand}>
            <Logo size={88} />
            <Wordmark height={44} label={t('app.name')} />
            <Text variant="body" tone="inkSecondary" style={classes.tagline}>{t('app.tagline')}</Text>
          </View>
          <Button secondary onPress={() => run(signInWithGoogle)}>
            <GoogleIcon size={20} />
            <Text variant="label">{t('auth.google')}</Text>
          </Button>
          <View style={classes.divider}>
            <View style={classes.dividerLine} />
            <Text variant="caption" tone="inkMuted">{t('auth.or')}</Text>
            <View style={classes.dividerLine} />
          </View>
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={error && !sentTo ? error : undefined}
          />
          {sentTo && <Text variant="body" tone="success" style={classes.message}>{t('auth.linkSent', { email: sentTo })}</Text>}
        </View>
        <View style={classes.bottom}>
          <Text variant="caption" tone="inkMuted" style={classes.terms}>{t('auth.terms')}</Text>
          <Button onPress={send}>{t('auth.sendLink')}</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
