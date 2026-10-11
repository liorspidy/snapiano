import { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/ui/Button/Button';
import { Text } from '@/ui/Text/Text';
import { uploadAndStart } from '@/lib/scans';
import { pickImage } from '@/lib/pickImage';
import classes from '@/styles/Scan.module.scss';

export default function Scan() {
  const { t } = useTranslation();
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const [photo, setPhoto] = useState<string | undefined>(uri);
  const [permission, requestPermission] = useCameraPermissions();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);

  const capture = async () => {
    const shot = await camera.current?.takePictureAsync({ quality: 1 });
    if (shot) setPhoto(shot.uri);
  };
  const upload = async () => {
    const picked = await pickImage();
    if (picked) setPhoto(picked);
  };

  const use = async () => {
    if (!photo || !session || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await uploadAndStart(photo, session.user.id);
      if (res.scanId) return router.replace({ pathname: '/process', params: { id: res.scanId } });
      setError(t(res.error === 'scan_quota_exceeded' ? 'error.quota' : res.error === 'piece_limit_reached' ? 'error.pieceLimit' : 'error.generic'));
    } catch {
      setError(t('error.generic'));
    }
    setBusy(false);
  };

  if (photo) {
    return (
      <SafeAreaView style={classes.screen}>
        <Image source={{ uri: photo }} style={classes.view} resizeMode="contain" accessibilityIgnoresInvertColors />
        {error && <Text variant="body" tone="error">{error}</Text>}
        <View style={classes.actions}>
          <Button secondary onPress={() => setPhoto(undefined)}>{t('scan.retake')}</Button>
          <Button onPress={use} disabled={busy}>{t('scan.use')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={classes.screen}>
        <View style={[classes.view, classes.center]}>
          <Text variant="bodyLarge" tone="inkSecondary" style={classes.centered}>{t('scan.needCamera')}</Text>
        </View>
        <View style={classes.actions}>
          <Button secondary onPress={upload}>{t('scan.upload')}</Button>
          <Button onPress={requestPermission}>{t('scan.allow')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={classes.screen}>
      <CameraView ref={camera} style={classes.view} facing="back" onCameraReady={() => setReady(true)} />
      <Text variant="body" tone="inkSecondary" style={classes.centered}>{t('scan.frameHint')}</Text>
      <View style={classes.actions}>
        <Button secondary onPress={upload}>{t('scan.upload')}</Button>
        <Button onPress={capture} disabled={!ready}>{t('scan.capture')}</Button>
      </View>
    </SafeAreaView>
  );
}
