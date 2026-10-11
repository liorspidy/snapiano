import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Must also be listed under Supabase > Authentication > URL Configuration > Redirect URLs.
const redirectTo = Linking.createURL('auth');
if (__DEV__) console.log(`[auth] add this exact address to Supabase > Authentication > URL Configuration > Redirect URLs: ${redirectTo}`);

type Auth = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};
const Ctx = createContext<Auth>(null as never);
export const useAuth = () => useContext(Ctx);

/** Tokens come back in the URL fragment (#access_token=...). */
async function sessionFromUrl(url: string) {
  const params = new URLSearchParams(url.split('#')[1] ?? '');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    // The app was opened by a sign-in link (cold start).
    Linking.getInitialURL().then((url) => { if (url) sessionFromUrl(url).catch(() => {}); });
    // A sign-in or confirmation link opened while the app is running.
    const link = Linking.addEventListener('url', ({ url }) => { sessionFromUrl(url).catch(() => {}); });
    // Only refresh tokens while the app is in the foreground.
    const app = AppState.addEventListener('change', (st) =>
      st === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
    return () => { sub.subscription.unsubscribe(); link.remove(); app.remove(); };
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') await sessionFromUrl(res.url);
  };

  const logIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ session, loading, signInWithGoogle, logIn, signUp, signOut }}>{children}</Ctx.Provider>;
}
