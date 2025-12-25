import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Modal, Alert, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, updatePassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

// Available languages
const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
];

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'attendant' | 'client' | null>(null);

  const router = useRouter();
  const auth = getAuth();

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        const savedNotifications = await AsyncStorage.getItem('notifications');
        
        if (savedLanguage) setLanguage(savedLanguage);
        if (savedNotifications) setNotifications(savedNotifications === 'true');
        
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
    
    // Fetch user data
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log('No user found');
          router.replace('/signin');
          return;
        }

        const userEmail = user.email;
        if (__DEV__) {
          console.log('Current user email:', userEmail);
        }
        setUserEmail(userEmail || '');
        
        // Check if user is attendant by checking the attendants collection
        const attendantsRef = collection(db, 'attendants');
        const q = query(attendantsRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          if (__DEV__) {
            console.log('User is attendant');
          }
          setUserRole('attendant');
          const attendantData = querySnapshot.docs[0].data();
          setUserData(attendantData);
          // Load attendant settings if they exist
          if (attendantData.language) setLanguage(attendantData.language);
          if (attendantData.notifications !== undefined) setNotifications(attendantData.notifications);
        } else {
          if (__DEV__) {
            console.log('User is not attendant');
          }
          // If not attendant, redirect to signin
          Alert.alert('Error', 'Unauthorized access');
          await signOut(auth);
          router.replace('/signin');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    fetchUserData();
  }, []);

  // Save settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('language', language);
        await AsyncStorage.setItem('notifications', notifications.toString());
        
        const currentUser = auth.currentUser;
        if (!currentUser || !userRole) return;

        // Only save if user is attendant
        if (userRole === 'attendant') {
          const attendantsRef = collection(db, 'attendants');
          const q = query(attendantsRef, where('email', '==', currentUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const attendantDoc = querySnapshot.docs[0];
            await setDoc(attendantDoc.ref, {
              language,
              notifications,
              updatedAt: new Date(),
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        Alert.alert('Error', 'Failed to save settings');
      }
    };
    
    saveSettings();
  }, [language, notifications, userRole]);

  // Handle password change
  const handleChangePassword = async () => {
    if (!newPassword.trim() || !currentPassword.trim()) {
      Alert.alert('Error', 'Please enter both current and new passwords.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user is currently signed in');
      }

      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setShowChangePasswordModal(false);
      setNewPassword('');
      setCurrentPassword('');
      Alert.alert('Success', 'Password changed successfully!');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect.');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
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
          setLoading(true);
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
            
            // Navigate to signin screen using replace to prevent going back
            router.replace('/signin' as any);
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6A0DAD" />
        </View>
      )}

      <Text style={styles.header}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile Settings</Text>
        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>Email:</Text>
          <Text style={styles.profileValue}>{userEmail || 'Not available'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>Role:</Text>
          <Text style={styles.profileValue}>{userRole || 'Not available'}</Text>
        </View>
        <Pressable 
          style={styles.changePasswordButton} 
          onPress={() => setShowChangePasswordModal(true)}
        >
          <Text style={styles.changePasswordText}>Change Password</Text>
        </Pressable>
      </View>

      {/* App Settings Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.option}>
          <Text style={styles.optionText}>Language</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={language}
              onValueChange={setLanguage}
              style={styles.picker}
            >
              {LANGUAGES.map((lang) => (
                <Picker.Item 
                  key={lang.value} 
                  label={lang.label} 
                  value={lang.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.option}>
          <Text style={styles.optionText}>Notifications</Text>
          <Switch 
            value={notifications} 
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notifications ? '#6A0DAD' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Logout Button */}
      <Pressable 
        style={styles.logoutButton} 
        onPress={handleLogout}
        disabled={loading}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Change Password</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#666"
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Pressable 
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons 
                  name={showCurrentPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color="#666"
                />
              </Pressable>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#666"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Pressable 
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? 'eye-off' : 'eye'} 
                  size={24} 
                  color="#666"
                />
              </Pressable>
            </View>
            
            <View style={styles.modalButtonContainer}>
              <Pressable 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setNewPassword('');
                  setCurrentPassword('');
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                }}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9F9F9', 
    padding: 20 
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#6A0DAD', 
    marginBottom: 20 
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 4,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10 
  },
  option: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  optionText: { 
    fontSize: 16, 
    color: '#333' 
  },
  changePasswordButton: {
    backgroundColor: '#6A0DAD',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  changePasswordText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingRight: 45,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  logoutButton: {
    backgroundColor: '#6A0DAD',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: { 
    color: '#fff', 
    fontSize: 18 
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  saveButton: { 
    backgroundColor: '#6A0DAD' 
  },
  cancelButton: { 
    backgroundColor: '#ccc' 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  pickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    width: 150,
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
    width: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    width: 80,
  },
  profileValue: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
});

export default Settings; 