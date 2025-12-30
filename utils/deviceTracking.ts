import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';

// Dynamic imports to handle missing packages gracefully
let Device: any = null;

try {
  Device = require('expo-device');
} catch (e) {
  console.warn('expo-device not available');
}

export interface DeviceInfo {
  platform: string;
  platformVersion: string | number;
  deviceModel: string | null;
  deviceName: string | null;
  deviceYearClass: number | null;
  deviceType: string | null;
  screenWidth: number;
  screenHeight: number;
  screenScale: number;
  appVersion: string | null;
  appOwnership: string | null;
  executionEnvironment: string | null;
  isDevice: boolean;
  brand: string | null;
  manufacturer: string | null;
  osName: string | null;
  osVersion: string | null;
}

/**
 * Get comprehensive device information
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const screenData = Dimensions.get('window');
  
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    deviceModel: Device?.modelName || Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
    deviceName: Device?.deviceName || null,
    deviceYearClass: Device?.deviceYearClass || null,
    deviceType: Device?.deviceType ? String(Device.deviceType) : null,
    screenWidth: screenData.width,
    screenHeight: screenData.height,
    screenScale: screenData.scale,
    appVersion: Constants.expoConfig?.version || null,
    appOwnership: (Constants as any)?.appOwnership || null,
    executionEnvironment: (Constants as any)?.executionEnvironment || null,
    isDevice: Device?.isDevice ?? true,
    brand: (Device as any)?.brand || (Platform.OS === 'android' ? 'Android' : 'Apple') || null,
    manufacturer: (Device as any)?.manufacturer || null,
    osName: (Device as any)?.osName || Platform.OS || null,
    osVersion: (Device as any)?.osVersion || String(Platform.Version) || null,
  };
}

/**
 * Get IP address with timeout
 */
export async function getIPAddress(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    const data = await response.json();
    clearTimeout(timeoutId);
    return data?.ip || null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('IP address request timed out');
    } else {
      console.warn('Failed to get IP address:', error);
    }
    return null;
  }
}

