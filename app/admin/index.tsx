import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../lib/firebaseConfig';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';
import { commonStyles } from '../../constants/theme';

// TypeScript interfaces
interface Client {
  name: string;
  email: string;
  balance: number;
  petrolPurchases?: number;
  dieselPurchases?: number;
}

interface Attendant {
  name: string;
  email: string;
}

interface Price {
  diesel: string;
  petrol: string;
}

const AdminHome = () => {
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [dieselPrice, setDieselPrice] = useState('');
  const [blendPrice, setBlendPrice] = useState('');
  const [totalAttendants, setTotalAttendants] = useState(0);
  const [dieselPurchases, setDieselPurchases] = useState(0);
  const [petrolPurchases, setPetrolPurchases] = useState(0);
  const [fuelLeft, setFuelLeft] = useState(0);
  const [lowFuelClients, setLowFuelClients] = useState(0);
  const [redFlagClients, setRedFlagClients] = useState(0);
  const [adminEmail, setAdminEmail] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [clientsToShow, setClientsToShow] = useState<Client[]>([]);
  const [attendantsToShow, setAttendantsToShow] = useState<Attendant[]>([]);
  const [clientIndex, setClientIndex] = useState(0);
  const [attendantIndex, setAttendantIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<'diesel' | 'petrol' | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const router = useRouter();

  // Fetch Dashboard Data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const email = await AsyncStorage.getItem('adminEmail');
        if (email) setAdminEmail(email);

        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map((doc) => doc.data() as Client);
        setClients(clientsData);
        setClientsToShow(clientsData.slice(0, 2));

        const attendantsSnapshot = await getDocs(collection(db, 'attendants'));
        const attendantsData = attendantsSnapshot.docs.map((doc) => doc.data() as Attendant);
        setAttendants(attendantsData);
        setAttendantsToShow(attendantsData.slice(0, 2));
        setTotalAttendants(attendantsData.length);

        setTotalCustomers(clientsData.length + attendantsData.length);

        let diesel = 0;
        let petrol = 0;
        let redFlagCount = 0;
        let lowFuelCount = 0;

        clientsData.forEach(client => {
          if (client.petrolPurchases) petrol += client.petrolPurchases;
          if (client.dieselPurchases) diesel += client.dieselPurchases;
          if (client.balance <= 0) redFlagCount++;
          if (client.balance < 100) lowFuelCount++;
        });

        setDieselPurchases(diesel);
        setPetrolPurchases(petrol);
        setRedFlagClients(redFlagCount);
        setLowFuelClients(lowFuelCount);
        setFuelLeft(1000);

        // Fetch prices
        const pricesDoc = await getDoc(doc(db, 'prices', 'prices'));
        if (pricesDoc.exists()) {
          const prices = pricesDoc.data() as Price;
          setDieselPrice(prices.diesel);
          setBlendPrice(prices.petrol);
        }

      } catch (error) {
        console.error('Error fetching data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdatePrice = async () => {
    if (!editingPrice || !newPrice) return;

    try {
      const priceRef = doc(db, 'prices', 'prices');
      await updateDoc(priceRef, {
        [editingPrice]: newPrice
      });

      if (editingPrice === 'diesel') {
        setDieselPrice(newPrice);
      } else {
        setBlendPrice(newPrice);
      }

      setShowPriceModal(false);
      setEditingPrice(null);
      setNewPrice('');
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const nextClients = () => {
    if (clientIndex + 2 < clients.length) {
      const newIndex = clientIndex + 2;
      setClientIndex(newIndex);
      setClientsToShow(clients.slice(newIndex, newIndex + 2));
    }
  };

  const previousClients = () => {
    if (clientIndex - 2 >= 0) {
      const newIndex = clientIndex - 2;
      setClientIndex(newIndex);
      setClientsToShow(clients.slice(newIndex, newIndex + 2));
    }
  };

  const nextAttendants = () => {
    if (attendantIndex + 2 < attendants.length) {
      const newIndex = attendantIndex + 2;
      setAttendantIndex(newIndex);
      setAttendantsToShow(attendants.slice(newIndex, newIndex + 2));
    }
  };

  const previousAttendants = () => {
    if (attendantIndex - 2 >= 0) {
      const newIndex = attendantIndex - 2;
      setAttendantIndex(newIndex);
      setAttendantsToShow(attendants.slice(newIndex, newIndex + 2));
    }
  };

  if (loading) {
    return (
      <SafeAreaLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A0DAD" />
        </View>
      </SafeAreaLayout>
    );
  }

  return (
    <SafeAreaLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity onPress={() => router.push('/admin/settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>

        <View style={styles.metricCard}>
          <Ionicons name="water" size={24} color="#6A0DAD" />
          <Text style={styles.metricValue}>${dieselPrice}</Text>
          <Text style={styles.metricLabel}>Diesel Price</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingPrice('diesel');
              setNewPrice(dieselPrice);
              setShowPriceModal(true);
            }}
          >
            <Ionicons name="pencil" size={16} color="#6A0DAD" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="flame" size={24} color="#6A0DAD" />
          <Text style={styles.metricValue}>${blendPrice}</Text>
          <Text style={styles.metricLabel}>Blend Price</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingPrice('petrol');
              setNewPrice(blendPrice);
              setShowPriceModal(true);
            }}
          >
            <Ionicons name="pencil" size={16} color="#6A0DAD" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="people" size={24} color="#6A0DAD" />
          <Text style={styles.metricValue}>{totalAttendants}</Text>
          <Text style={styles.metricLabel}>Attendants</Text>
        </View>

        <View style={[styles.metricCard, styles.warningCard]}>
          <Ionicons name="warning" size={24} color="#FF5733" />
          <Text style={[styles.metricValue, styles.warningText]}>{lowFuelClients}</Text>
          <Text style={styles.metricLabel}>Low Fuel Clients</Text>
        </View>

        <View style={[styles.metricCard, styles.warningCard]}>
          <Ionicons name="alert-circle" size={24} color="#FF5733" />
          <Text style={[styles.metricValue, styles.warningText]}>{redFlagClients}</Text>
          <Text style={styles.metricLabel}>Red Flag Clients</Text>
        </View>
      </View>

      <Modal
        visible={showPriceModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update {editingPrice === 'diesel' ? 'Diesel' : 'Blend'} Price</Text>
            <TextInput
              style={styles.priceInput}
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              placeholder="Enter new price"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPriceModal(false);
                  setEditingPrice(null);
                  setNewPrice('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleUpdatePrice}
              >
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Clients</Text>
        <View style={styles.listContainer}>
          {clientsToShow.map((client, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="person-circle" size={24} color="#6A0DAD" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{client.name}</Text>
                <Text style={styles.listItemSubtitle}>{client.email}</Text>
                <Text style={[styles.listItemBalance, client.balance <= 0 && styles.negativeBalance]}>
                  Balance: ${client.balance}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            style={[styles.paginationButton, clientIndex === 0 && styles.disabledButton]} 
            onPress={previousClients}
            disabled={clientIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={clientIndex === 0 ? "#ccc" : "#6A0DAD"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paginationButton, clientIndex + 2 >= clients.length && styles.disabledButton]}
            onPress={nextClients}
            disabled={clientIndex + 2 >= clients.length}
          >
            <Ionicons name="chevron-forward" size={24} color={clientIndex + 2 >= clients.length ? "#ccc" : "#6A0DAD"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Attendants</Text>
        <View style={styles.listContainer}>
          {attendantsToShow.map((attendant, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="person" size={24} color="#6A0DAD" />
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{attendant.name}</Text>
                <Text style={styles.listItemSubtitle}>{attendant.email}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            style={[styles.paginationButton, attendantIndex === 0 && styles.disabledButton]}
            onPress={previousAttendants}
            disabled={attendantIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={attendantIndex === 0 ? "#ccc" : "#6A0DAD"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paginationButton, attendantIndex + 2 >= attendants.length && styles.disabledButton]}
            onPress={nextAttendants}
            disabled={attendantIndex + 2 >= attendants.length}
          >
            <Ionicons name="chevron-forward" size={24} color={attendantIndex + 2 >= attendants.length ? "#ccc" : "#6A0DAD"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/admin/clients')}>
          <Ionicons name="people" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Manage Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/admin/threshold')}>
          <Ionicons name="shield-checkmark" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Manage Attendants</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/admin/activities')}>
          <Ionicons name="fitness" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>View Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/admin/settings')}>
          <Ionicons name="settings" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#6A0DAD',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adminEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    ...commonStyles.glassCard,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  warningCard: {
    backgroundColor: 'rgba(255, 245, 245, 0.7)',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A0DAD',
    marginVertical: 8,
  },
  warningText: {
    color: '#FF5733',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    padding: 20,
    ...commonStyles.glassCard,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  listContainer: {
    backgroundColor: '#fff',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemContent: {
    marginLeft: 15,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listItemBalance: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 2,
  },
  negativeBalance: {
    color: '#dc3545',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  paginationButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtons: {
    padding: 20,
  },
  actionButton: {
    backgroundColor: '#6A0DAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  updateButton: {
    backgroundColor: '#6A0DAD',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AdminHome;
