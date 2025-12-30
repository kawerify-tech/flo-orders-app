import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';
import { LEGAL_TEXT, LEGAL } from '../../lib/legal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function UserAgreementScreen() {
  const router = useRouter();

  return (
    <SafeAreaLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{LEGAL_TEXT.userAgreementTitle}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.meta}>Agreement Identification: {LEGAL.agreementId}</Text>
          <Text style={styles.meta}>Effective Date (UTC): {LEGAL.effectiveDateUtc}</Text>
          <View style={styles.spacer} />
          <Text style={styles.body}>{LEGAL_TEXT.userAgreement}</Text>
        </ScrollView>
      </View>
    </SafeAreaLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
    height: 44,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
