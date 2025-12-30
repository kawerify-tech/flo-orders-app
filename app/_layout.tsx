import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/AuthContext';
import { NavigationGuard } from '../components/NavigationGuard';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(err => {
  console.warn('Error preventing splash screen:', err);
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ea" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationGuard />
          <StatusBar style="auto" backgroundColor="#F5F5F5" translucent={false} />
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
    </ErrorBoundary>
  );
}
