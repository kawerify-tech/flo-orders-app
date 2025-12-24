import { useWindowDimensions, Platform } from 'react-native';

export const breakpoints = {
  // iPhone sizes
  mobile: 0,
  iphoneSE: 375,    // iPhone SE, 12 mini, 13 mini
  iphoneStandard: 390, // iPhone 12, 13, 14, 15
  iphonePlus: 414,  // iPhone 6+, 7+, 8+
  iphoneMax: 428,   // iPhone 12 Pro Max, 13 Pro Max, 14 Plus, 15 Plus
  iphonePro: 430,   // iPhone 14 Pro, 15 Pro
  iphoneProMax: 932, // iPhone 14 Pro Max, 15 Pro Max (Dynamic Island)
  
  // iPad sizes
  ipadMini: 744,    // iPad Mini
  ipadStandard: 810, // iPad 9th/10th gen
  ipadAir: 820,     // iPad Air
  ipadPro11: 834,   // iPad Pro 11"
  ipadPro129: 1024, // iPad Pro 12.9"
  
  // Desktop and TV
  desktop: 1200,
  tv: 1920,
};

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  
  // Check for TV first
  if (width >= breakpoints.tv) return 'tv';
  
  // Desktop
  if (width >= breakpoints.desktop) return 'desktop';
  
  // iPad sizes
  if (width >= breakpoints.ipadPro129) return 'ipadPro129';
  if (width >= breakpoints.ipadPro11) return 'ipadPro11';
  if (width >= breakpoints.ipadAir) return 'ipadAir';
  if (width >= breakpoints.ipadStandard) return 'ipadStandard';
  if (width >= breakpoints.ipadMini) return 'ipadMini';
  
  // iPhone sizes
  if (width >= breakpoints.iphoneProMax) return 'iphoneProMax';
  if (width >= breakpoints.iphonePro) return 'iphonePro';
  if (width >= breakpoints.iphoneMax) return 'iphoneMax';
  if (width >= breakpoints.iphonePlus) return 'iphonePlus';
  if (width >= breakpoints.iphoneStandard) return 'iphoneStandard';
  if (width >= breakpoints.iphoneSE) return 'iphoneSE';
  
  return 'mobile';
}

export function getDeviceType() {
  const { width } = useWindowDimensions();
  
  if (Platform.OS === 'ios') {
    if (width >= breakpoints.ipadMini) return 'ipad';
    return 'iphone';
  }
  
  if (width >= breakpoints.ipadMini) return 'tablet';
  return 'mobile';
}

export function isIPhone() {
  return Platform.OS === 'ios' && useWindowDimensions().width < breakpoints.ipadMini;
}

export function isIPad() {
  return Platform.OS === 'ios' && useWindowDimensions().width >= breakpoints.ipadMini;
}