import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text/Text';
import { color } from '@/theme/tokens';
import classes from './PasswordChecklist.module.scss';

// Live password rules (from take5). Each rule shows an icon and a word, so colour is never the only signal.
const RULES = [
  { key: 'len', test: (p: string) => p.length >= 8 },
  { key: 'upper', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', test: (p: string) => /[a-z]/.test(p) },
  { key: 'num', test: (p: string) => /\d/.test(p) },
  { key: 'sym', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function PasswordChecklist({ value }: { value: string }) {
  const { t } = useTranslation();
  const passed = RULES.filter((r) => r.test(value)).length;
  const level = passed <= 2 ? 'weak' : passed < RULES.length ? 'medium' : 'strong';

  return (
    <View style={classes.root}>
      <View style={classes.bar}>
        <View style={[classes.fill, classes[level], { width: `${(passed / RULES.length) * 100}%` }]} />
      </View>
      <Text variant="caption" tone="inkSecondary">{t('auth.pw.title')}</Text>
      {RULES.map((r) => {
        const ok = r.test(value);
        return (
          <View key={r.key} style={classes.rule} accessible accessibilityLabel={`${t(`auth.pw.${r.key}`)}: ${t(ok ? 'auth.pw.met' : 'auth.pw.missing')}`}>
            {ok ? <Check color={color.success} size={16} /> : <X color={color.inkMuted} size={16} />}
            <Text variant="caption" style={ok ? classes.ok : classes.missing}>{t(`auth.pw.${r.key}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}
