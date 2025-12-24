import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Text, StyleSheet, View, Platform } from 'react-native';

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
        name="list"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "list" : "list-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Orders</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transaction"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "cash" : "cash-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Payments</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Chat</Text>
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
                name={focused ? "cog" : "cog-outline"} 
                size={24} 
                color={focused ? "#6A0DAD" : "#888"} 
                style={styles.icon}
              />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Settings</Text>
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
    height: "100%",
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(106, 13, 173, 0.08)',
    borderRadius: 10,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    color: "#6A0DAD",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
