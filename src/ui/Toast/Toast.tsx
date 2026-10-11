import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Text/Text';
import classes from './Toast.module.scss';

type Variant = 'default' | 'success';
type ToastItem = { id: number; message: string; variant: Variant };

const AUTO_DISMISS_MS = 3000;
const EXIT_MS = 180;
const Ctx = createContext<(message: string, variant?: Variant) => void>(() => {});
export const useToast = () => useContext(Ctx);

function ToastRow({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(toast.message);
    Animated.timing(shown, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const leave = setTimeout(() => {
      Animated.timing(shown, { toValue: 0, duration: EXIT_MS, useNativeDriver: true }).start(() => onDone(toast.id));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(leave);
  }, [toast, shown, onDone]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[classes.toast, { opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}
    >
      <View style={[classes.dot, toast.variant === 'success' && classes.dotSuccess]} />
      <Text variant="label" style={classes.message}>{toast.message}</Text>
    </Animated.View>
  );
}

// Ported from take5 ui/toast: wrap the app once, then call useToast()(message). Text is already translated by the caller.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const insets = useSafeAreaInsets();
  const show = useCallback((message: string, variant: Variant = 'default') => {
    setToasts((all) => [...all, { id: next.current++, message, variant }]);
  }, []);
  const done = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {toasts.length > 0 && (
        <View pointerEvents="none" style={[classes.viewport, { bottom: insets.bottom + 16 }]}>
          {toasts.map((t) => <ToastRow key={t.id} toast={t} onDone={done} />)}
        </View>
      )}
    </Ctx.Provider>
  );
}
