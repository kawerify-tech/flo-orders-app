import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Dimensions, Platform, Linking, BackHandler } from 'react-native';
import { SafeAreaLayout } from '../components/SafeAreaLayout';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, query, where, getDocs, getDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import { colors, responsive, commonStyles } from '../constants/theme';
import { useBreakpoint } from '../constants/breakpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceInfo, getLocationInfo, getIPAddress } from '../utils/deviceTracking';
import { useAuth } from '../lib/AuthContext';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const { user, userRole } = useAuth();

  // Prevent back button from going back when signed in
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // If user is signed in, prevent going back
        if (user) {
          BackHandler.exitApp();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('lastLoginEmail');
        if (storedEmail) setEmail(storedEmail);

        // Check if user is already signed in - redirect immediately
        try {
          const user = auth.currentUser;
          const isSignedIn = await AsyncStorage.getItem('isSignedIn');
          
          if (user && isSignedIn === 'true') {
            const storedRole = await AsyncStorage.getItem('userRole');
            if (storedRole === 'admin') {
              try {
                router.replace('/admin' as any);
              } catch (e) {
                console.error('Navigation error:', e);
              }
            } else if (storedRole === 'attendant') {
              try {
                router.replace('/attendant' as any);
              } catch (e) {
                console.error('Navigation error:', e);
              }
            } else if (storedRole === 'client') {
              try {
                router.replace('/clients' as any);
              } catch (e) {
                console.error('Navigation error:', e);
              }
            }
          }
        } catch (authCheckError) {
          console.error('Auth check error:', authCheckError);
        }
      } catch (error) {
        console.error('Init error:', error);
        // Continue - don't block the screen
      }
    };

    init();
  }, []);

  const isTv = breakpoint === 'tv';
  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint.startsWith('ipad');

  // Responsive values based on breakpoint
  const logoSize = isTv ? 180 : isDesktop ? 120 : isTablet ? 100 : 70;
  const titleFontSize = isTv ? 48 : isDesktop ? 36 : isTablet ? 28 : 20;
  const inputFontSize = isTv ? 28 : isDesktop ? 22 : isTablet ? 18 : 14;
  const buttonFontSize = isTv ? 28 : isDesktop ? 22 : isTablet ? 18 : 14;
  const containerMaxWidth = isTv ? 900 : isDesktop ? 500 : '100%';
  const buttonBottomSpace = isTv ? 120 : isDesktop ? 80 : isTablet ? 60 : 40;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      if (__DEV__) {
        console.log('Login Success:', user.email);
      }

      await AsyncStorage.setItem('lastLoginEmail', email.trim());
      // Store sign-in timestamp for persistence
      await AsyncStorage.setItem('lastSignInTime', new Date().toISOString());
      await AsyncStorage.setItem('isSignedIn', 'true');

      try {
        // Get comprehensive device and location information with timeout
        const auditPromise = Promise.race([
          Promise.all([
            getDeviceInfo().catch(err => {
              console.warn('Error getting device info:', err);
              return null;
            }),
            getLocationInfo().catch(err => {
              console.warn('Error getting location info:', err);
              return null;
            }),
            getIPAddress().catch(err => {
              console.warn('Error getting IP address:', err);
              return null;
            }),
          ]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Audit timeout')), 5000)
          ),
        ]) as Promise<[any, any, string | null]>;

        const [deviceInfo, locationInfo, ipAddress] = await auditPromise.catch(() => [null, null, null]);

        // Store device info locally for security checks (non-blocking)
        if (deviceInfo) {
          try {
            await AsyncStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));
          } catch (e) {
            console.warn('Error storing device info:', e);
          }
        }
        if (locationInfo) {
          try {
            await AsyncStorage.setItem('lastLocation', JSON.stringify(locationInfo));
          } catch (e) {
            console.warn('Error storing location:', e);
          }
        }

        // Record login audit with full device and location data (non-blocking)
        if (deviceInfo || locationInfo || ipAddress) {
          try {
            await Promise.race([
              addDoc(collection(db, 'loginAudits'), {
                userId: user.uid,
                email: (user.email || email.trim() || '').toLowerCase(),
                ipAddress: ipAddress || null,
                deviceInfo: deviceInfo || null,
                location: locationInfo || null,
                timestamp: new Date().toISOString(),
                createdAt: serverTimestamp(),
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Firestore timeout')), 3000)
              ),
            ]).catch(err => {
              console.warn('Error recording login audit:', err);
            });
          } catch (err) {
            console.warn('Error in audit promise:', err);
          }
        }

        // Send security alert email (non-blocking)
        try {
          await Promise.race([
            addDoc(collection(db, 'mail'), {
              to: 'contact@kawerifytech.com',
              message: {
                subject: 'New Sign-in Alert - Flo Orders',
                text: `A sign-in occurred for ${(user.email || email.trim() || '').toLowerCase()}\n\nDevice: ${deviceInfo?.deviceModel || deviceInfo?.platform || 'Unknown'} (${deviceInfo?.platformVersion || 'Unknown'})\nIP: ${ipAddress || 'Unknown'}\nLocation: ${locationInfo?.address || (locationInfo?.latitude && locationInfo?.longitude ? `${locationInfo.latitude}, ${locationInfo.longitude}` : 'Unknown')}\nTimestamp: ${new Date().toLocaleString()}\n`,
              },
              createdAt: serverTimestamp(),
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Email timeout')), 3000)
            ),
          ]).catch(err => {
            console.warn('Error sending security email:', err);
          });
        } catch (err) {
          console.warn('Error in email promise:', err);
        }
      } catch (error) {
        console.error('Error in audit process:', error);
        // Continue even if audit fails - don't block login
      }

      let role: string | null = null;

      try {
        const adminRef = doc(db, 'admins', 'admin');
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists() && adminSnap.data()?.email === email) {
          role = 'admin';
        }

        if (!role) {
          const attendantsQuery = query(collection(db, 'attendants'), where('email', '==', email), limit(1));
          const attendantsSnap = await getDocs(attendantsQuery);
          if (!attendantsSnap.empty) {
            role = 'attendant';
          }
        }

        if (!role) {
          const clientsQuery = query(collection(db, 'clients'), where('email', '==', email), limit(1));
          const clientsSnap = await getDocs(clientsQuery);
          if (!clientsSnap.empty) {
            role = 'client';
          }
        }
      } catch (roleError) {
        console.error('Error determining role:', roleError);
        Alert.alert('Error', 'Failed to determine user role. Please try again.');
        setLoading(false);
        return;
      }

      setLoading(false);

      if (role === 'admin') {
        try {
          await AsyncStorage.setItem('userRole', 'admin');
          await AsyncStorage.setItem('isSignedIn', 'true');
          router.replace('/admin' as any);
        } catch (navError) {
          console.error('Error navigating to admin:', navError);
          Alert.alert('Error', 'Failed to navigate. Please try again.');
        }
      } else if (role === 'attendant') {
        try {
          await AsyncStorage.setItem('userRole', 'attendant');
          await AsyncStorage.setItem('isSignedIn', 'true');
          router.replace('/attendant' as any);
        } catch (navError) {
          console.error('Error navigating to attendant:', navError);
          Alert.alert('Error', 'Failed to navigate. Please try again.');
        }
      } else if (role === 'client') {
        try {
          await AsyncStorage.setItem('userRole', 'client');
          await AsyncStorage.setItem('isSignedIn', 'true');
          router.replace('/clients' as any);
        } catch (navError) {
          console.error('Error navigating to clients:', navError);
          Alert.alert('Error', 'Failed to navigate. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Role not found. Contact support.');
        try {
          await AsyncStorage.removeItem('isSignedIn');
        } catch (e) {
          console.warn('Error removing isSignedIn:', e);
        }
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Login Error:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Wrong email or password. Please try again or contact our Admin.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please check your internet connection and try again.');
      }
    }
  };

  return (
    <SafeAreaLayout>
      <View style={[styles.container, { maxWidth: containerMaxWidth }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/flo-logo.png')} 
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={[styles.title, { fontSize: titleFontSize }]}>Welcome Back</Text>
          
      <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={inputFontSize + 4} color={colors.textLight} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Email"
              placeholderTextColor={colors.textLight}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={inputFontSize + 4} color={colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { fontSize: inputFontSize }]}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={inputFontSize + 4} 
                color={colors.textLight} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Forgot Password', 'Please contact the admin.')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          <View style={styles.buttonBottomSpacer} />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://kawerifytech.com')}
            accessibilityRole="link"
          >
            <Text style={styles.footerText}>Developed by Kawerify Tech</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 0,
    maxWidth: responsive.isDesktop ? 500 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.lg,
    marginTop: responsive.spacing.xl,
    marginBottom: responsive.spacing.lg,
  },
  logo: {
    width: responsive.isMobile ? 80 : 100,
    height: responsive.isMobile ? 80 : 100,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: responsive.spacing.lg,
  },
  title: {
    fontSize: responsive.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: responsive.spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    marginBottom: responsive.spacing.md,
    paddingHorizontal: responsive.spacing.sm,
    backgroundColor: colors.background,
    ...commonStyles.shadow,
  },
  inputIcon: {
    marginRight: responsive.spacing.sm,
  },
  input: {
    flex: 1,
    height: responsive.isMobile ? 45 : 50,
    fontSize: responsive.fontSize.sm,
    color: colors.text,
  },
  passwordToggle: {
    padding: responsive.spacing.sm,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: responsive.spacing.lg,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: responsive.fontSize.sm,
  },
  signInButton: {
    backgroundColor: colors.primary,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: colors.background,
    fontSize: responsive.fontSize.md,
    fontWeight: 'bold',
  },
  buttonBottomSpacer: {
    height: responsive.spacing.xl * 2,
  },
  footer: {
    paddingHorizontal: responsive.spacing.lg,
    paddingVertical: responsive.spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textLight,
    fontSize: responsive.fontSize.xs,
  },
});

export default SignInScreen;
