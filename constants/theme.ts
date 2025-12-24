import { Dimensions, Platform, useColorScheme } from 'react-native';

const { width, height } = Dimensions.get('window');

// Brand Colors with Dark Mode Support
export const lightColors = {
  primary: '#6A0DAD', // Purple
  secondary: '#FF6B6B', // Coral
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#333333',
  textLight: '#666666',
  textSecondary: '#8E8E93', // iOS secondary text
  border: '#DDDDDD',
  separator: '#C6C6C8', // iOS separator
  success: '#34C759', // iOS green
  error: '#FF3B30', // iOS red
  warning: '#FF9500', // iOS orange
  info: '#007AFF', // iOS blue
  card: '#FFFFFF',
  notification: '#FF3B30',
};

export const darkColors = {
  primary: '#8A2BE2', // Lighter purple for dark mode
  secondary: '#FF6B6B',
  background: '#000000',
  surface: '#1C1C1E', // iOS dark surface
  text: '#FFFFFF',
  textLight: '#AEAEB2', // iOS secondary text dark
  textSecondary: '#8E8E93',
  border: '#38383A', // iOS dark border
  separator: '#38383A',
  success: '#30D158', // iOS green dark
  error: '#FF453A', // iOS red dark
  warning: '#FF9F0A', // iOS orange dark
  info: '#0A84FF', // iOS blue dark
  card: '#1C1C1E',
  notification: '#FF453A',
};

export const colors = lightColors; // Default to light colors

// Hook to get colors based on color scheme
export function useThemeColors() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

// Responsive Sizes
export const responsive = {
  // Screen Dimensions
  screen: {
    width,
    height,
  },
  
  // Font Sizes - iOS optimized
  fontSize: {
    xs: Platform.OS === 'ios' ? (width < 375 ? 11 : width < 744 ? 12 : 14) : (width < 768 ? 12 : 14),
    sm: Platform.OS === 'ios' ? (width < 375 ? 13 : width < 744 ? 14 : 16) : (width < 768 ? 14 : 16),
    md: Platform.OS === 'ios' ? (width < 375 ? 15 : width < 744 ? 16 : 18) : (width < 768 ? 16 : 18),
    lg: Platform.OS === 'ios' ? (width < 375 ? 17 : width < 744 ? 18 : 20) : (width < 768 ? 18 : 20),
    xl: Platform.OS === 'ios' ? (width < 375 ? 19 : width < 744 ? 20 : 24) : (width < 768 ? 20 : 24),
    xxl: Platform.OS === 'ios' ? (width < 375 ? 22 : width < 744 ? 24 : 32) : (width < 768 ? 24 : 32),
  },
  
  // Spacing - iOS Human Interface Guidelines
  spacing: {
    xs: Platform.OS === 'ios' ? 4 : (width < 768 ? 4 : 8),
    sm: Platform.OS === 'ios' ? 8 : (width < 768 ? 8 : 12),
    md: Platform.OS === 'ios' ? 16 : (width < 768 ? 12 : 16),
    lg: Platform.OS === 'ios' ? 20 : (width < 768 ? 16 : 24),
    xl: Platform.OS === 'ios' ? 32 : (width < 768 ? 24 : 32),
    xxl: Platform.OS === 'ios' ? 44 : (width < 768 ? 32 : 48),
  },
  
  // Border Radius - iOS style
  borderRadius: {
    xs: 4,
    sm: Platform.OS === 'ios' ? 8 : 4,
    md: Platform.OS === 'ios' ? 10 : 8,
    lg: Platform.OS === 'ios' ? 14 : 12,
    xl: Platform.OS === 'ios' ? 20 : 16,
    round: 9999,
  },
  
  // Device Type Detection
  isMobile: width < 744, // Updated for iPad Mini
  isTablet: width >= 744 && width < 1024,
  isDesktop: width >= 1024,
  isTV: Platform.OS === 'web' && width >= 1920,
  isIOS: Platform.OS === 'ios',
  isIPhone: Platform.OS === 'ios' && width < 744,
  isIPad: Platform.OS === 'ios' && width >= 744,
  
  // Safe Area Support
  safeArea: {
    top: Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : 0,
    bottom: Platform.OS === 'ios' ? (height >= 812 ? 34 : 0) : 0,
  },
};

// Common Styles
export const commonStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  input: {
    height: responsive.isMobile ? 45 : 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    paddingHorizontal: responsive.spacing.md,
    fontSize: responsive.fontSize.sm,
    color: colors.text,
  },
  
  button: {
    height: responsive.isMobile ? 45 : 50,
    borderRadius: responsive.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.lg,
  },
  
  buttonText: {
    fontSize: responsive.fontSize.md,
    fontWeight: 'bold',
  },
}; 