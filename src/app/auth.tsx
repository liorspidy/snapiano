import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';

// Sign-in links (Google, email confirmation) land here. AuthProvider reads the tokens from the link; until the session
// exists this goes to the login screen, and when it appears the router moves on to the library by itself.
export default function AuthCallback() {
  const { session } = useAuth();
  return <Redirect href={session ? '/' : '/login'} />;
}
