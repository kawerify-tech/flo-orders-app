import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { BackHandler, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../lib/AuthContext';

/**
 * Navigation Guard Component
 * Prevents users from going back to signin screen when signed in
 * Handles Android back button to prevent navigation to signin
 */
export function NavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole } = useAuth();

  useEffect(() => {
    // Prevent going back to signin when signed in
    const checkAuthState = async () => {
      try {
        const isSignedIn = await AsyncStorage.getItem('isSignedIn');
        
        // If user is signed in and tries to access signin/welcome screens, redirect
        if (user && isSignedIn === 'true' && (pathname === '/signin' || pathname === '/')) {
          try {
            if (userRole === 'admin') {
              router.replace('/admin' as any);
            } else if (userRole === 'attendant') {
              router.replace('/attendant' as any);
            } else if (userRole === 'client') {
              router.replace('/clients' as any);
            }
          } catch (navError) {
            console.error('Navigation error in guard:', navError);
          }
        }
      } catch (error) {
        console.error('Navigation guard error:', error);
      }
    };

    checkAuthState();
  }, [user, userRole, pathname, router]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If on signin or welcome screen and user is signed in, prevent back navigation
      if ((pathname === '/signin' || pathname === '/') && user) {
        // Move app to background instead of going back
        BackHandler.exitApp();
        return true;
      }
      
      // Allow normal back navigation for other screens
      return false;
    });

    return () => backHandler.remove();
  }, [pathname, user]);

  return null;
}

