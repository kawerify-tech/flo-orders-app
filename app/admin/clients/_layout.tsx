import React from 'react';
import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6A0DAD',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Clients',
        }}
      />
      <Stack.Screen
        name="client-details"
        options={{
          title: 'Client Details',
        }}
      />
    </Stack>
  );
} 