import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Text, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "grid" : "grid-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Dashboard</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "receipt" : "receipt-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Transactions</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "notifications" : "notifications-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Notifications</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Profile</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    height: 80,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 9999, // Ensure tab bar is always on top
    position: 'relative', // Required for z-index to work
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 86,
    maxWidth: 86,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(106, 13, 173, 0.08)',
    borderRadius: 10,
    paddingVertical: 4,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: "#6A0DAD",
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
