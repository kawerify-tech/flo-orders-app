import { StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useBreakpoint } from '../constants/breakpoints';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../lib/firebaseConfig';

const WelcomeScreen = () => {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const [checkingTerms, setCheckingTerms] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if terms have been accepted
        const termsAccepted = await AsyncStorage.getItem('termsAccepted');
        if (!termsAccepted) {
          // Redirect to terms acceptance screen
          try {
            router.replace('/terms-acceptance' as any);
          } catch (navError) {
            console.error('Navigation error:', navError);
            setCheckingTerms(false);
          }
          return;
        }

        // Check if user is already logged in
        try {
          if (!auth.currentUser) {
            setCheckingTerms(false);
            return;
          }

          const storedRole = await AsyncStorage.getItem('userRole');
          if (storedRole === 'admin') {
            try {
              router.replace('/admin' as any);
            } catch (e) {
              console.error('Navigation error:', e);
              setCheckingTerms(false);
            }
          } else if (storedRole === 'attendant') {
            try {
              router.replace('/attendant' as any);
            } catch (e) {
              console.error('Navigation error:', e);
              setCheckingTerms(false);
            }
          } else if (storedRole === 'client') {
            try {
              router.replace('/clients' as any);
            } catch (e) {
              console.error('Navigation error:', e);
              setCheckingTerms(false);
            }
          } else {
            setCheckingTerms(false);
          }
        } catch (authError) {
          console.error('Auth check error:', authError);
          setCheckingTerms(false);
        }
      } catch (error) {
        console.error('Init error:', error);
        setCheckingTerms(false);
      }
    };

    init();
  }, []);

  const isTv = breakpoint === 'tv';
  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint.startsWith('ipad');

  // Responsive values based on breakpoint
  const logoSize = isTv ? 220 : isDesktop ? 110 : isTablet ? 110 : 80;
  const logoContainerHeight = isTv ? 320 : isDesktop ? 150 : isTablet ? 160 : 110;
  const borderRadius = isTv ? 80 : isDesktop ? 36 : isTablet ? 40 : 28;
  const headingFontSize = isTv ? 64 : isDesktop ? 32 : isTablet ? 32 : 22;
  const buttonFontSize = isTv ? 32 : isDesktop ? 16 : isTablet ? 18 : 14;
  const buttonPaddingV = isTv ? 32 : isDesktop ? 12 : isTablet ? 16 : 10;
  const buttonPaddingH = isTv ? 120 : isDesktop ? 48 : isTablet ? 60 : 40;
  const contentPaddingH = isTv ? 80 : isDesktop ? 24 : isTablet ? 24 : 12;
  const buttonMarginTop = isTv ? 60 : isDesktop ? 24 : isTablet ? 30 : 20;
  const buttonBottomSpace = isTv ? 120 : isDesktop ? 48 : isTablet ? 60 : 40;
  const contentMaxWidth = isDesktop ? 420 : '100%';

  if (checkingTerms) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.container]}> 
      {/* Logo Section (Top) with Rounded Bottom Corners */}
      <View style={[styles.logoContainer, {
        height: logoContainerHeight,
        borderBottomLeftRadius: borderRadius,
        borderBottomRightRadius: borderRadius,
      }]}
      >
        <Image 
          source={require("../assets/images/flo-logo.png")} 
          style={{ width: logoSize, height: logoSize, borderRadius }}
          resizeMode="contain"
        />
      </View>

      {/* Text and Button Section */}
      <View style={[styles.contentContainer, { paddingHorizontal: contentPaddingH, maxWidth: contentMaxWidth }]}> 
        <Text style={[styles.heading, { fontSize: headingFontSize }]}>Welcome to</Text>
        <Text style={[styles.heading, { fontSize: headingFontSize }]}>FLO Fuel Orders</Text>
        <TouchableOpacity 
          style={[styles.button, {
            paddingVertical: buttonPaddingV,
            paddingHorizontal: buttonPaddingH,
            borderRadius,
            marginTop: buttonMarginTop,
          }]}
          onPress={() => {
            router.replace("/signin" as any);
          }}
        >
          <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Next</Text>
        </TouchableOpacity>
        <View style={{ height: buttonBottomSpace }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A0DAD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#6A0DAD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
});

export default WelcomeScreen;
