import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../lib/AuthContext';
import { NavigationGuard } from '../components/NavigationGuard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useThemeColors } from '../constants/theme';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(err => {
  console.warn('Error preventing splash screen:', err);
});

export default function RootLayout() {
  const colors = useThemeColors();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const anyGlobal = global as any;
    const errorUtils = anyGlobal?.ErrorUtils;
    if (!errorUtils?.setGlobalHandler) return;

    const defaultHandler = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((err: any, isFatal?: boolean) => {
      try {
        AsyncStorage.setItem(
          'lastFatalJsError',
          JSON.stringify({
            message: String(err?.message || err || 'Unknown error'),
            stack: String(err?.stack || ''),
            timeIso: new Date().toISOString(),
            isFatal: Boolean(isFatal),
          })
        ).catch(() => {});
      } catch {
        // Ignore
      }
      if (typeof defaultHandler === 'function') {
        defaultHandler(err, isFatal);
      }
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(err => {
        console.warn('Error hiding splash screen:', err);
      });
    }
  }, [loaded]);

  if (error) {
    console.error('Font loading error:', error);
  }

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color="#6200ea" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationGuard />
            <StatusBar style="auto" backgroundColor={colors.background} translucent={false} />
            <Stack>
              <Stack.Screen name="terms-acceptance" options={{ headerShown: false }} />
              <Stack.Screen name="legal/user-agreement" options={{ headerShown: false }} />
              <Stack.Screen name="legal/terms-of-service" options={{ headerShown: false }} />
              <Stack.Screen name="legal/privacy-policy" options={{ headerShown: false }} />
              <Stack.Screen name="legal/more-info" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="signin" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="attendant" options={{ headerShown: false }} />
              <Stack.Screen name="clients" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </ErrorBoundary>
  );
}
