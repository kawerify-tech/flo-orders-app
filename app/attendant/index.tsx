import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { collection, query, orderBy, onSnapshot, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { commonStyles } from '../../constants/theme';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';

// Types
interface Stats {
  totalClients: number;
  activeClients: number;
  lowBalanceClients: number;
  pumpPrices: {
    diesel: number;
    petrol: number;
  };
}

interface Client {
  id: string;
  name: string;
  status: string;
  balance: number;
  email: string;
  cellPhone: string;
}

const AttendantDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeClients: 0,
    lowBalanceClients: 0,
    pumpPrices: {
      diesel: 0,
      petrol: 0
    }
  });
  const [lowBalanceClients, setLowBalanceClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const pricesRef = doc(db, 'prices', 'prices');

        // Fetch pump prices
        const pricesDoc = await getDoc(pricesRef);
        const pricesData = pricesDoc.exists() ? pricesDoc.data() : { diesel: '0', petrol: '0' };

        // Low Balance Clients Query
        const lowBalanceQuery = query(
          clientsRef,
          where('balance', '<', 100),
          orderBy('balance'),
          limit(5)
        );

        // Set up listener for low balance clients
        const unsubscribeLowBalance = onSnapshot(lowBalanceQuery, (snapshot) => {
          const clientsData: Client[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            clientsData.push({
              id: doc.id,
              name: data.name || 'Unknown',
              status: data.status || 'Unknown',
              balance: Number(data.balance) || 0,
              email: data.email || 'No email',
              cellPhone: data.cellPhone || 'No phone'
            });
          });
          setLowBalanceClients(clientsData);
        });

        // Fetch Stats
        const totalClientsQuery = query(clientsRef);
        const activeClientsQuery = query(clientsRef, where('status', '==', 'active'));
        const lowBalanceCountQuery = query(clientsRef, where('balance', '<', 100));

        const [
          clientsSnapshot,
          activeClientsSnapshot,
          lowBalanceSnapshot
        ] = await Promise.all([
          getDocs(totalClientsQuery),
          getDocs(activeClientsQuery),
          getDocs(lowBalanceCountQuery)
        ]);

        setStats({
          totalClients: clientsSnapshot.size,
          activeClients: activeClientsSnapshot.size,
          lowBalanceClients: lowBalanceSnapshot.size,
          pumpPrices: {
            diesel: Number(pricesData.diesel) || 0,
            petrol: Number(pricesData.petrol) || 0
          }
        });

        setLoading(false);

        return () => {
          unsubscribeLowBalance();
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, isPriceCard = false }: { 
    title: string; 
    value: number; 
    icon: string;
    isPriceCard?: boolean;
  }) => (
    <View style={[styles.statCard, isPriceCard && styles.priceCard]}>
      <Ionicons name={icon as any} size={24} color="#6A0DAD" />
      <Text style={styles.statValue}>
        {isPriceCard ? `$ ${value.toFixed(2)}` : value}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderClientItem = ({ item }: { item: Client }) => {
    const getStatusColor = (balance: number) => {
      if (balance <= 0) return '#FF4C4C';
      if (balance < 100) return '#FFA500';
      return '#4CAF50';
    };

    return (
      <View style={[styles.listItem, { borderLeftColor: getStatusColor(item.balance) }]}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemTitle}>{item.name}</Text>
          <Text style={[styles.badge, { backgroundColor: getStatusColor(item.balance) }]}>
            $ {item.balance.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.listItemSubtitle}>{item.email}</Text>
        <Text style={styles.listItemSubtitle}>{item.cellPhone}</Text>
        <Text style={[styles.statusText, { color: item.status === 'active' ? '#4CAF50' : '#FF4C4C' }]}>
          {item.status}
        </Text>
      </View>
    );
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
          <View style={styles.headerContent}>
            <Ionicons name="person-circle" size={32} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Attendant Dashboard</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <StatCard 
            title="Total Clients" 
            value={stats.totalClients} 
            icon="people" 
          />
          <StatCard 
            title="Active Clients" 
            value={stats.activeClients} 
            icon="people-circle" 
          />
          <StatCard 
            title="Low Balance" 
            value={stats.lowBalanceClients} 
            icon="warning" 
          />
        </View>

        <View style={styles.pricesContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag" size={24} color="#6A0DAD" />
            <Text style={styles.sectionTitle}>Current Pump Prices</Text>
          </View>
          <View style={styles.priceCardsContainer}>
            <StatCard 
              title="Diesel" 
              value={stats.pumpPrices.diesel} 
              icon="car" 
              isPriceCard 
            />
            <StatCard 
              title="Petrol" 
              value={stats.pumpPrices.petrol} 
              icon="car-sport" 
              isPriceCard 
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color="#6A0DAD" />
            <Text style={styles.sectionTitle}>Low Balance Clients</Text>
          </View>
          <FlatList
            data={lowBalanceClients}
            renderItem={renderClientItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      </ScrollView>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6A0DAD',
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
    ...commonStyles.glassCard,
    margin: 16,
    borderRadius: 12,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    ...commonStyles.glassCard,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  horizontalList: {
    paddingRight: 16,
  },
  listItem: {
    ...commonStyles.glassCard,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    marginBottom: 8,
    width: 280,
    borderLeftWidth: 4,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  pricesContainer: {
    padding: 16,
    ...commonStyles.glassCard,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  priceCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  priceCard: {
    width: '48%',
    backgroundColor: 'rgba(248, 249, 250, 0.75)',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statCard: {
    ...commonStyles.glassCard,
    borderRadius: 12,
    padding: 16,
    width: '30%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginVertical: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
});

export default AttendantDashboard;
