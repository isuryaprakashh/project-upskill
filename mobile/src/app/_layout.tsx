import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '../components/ui';
import { getSession, loadSession, subscribeSession } from '../lib/api';
import { startProgress } from '../lib/progress';
import { C } from '../theme';

export default function RootLayout() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const [booted, setBooted] = useState(false);
  const [readyFor, setReadyFor] = useState<string | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();
  const userId = session?.user.id;

  useEffect(() => { void loadSession().finally(() => setBooted(true)); }, []);

  useEffect(() => {
    if (!booted) return;
    void startProgress().finally(() => setReadyFor(userId ?? null));
  }, [booted, userId]);
  const ready = readyFor === (userId ?? null);

  // Send signed-out people to sign in, and signed-in people away from it.
  useEffect(() => {
    if (!booted) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/login');
    else if (session && inAuth) router.replace('/');
  }, [booted, session, segments, router]);

  // The navigator always stays mounted; a cover hides it while we load.
  const loading = !booted || (!!session && !ready);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      <Toast />
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
          <ActivityIndicator color={C.primary} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
