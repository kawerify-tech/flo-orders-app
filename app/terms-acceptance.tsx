import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useBreakpoint } from '../constants/breakpoints';
import Constants from 'expo-constants';
import { LEGAL } from '../lib/legal';
import { SafeAreaLayout } from '../components/SafeAreaLayout';
import { Ionicons } from '@expo/vector-icons';

const TermsAcceptanceScreen = () => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const breakpoint = useBreakpoint();

  const isTv = breakpoint === 'tv';
  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint.startsWith('ipad');

  const headingFontSize = isTv ? 48 : isDesktop ? 32 : isTablet ? 28 : 22;
  const textFontSize = isTv ? 24 : isDesktop ? 16 : isTablet ? 16 : 14;
  const buttonFontSize = isTv ? 28 : isDesktop ? 18 : isTablet ? 18 : 16;
  const buttonPaddingV = isTv ? 24 : isDesktop ? 14 : isTablet ? 16 : 12;
  const buttonPaddingH = isTv ? 100 : isDesktop ? 60 : isTablet ? 70 : 50;

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert('Acceptance Required', 'Please read and accept the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    try {
      // Store versioned legal acceptance
      try {
        await AsyncStorage.setItem(
          LEGAL.acceptanceStorageKey,
          JSON.stringify({ agreementId: LEGAL.agreementId, acceptedAtIso: new Date().toISOString() })
        );
      } catch (storageError) {
        console.error('Error storing terms acceptance:', storageError);
        Alert.alert('Error', 'Failed to save acceptance. Please try again.');
        setLoading(false);
        return;
      }

      // Request permissions (non-blocking - continue even if permissions fail)
      try {
        await requestAllPermissions();
      } catch (permError) {
        console.warn('Error requesting permissions:', permError);
        // Continue anyway - permissions can be requested later
      }

      // Navigate to welcome screen
      try {
        router.replace('/');
      } catch (navError) {
        console.error('Navigation error:', navError);
        Alert.alert('Error', 'Failed to navigate. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    try {
      // Request notification permissions
      try {
        // expo-notifications remote push is not supported in Expo Go (SDK 53+).
        // Avoid importing the module in Expo Go to prevent warnings / instability.
        if (Constants.appOwnership !== 'expo') {
          const Notifications = await import('expo-notifications');
          const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
          if (notificationStatus !== 'granted') {
            console.warn('Notification permission not granted');
          }
        }
      } catch (notifError) {
        console.warn('Error requesting notification permission:', notifError);
      }

      // Request storage permissions
      if (Platform.OS === 'android') {
        try {
          // Request storage permissions for Android 13+ (API 33+)
          if (Platform.Version >= 33) {
            const readMediaImages = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            );
            const readMediaVideo = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
            );
            if (__DEV__) {
              console.log('Media permissions:', { readMediaImages, readMediaVideo });
            }
          } else {
            // For Android 12 and below, request legacy storage permissions
            const readStorage = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              {
                title: 'Storage Permission',
                message: 'Flo Orders needs access to your storage to save PDF reports.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );
            const writeStorage = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              {
                title: 'Storage Permission',
                message: 'Flo Orders needs access to your storage to save PDF reports.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );
            if (__DEV__) {
              console.log('Storage permissions:', { readStorage, writeStorage });
            }
          }
        } catch (error) {
          console.warn('Storage permission request failed:', error);
        }
      }
      // Note: On iOS, file system operations use app-specific directories
      // that don't require explicit permissions

      // Note: Internet/mobile data permission is automatically granted on both platforms
      // The app will work without storage permissions, but PDF saving may be limited
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const openPrivacyPolicy = () => {
    router.push('/legal/privacy-policy' as any);
  };

  const openUserAgreement = () => {
    router.push('/legal/user-agreement' as any);
  };

  const openTermsOfService = () => {
    router.push('/legal/terms-of-service' as any);
  };

  const openMoreInfo = () => {
    router.push('/legal/more-info' as any);
  };

  const openFloEnergyWebsite = () => {
    Linking.openURL('https://floenergy.net/').catch(err =>
      console.error('Failed to open Flo Energy website:', err)
    );
  };

  const openKawerifyTechWebsite = () => {
    Linking.openURL('http://kawerifytech.com/').catch(err =>
      console.error('Failed to open Kawerify Tech website:', err)
    );
  };

  const openSupportEmail = () => {
    const email = 'contact@kawerifytech.com';
    const subject = 'Flo Orders App - Support Request';
    const body = 'Please describe your issue or question:';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(err =>
      console.error('Failed to open email:', err)
    );
  };

  return (
    <SafeAreaLayout>
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/' as any);
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Terms</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: headingFontSize }]}>Terms of Service</Text>
            <Text style={[styles.subtitle, { fontSize: textFontSize }]}>
              Please read and accept to continue
            </Text>
          </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>Legal Documents</Text>
          <TouchableOpacity onPress={openUserAgreement} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>View User Agreement →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openTermsOfService} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>View Terms of Service →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openPrivacyPolicy} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>View Privacy Policy →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openMoreInfo} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>More Info →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            1. Acceptance of Terms
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            By accessing and using the Flo Orders mobile application (&quot;App&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            2. App Permissions
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            This app requires the following permissions to function properly:
          </Text>
          <View style={styles.permissionList}>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • <Text style={styles.bold}>Internet/Mobile Data:</Text> Required for syncing data, authentication, and real-time updates
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • <Text style={styles.bold}>Storage:</Text> Required for saving PDF reports and transaction documents
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • <Text style={styles.bold}>Notifications:</Text> Required to send you important updates about your orders and transactions
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • <Text style={styles.bold}>Vibration:</Text> Used for notification feedback
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            3. User Responsibilities
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            4. Data Collection and Privacy
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            We collect and process personal data as described in our Privacy Policy. By using this app, you consent to the collection and use of information in accordance with our Privacy Policy. You can view our full Privacy Policy by tapping the link below or visiting our website.
          </Text>
          <TouchableOpacity onPress={openPrivacyPolicy} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>
              View Privacy Policy →
            </Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            5. App Owner Information
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            This app is owned and operated by <Text style={styles.bold}>Flo Energy</Text>, a Zimbabwean energy company with over 70 years of experience in the fuel industry.
          </Text>
          <View style={styles.contactBox}>
            <Text style={[styles.contactTitle, { fontSize: textFontSize }]}>Flo Energy</Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Website: <Text style={styles.link} onPress={openFloEnergyWebsite}>floenergy.net</Text>
            </Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Email: sales1@floenergy.net
            </Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Office: +263 29 2461125-7
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            6. Developer Information
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            This app was developed by <Text style={styles.bold}>Kawerify Tech (Private) Limited</Text>, a technology and education enterprise headquartered in Bulawayo, Zimbabwe.
          </Text>
          <View style={styles.contactBox}>
            <Text style={[styles.contactTitle, { fontSize: textFontSize }]}>Kawerify Tech</Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Website: <Text style={styles.link} onPress={openKawerifyTechWebsite}>kawerifytech.com</Text>
            </Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Email: contact@kawerifytech.com
            </Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Alt Email: kawerifytech@gmail.com
            </Text>
            <Text style={[styles.contactText, { fontSize: textFontSize }]}>
              Phone: +263 71 626 4988
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            7. Reporting Issues and Support
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            If you encounter any issues, bugs, or have questions about the app, please contact our support team:
          </Text>
          <TouchableOpacity onPress={openSupportEmail} style={styles.linkButton}>
            <Text style={[styles.linkText, { fontSize: textFontSize }]}>
              Contact Support →
            </Text>
          </TouchableOpacity>
          <Text style={[styles.text, { fontSize: textFontSize, marginTop: 10 }]}>
            For technical issues, bugs, or feature requests, please include:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • Device model and operating system version
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • App version (shown in Settings)
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • Steps to reproduce the issue
            </Text>
            <Text style={[styles.bulletPoint, { fontSize: textFontSize }]}>
              • Screenshots if applicable
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            8. Limitation of Liability
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            Flo Energy and Kawerify Tech shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the app.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            9. Changes to Terms
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            We reserve the right to modify these terms at any time. Your continued use of the app after any changes constitutes acceptance of the new terms.
          </Text>

          <Text style={[styles.sectionTitle, { fontSize: textFontSize + 2 }]}>
            10. Acceptance
          </Text>
          <Text style={[styles.text, { fontSize: textFontSize }]}>
            By checking the box below and tapping &quot;Accept &amp; Continue&quot;, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </Text>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, accepted && styles.checkboxChecked]}
              onPress={() => setAccepted(!accepted)}
            >
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={[styles.checkboxLabel, { fontSize: textFontSize }]}>
              I have read and agree to the Terms of Service
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!accepted || loading) && styles.acceptButtonDisabled,
            {
              paddingVertical: buttonPaddingV,
              paddingHorizontal: buttonPaddingH,
            },
          ]}
          onPress={handleAccept}
          disabled={!accepted || loading}
        >
          <Text style={[styles.acceptButtonText, { fontSize: buttonFontSize }]}>
            {loading ? 'Processing...' : 'Accept & Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </SafeAreaLayout>
);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#6A0DAD',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  content: {
    marginTop: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  permissionList: {
    marginLeft: 10,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 10,
    marginTop: 8,
  },
  bulletPoint: {
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  contactBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  contactTitle: {
    fontWeight: 'bold',
    color: '#6A0DAD',
    marginBottom: 8,
  },
  contactText: {
    color: '#555',
    marginBottom: 4,
    lineHeight: 20,
  },
  link: {
    color: '#6A0DAD',
    textDecorationLine: 'underline',
  },
  linkButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  linkText: {
    color: '#6A0DAD',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#6A0DAD',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#6A0DAD',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  acceptButton: {
    backgroundColor: '#6A0DAD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#ccc',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TermsAcceptanceScreen;

