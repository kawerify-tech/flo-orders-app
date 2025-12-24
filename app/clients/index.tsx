import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  limit,
  getDoc,
  DocumentData,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface ClientDashboardProps {
  navigation?: any;
}

interface Transaction {
  id: string;
  amount: number;
  litres: number;
  fuelType: 'diesel' | 'blend';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  vehicle: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
  attendantName: string;
  pumpPrice: number;
  clientEmail: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  balance: number;
  pumpPrice: string;
  vatNumber: string;
  tinNumber: string;
  totalFuelPurchased: number;
  totalValue: number;
  status: string;
  vehicle: string[];
  totalRefills: number;
}

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  // Add other screens as needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ClientDashboard: React.FC<ClientDashboardProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Transaction[]>([]);
  const [pumpPrices, setPumpPrices] = useState<{ petrol: string; diesel: string }>({
    petrol: '0',
    diesel: '0'
  });
  const auth = getAuth();

  useEffect(() => {
    let unsubscribeTransactions: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user?.email) {
        console.log('Fetching data for:', user.email);
        // Store the unsubscribe function returned by fetchClientData
        const cleanup = await fetchClientData(user.email);
        unsubscribeTransactions = cleanup;
      } else {
        console.log('No authenticated user');
        setLoading(false);
        setClientData(null);
        navigation?.navigate('Login');
      }
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, []);

  useEffect(() => {
    const fetchPumpPrices = async () => {
      try {
        const pricesRef = collection(db, 'prices');
        const pricesQuery = query(pricesRef, orderBy('timestamp', 'desc'), limit(1));
        const pricesSnapshot = await getDocs(pricesQuery);
        
        if (!pricesSnapshot.empty) {
          const latestPrices = pricesSnapshot.docs[0].data();
          setPumpPrices({
            petrol: latestPrices.petrol || '0',
            diesel: latestPrices.diesel || '0'
          });
        }
      } catch (error) {
        console.error('Error fetching pump prices:', error);
      }
    };

    fetchPumpPrices();
  }, []);

  const fetchClientData = async (email: string): Promise<() => void> => {
    if (!email) {
      setLoading(false);
      return () => {};
    }

    try {
      // First fetch client data using query
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No client document found for:', email);
        Alert.alert(
          'Account Not Found',
          'Please contact support to set up your client account.',
          [{ text: 'OK' }]
        );
        setClientData(null);
        setLoading(false);
        return () => {};
      }

      // Get the first matching document
      const clientDoc = querySnapshot.docs[0];
      const clientDocData = clientDoc.data();

      // Set client data with type safety
      setClientData({
        id: clientDoc.id,
        name: clientDocData?.name || '',
        email: clientDocData?.email?.toLowerCase() || email.toLowerCase(),
        balance: Number(clientDocData?.balance || 0),
        pumpPrice: clientDocData?.pumpPrice || '0',
        vatNumber: clientDocData?.vatNumber || '',
        tinNumber: clientDocData?.tinNumber || '',
        totalFuelPurchased: Number(clientDocData?.totalFuelPurchased || 0),
        totalValue: Number(clientDocData?.totalValue || 0),
        status: clientDocData?.status || 'active',
        vehicle: Array.isArray(clientDocData?.vehicle) ? clientDocData.vehicle : [],
        totalRefills: Number(clientDocData?.totalRefills || 0)
      });

      console.log('Client data fetched successfully:', clientDocData);

      // Set up real-time listener for transactions with pagination
      const BATCH_SIZE = 10; // Smaller batch size for better performance
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(
          transactionsRef,
        where('clientEmail', '==', email.toLowerCase()),
        where('status', 'in', ['pending', 'completed']), // Filter at database level
        orderBy('timestamp', 'desc'), // We need this index for large datasets
        limit(BATCH_SIZE)
      );

      // Create the required index in Firebase Console or add this to your deployment
      // Required index: collection="transactions", 
      // fields: clientEmail ASC, status ASC, timestamp DESC

      const unsubscribe = onSnapshot(transactionsQuery, 
        (snapshot) => {
          const allTransactions = snapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp instanceof Timestamp 
              ? data.timestamp 
              : Timestamp.now();

            return {
          id: doc.id,
              amount: Number(data.amount || 0),
              litres: Number(data.litres || 0),
              fuelType: data.fuelType as 'diesel' | 'blend',
              status: data.status as 'pending' | 'approved' | 'rejected' | 'completed',
              vehicle: data.vehicle || '',
              timestamp: {
                seconds: timestamp.seconds,
                nanoseconds: timestamp.nanoseconds,
                toDate: () => timestamp.toDate()
              },
              attendantName: data.attendantName || '',
              pumpPrice: Number(data.pumpPrice || 0),
              clientEmail: data.clientEmail || email.toLowerCase()
            } satisfies Transaction;
          });

          // No need to sort since we're using orderBy in the query
          const completedTransactions = allTransactions
            .filter(t => t.status === 'completed')
            .slice(0, 5); // Show fewer recent transactions

          const pendingTransactions = allTransactions
            .filter(t => t.status === 'pending');

          setRecentTransactions(completedTransactions);
          setPendingInvoices(pendingTransactions);
          
          console.log(`Fetched ${allTransactions.length} recent transactions`);
        },
        (error) => {
          console.error('Error subscribing to transactions:', error);
          if (error.code === 'permission-denied') {
            Alert.alert('Error', 'You do not have permission to view these transactions');
          } else if (error.code === 'resource-exhausted') {
            Alert.alert('Error', 'Too many requests. Please try again later');
      } else {
            Alert.alert('Error', 'Failed to load transactions');
          }
      }
      );

      setLoading(false);
      return unsubscribe;

    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
      setLoading(false);
      return () => {};
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user?.email) {
      await fetchClientData(user.email);
    } else {
      setLoading(false);
      Alert.alert('Error', 'Please login again');
      navigation?.navigate('Login');
    }
  };

  const calculateMonthlyUsage = () => {
    if (!recentTransactions.length) return 0;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = recentTransactions.filter(transaction => {
      const transactionDate = transaction.timestamp.toDate();
      return transactionDate >= firstDayOfMonth && transactionDate <= now;
    });
    
    return monthlyTransactions.reduce((total, transaction) => total + transaction.litres, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A0DAD" />
      </View>
    );
  }

  if (!clientData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No client profile found</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Icon name="refresh" size={24} color="#6A0DAD" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <LinearGradient
        colors={['#8A2BE2', '#6A0DAD']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.nameText}>{clientData?.name}</Text>
          <Text style={styles.emailText}>{clientData?.email}</Text>
        <Text style={styles.dateText}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>
      </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="wallet-outline" size={24} color="#6A0DAD" />
          <Text style={styles.statTitle}>Balance</Text>
          <Text style={styles.statValue}>
            ${clientData?.balance?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="receipt-outline" size={24} color="#6A0DAD" />
          <Text style={styles.statTitle}>Total Receipts</Text>
          <Text style={styles.statValue}>
            {clientData?.totalRefills?.toLocaleString() || '0'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="trending-up-outline" size={24} color="#6A0DAD" />
          <Text style={styles.statTitle}>Monthly Usage</Text>
          <Text style={styles.statValue}>
            {calculateMonthlyUsage().toFixed(2)}L
          </Text>
        </View>
      </View>

      {/* Client Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Account Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>VAT Number:</Text>
          <Text style={styles.detailValue}>{clientData?.vatNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>TIN Number:</Text>
          <Text style={styles.detailValue}>{clientData?.tinNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Fuel:</Text>
          <Text style={styles.detailValue}>
            {clientData?.totalFuelPurchased?.toLocaleString()}L
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Value:</Text>
          <Text style={styles.detailValue}>
            ${clientData?.totalValue?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: clientData?.status === 'active' ? '#4CAF50' : '#FF5252' }]}>
            <Text style={styles.statusText}>{clientData?.status?.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Fuel Usage Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fuel Usage Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="bar-chart-outline" size={24} color="#6A0DAD" />
              <Text style={styles.summaryLabel}>Monthly Usage</Text>
              <Text style={styles.summaryValue}>
                {calculateMonthlyUsage().toFixed(2)} L
                </Text>
              </View>
            <View style={styles.summaryItem}>
              <Icon name="trending-up-outline" size={24} color="#6A0DAD" />
              <Text style={styles.summaryLabel}>Efficiency</Text>
              <Text style={styles.summaryValue}>
                {clientData?.totalValue && clientData?.totalFuelPurchased ? 
                  (clientData.totalValue / clientData.totalFuelPurchased).toFixed(2) : '0'} $/L
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Registered Vehicles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Vehicles</Text>
        <View style={styles.vehiclesContainer}>
          {clientData?.vehicle && clientData.vehicle.length > 0 ? (
            clientData.vehicle.map((vehicle, index) => (
              <View key={index} style={styles.vehicleCard}>
                <Icon name="car-outline" size={24} color="#6A0DAD" />
                <Text style={styles.vehicleText}>{vehicle}</Text>
              </View>
          ))
        ) : (
            <Text style={styles.emptyText}>No vehicles registered</Text>
        )}
        </View>
      </View>

      <View style={styles.pricesContainer}>
        <Text style={styles.priceText}>Diesel: ${pumpPrices.diesel}/L</Text>
        <Text style={styles.priceText}>Petrol: ${pumpPrices.petrol}/L</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: -30,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 4,
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionDetail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 8,
    color: '#6A0DAD',
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    padding: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 4,
  },
  vehiclesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  vehicleText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  pricesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ClientDashboard; 