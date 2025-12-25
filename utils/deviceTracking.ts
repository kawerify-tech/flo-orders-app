import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';

// Dynamic imports to handle missing packages gracefully
let Location: any = null;
let Device: any = null;

try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location not available');
}

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

export interface LocationInfo {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  address: string | null;
  timestamp: string;
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
 * Get current location with reverse geocoding
 */
export async function getLocationInfo(): Promise<LocationInfo> {
  if (!Location) {
    console.warn('expo-location not available');
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      address: null,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Check if location services are enabled
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        address: null,
        timestamp: new Date().toISOString(),
      };
    }

    // Get current location with timeout
    const location = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 10000)
      ),
    ]) as any;

    let address: string | null = null;
    
    try {
      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const parts = [
          addr.street,
          addr.streetNumber,
          addr.city,
          addr.region,
          addr.country,
        ].filter(Boolean);
        address = parts.join(', ') || null;
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || null,
      altitude: location.coords.altitude || null,
      address,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      altitude: null,
      address: null,
      timestamp: new Date().toISOString(),
    };
  }
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

