import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';
import { LEGAL_TEXT, LEGAL } from '../../lib/legal';

export default function UserAgreementScreen() {
  return (
    <SafeAreaLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{LEGAL_TEXT.userAgreementTitle}</Text>
        <Text style={styles.meta}>Agreement Identification: {LEGAL.agreementId}</Text>
        <Text style={styles.meta}>Effective Date (UTC): {LEGAL.effectiveDateUtc}</Text>
        <View style={styles.spacer} />
        <Text style={styles.body}>{LEGAL_TEXT.userAgreement}</Text>
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
  spacer: {
    height: 12,
  },
  body: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
