import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ],
        tabBarShowLabel: false,
        sceneContainerStyle: styles.scene,
      } as any)}
    >
      {/** Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Dashboard</Text>
            </View>
          ),
        }}
      />

      {/** Clients Stack */}
      <Tabs.Screen
        name="clients"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? "people" : "people-outline"} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Clients</Text>
            </View>
          ),
        }}
      />

      {/** Activities Tab */}
      <Tabs.Screen
        name="activities"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? "fitness" : "fitness-outline"} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Activities</Text>
            </View>
          ),
        }}
      />

      {/** Feedback Tab */}
      <Tabs.Screen
        name="feedback"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? "star" : "star-outline"} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Feedback</Text>
            </View>
          ),
        }}
      />

      {/** Attendant Tab */}
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Attendant</Text>
            </View>
          ),
        }}
      />

      {/** Settings Tab */}
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons name={focused ? "cog" : "cog-outline"} size={24} color={focused ? "#6A0DAD" : "#888"} />
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">Settings</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: '#F5F5F5',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    maxWidth: 86,
  },
  label: {
    fontSize: 11,
    color: '#6A0DAD',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
