import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { collection, query, getDocs, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';

interface Client {
  id: string;
  name: string;
  email: string;
  cellPhone: string;
  balance: number;
  status: string;
}

const DEFAULT_CLIENT: Partial<Client> = {
  balance: 0,
  status: 'Active'
};

const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const robotAnimation = new Animated.Value(0);

  // Animate the robot
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(robotAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(robotAnimation, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  // Fetch clients data
  const fetchClients = async () => {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const clientsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          email: data.email || 'No email',
          cellPhone: data.cellPhone || 'No phone',
          balance: Number(data.balance) || 0,
          status: data.status || 'Active'
        } as Client;
      });

      setClients(clientsList);
      setFilteredClients(clientsList);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(text.toLowerCase()) ||
      client.email.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredClients(filtered);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const renderClient = ({ item }: { item: Client }) => {
    // Determine card color and status based on balance
    const getCardStatus = (balance: number) => {
      if (balance <= 0) return {
        color: '#FF4C4C',
        icon: 'warning',
        label: 'DANGER',
        labelColor: '#FFE0E0'
      };
      if (balance < 100) return {
        color: '#FFA500',
        icon: 'alert-circle',
        label: 'WARNING',
        labelColor: '#FFF3E0'
      };
      return {
        color: '#4CAF50',
        icon: 'checkmark-circle',
        label: 'SAFE',
        labelColor: '#E8F5E9'
      };
    };

    const status = getCardStatus(Number(item.balance) || 0);

    return (
      <Animated.View 
        style={[
          styles.clientItem,
          { 
            backgroundColor: status.color,
            transform: [{
              scale: robotAnimation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.02, 1]
              })
            }]
          }
        ]}
      >
        <View style={styles.clientIcon}>
          <Icon name="person-circle" size={40} color="white" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.clientName}>{item.name || 'Unknown'}</Text>
          
          <View style={styles.detailRow}>
            <Icon name="mail" size={16} color="white" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.email || 'No email'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="call" size={16} color="white" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.cellPhone || 'No phone'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="wallet" size={16} color="white" style={styles.detailIcon} />
            <Text style={styles.detailText}>Balance: ${Number(item.balance).toFixed(2)}</Text>
          </View>

          <View style={styles.statusContainer}>
            <Icon 
              name={item.status?.toLowerCase() === 'active' ? 'checkmark-circle' : 'alert-circle'} 
              size={16} 
              color="white" 
              style={styles.detailIcon} 
            />
            <Text style={[styles.statusText, { color: 'white' }]}>
              {item.status || 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.fuelIconContainer}>
          <View style={[styles.statusBadge, { backgroundColor: status.labelColor }]}>
            <Icon 
              name={status.icon} 
              size={16} 
              color={status.color} 
              style={styles.statusBadgeIcon} 
            />
            <Text style={[styles.statusBadgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Icon 
            name="gas-station" 
            size={24} 
            color="white" 
            style={styles.fuelIcon} 
          />
          <Text style={styles.balanceText}>
            ${Number(item.balance).toFixed(2)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A0DAD" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </SafeAreaLayout>
    );
  }

  return (
    <SafeAreaLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Client Fuel Status</Text>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearButton}
            >
              <Icon name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredClients}
          keyExtractor={(item: Client) => item.id}
          renderItem={renderClient}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'No clients found matching your search'
                  : 'No clients available'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaLayout>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#6A0DAD',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  clientItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clientIcon: {
    marginRight: 12,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'white',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fuelIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
    minWidth: 100,
  },
  fuelIcon: {
    marginBottom: 4,
  },
  balanceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusBadgeIcon: {
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ClientList;
