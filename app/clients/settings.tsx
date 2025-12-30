import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { List, Switch, Button, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { DataDeletionService } from '../../utils/dataDeletion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../lib/firebaseConfig';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../lib/AuthContext';
import { commonStyles } from '../../constants/theme';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';

interface ClientData {
  id?: string;
  name: string;
  address: string;
  balance: number;
  remainingFuel: number;
  pumpPrice: number;
  cellPhone: string;
  contactPerson: string;
  email: string;
  notifications: boolean;
  role: string;
  status: string;
  vatNumber: string;
  tinNumber: string;
  vehicle: string[];
  totalFuelPurchased: number;
  totalValue: number;
}

export default function Settings() {
  const router = useRouter();
  const { setUserRole } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  const openUserAgreement = () => router.push('/legal/user-agreement' as any);
  const openTermsOfService = () => router.push('/legal/terms-of-service' as any);
  const openPrivacyPolicy = () => router.push('/legal/privacy-policy' as any);
  const openMoreInfo = () => router.push('/legal/more-info' as any);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!isMounted) return;

      if (user?.uid && user?.email) {
        console.log('Fetching profile data for:', user.email);
        fetchClientData(user.uid, user.email);
      } else {
        console.log('No authenticated user');
        setLoading(false);
        setClientData(null);
        router.replace("/signin");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const fetchClientData = async (uid: string, email: string) => {
    if (!uid || !email) {
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.toLowerCase();

      let clientDocId = uid;
      let data: any | null = null;

      const clientRef = doc(db, 'clients', uid);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        data = clientSnap.data();
      } else {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('email', '==', normalizedEmail), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const found = querySnapshot.docs[0];
          clientDocId = found.id;
          data = found.data();
        }
      }

      if (!data) {
        console.log('No client document found for email:', email);
        Alert.alert(
          'Account Not Found',
          'Please contact support to set up your client account.',
          [{ text: 'OK' }]
        );
        setClientData(null);
        setLoading(false);
        return;
      }
      
      const formattedData: ClientData = {
        id: clientDocId,
        name: data.name || '',
        email: data.email || email,
        address: data.address || '',
        balance: Number(data.balance) || 0,
        remainingFuel: Number(data.remainingFuel) || 0,
        pumpPrice: Number(data.pumpPrice) || 0,
        cellPhone: data.cellPhone || '',
        contactPerson: data.contactPerson || '',
        notifications: Boolean(data.notifications),
        role: data.role || 'client',
        status: data.status || 'inactive',
        vatNumber: data.vatNumber || '',
        tinNumber: data.tinNumber || '',
        vehicle: Array.isArray(data.vehicle) ? data.vehicle : [],
        totalFuelPurchased: Number(data.totalFuelPurchased) || 0,
        totalValue: Number(data.totalValue) || 0,
      };

      setClientData(formattedData);
      setNotificationsEnabled(formattedData.notifications);

    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert(
        'Error',
        'Failed to load your profile. Please try again later.',
        [{ text: 'Retry', onPress: () => handleRefresh() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user?.uid && user?.email) {
      fetchClientData(user.uid, user.email);
    } else {
      setLoading(false);
      Alert.alert('Error', 'Please login again');
      router.replace("/signin");
    }
  };

  const handleRefill = () => {
    router.push("/transactions");
  };

  const handleDataDeletion = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const user = auth.currentUser;
              if (!user) throw new Error('No user logged in');

              const deletionService = DataDeletionService.getInstance();
              await deletionService.requestDataDeletion(
                user.uid,
                user.email || '',
                'User requested account deletion'
              );

              Alert.alert(
                'Request Submitted',
                'Your account deletion request has been submitted. You will be notified once it is processed.'
              );
            } catch (error) {
              console.error('Error requesting deletion:', error);
              Alert.alert('Error', 'Failed to submit deletion request. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            // Clear all stored authentication data
            await AsyncStorage.multiRemove([
              'userRole',
              'isSignedIn',
              'lastSignInTime',
              'deviceInfo',
              'lastLocation',
              'lastLoginEmail',
            ]);
            
            // Sign out from Firebase
            await signOut(auth);
            
            // Clear user role from context
            setUserRole(null);
            
            // Navigate to signin screen using replace to prevent going back
            router.replace('/signin' as any);
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setIsLoggingOut(false);
            setLoading(false);
          }
        }
      }
    ]);
  };

  const renderProfileItem = (label: string, value: string | number) => (
    <View style={styles.profileItem} key={label}>
      <Text style={styles.labelText}>{label}</Text>
      <Text style={styles.valueText}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </View>
  );

  // Privacy Policy Modal
  const PrivacyPolicyModal = () => (
    <Modal
      visible={showPrivacyPolicy}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPrivacyPolicy(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalLastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

            <Text style={styles.modalSection}>1. Introduction</Text>
            <Text style={styles.modalText}>
              Welcome to Flo Orders. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
            </Text>

            <Text style={styles.modalSection}>2. Data We Collect</Text>
            <Text style={styles.modalText}>
              We collect and process the following data:
              {'\n'}- Personal identification information (Name, email address, phone number)
              {'\n'}- Transaction data
              {'\n'}- Device information
              {'\n'}- Usage data
              {'\n'}- Location data (when permitted)
            </Text>

            <Text style={styles.modalSection}>3. How We Use Your Data</Text>
            <Text style={styles.modalText}>
              We use your data for:
              {'\n'}- Providing and maintaining our service
              {'\n'}- Processing your transactions
              {'\n'}- Sending you notifications
              {'\n'}- Improving our services
              {'\n'}- Customer support
            </Text>

            <Text style={styles.modalSection}>4. Data Security</Text>
            <Text style={styles.modalText}>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
            </Text>

            <Text style={styles.modalSection}>5. Your Rights</Text>
            <Text style={styles.modalText}>
              You have the right to:
              {'\n'}- Access your personal data
              {'\n'}- Correct your personal data
              {'\n'}- Delete your personal data
              {'\n'}- Object to processing of your personal data
            </Text>

            <Text style={styles.modalSection}>6. Developer / Contact</Text>
            <Text style={styles.modalText}>
              Kawerify Tech 2025
              {'\n'}kawerifytech.com
              {'\n'}contact@kawerifytech.com
              {'\n'}kawerifytech@gmail.com
              {'\n'}+263 71 626 4988
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Terms of Service Modal
  const TermsOfServiceModal = () => (
    <Modal
      visible={showTermsOfService}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTermsOfService(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <TouchableOpacity onPress={() => setShowTermsOfService(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalLastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

            <Text style={styles.modalSection}>1. Agreement to Terms</Text>
            <Text style={styles.modalText}>
              By accessing or using Flo Orders, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
            </Text>

            <Text style={styles.modalSection}>2. Use License</Text>
            <Text style={styles.modalText}>
              Permission is granted to temporarily download one copy of the app for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </Text>

            <Text style={styles.modalSection}>3. User Account</Text>
            <Text style={styles.modalText}>
              To access certain features of the app, you must register for an account. You agree to:
              {'\n'}- Provide accurate information
              {'\n'}- Maintain the security of your account
              {'\n'}- Accept responsibility for all activities under your account
              {'\n'}- Notify us immediately of any security breaches
            </Text>

            <Text style={styles.modalSection}>4. Prohibited Uses</Text>
            <Text style={styles.modalText}>
              You may not:
              {'\n'}- Use the service for any illegal purpose
              {'\n'}- Violate any laws in your jurisdiction
              {'\n'}- Attempt to gain unauthorized access to any portion of the service
              {'\n'}- Interfere with or disrupt the service
            </Text>

            <Text style={styles.modalSection}>5. Service Modifications</Text>
            <Text style={styles.modalText}>
              We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
            </Text>

            <Text style={styles.modalSection}>6. Limitation of Liability</Text>
            <Text style={styles.modalText}>
              In no event shall Flo Orders be liable for any damages arising out of the use or inability to use the service, even if we have been notified of the possibility of such damages.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!auth.currentUser) {
    return (
      <SafeAreaLayout>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#FF5252" />
            <Text style={styles.errorText}>Please sign in to view your profile</Text>
          </View>
        </ScrollView>
      </SafeAreaLayout>
    );
  }

  return (
    <SafeAreaLayout contentStyle={{ backgroundColor: '#F5F5F5' }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6A0DAD" />
        </View>
      )}
      
      {/* Background Circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Profile & Settings</Text>
        <Text style={styles.refillText}>Refill Fuel</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : clientData ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Overview</Text>
                {renderProfileItem('Name', clientData.name)}
                {renderProfileItem('Email', clientData.email)}
                {renderProfileItem('Balance', `$${clientData.balance.toFixed(2)}`)}
                {renderProfileItem('Pump Price', `$${clientData.pumpPrice.toFixed(2)}/L`)}
              </View>

              <Divider style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                {renderProfileItem('Phone', clientData.cellPhone)}
                {renderProfileItem('Contact Person', clientData.contactPerson)}
                {renderProfileItem('Address', clientData.address)}
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Details</Text>
                {renderProfileItem('VAT Number', clientData.vatNumber)}
                {renderProfileItem('TIN Number', clientData.tinNumber)}
                <Text style={styles.labelText}>Registered Vehicles</Text>
                {clientData.vehicle.map((vehicle, index) => (
                  <Text key={`vehicle-${index}`} style={styles.vehicleText}>
                    {vehicle}
                  </Text>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Statistics</Text>
                {renderProfileItem('Total Fuel Purchased', `${clientData.totalFuelPurchased.toFixed(2)}L`)}
                {renderProfileItem('Total Value', `$${clientData.totalValue.toFixed(2)}`)}
                <View style={styles.statusContainer}>
                  <Text style={styles.labelText}>Account Status</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: clientData.status.toLowerCase() === 'active' ? '#4CAF50' : '#FFA000' }
                  ]}>
                    <Text style={styles.statusText}>
                      {clientData.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#FF5252" />
              <Text style={styles.errorText}>No profile data found</Text>
            </View>
          )}
        </View>

        {/* Settings Card */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <List.Section>
            <List.Subheader>Privacy</List.Subheader>
            <List.Item
              title="Push Notifications"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
            />
            <List.Item
              title="Location Services"
              left={props => <List.Icon {...props} icon="map-marker" />}
              right={() => (
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                />
              )}
            />
          </List.Section>

          <Divider />

          <List.Section>
            <List.Subheader>Legal</List.Subheader>
            <List.Item
              title="User Agreement"
              left={props => <List.Icon {...props} icon="file-document" />}
              onPress={openUserAgreement}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Privacy Policy"
              left={props => <List.Icon {...props} icon="shield-account" />}
              onPress={openPrivacyPolicy}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="Terms of Service"
              left={props => <List.Icon {...props} icon="file-document" />}
              onPress={openTermsOfService}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
            <List.Item
              title="More Info"
              left={props => <List.Icon {...props} icon="information" />}
              onPress={openMoreInfo}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>

          <Divider />

          <List.Section>
            <List.Subheader>Account</List.Subheader>
            <List.Item
              title="Logout"
              left={props => <List.Icon {...props} icon="logout" />}
              onPress={handleLogout}
              right={props => <List.Icon {...props} icon="chevron-right" />}
            />
          </List.Section>

          <View style={styles.versionContainer}>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <PrivacyPolicyModal />
      <TermsOfServiceModal />
    </SafeAreaLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  headerContainer: {
    backgroundColor: '#6A0DAD',
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  refillText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: '#9575CD',
    borderRadius: 100,
    top: -50,
    right: -50,
    opacity: 0.2,
    zIndex: 0,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    backgroundColor: '#7E57C2',
    borderRadius: 75,
    bottom: 100,
    left: -50,
    opacity: 0.15,
    zIndex: 0,
  },
  circle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: '#B39DDB',
    borderRadius: 50,
    bottom: -20,
    right: 30,
    opacity: 0.2,
    zIndex: 0,
  },
  profileCard: {
    ...commonStyles.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  settingsCard: {
    ...commonStyles.glassCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  profileItem: {
    marginBottom: 12,
  },
  labelText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF5252',
    textAlign: 'center',
    padding: 20,
  },
  vehicleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  versionContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  version: {
    color: '#666',
    fontSize: 14,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    height: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  modalScrollView: {
    flex: 1,
  },
  modalLastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  modalSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 10,
  },
}); 