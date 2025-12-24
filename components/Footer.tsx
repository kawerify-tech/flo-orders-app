import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Footer: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Kawerify Tech 2025</Text>
      <Text style={styles.text}>kawerifytech.com</Text>
      <Text style={styles.text}>contact@kawerifytech.com</Text>
      <Text style={styles.text}>kawerifytech@gmail.com</Text>
      <Text style={styles.text}>+263 71 626 4988</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
}); 