import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, Timestamp, getDoc, setDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  litres: number;
  status: 'pending' | 'completed' | 'rejected';
  vehicle: string;
  fuelType: 'diesel' | 'petrol';
  timestamp: Timestamp;
  updatedAt?: Timestamp;
  pumpPrice: string;
  metadata: {
    clientBalance: number;
    remainingFuel: number;
  };
  attendantId?: string;
  attendantName?: string;
  processedAt?: Timestamp;
  processingSteps?: Array<{
    step: string;
    timestamp: Timestamp;
    status: string;
    attendantId: string;
    attendantName: string;
  }>;
}

interface TransactionsByStatus {
  pending: Transaction[];
  completed: Transaction[];
  rejected: Transaction[];
}

interface Client {
  id: string;
  name: string;
  email: string;
  balance: number;
  vehicles: string[];
}

interface CreateTransactionForm {
  clientEmail: string;
  clientName: string;
  vehicle: string;
  fuelType: 'diesel' | 'petrol';
  litres: string;
  amount: string;
  selectedClient: Client | null;
}

const TransactionScreen: React.FC = () => {
  const [transactionsByStatus, setTransactionsByStatus] = useState<TransactionsByStatus>({
    pending: [],
    completed: [],
    rejected: []
  });
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showClientList, setShowClientList] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [pumpPrices, setPumpPrices] = useState({ diesel: '0', petrol: '0' });
  
  const [createForm, setCreateForm] = useState<CreateTransactionForm>({
    clientEmail: '',
    clientName: '',
    vehicle: '',
    fuelType: 'diesel',
    litres: '',
    amount: '',
    selectedClient: null
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Fetch pump prices
  useEffect(() => {
    const fetchPumpPrices = async () => {
      try {
        const pricesRef = doc(db, 'prices', 'prices');
        const pricesDoc = await getDoc(pricesRef);
        
        if (pricesDoc.exists()) {
          const pricesData = pricesDoc.data();
          setPumpPrices({
            diesel: pricesData.diesel || '0',
            petrol: pricesData.petrol || '0'
          });
        }
      } catch (error) {
        console.error('Error fetching pump prices:', error);
      }
    };

    fetchPumpPrices();
  }, []);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientsList: Client[] = [];
        
        clientsSnapshot.forEach((doc) => {
          const data = doc.data();
          clientsList.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            balance: Number(data.balance) || 0,
            vehicles: Array.isArray(data.vehicle) ? data.vehicle : []
          });
        });
        
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, []);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const transactionsRef = collection(db, 'transactions');
        const q = query(transactionsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        const pending = transactions.filter(t => t.status === 'pending');
        const completed = transactions.filter(t => t.status === 'completed');
        const rejected = transactions.filter(t => t.status === 'rejected');
        
        setTransactionsByStatus({ pending, completed, rejected });
        setAllTransactions(transactions);
        setFilteredTransactions(transactions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const refreshTransactions = async () => {
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      const transactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() } as Transaction);
      });

      const pending = transactions.filter(t => t.status === 'pending');
      const completed = transactions.filter(t => t.status === 'completed');
      const rejected = transactions.filter(t => t.status === 'rejected');

      setTransactionsByStatus({ pending, completed, rejected });
      setAllTransactions(transactions);
      setFilteredTransactions(transactions);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  };

  // Filter transactions based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions(allTransactions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allTransactions.filter(transaction => 
      transaction.clientName.toLowerCase().includes(query) ||
      transaction.clientEmail.toLowerCase().includes(query) ||
      transaction.vehicle.toLowerCase().includes(query) ||
      transaction.id.toLowerCase().includes(query)
    );
    
    setFilteredTransactions(filtered);
  }, [searchQuery, allTransactions]);

  // Filter clients based on search query
  useEffect(() => {
    if (clientSearchQuery.trim() === '') {
      setFilteredClients(clients);
      return;
    }

    const query = clientSearchQuery.toLowerCase();
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    );
    setFilteredClients(filtered);
  }, [clientSearchQuery, clients]);

  // Clear form when modal opens/closes
  useEffect(() => {
    if (!modalVisible) {
      setCreateForm({
        clientEmail: '',
        clientName: '',
        vehicle: '',
        fuelType: 'diesel',
        litres: '',
        amount: '',
        selectedClient: null
      });
      setShowClientList(false);
    }
  }, [modalVisible]);

  // Calculate litres based on amount and pump price
  const calculateLitres = (amount: string, fuelType: 'diesel' | 'petrol'): string => {
    if (!amount || isNaN(Number(amount))) return '';
    const amountNum = Number(amount);
    const price = Number(pumpPrices[fuelType]);
    if (isNaN(price) || price === 0) return '';
    return (amountNum / price).toFixed(2);
  };

  // Handle amount change and update litres automatically
  const handleAmountChange = (text: string) => {
    const newLitres = calculateLitres(text, createForm.fuelType);
    setCreateForm(prev => ({
      ...prev,
      amount: text,
      litres: newLitres
    }));
  };

  // Handle fuel type change and recalculate litres
  const handleFuelTypeChange = (type: 'diesel' | 'petrol') => {
    const newLitres = calculateLitres(createForm.amount, type);
    setCreateForm(prev => ({
      ...prev,
      fuelType: type,
      litres: newLitres
    }));
  };

  const handleApproveTransaction = async (transaction: Transaction) => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be signed in to approve transactions');
        return;
      }

      const attendantId = currentUser.uid;
      const attendantName = currentUser.displayName || 'Station Attendant';
      const now = Timestamp.now();

      // Update the main transaction status
      const transactionRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transactionRef, {
        status: 'completed',
        updatedAt: now,
        attendantId,
        attendantName,
        processedAt: now,
        processingSteps: [
          ...(transaction.processingSteps || []),
          {
            step: 'approved',
            timestamp: now,
            status: 'completed',
            attendantId,
            attendantName
          }
        ]
      });

      // Update client's transaction copy
      const clientTransactionRef = doc(
        db, 
        `clients/${transaction.clientEmail}/transactions/${transaction.id}`
      );
      try {
        await updateDoc(clientTransactionRef, {
          status: 'completed',
          updatedAt: now,
          attendantId,
          attendantName,
          processedAt: now,
          processingSteps: [
            ...(transaction.processingSteps || []),
            {
              step: 'approved',
              timestamp: now,
              status: 'completed',
              attendantId,
              attendantName
            }
          ]
        });
      } catch (error) {
        console.error('Error updating client transaction copy:', error);
      }

      // Best-effort: update client's balance (do not block approval UI)
      try {
        const clientRef = doc(db, 'clients', transaction.clientEmail);
        await updateDoc(clientRef, {
          balance: increment(-transaction.amount)
        });
      } catch (error) {
        console.error('Error updating client balance:', error);
      }

      // Best-effort: refresh UI
      await refreshTransactions();

      Alert.alert('Success', 'Transaction approved successfully');
    } catch (error) {
      console.error('Error approving transaction:', error);
      Alert.alert('Error', 'Failed to approve transaction. Please check your permissions.');
    }
  };

  const handleRejectTransaction = async (transaction: Transaction) => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be signed in to reject transactions');
        return;
      }

      const attendantId = currentUser.uid;
      const attendantName = currentUser.displayName || 'Station Attendant';
      const now = Timestamp.now();

      // Update the main transaction status
      const transactionRef = doc(db, 'transactions', transaction.id);
      await updateDoc(transactionRef, {
        status: 'rejected',
        updatedAt: now,
        attendantId,
        attendantName,
        processedAt: now,
        processingSteps: [
          ...(transaction.processingSteps || []),
          {
            step: 'rejected',
            timestamp: now,
            status: 'rejected',
            attendantId,
            attendantName
          }
        ]
      });

      // Update client's transaction copy
      const clientTransactionRef = doc(
        db, 
        `clients/${transaction.clientEmail}/transactions/${transaction.id}`
      );
      try {
        await updateDoc(clientTransactionRef, {
          status: 'rejected',
          updatedAt: now,
          attendantId,
          attendantName,
          processedAt: now,
          processingSteps: [
            ...(transaction.processingSteps || []),
            {
              step: 'rejected',
              timestamp: now,
              status: 'rejected',
              attendantId,
              attendantName
            }
          ]
        });
      } catch (error) {
        console.error('Error updating client transaction copy:', error);
      }

      // Best-effort: refresh UI
      await refreshTransactions();

      Alert.alert('Success', 'Transaction rejected successfully');
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      Alert.alert('Error', 'Failed to reject transaction. Please check your permissions.');
    }
  };

  const handleCreateTransaction = async () => {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be signed in to create transactions');
        return;
      }

      if (!createForm.selectedClient || !createForm.vehicle || !createForm.amount) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const amount = Number(createForm.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      if (amount > createForm.selectedClient.balance) {
        Alert.alert('Error', 'Amount exceeds available balance');
        return;
      }

      setLoadingCreate(true);

      const now = Timestamp.now();
      const transactionData = {
        clientId: createForm.selectedClient.id,
        clientName: createForm.selectedClient.name,
        clientEmail: createForm.selectedClient.email,
        amount,
        litres: Number(createForm.litres),
        status: 'pending' as const,
        vehicle: createForm.vehicle,
        fuelType: createForm.fuelType,
        timestamp: now,
        pumpPrice: createForm.fuelType === 'diesel' ? pumpPrices.diesel : pumpPrices.petrol,
        metadata: {
          clientBalance: createForm.selectedClient.balance,
          remainingFuel: 0
        }
      };

      // Create transaction in main collection
      const transactionRef = doc(collection(db, 'transactions'));
      await setDoc(transactionRef, transactionData);

      // Create transaction in client's collection
      try {
        const clientTransactionRef = doc(
          db,
          `clients/${createForm.selectedClient.email}/transactions/${transactionRef.id}`
        );
        await setDoc(clientTransactionRef, transactionData);
      } catch (error) {
        console.error('Error creating client transaction copy:', error);
      }

      // Reset form and close modals
      setCreateForm({
        clientEmail: '',
        clientName: '',
        vehicle: '',
        fuelType: 'diesel',
        litres: '',
        amount: '',
        selectedClient: null
      });
      setShowClientList(false);
      setModalVisible(false);

      // Best-effort: refresh UI (do not show permission error if this fails)
      await refreshTransactions();

      Alert.alert('Success', 'Transaction created successfully');
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please check your permissions.');
    } finally {
      setLoadingCreate(false);
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.clientName} numberOfLines={1} ellipsizeMode="tail">{item.clientName}</Text>
        <Text style={styles.timestamp} numberOfLines={1} ellipsizeMode="tail">
          {item.timestamp.toDate().toLocaleString()}
        </Text>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>$ {item.amount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Litres:</Text>
          <Text style={styles.detailValue}>{item.litres}L</Text>
        </View>
          <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>{item.vehicle}</Text>
          </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fuel Type:</Text>
          <Text style={styles.detailValue}>{item.fuelType}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveTransaction(item)}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectTransaction(item)}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSection = (title: string, data: Transaction[], count: number) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <FlatList
        data={data}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No {title.toLowerCase()} transactions</Text>
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.pumpPrices}>
          <Text style={styles.pumpPriceText}>Diesel: $ {pumpPrices.diesel}</Text>
          <Text style={styles.pumpPriceText}>Petrol: $ {pumpPrices.petrol}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A0DAD" />
        </View>
      ) : (
        <FlatList
          style={styles.transactionsList}
          data={searchQuery ? filteredTransactions : []}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            searchQuery ? (
              null
            ) : (
              <>
                {renderSection('Pending', transactionsByStatus.pending, transactionsByStatus.pending.length)}
                {renderSection('Completed', transactionsByStatus.completed, transactionsByStatus.completed.length)}
                {renderSection('Rejected', transactionsByStatus.rejected, transactionsByStatus.rejected.length)}
              </>
            )
          }
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.emptyText}>No transactions found</Text>
            ) : null
          }
        />
      )}

      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.createButtonText}>Create Transaction</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Transaction</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Client</Text>
                <TouchableOpacity 
                  style={styles.clientSelector}
                  onPress={() => setShowClientList(!showClientList)}
                >
                  <Text style={styles.clientSelectorText}>
                    {createForm.selectedClient ? createForm.selectedClient.name : 'Select a client'}
                  </Text>
                  <Ionicons 
                    name={showClientList ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {showClientList && (
                  <View style={styles.clientListContainer}>
                    <View style={styles.clientSearchContainer}>
                      <Ionicons name="search" size={20} color="#666" style={styles.clientSearchIcon} />
                      <TextInput
                        style={styles.clientSearchInput}
                        placeholder="Search clients..."
                        value={clientSearchQuery}
                        onChangeText={setClientSearchQuery}
                        placeholderTextColor="#999"
                      />
                      {clientSearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setClientSearchQuery('')}
                          style={styles.clientSearchClearButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView style={styles.clientList}>
                      {filteredClients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={styles.clientItem}
                          onPress={() => {
                            setCreateForm({
                              ...createForm,
                              selectedClient: client,
                              clientEmail: client.email,
                              clientName: client.name
                            });
                            setShowClientList(false);
                            setClientSearchQuery('');
                          }}
                        >
                          <Text style={styles.clientItemText}>{client.name}</Text>
                          <Text style={styles.clientBalanceText}>
                            Balance: $ {client.balance.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fuel Type</Text>
                <View style={styles.fuelTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.fuelTypeButton,
                      createForm.fuelType === 'diesel' && styles.fuelTypeButtonActive
                    ]}
                    onPress={() => handleFuelTypeChange('diesel')}
                  >
                    <Ionicons 
                      name="car" 
                      size={20} 
                      color={createForm.fuelType === 'diesel' ? '#FFF' : '#666'} 
                    />
                    <Text 
                      style={[
                        styles.fuelTypeText,
                        createForm.fuelType === 'diesel' && styles.fuelTypeTextActive
                      ]}
                    >
                      Diesel (${pumpPrices.diesel}/L)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.fuelTypeButton,
                      createForm.fuelType === 'petrol' && styles.fuelTypeButtonActive
                    ]}
                    onPress={() => handleFuelTypeChange('petrol')}
                  >
                    <Ionicons 
                      name="car-sport" 
                      size={20} 
                      color={createForm.fuelType === 'petrol' ? '#FFF' : '#666'} 
                    />
                    <Text 
                      style={[
                        styles.fuelTypeText,
                        createForm.fuelType === 'petrol' && styles.fuelTypeTextActive
                      ]}
                    >
                      Petrol (${pumpPrices.petrol}/L)
                    </Text>
                  </TouchableOpacity>
            </View>
                </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vehicle</Text>
                {createForm.selectedClient ? (
                  <View style={styles.vehicleSelector}>
                    {createForm.selectedClient.vehicles.map((vehicle, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.vehicleButton,
                          createForm.vehicle === vehicle && styles.vehicleButtonActive
                        ]}
                        onPress={() => setCreateForm({...createForm, vehicle})}
                      >
                        <Text 
                          style={[
                            styles.vehicleText,
                            createForm.vehicle === vehicle && styles.vehicleTextActive
                          ]}
                        >
                          {vehicle}
                        </Text>
                      </TouchableOpacity>
                    ))}
            </View>
                ) : (
                  <Text style={styles.helperText}>Select a client first to see their vehicles</Text>
            )}
          </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={createForm.amount}
                  onChangeText={handleAmountChange}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Litres</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                  value={createForm.litres}
                  editable={false}
                  placeholder="Litres will be calculated automatically"
                />
                {createForm.selectedClient && (
                  <Text style={styles.balanceText}>
                    Available balance: $ {createForm.selectedClient.balance}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTransaction}
                disabled={loadingCreate}
              >
                {loadingCreate ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Transaction</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6A0DAD',
    padding: 20,
    paddingTop: 40,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  pumpPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pumpPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionsList: {
    flex: 1,
  },
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A0DAD',
    backgroundColor: 'rgba(106, 13, 173, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
    textAlign: 'right',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  createButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6A0DAD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    maxHeight: '80%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  clientSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  clientSelectorText: {
    fontSize: 16,
    color: '#333333',
  },
  clientListContainer: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clientList: {
    maxHeight: 200,
  },
  clientItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  clientItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  clientBalanceText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  fuelTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fuelTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  fuelTypeButtonActive: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  fuelTypeText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 8,
  },
  fuelTypeTextActive: {
    color: '#FFFFFF',
  },
  vehicleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleButton: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  vehicleButtonActive: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  vehicleText: {
    fontSize: 14,
    color: '#666666',
  },
  vehicleTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    fontSize: 16,
  },
  balanceText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#6A0DAD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginVertical: 20,
  },
  clientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  clientSearchIcon: {
    marginRight: 8,
  },
  clientSearchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clientSearchClearButton: {
    padding: 4,
  },
});

export default TransactionScreen;