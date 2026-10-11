import { useCallback, useState } from 'react';
import { FlatList, InteractionManager, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button/Button';
import { Text } from '@/ui/Text/Text';
import { pickImage } from '@/lib/pickImage';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';
import classes from '@/styles/Library.module.scss';

type Piece = { id: string; title: string; composer: string; progress_measure: number };

export default function Library() {
  const { t } = useTranslation();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [scansLeft, setScansLeft] = useState<number | null>(null); // null = unlimited or unknown

  // Load after the screen transition has finished, so the slide animation never competes with the data update.
  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      supabase.from('pieces').select('id, title, composer, progress_measure').order('updated_at', { ascending: false })
        .then(({ data }) => setPieces(data ?? []));
      supabase.rpc('my_entitlements').then(({ data }) => {
        if (data?.scans_per_month != null) setScansLeft(Math.max(0, data.scans_per_month - data.scans_used));
      });
    });
    return () => task.cancel();
  }, []));

  return (
    <SafeAreaView style={classes.screen}>
      <View style={classes.header}>
        <View style={classes.titleRow}>
          <Text variant="display" accessibilityRole="header" style={classes.grow}>{t('library.title')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('account.title')} onPress={() => router.push('/account')} style={({ pressed }) => [classes.account, pressed && classes.pressed]}>
            <UserRound color={color.ink} size={24} />
          </Pressable>
        </View>
        {scansLeft !== null && <Text variant="caption" tone="inkMuted">{t('library.scansLeft', { count: scansLeft })}</Text>}
      </View>
      <FlatList
        style={classes.grow}
        data={pieces}
        keyExtractor={(p) => p.id}
        contentContainerStyle={pieces.length ? classes.list : classes.empty}
        ListEmptyComponent={
          <Text variant="bodyLarge" tone="inkSecondary" style={classes.centered}>{t('library.empty')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" style={({ pressed }) => [classes.row, pressed && classes.pressed]} onPress={() => router.push({ pathname: '/practice', params: { id: item.id } })}>
            <Text variant="bodyLarge">{item.title || t('app.name')}</Text>
            <Text variant="caption" tone="inkMuted">
              {item.progress_measure ? t('review.measure', { n: item.progress_measure }) : t('library.notStarted')}
            </Text>
          </Pressable>
        )}
      />
      <View style={classes.actions}>
        <Button secondary onPress={async () => {
          const uri = await pickImage();
          if (uri) router.push({ pathname: '/scan', params: { uri } });
        }}>{t('library.upload')}</Button>
        <Button onPress={() => router.push('/scan')}>{t('library.scan')}</Button>
      </View>
    </SafeAreaView>
  );
}
