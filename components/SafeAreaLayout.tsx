import React from 'react';
import { View, StyleSheet, Platform, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, responsive } from '../constants/theme';

interface SafeAreaLayoutProps {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  statusBarStyle?: 'auto' | 'light' | 'dark';
}

export const SafeAreaLayout: React.FC<SafeAreaLayoutProps> = ({
  children,
  style,
  contentStyle,
  edges = ['top', 'bottom', 'left', 'right'],
  statusBarStyle = 'auto'
}) => {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // Determine status bar style based on color scheme
  const getStatusBarStyle = () => {
    if (statusBarStyle !== 'auto') return statusBarStyle;

    const backgroundColor =
      contentStyle?.backgroundColor ?? style?.backgroundColor ?? colors.background;

    const hex = typeof backgroundColor === 'string' ? backgroundColor.trim() : '';
    const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (hexMatch) {
      const raw = hexMatch[1];
      const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? 'dark' : 'light';
    }

    return colorScheme === 'dark' ? 'light' : 'dark';
  };

  const getBarStyle = (): 'light-content' | 'dark-content' => {
    const styleChoice = getStatusBarStyle();
    return styleChoice === 'light' ? 'light-content' : 'dark-content';
  };

  const statusBarBackgroundColor =
    contentStyle?.backgroundColor ?? style?.backgroundColor ?? colors.background;

  if (__DEV__) {
    console.log('SafeAreaLayout active', {
      insets,
      statusBarStyle: getStatusBarStyle(),
      statusBarBackgroundColor,
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }, style]}
      edges={edges}
    >
      <StatusBar
        barStyle={getBarStyle()}
        backgroundColor={typeof statusBarBackgroundColor === 'string' ? statusBarBackgroundColor : colors.background}
        translucent={false}
      />
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.background,
            paddingBottom:
              (contentStyle?.paddingBottom ?? 0) +
              insets.bottom +
              (Platform.OS === 'android' && insets.bottom === 0 ? 24 : 0),
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
});