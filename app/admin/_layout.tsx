import React from 'react';
import { Tabs, Stack } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
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
      <Tabs.Screen
        name="clients/index"
        options={{
          title: 'Clients',
          href: null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="users" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 80,
    paddingBottom: 6,
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
