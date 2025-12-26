import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';
import { LEGAL_TEXT, LEGAL } from '../../lib/legal';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{LEGAL_TEXT.privacyPolicyTitle}</Text>
        <Text style={styles.meta}>Policy Identifier: {LEGAL.privacyPolicyId}</Text>
        <Text style={styles.meta}>Effective Date (UTC): {LEGAL.effectiveDateUtc}</Text>
        <Text style={styles.body}>{LEGAL_TEXT.privacyPolicy}</Text>
      </ScrollView>
    </SafeAreaLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
