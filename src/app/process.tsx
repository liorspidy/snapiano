import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button/Button';
import { Text } from '@/components/Text/Text';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';
import classes from '@/styles/Process.module.scss';

type Scan = { status: 'queued' | 'processing' | 'done' | 'failed'; measures: number | null; flagged_measures: number[] | null; piece_id: string | null };

export default function Process() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan>();

  // ponytail: polls every 3s; switch to Supabase realtime if the worker takes long enough to matter.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const { data } = await supabase.from('scans').select('status, measures, flagged_measures, piece_id').eq('id', id).single();
      if (stop) return;
      if (data) setScan(data as Scan);
      if (!data || data.status === 'queued' || data.status === 'processing') setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [id]);

  const working = !scan || scan.status === 'queued' || scan.status === 'processing';
  const flagged = scan?.flagged_measures?.length ?? 0;

  return (
    <SafeAreaView style={classes.screen}>
      <View style={classes.body}>
        {working && <ActivityIndicator size="large" color={color.ink} />}
        <Text variant="headline" accessibilityRole="header" style={classes.centered}>
          {working ? t('process.title') : scan.status === 'done' ? t('review.found', { count: scan.measures ?? 0 }) : t('process.failed')}
        </Text>
        {working && <Text variant="body" tone="inkSecondary" style={classes.centered}>{t('process.read')}</Text>}
        {scan?.status === 'done' && (
          <Text variant="bodyLarge" tone="inkSecondary" style={classes.centered}>
            {flagged ? t('review.toCheck', { count: flagged }) : t('review.ready')}
          </Text>
        )}
      </View>
      {!working && (
        <View style={classes.actions}>
          {scan.status === 'done' && scan.piece_id
            ? <Button onPress={() => router.replace({ pathname: '/practice', params: { id: scan.piece_id! } })}>{t('review.startPractice')}</Button>
            : <Button onPress={() => router.replace('/')}>{t('process.back')}</Button>}
        </View>
      )}
    </SafeAreaView>
  );
}
