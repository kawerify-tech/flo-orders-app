import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
  writeBatch,
  limit,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { handleAppError, showUserError, showUserSuccess } from '../../utils/userFacingError';

interface ClientData {
  id: string;
  address: string;
  amount: number;
  balance: number;
  cellPhone: string;
  contactPerson: number;
  email: string;
  fuelWithdrawn: number;
  invoiceNumbers: string[];
  language: string;
  litresDrawn: number;
  name: string;
  notifications: boolean;
  openingBalance: number;
  password: string;
  pumpPrice: number;
  receiptNumber: number;
  remainingFuel: number;
  requests: string[];
  role: string;
  status: string;
  threshold: number;
  tinNumber: number;
  totalFuelPurchased: number;
  totalValue: number;
  updatedAt: any;
  vatNumber: number;
  vehicle: string[];
}

interface Transaction {
  id: string;
  amount: number;
  litres: number;
  pumpPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  vehicle: string;
  fuelType: 'diesel' | 'blend';
  attendantId: string;
  attendantName: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  clientName: string;
  clientEmail: string;
  isDraft?: boolean;
  metadata: {
    clientBalance: number;
    remainingFuel: number;
    requestSource: string;
  };
  processingSteps: {
    step: string;
    timestamp: string;
    status: string;
  }[];
  notes?: string;
}

interface SavedTransaction extends Transaction {
  isDraft: boolean;
  lastModified: any;
}

const { width } = Dimensions.get('window');

const TransactionScreen = () => {
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendant, setSelectedAttendant] = useState<any>(null);
  const [attendants, setAttendants] = useState<any[]>([]);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [pumpPrice, setPumpPrice] = useState(0);
  const [calculatedLitres, setCalculatedLitres] = useState(0);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const hasAlertedTransactionsPermission = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [draftTransactions, setDraftTransactions] = useState<SavedTransaction[]>([]);
  const [selectedFuelType, setSelectedFuelType] = useState<'diesel' | 'blend'>('diesel');
  const scrollViewRef = useRef<ScrollView>(null);
  const unsubscribeTransactionsRef = useRef<null | (() => void)>(null);

  // Add new state for displaying current balance in transaction form
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const currentUser = auth.currentUser;

  // Calculate litres when amount or pump price changes
  useEffect(() => {
    if (amount && pumpPrice > 0 && clientData) {
      const amountNum = parseFloat(amount);
      const litres = amountNum / pumpPrice;
      setCalculatedLitres(Number(litres.toFixed(2)));
      
      // Ensure we're comparing numbers
      const currentBalance = Number(clientData.balance) || 0;
      const isValid = amountNum <= currentBalance;
      
      console.log('Balance validation:', {
        enteredAmount: amountNum,
        currentBalance: currentBalance,
        isValid: isValid
      });
      
      setIsAmountValid(isValid);
    } else {
      setCalculatedLitres(0);
      setIsAmountValid(true);
    }
  }, [amount, pumpPrice, clientData]);

  const fetchClientData = useCallback(async () => {
    if (!currentUser?.email) {
      console.log('No user email found');
      showUserError('Please sign in again.');
      setLoading(false);
      return null;
    }

    if (!currentUser?.uid) {
      console.log('No user uid found');
      showUserError('Please sign in again.');
      setLoading(false);
      return null;
    }

    const userEmail = currentUser.email.toLowerCase();

    try {
      let clientDocId = currentUser.uid;
      let data: any | null = null;

      const clientRef = doc(db, 'clients', currentUser.uid);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        data = clientSnap.data();
      } else {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('email', '==', userEmail), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          clientDocId = snapshot.docs[0].id;
          data = snapshot.docs[0].data();
        }
      }

      if (data) {
        
        // Ensure vehicle array is properly initialized
        const clientData = {
        id: clientDocId,
          ...data,
          balance: Number(data.balance || 0),
          remainingFuel: Number(data.remainingFuel || 0),
          pumpPrice: Number(data.pumpPrice || 0),
          vehicle: Array.isArray(data.vehicle) ? data.vehicle : [], // Ensure it's an array
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ClientData;

        console.log('Client data loaded:', {
          id: clientData.id,
          email: userEmail,
          balance: clientData.balance,
          remainingFuel: clientData.remainingFuel,
          pumpPrice: clientData.pumpPrice,
          vehicleCount: clientData.vehicle.length
        });

        setClientData(clientData);
        setPumpPrice(clientData.pumpPrice);

        return clientData;
      } else {
        console.log('No client profile found for:', userEmail);
        Alert.alert(
          'Account Not Found',
          'Please contact support to set up your client account.',
          [{ text: 'OK' }]
        );
        setClientData(null);
        return null;
      }
    } catch (error) {
      handleAppError(error, {
        context: 'Error fetching client data:',
        userMessage: 'Unable to load your account right now. Please try again.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email, currentUser?.uid]);

  const fetchAttendants = useCallback(async () => {
    try {
      const attendantsRef = collection(db, 'attendants');
      const snapshot = await getDocs(attendantsRef);
      const attendantList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status
      }));
      setAttendants(attendantList);
    } catch (error) {
      handleAppError(error, {
        context: 'Error fetching attendants:',
        userMessage: 'Unable to load attendants right now. Please try again.',
      });
    }
  }, []);

  const subscribeToTransactions = useCallback(() => {
    if (!currentUser?.email) return () => {};

    setIsLoadingTransactions(true);

    // First try without the complex query
    const transactionsRef = collection(db, 'transactions');
    const simpleQuery = query(
      transactionsRef,
      where('clientEmail', '==', currentUser.email.toLowerCase())
    );

    return onSnapshot(simpleQuery, 
      (snapshot) => {
        const transactionList = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp 
            : Timestamp.now();

          return {
            ...data,
            id: doc.id,
            timestamp: {
              seconds: timestamp.seconds,
              nanoseconds: timestamp.nanoseconds,
              toDate: () => timestamp.toDate()
            }
          } as Transaction;
        });

        // Sort transactions client-side instead of in the query
        const sortedTransactions = transactionList.sort((a, b) => 
          b.timestamp.seconds - a.timestamp.seconds
        );

        // Limit to 20 transactions after sorting
        const limitedTransactions = sortedTransactions.slice(0, 20);

        setTransactions(limitedTransactions);
        setIsLoadingTransactions(false);
        
        console.log(`Fetched ${limitedTransactions.length} transactions`);
      }, 
      (error) => {
        if (__DEV__) {
          console.warn('Error subscribing to transactions:', error);
        }
        setIsLoadingTransactions(false);
        if ((error as any)?.code === 'permission-denied') {
          setTransactions([]);
          if (!hasAlertedTransactionsPermission.current) {
            hasAlertedTransactionsPermission.current = true;
            showUserError('Transactions are unavailable right now. Please try again later.');
          }
          return;
        }

        showUserError('Failed to load transactions. Please try again.');
      }
    );
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser) {
      showUserError('Please sign in to access transactions.');
      return;
    }

    // Always clean up any previous snapshot listener before creating a new one.
    if (unsubscribeTransactionsRef.current) {
      try {
        unsubscribeTransactionsRef.current();
      } catch {}
      unsubscribeTransactionsRef.current = null;
    }

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const clientDataResult = await fetchClientData();

        if (clientDataResult) {
          setCurrentBalance(clientDataResult.balance);
          setDisplayBalance(clientDataResult.balance);
        }

        await fetchAttendants();
        unsubscribeTransactionsRef.current = subscribeToTransactions();
      } catch (error) {
        console.error('Error loading initial data:', error);
        setLastError('Unable to load transactions right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      if (unsubscribeTransactionsRef.current) {
        try {
          unsubscribeTransactionsRef.current();
        } catch {}
        unsubscribeTransactionsRef.current = null;
      }
    };
  }, [currentUser, fetchClientData, fetchAttendants, subscribeToTransactions]);

  const validateTransaction = () => {
    if (!amount || !selectedVehicle || !selectedAttendant) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (!clientData) {
      Alert.alert('Error', 'Client data not loaded. Please refresh.');
      return false;
    }

    const requestedAmount = parseFloat(amount);
    const currentBalance = Number(clientData.balance);
    const currentPumpPrice = Number(pumpPrice);

    if (!currentPumpPrice || currentPumpPrice <= 0) {
      Alert.alert('Error', 'Pump price is not set. Please contact the admin.');
      return false;
    }
    
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return false;
    }

    if (requestedAmount > currentBalance) {
      Alert.alert('Error', 
        `Insufficient balance\n\nRequested: $${requestedAmount.toFixed(2)}\nAvailable: $${currentBalance.toFixed(2)}`
      );
      return false;
    }

    return true;
  };

const handleCreateTransaction = async () => {
  if (!validateTransaction()) return;

  if (!currentUser?.email || !clientData) {
    showUserError('Please sign in to create a transaction.');
    return;
  }

  try {
    setIsProcessing(true);
    const transactionAmount = parseFloat(amount);
    const userEmail = currentUser.email.toLowerCase();

    if (!pumpPrice || pumpPrice <= 0) {
      showUserError('Pump price is unavailable right now. Please try again later.');
      return;
    }

    const litres = Number((transactionAmount / pumpPrice).toFixed(2));
    const currentRemainingFuel = currentBalance / pumpPrice;

    // Create transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create batch write
    const batch = writeBatch(db);

    // 1. Create transaction document (global)
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionData = {
      id: transactionId,
      amount: transactionAmount,
      litres,
      fuelType: selectedFuelType,
      status: 'pending',
      vehicle: selectedVehicle,
      attendantId: selectedAttendant?.id || '',
      attendantName: selectedAttendant?.name || '',
      pumpPrice: pumpPrice,
      clientEmail: userEmail,
      clientId: clientData.id,
      clientName: clientData.name,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        clientBalance: currentBalance,
        remainingFuel: currentRemainingFuel,
        requestSource: 'mobile_app'
      },
      processingSteps: [{
        step: 'created',
        timestamp: new Date().toISOString(),
        status: 'completed'
      }]
    };
    batch.set(transactionRef, transactionData);

    // 2. Create transaction copy in client subcollection
    const clientTransactionRef = doc(db, 'clients', clientData.id, 'transactions', transactionId);
    batch.set(clientTransactionRef, transactionData);

    // 3. Create a client-visible notification entry
    const clientNotificationRef = doc(db, 'clients', clientData.id, 'notifications', transactionId);
    batch.set(clientNotificationRef, {
      message: `Transaction pending: $${transactionAmount.toFixed(2)} (${selectedFuelType})`,
      createdAt: serverTimestamp(),
      type: 'transaction',
      status: 'pending',
      transactionId,
      amount: transactionAmount,
      litres,
      fuelType: selectedFuelType,
      read: false,
    });

    await batch.commit();

    // Reset form
    setAmount('');
    setSelectedVehicle('');
    setSelectedFuelType('diesel');
    setSelectedAttendant(null);

    showUserSuccess('Transaction created successfully');
  } catch (error) {
    handleAppError(error, {
      context: 'Error in transaction:',
      userMessage: 'Could not create your transaction right now. Please try again.',
    });
  } finally {
    setIsProcessing(false);
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const saveDraftTransaction = async () => {
    if (!currentUser?.email || !clientData) {
      showUserError('Please sign in again.');
      return;
    }

    if (!validateTransaction()) return;

    setIsProcessing(true);
    setLastError(null);

    try {
      const draftId = `DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      const draftData = {
        id: draftId,
        amount: parseFloat(amount),
        litres: calculatedLitres,
        pumpPrice: clientData.pumpPrice,
        status: 'pending',
        vehicle: selectedVehicle,
        fuelType: selectedFuelType,
        attendantId: selectedAttendant.id,
        attendantName: selectedAttendant.name,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        clientId: clientData.id,
        clientName: clientData.name,
        clientEmail: currentUser.email,
        isDraft: true,
        lastModified: now,
        metadata: {
          clientBalance: clientData.balance,
          remainingFuel: clientData.remainingFuel,
          requestSource: 'mobile_app'
        },
        processingSteps: [{
          step: 'draft_created',
          timestamp: now.toDate().toISOString(),
          status: 'completed'
        }]
      };

      // Save draft directly to client's drafts subcollection
      await setDoc(
        doc(db, `clients/${clientData.id}/drafts/${draftId}`),
        draftData
      );

      // Reset form
      setAmount('');
      setSelectedVehicle('');
      setSelectedFuelType('diesel');
      setSelectedAttendant(null);

      showUserSuccess('Draft saved successfully');

    } catch (error) {
      handleAppError(error, {
        context: 'Error saving draft:',
        userMessage: 'Could not save draft right now. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const sendDraftTransaction = async (draft: SavedTransaction) => {
    setIsProcessing(true);
    setLastError(null);

    try {
      if (!clientData?.id || !currentUser?.email) {
        showUserError('Please sign in again.');
        return;
      }

      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      const transactionData = {
        ...draft,
        id: transactionId,
        isDraft: false,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        processingSteps: [
          ...(draft.processingSteps || []),
          {
            step: 'draft_sent',
            timestamp: now.toDate().toISOString(),
            status: 'completed'
          }
        ]
      };

      const batch = writeBatch(db);
      const draftRef = doc(db, `clients/${clientData.id}/drafts/${draft.id}`);
      const transactionRef = doc(db, 'transactions', transactionId);
      const clientTransactionRef = doc(db, `clients/${clientData.id}/transactions/${transactionId}`);
      const clientNotificationRef = doc(db, 'clients', clientData.id, 'notifications', transactionId);

      batch.delete(draftRef);
      batch.set(transactionRef, transactionData);
      batch.set(clientTransactionRef, transactionData);
      batch.set(clientNotificationRef, {
        message: `Transaction pending: $${Number(draft.amount).toFixed(2)} (${draft.fuelType})`,
        createdAt: serverTimestamp(),
        type: 'transaction',
        status: 'pending',
        transactionId,
        amount: Number(draft.amount),
        litres: Number(draft.litres),
        fuelType: draft.fuelType,
        read: false,
      });

      await batch.commit();

      setDraftTransactions(prev => prev.filter(d => d.id !== draft.id));
      showUserSuccess('Transaction created successfully');

    } catch (error) {
      handleAppError(error, {
        context: 'Error creating transaction from draft:',
        userMessage: 'Could not create your transaction right now. Please try again.',
      });
      // Refresh drafts list in case of error
      const draftsQuery = query(
        collection(db, `clients/${clientData?.id}/drafts`),
        orderBy('lastModified', 'desc')
      );
      const snapshot = await getDocs(draftsQuery);
      const draftsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedTransaction[];
      setDraftTransactions(draftsList);
    } finally {
      setIsProcessing(false);
    }
  };

  const editDraft = (draft: SavedTransaction) => {
    // Set all the form fields
    setAmount(draft.amount.toString());
    setSelectedVehicle(draft.vehicle);
    setSelectedFuelType(draft.fuelType);
    
    // Find and set the attendant
    const attendant = attendants.find(a => a.id === draft.attendantId);
    setSelectedAttendant(attendant || null);

    // Delete the draft after loading its data
    const deleteDraft = async () => {
      try {
        const draftRef = doc(db, `clients/${clientData?.id}/drafts/${draft.id}`);
        await deleteDoc(draftRef);
        setDraftTransactions(prev => prev.filter(d => d.id !== draft.id));
      } catch (error) {
        handleAppError(error, {
          context: 'Error deleting draft:',
          userMessage: 'Could not delete draft right now. Please try again.',
        });
      }
    };

    deleteDraft();
    
    // Scroll to the form
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  useEffect(() => {
    if (!currentUser?.uid || !clientData?.id) return;

    // Subscribe to drafts in client's subcollection
    const draftsQuery = query(
      collection(db, `clients/${clientData.id}/drafts`),
      orderBy('lastModified', 'desc')
    );

    const unsubscribe = onSnapshot(draftsQuery, (snapshot) => {
      const draftsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedTransaction[];
      setDraftTransactions(draftsList);
    }, (error) => {
      console.error('Error subscribing to drafts:', error);
      showUserError('Failed to load drafts. Please try again.');
    });

    return () => unsubscribe();
  }, [currentUser?.uid, clientData?.id]);

  const renderAttendantSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Attendant</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedAttendant?.id || ''}
          onValueChange={(itemValue) => {
            const selected = attendants.find(a => a.id === itemValue);
            setSelectedAttendant(selected || null);
          }}
          style={styles.picker}
          dropdownIconColor="#333333"
        >
          <Picker.Item label="Select an attendant" value="" />
          {attendants.map((attendant) => (
            <Picker.Item 
              key={attendant.id} 
              label={attendant.name} 
              value={attendant.id} 
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderFuelTypeSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Fuel Type</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedFuelType}
          onValueChange={(itemValue) => setSelectedFuelType(itemValue)}
          style={styles.picker}
          dropdownIconColor="#333333"
        >
          <Picker.Item label="Diesel" value="diesel" />
          <Picker.Item label="Blend" value="blend" />
        </Picker>
      </View>
    </View>
  );

  const renderVehicleSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Vehicle</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedVehicle}
          onValueChange={(itemValue) => setSelectedVehicle(itemValue)}
          style={styles.picker}
          dropdownIconColor="#333333"
        >
          <Picker.Item label="Select a vehicle" value="" />
          {clientData && clientData.vehicle && Array.isArray(clientData.vehicle) ? (
            clientData.vehicle.map((vehicle, index) => (
              <Picker.Item key={index} label={vehicle} value={vehicle} />
            ))
          ) : null}
        </Picker>
      </View>
    </View>
  );

  const renderFormButtons = () => (
    <View style={styles.buttonContainer}>
            <TouchableOpacity
        style={[styles.button, styles.saveButton]}
        onPress={saveDraftTransaction}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>Save Draft</Text>
            </TouchableOpacity>
        <TouchableOpacity
        style={[styles.button, styles.submitButton]}
          onPress={handleCreateTransaction}
        disabled={isProcessing}
        >
        <Text style={styles.submitButtonText}>Send Now</Text>
        </TouchableOpacity>
      </View>
  );

  const renderDrafts = () => (
    <View style={styles.draftsContainer}>
      <Text style={styles.sectionTitle}>Saved Drafts</Text>
      {draftTransactions.length === 0 ? (
        <Text style={styles.noTransactionsText}>No saved drafts</Text>
      ) : (
        draftTransactions.map(draft => (
          <View key={draft.id} style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View>
                <Text style={styles.draftId}>Draft #{draft.id.slice(-6)}</Text>
                <Text style={styles.draftVehicle}>{draft.vehicle}</Text>
              </View>
              <Text style={styles.draftAmount}>
                ${draft.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.draftDetails}>
              <Text style={styles.draftLitres}>
                ${draft.amount.toFixed(2)} @ ${draft.pumpPrice.toFixed(2)}/L
              </Text>
              <Text style={styles.draftDate}>
                {(() => {
                  const lm: any = (draft as any).lastModified;
                  const date: Date = lm?.toDate?.() ?? (lm instanceof Date ? lm : new Date());
                  return format(date, 'MMM d, yyyy HH:mm');
                })()}
              </Text>
            </View>
            <View style={styles.draftActions}>
              <TouchableOpacity
                style={[styles.draftButton, styles.editButton]}
                onPress={() => editDraft(draft)}
              >
                <Icon name="create-outline" size={20} color="#6A0DAD" />
                <Text style={styles.draftButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.draftButton, styles.sendButton]}
                onPress={() => sendDraftTransaction(draft)}
                disabled={isProcessing}
              >
                <Icon name="send-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.draftButtonText, styles.sendButtonText]}>
                  {isProcessing ? 'Sending...' : 'Send'}
              </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderTransactionList = () => {
    if (isLoadingTransactions) {
      return <ActivityIndicator size="large" color="#6A0DAD" />;
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No transactions yet</Text>
        </View>
      );
    }

    return (
      <View>
        {transactions.map((item) => {
          let date: Date;
          try {
            date = item.timestamp?.toDate?.() || new Date();
          } catch {
            console.warn('Invalid timestamp for transaction:', item.id);
            date = new Date();
          }

          return (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionHeaderRow}>
                <View style={styles.transactionAmountContainer}>
                  <Icon name="cash-outline" size={24} color="#6A0DAD" />
                  <Text style={styles.transactionAmount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}>
                  <Icon
                    name={
                      item.status === 'completed' ? 'checkmark-circle-outline' :
                      item.status === 'pending' ? 'time-outline' :
                      item.status === 'rejected' ? 'close-circle-outline' :
                      'help-circle-outline'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.statusText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.transactionDetailsBox}>
                <View style={styles.detailRow}>
                  <Icon name="water-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    ${item.amount.toFixed(2)} ({item.fuelType})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="pricetag-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    Vehicle: {item.vehicle}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="calendar-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    Date: {date.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
};

const renderTransactionForm = () => (
  <View style={styles.formContainer}>
    <Text style={styles.formTitle}>New Transaction</Text>
    
    {/* Always visible balance */}
    <View style={styles.balanceContainer}>
      <Text style={styles.balanceLabel}>Current Balance:</Text>
      <Text style={styles.balanceAmount}>${displayBalance.toFixed(2)}</Text>
    </View>

    {renderFuelTypeSelector()}
    {renderVehicleSelector()}
    
    <TextInput
      style={[styles.input, !isAmountValid && styles.invalidInput]}
      placeholder="Enter Amount ($)"
      value={amount}
      onChangeText={setAmount}
      keyboardType="numeric"
      placeholderTextColor="#999"
    />

    {renderAttendantSelector()}
    {renderFormButtons()}
  </View>
);

if (!currentUser) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Please sign in to view transactions</Text>
    </View>
  );
}

if (loading) {
  return (
    <View style={styles.mainContainer}>
      <ActivityIndicator size="large" color="#6A0DAD" />
    </View>
  );
}

if (lastError) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{lastError}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setLastError(null);
          fetchClientData();
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

return (
  <View style={styles.mainContainer}>
    {/* Background Circles */}
    <View style={styles.backgroundCircle1} />
    <View style={styles.backgroundCircle2} />
    <View style={styles.backgroundCircle3} />
    
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
    >
      {/* Current Balance and Fuel Info */}
      <LinearGradient
        colors={['#8A2BE2', '#6A0DAD']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{clientData?.name || 'Welcome'}</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <Icon name="wallet-outline" size={24} color="#FFFFFF" style={styles.cardIcon} />
              <Text style={styles.infoLabel}>Current Balance</Text>
              <Text style={styles.infoValue}>
                ${currentBalance.toFixed(2)}
              </Text>
              <Text style={styles.infoSubtext}>Available Funds</Text>
            </View>
            <View style={styles.infoCard}>
              <Icon name="gas-station-outline" size={24} color="#FFFFFF" style={styles.cardIcon} />
              <Text style={styles.infoLabel}>Pump Price</Text>
              <Text style={styles.infoValue}>
                ${pumpPrice.toFixed(2)}/L
              </Text>
              <Text style={styles.infoSubtext}>Current Station Rate</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Client Details Summary with icons */}
      <View style={styles.clientInfoCard}>
        <Text style={styles.sectionTitle}>Client Details</Text>
        <View style={styles.clientInfoRow}>
          <Icon name="receipt-outline" size={20} color="#6A0DAD" />
          <Text style={styles.clientInfoTextStyle}>VAT: {clientData?.vatNumber || 'N/A'}</Text>
        </View>
        <View style={styles.clientInfoRow}>
          <Icon name="document-text-outline" size={20} color="#6A0DAD" />
          <Text style={styles.clientInfoTextStyle}>TIN: {clientData?.tinNumber || 'N/A'}</Text>
        </View>
        <View style={styles.clientInfoRow}>
          <Icon name="pricetag-outline" size={20} color="#6A0DAD" />
          <Text style={styles.clientInfoTextStyle}>Pump Price: ${pumpPrice.toFixed(2)}/L</Text>
        </View>
      </View>

      {/* New Transaction Form */}
      {renderTransactionForm()}

      {/* Add drafts section */}
      {renderDrafts()}

      {/* Transactions List */}
      <View style={styles.transactionsList}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        {renderTransactionList()}
      </View>
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  container: {
    flex: 1,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(106, 13, 173, 0.1)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(138, 43, 226, 0.08)',
    top: width * 0.3,
    left: -width * 0.3,
  },
  backgroundCircle3: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(106, 13, 173, 0.05)',
    bottom: width * 0.2,
    right: -width * 0.1,
  },
  gradientHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 30,
    marginBottom: 20,
  },
  headerContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', // Center the icon
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 20,
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  calculationContainer: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  calculationText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  attendantList: {
    flexGrow: 0,
    marginBottom: 20,
  },
  attendantItem: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FE',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedAttendant: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  attendantName: {
    color: '#333333',
    fontWeight: '500',
  },
  selectedAttendantText: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6A0DAD',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 20,
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  clientInfoTextStyle: {
    fontSize: 15,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  transactionsList: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionDetailsBox: {
    backgroundColor: '#F8F9FE',
    padding: 12,
    borderRadius: 12,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A0DAD',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 13,
    color: '#666666',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    marginTop: 12,
  },
  downloadButtonText: {
    marginLeft: 8,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  statusMessage: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#F8F9FE',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalidInput: {
    borderColor: '#FF0000',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  invalidText: {
    color: '#FF0000',
  },
  errorMessage: {
    color: '#FF0000',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerWrapper: {
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333333',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  transactionVehicle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  transactionLitres: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  loadingAttendants: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FE',
    borderRadius: 16,
  },
  loadingTransactions: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666666',
    fontSize: 14,
  },
  noTransactionsText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#6A0DAD',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  draftsContainer: {
    marginTop: 20,
    padding: 16,
  },
  draftCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#6A0DAD',
  },
  sendButton: {
    backgroundColor: '#6A0DAD',
  },
  draftButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#6A0DAD',
  },
  sendButtonText: {
    color: '#FFFFFF',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#6A0DAD',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A0DAD',
  },
  draftId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  draftVehicle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  draftAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  draftDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FE',
    padding: 12,
    borderRadius: 12,
  },
  draftLitres: {
    fontSize: 14,
    color: '#666666',
  },
  draftDate: {
    fontSize: 13,
    color: '#666666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  transactionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardIcon: {
    marginBottom: 8,
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceContainer: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 18,
    color: '#6A0DAD',
    fontWeight: 'bold',
  },
});

export default TransactionScreen; 