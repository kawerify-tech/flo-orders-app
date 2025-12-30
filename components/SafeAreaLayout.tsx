import React from 'react';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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

  // Determine status bar style based on color scheme
  const getStatusBarStyle = () => {
    if (statusBarStyle !== 'auto') return statusBarStyle;
    return colorScheme === 'dark' ? 'light' : 'dark';
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }, style]}
      edges={edges}
    >
      <StatusBar
        style={getStatusBarStyle()}
        backgroundColor={colors.background}
        translucent={false}
      />
      <View style={[styles.content, { backgroundColor: colors.background }, contentStyle]}>
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